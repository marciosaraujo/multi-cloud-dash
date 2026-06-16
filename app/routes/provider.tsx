import { Link } from "react-router";
import type { Route } from "./+types/provider";
import { ServiceCard } from "~/components/ServiceCard";
import { Shell } from "~/components/Shell";
import { checkAll } from "~/lib/health-check";
import { readHistory } from "~/lib/history";
import { latestCheck } from "~/lib/metrics";
import { getProvider, getServicesByProvider } from "~/lib/services";

export function meta({ data }: Route.MetaArgs) {
	return [{ title: data ? `${data.provider.name} · Health` : "Provider" }];
}

export async function loader({ params, context }: Route.LoaderArgs) {
	const provider = getProvider(params.providerId);
	if (!provider) {
		throw new Response("Provider not found", { status: 404 });
	}
	const defs = getServicesByProvider(provider.id);
	const [health, history] = await Promise.all([
		checkAll(defs),
		readHistory(context.cloudflare.env),
	]);
	return { provider, health, history };
}

export default function ProviderPage({ loaderData }: Route.ComponentProps) {
	const { provider, health, history } = loaderData;

	return (
		<Shell lastUpdatedAt={latestCheck(health)}>
			<Link
				to="/"
				className="text-sm text-slate-400 transition hover:text-cyan-100"
			>
				← Overview
			</Link>
			<h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-50">
				{provider.name}
			</h1>
			<p className="mt-1 text-sm text-slate-400">
				{health.length} monitored {health.length === 1 ? "service" : "services"}
				.
			</p>

			<div className="mt-6 grid gap-3">
				{health.map((h) => (
					<ServiceCard
						key={h.serviceId}
						health={h}
						days={history[h.serviceId] ?? []}
					/>
				))}
			</div>
		</Shell>
	);
}
