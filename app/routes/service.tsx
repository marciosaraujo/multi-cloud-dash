import { Link } from "react-router";
import type { Route } from "./+types/service";
import { Shell } from "~/components/Shell";
import { StatusBadge } from "~/components/StatusBadge";
import { checkService } from "~/lib/health-check";
import { getProvider, getService } from "~/lib/services";

export function meta({ data }: Route.MetaArgs) {
	return [{ title: data ? `${data.def.name} · Health` : "Service" }];
}

export async function loader({ params }: Route.LoaderArgs) {
	const def = getService(params.serviceId);
	if (!def) {
		throw new Response("Service not found", { status: 404 });
	}
	const health = await checkService(def);
	return { def, health };
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
	const { def, health } = loaderData;
	const provider = getProvider(def.provider);

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
				</div>
				<StatusBadge status={health.status} />
			</div>

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
						<a
							href={def.url}
							className="text-cyan-300 hover:underline"
						>
							{def.url}
						</a>
					}
				/>
			</dl>
		</Shell>
	);
}
