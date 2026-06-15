import type { Route } from "./+types/home";
import { HeroCard } from "~/components/HeroCard";
import { ProviderSummaryCard } from "~/components/ProviderSummaryCard";
import { Shell } from "~/components/Shell";
import { checkAll } from "~/lib/health-check";
import { overviewMetrics } from "~/lib/metrics";
import { PROVIDERS, SERVICES } from "~/lib/services";

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "Multi-Cloud Health Dashboard" },
		{
			name: "description",
			content: "Edge-native status overview across multiple cloud providers.",
		},
	];
}

export async function loader() {
	const health = await checkAll(SERVICES);
	const metrics = overviewMetrics(
		health,
		PROVIDERS.map((p) => p.id),
	);
	return { health, metrics };
}

export default function Home({ loaderData }: Route.ComponentProps) {
	const { health, metrics } = loaderData;

	return (
		<Shell lastUpdatedAt={metrics.lastUpdatedAt}>
			<div className="flex flex-col gap-8">
				<HeroCard metrics={metrics} />

				<section>
					<div className="mb-4 flex items-center justify-between gap-3">
						<h2 className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
							Providers
						</h2>
						<p className="hidden text-xs text-slate-500 sm:block">
							Click a provider for per-service detail.
						</p>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{PROVIDERS.map((provider) => (
							<ProviderSummaryCard
								key={provider.id}
								provider={provider}
								health={health.filter((h) => h.provider === provider.id)}
							/>
						))}
					</div>
				</section>
			</div>
		</Shell>
	);
}
