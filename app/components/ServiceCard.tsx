import { Link } from "react-router";
import type { DailyAgg } from "~/lib/history";
import type { ServiceHealth } from "~/lib/services";
import { StatusBadge } from "./StatusBadge";
import { UptimeBar } from "./UptimeBar";

export function ServiceCard({
	health,
	days = [],
}: {
	health: ServiceHealth;
	days?: DailyAgg[];
}) {
	return (
		<Link
			to={`/services/${health.serviceId}`}
			className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-white/10"
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<h3 className="truncate font-medium text-slate-100">{health.name}</h3>
					<p className="mt-0.5 font-mono text-xs text-slate-400">
						{health.latencyMs != null ? `${health.latencyMs} ms` : "no latency"}
						{health.statusCode != null ? ` · HTTP ${health.statusCode}` : ""}
					</p>
				</div>
				<StatusBadge status={health.status} />
			</div>
			{health.message ? (
				<p className="mt-2 truncate text-xs text-slate-400">{health.message}</p>
			) : null}
			{days.length ? (
				<div className="mt-3">
					<UptimeBar days={days} range={14} />
				</div>
			) : null}
		</Link>
	);
}
