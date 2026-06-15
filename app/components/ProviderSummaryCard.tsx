import { Link } from "react-router";
import type { ProviderMeta, ServiceHealth } from "~/lib/services";
import { countStatuses, latestCheck, rollupStatus } from "~/lib/metrics";
import { StatusBadge } from "./StatusBadge";

export function ProviderSummaryCard({
	provider,
	health,
}: {
	provider: ProviderMeta;
	health: ServiceHealth[];
}) {
	const counts = countStatuses(health);
	const lastCheck = latestCheck(health);

	return (
		<Link
			to={`/providers/${provider.id}`}
			className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-400/10 via-slate-900/40 to-blue-500/10 p-5 shadow-[0_18px_45px_rgba(2,6,23,0.6)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/40 hover:shadow-[0_22px_60px_rgba(56,189,248,0.25)]"
		>
			{/* Liquid glow */}
			<div className="pointer-events-none absolute -top-16 -right-10 size-32 rounded-full bg-cyan-400/20 opacity-60 blur-3xl transition group-hover:bg-cyan-300/30" />

			<div className="relative flex items-center justify-between gap-3">
				<div>
					<h2 className="font-semibold tracking-tight text-slate-50">
						{provider.name}
					</h2>
					<p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
						Provider
					</p>
				</div>
				<StatusBadge status={rollupStatus(health)} />
			</div>

			<dl className="relative mt-5 flex items-end gap-4 text-sm">
				<div>
					<dt className="text-[11px] uppercase tracking-wider text-slate-400">
						Up
					</dt>
					<dd className="font-mono text-lg font-semibold text-emerald-300">
						{counts.up}
					</dd>
				</div>
				<div>
					<dt className="text-[11px] uppercase tracking-wider text-slate-400">
						Degraded
					</dt>
					<dd className="font-mono text-lg font-semibold text-amber-300">
						{counts.degraded}
					</dd>
				</div>
				<div>
					<dt className="text-[11px] uppercase tracking-wider text-slate-400">
						Down
					</dt>
					<dd className="font-mono text-lg font-semibold text-rose-300">
						{counts.down}
					</dd>
				</div>
				<div className="ml-auto text-right">
					<dt className="text-[11px] uppercase tracking-wider text-slate-400">
						Services
					</dt>
					<dd className="font-mono text-lg font-semibold text-slate-100">
						{counts.total}
					</dd>
				</div>
			</dl>

			{lastCheck ? (
				<p className="relative mt-4 font-mono text-[11px] text-slate-500">
					Checked {new Date(lastCheck).toLocaleTimeString()}
				</p>
			) : null}
		</Link>
	);
}
