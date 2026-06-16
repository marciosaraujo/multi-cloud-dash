// Self-check for KV persistence logic. Run: node --test app/lib/history.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
	recordChecks,
	readHistory,
	readState,
	windowUptimePct,
} from "./history.ts";
import type { ServiceHealth } from "./services";

// In-memory stand-in for KVNamespace (only get/put are used).
function fakeKV() {
	const store = new Map<string, string>();
	return {
		store,
		get: async (k: string, _t?: string) => {
			const v = store.get(k);
			return v == null ? null : JSON.parse(v);
		},
		put: async (k: string, v: string) => {
			store.set(k, v);
		},
	};
}

function envWith(kv: ReturnType<typeof fakeKV>) {
	return { HEALTH_KV: kv } as unknown as Env;
}

function check(
	status: ServiceHealth["status"],
	latencyMs: number | null,
): ServiceHealth {
	return {
		serviceId: "svc",
		name: "svc",
		provider: "cloudflare",
		status,
		latencyMs,
		checkedAt: new Date().toISOString(),
	};
}

test("no-op when binding absent", async () => {
	await recordChecks({} as Env, [check("up", 10)]); // must not throw
});

test("accumulates today, flushes previous day on UTC rollover", async () => {
	const kv = fakeKV();
	const env = envWith(kv);

	// Seed state as if yesterday accrued: 3 up, 1 down => strict uptime 75%.
	const yesterday = "2026-06-14";
	await kv.put(
		"state:current",
		JSON.stringify({
			updatedAt: `${yesterday}T23:59:00Z`,
			services: {
				svc: {
					status: "up",
					lastLatencyMs: 100,
					degradedSince: null,
					latencyRing: [100],
					today: {
						date: yesterday,
						checks: 4,
						up: 3,
						degraded: 0,
						down: 1,
						unknown: 0,
						latencySamples: [100, 200, 300, 400],
					},
				},
			},
		}),
	);

	// A new check today triggers the flush of yesterday.
	await recordChecks(env, [check("up", 150)]);

	const history = await readHistory(env);
	assert.equal(history.svc.length, 1);
	const day = history.svc[0];
	assert.equal(day.date, yesterday);
	assert.equal(day.uptimePct, 75); // strict: only `up` counts
	assert.equal(day.worst, "down");
	assert.equal(day.p95LatencyMs, 400);
	assert.equal(day.avgLatencyMs, 250);

	const state = await readState(env);
	const today = state!.services.svc.today;
	assert.notEqual(today.date, yesterday); // reset to current UTC day
	assert.equal(today.checks, 1);
	assert.equal(today.up, 1);
});

test("degradedSince set on leaving up, cleared on return", async () => {
	const kv = fakeKV();
	const env = envWith(kv);
	await recordChecks(env, [check("up", 10)]);
	await recordChecks(env, [check("degraded", 20)]);
	let state = await readState(env);
	assert.ok(state!.services.svc.degradedSince);
	await recordChecks(env, [check("up", 10)]);
	state = await readState(env);
	assert.equal(state!.services.svc.degradedSince, null);
});

test("windowUptimePct weights by checks", () => {
	const pct = windowUptimePct([
		{
			date: "a",
			uptimePct: 100,
			worst: "up",
			avgLatencyMs: 1,
			p95LatencyMs: 1,
			checks: 100,
		},
		{
			date: "b",
			uptimePct: 50,
			worst: "down",
			avgLatencyMs: 1,
			p95LatencyMs: 1,
			checks: 100,
		},
	]);
	assert.equal(pct, 75);
	assert.equal(windowUptimePct([]), null);
});
