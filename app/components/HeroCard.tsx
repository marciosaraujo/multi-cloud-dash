import type { OverviewMetrics } from "~/lib/metrics";

function Kpi({
	label,
	value,
	tone,
}: {
	label: string;
	value: string;
	tone: string;
}) {
	return (
		<div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-lg">
			<p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
				{label}
			</p>
			<p className={`mt-1 font-mono text-2xl font-semibold ${tone}`}>{value}</p>
		</div>
	);
}

export function HeroCard({ metrics }: { metrics: OverviewMetrics }) {
	return (
		<section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-400/15 via-slate-900/50 to-blue-500/10 px-5 py-6 shadow-[0_22px_55px_rgba(2,6,23,0.7)] backdrop-blur-2xl md:px-8 md:py-7">
			{/* Liquid glows */}
			<div className="pointer-events-none absolute -top-12 -left-10 size-36 rounded-full bg-cyan-400/20 opacity-70 blur-3xl" />
			<div className="pointer-events-none absolute -bottom-12 -right-12 size-44 rounded-full bg-blue-500/20 opacity-60 blur-3xl" />

			<div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
				<div className="max-w-xl">
					<p className="font-mono text-[11px] uppercase tracking-[0.25em] text-slate-300">
						Overview
					</p>
					<h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">
						Live status across {metrics.totalProviders} providers ·{" "}
						{metrics.totalServices} services
					</h1>
					<p className="mt-2 text-sm text-slate-300">
						Continuous, edge-powered health checks for your cloud and SaaS
						with per-provider and per-service insights in seconds.
					</p>
				</div>

				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
					<Kpi
						label="Healthy providers"
						value={`${metrics.healthyProviders}/${metrics.totalProviders}`}
						tone="text-emerald-300"
					/>
					<Kpi
						label="Impacted services"
						value={String(metrics.impactedServices)}
						tone="text-amber-300"
					/>
					<Kpi
						label="Services up now"
						value={`${metrics.servicesUpPct}%`}
						tone="text-sky-300"
					/>
				</div>
			</div>
		</section>
	);
}
