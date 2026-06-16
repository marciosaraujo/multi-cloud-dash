import { Link } from "react-router";
import type { Route } from "./+types/service";
import { Shell } from "~/components/Shell";
import { Sparkline } from "~/components/Sparkline";
import { StatusBadge } from "~/components/StatusBadge";
import { UptimeBar } from "~/components/UptimeBar";
import { checkService } from "~/lib/health-check";
import { readHistory, readState, windowUptimePct } from "~/lib/history";
import { getProvider, getService } from "~/lib/services";

export function meta({ data }: Route.MetaArgs) {
	return [{ title: data ? `${data.def.name} · Health` : "Service" }];
}

export async function loader({ params, context }: Route.LoaderArgs) {
	const def = getService(params.serviceId);
	if (!def) {
		throw new Response("Service not found", { status: 404 });
	}
	const env = context.cloudflare.env;
	const [health, state, history] = await Promise.all([
		checkService(def),
		readState(env),
		readHistory(env),
	]);
	const days = history[def.id] ?? [];
	return {
		def,
		health,
		days,
		uptimePct: windowUptimePct(days),
		serviceState: state?.services[def.id] ?? null,
	};
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-4 border-b border-white/5 py-3 last:border-0">
			<dt className="text-sm text-slate-400">{label}</dt>
			<dd className="min-w-0 truncate text-right text-sm font-medium text-slate-100">
				{value}
			</dd>
		</div>
	);
}

export default function ServicePage({ loaderData }: Route.ComponentProps) {
	const { def, health, days, uptimePct, serviceState } = loaderData;
	const provider = getProvider(def.provider);
	const ring = serviceState?.latencyRing ?? [];
	const p95 = days.length ? days[days.length - 1].p95LatencyMs : null;

	return (
		<Shell lastUpdatedAt={health.checkedAt}>
			<Link
				to={`/providers/${def.provider}`}
				className="text-sm text-slate-400 transition hover:text-cyan-100"
			>
				← {provider?.name ?? "Provider"}
			</Link>

			<div className="mt-3 flex items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-slate-50">
						{def.name}
					</h1>
					{def.description ? (
						<p className="mt-1 text-sm text-slate-400">{def.description}</p>
					) : null}
					{serviceState?.degradedSince && health.status !== "up" ? (
						<p className="mt-2 inline-flex rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 font-mono text-[11px] text-amber-300">
							degraded since{" "}
							{new Date(serviceState.degradedSince).toLocaleString()}
						</p>
					) : null}
				</div>
				<StatusBadge status={health.status} />
			</div>

			<section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_45px_rgba(2,6,23,0.5)] backdrop-blur-xl">
				<div className="flex items-center justify-between gap-3">
					<h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
						Last {Math.min(30, days.length) || 30} days
					</h2>
					<div className="flex items-center gap-4 text-right">
						{ring.length > 1 ? (
							<div className="flex items-center gap-2">
								<Sparkline values={ring} />
								<span className="font-mono text-xs text-slate-400">
									p95 {p95 != null ? `${p95}ms` : "—"}
								</span>
							</div>
						) : null}
						<div>
							<p className="text-[10px] uppercase tracking-wider text-slate-400">
								Uptime
							</p>
							<p className="font-mono text-lg font-semibold text-emerald-300">
								{uptimePct != null ? `${uptimePct}%` : "—"}
							</p>
						</div>
					</div>
				</div>
				<div className="mt-4">
					{days.length ? (
						<UptimeBar days={days} />
					) : (
						<p className="text-xs text-slate-500">
							No history yet — accrues once the cron has run across a few UTC
							days.
						</p>
					)}
				</div>
			</section>

			<dl className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-5 shadow-[0_18px_45px_rgba(2,6,23,0.5)] backdrop-blur-xl">
				<Row label="Provider" value={provider?.name ?? def.provider} />
				<Row label="Check type" value={def.type} />
				<Row
					label="Latency"
					value={health.latencyMs != null ? `${health.latencyMs} ms` : "—"}
				/>
				<Row label="HTTP status" value={health.statusCode ?? "—"} />
				{health.indicator ? (
					<Row label="Indicator" value={health.indicator} />
				) : null}
				{health.message ? <Row label="Message" value={health.message} /> : null}
				<Row
					label="Checked at"
					value={new Date(health.checkedAt).toLocaleString()}
				/>
				<Row
					label="Endpoint"
					value={
						<a href={def.url} className="text-cyan-300 hover:underline">
							{def.url}
						</a>
					}
				/>
			</dl>
		</Shell>
	);
}
