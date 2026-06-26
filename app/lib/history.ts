import type { ServiceHealth, ServiceStatus } from "./services";

// KV persistence for the health dashboard. Two keys only (see spec §4):
//   state:current  — live snapshot, overwritten every cron cycle (~288 writes/day)
//   history:daily  — rolling 31-day aggregates, written once per UTC-day rollover
// state:current is the single writer's accumulator; history is flushed from it.

const STATE_KEY = "state:current";
const HISTORY_KEY = "history:daily";

const LATENCY_RING = 48; // ~4h of 5-min samples for the sparkline
const RESERVOIR = 200; // cap on daily latency samples kept for p95
const RETENTION_DAYS = 31;

// The HEALTH_KV binding only appears on `Env` after the one-time bootstrap +
// `wrangler types` (spec §2). Until then, read it through a cast so the code
// typechecks and no-ops at runtime when the binding is absent.
function kvOf(env: Env): KVNamespace | undefined {
	return (env as { HEALTH_KV?: KVNamespace }).HEALTH_KV;
}

export interface TodayTally {
	date: string; // YYYY-MM-DD (UTC)
	checks: number;
	up: number;
	degraded: number;
	down: number;
	unknown: number;
	latencySamples: number[];
}

export interface ServiceState {
	status: ServiceStatus;
	lastLatencyMs: number | null;
	degradedSince: string | null; // ISO, null when up
	latencyRing: number[];
	today: TodayTally;
}

export interface LiveState {
	updatedAt: string;
	services: Record<string, ServiceState>;
}

export interface DailyAgg {
	date: string;
	uptimePct: number; // strict: only `up` counts as available (spec §6)
	worst: ServiceStatus;
	avgLatencyMs: number | null;
	p95LatencyMs: number | null;
	checks: number;
}

export type DailyHistory = Record<string, DailyAgg[]>;

function initToday(date: string): TodayTally {
	return {
		date,
		checks: 0,
		up: 0,
		degraded: 0,
		down: 0,
		unknown: 0,
		latencySamples: [],
	};
}

function initService(date: string): ServiceState {
	return {
		status: "unknown",
		lastLatencyMs: null,
		degradedSince: null,
		latencyRing: [],
		today: initToday(date),
	};
}

function avg(xs: number[]): number | null {
	if (xs.length === 0) return null;
	return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
}

function percentile(xs: number[], p: number): number | null {
	if (xs.length === 0) return null;
	const sorted = [...xs].sort((a, b) => a - b);
	const idx = Math.min(
		sorted.length - 1,
		Math.ceil((p / 100) * sorted.length) - 1,
	);
	return sorted[Math.max(0, idx)];
}

function worstOf(t: TodayTally): ServiceStatus {
	if (t.down) return "down";
	if (t.degraded) return "degraded";
	if (t.unknown) return "unknown";
	return "up";
}

// Flush any service still carrying a tally from a previous UTC day into
// history:daily. Idempotent: no-op (and no write) when nothing is stale, so a
// skipped cron cycle just flushes on the next one that runs.
async function maybeFlushPreviousDay(
	kv: KVNamespace,
	state: LiveState,
	todayUTC: string,
): Promise<void> {
	const stale = Object.values(state.services).some(
		(s) => s.today.date !== todayUTC,
	);
	if (!stale) return;

	const history = ((await kv.get(HISTORY_KEY, "json")) as DailyHistory) ?? {};

	for (const [id, s] of Object.entries(state.services)) {
		if (s.today.date === todayUTC) continue;
		const t = s.today;
		const total = t.checks || 1;
		const agg: DailyAgg = {
			date: t.date,
			uptimePct: +((t.up / total) * 100).toFixed(2),
			worst: worstOf(t),
			avgLatencyMs: avg(t.latencySamples),
			p95LatencyMs: percentile(t.latencySamples, 95),
			checks: t.checks,
		};
		history[id] = [...(history[id] ?? []), agg].slice(-RETENTION_DAYS);
		s.today = initToday(todayUTC);
	}

	await kv.put(HISTORY_KEY, JSON.stringify(history)); // 1 write/day
}

// Called from scheduled(): fold a round of checks into live state, flushing the
// previous day on UTC rollover. One read + one write of state:current per cycle.
export async function recordChecks(
	env: Env,
	results: ServiceHealth[],
): Promise<void> {
	const kv = kvOf(env);
	if (!kv) return; // binding not provisioned yet — no-op (spec §2)

	const now = new Date();
	const todayUTC = now.toISOString().slice(0, 10);

	const state: LiveState = ((await kv.get(STATE_KEY, "json")) as LiveState) ?? {
		updatedAt: now.toISOString(),
		services: {},
	};

	await maybeFlushPreviousDay(kv, state, todayUTC);

	for (const r of results) {
		const s = state.services[r.serviceId] ?? initService(todayUTC);

		// degradedSince marca o início de uma degradação CONFIRMADA (degraded/down).
		// `unknown` é perda de visibilidade, não incidente: não inicia nem encerra o
		// relógio. Só `up` o zera. (README §status model)
		const incident = r.status === "degraded" || r.status === "down";
		if (incident && s.degradedSince === null) {
			s.degradedSince = now.toISOString();
		}
		if (r.status === "up") s.degradedSince = null;
		s.status = r.status;

		if (typeof r.latencyMs === "number") {
			s.lastLatencyMs = r.latencyMs;
			s.latencyRing = [...s.latencyRing, r.latencyMs].slice(-LATENCY_RING);
			if (s.today.latencySamples.length < RESERVOIR) {
				s.today.latencySamples.push(r.latencyMs);
			}
		}

		if (s.today.date !== todayUTC) s.today = initToday(todayUTC);
		s.today.checks++;
		s.today[r.status]++; // up | degraded | down | unknown

		state.services[r.serviceId] = s;
	}

	state.updatedAt = now.toISOString();
	await kv.put(STATE_KEY, JSON.stringify(state));
}

export async function readState(env: Env): Promise<LiveState | null> {
	const kv = kvOf(env);
	if (!kv) return null;
	return ((await kv.get(STATE_KEY, "json")) as LiveState) ?? null;
}

export async function readHistory(env: Env): Promise<DailyHistory> {
	const kv = kvOf(env);
	if (!kv) return {};
	return ((await kv.get(HISTORY_KEY, "json")) as DailyHistory) ?? {};
}

// Uptime % over the window, weighted by checks/day (spec §9.3 — no invented 99.9%).
export function windowUptimePct(days: DailyAgg[]): number | null {
	const withData = days.filter((d) => d.checks > 0);
	if (withData.length === 0) return null;
	const checks = withData.reduce((a, d) => a + d.checks, 0);
	const weighted = withData.reduce((a, d) => a + d.uptimePct * d.checks, 0);
	return +(weighted / checks).toFixed(2);
}
