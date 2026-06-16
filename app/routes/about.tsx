import { Link } from "react-router";
import type { Route } from "./+types/about";
import { Shell } from "~/components/Shell";
import { PROVIDERS, SERVICES } from "~/lib/services";

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "About · Multi-Cloud Health" },
		{
			name: "description",
			content:
				"About the Multi-Cloud Health Dashboard — an edge-native status dashboard built with React Router and Cloudflare Workers.",
		},
	];
}

function Panel({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_45px_rgba(2,6,23,0.5)] backdrop-blur-xl md:p-6">
			<h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
				{title}
			</h2>
			<div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-300">
				{children}
			</div>
		</section>
	);
}

export default function About() {
	return (
		<Shell>
			<Link
				to="/"
				className="text-sm text-slate-400 transition hover:text-cyan-100"
			>
				← Overview
			</Link>
			<h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">
				About this dashboard
			</h1>
			<p className="mt-2 max-w-2xl text-sm text-slate-400">
				A single-pane-of-glass view of the health of critical cloud and SaaS
				providers, served from the edge.
			</p>

			<div className="mt-6 grid gap-4 lg:grid-cols-2">
				<Panel title="What it does">
					<p>
						Multi-Cloud Health aggregates the public status of{" "}
						{PROVIDERS.length} providers across {SERVICES.length} services into
						one fast, read-only dashboard. Instead of jumping between separate
						status pages, you get a global overview plus per-provider and
						per-service detail.
					</p>
					<p>
						Each check runs server-side on every request (with a short edge
						cache), so what you see is the current state — not a stale snapshot.
					</p>
				</Panel>

				<Panel title="History & persistence">
					<p>
						A cron trigger runs the same checks every 5 minutes (UTC) and folds
						the result into Workers KV: one live snapshot plus daily aggregates
						kept for 31 days. The 30-day bar and latency sparkline read from
						that store — no external database, all on the free tier.
					</p>
					<p>
						Uptime is <span className="text-slate-200">strict</span>: only fully
						operational counts as available. Timeouts, rate limits (429) and 5xx
						map to <span className="text-slate-200">UNKNOWN</span> — a loss of
						visibility, never DOWN. Only a provider's own status API declaring
						"critical" yields DOWN, and days with no data render grey, not green.
					</p>
				</Panel>

				<Panel title="How the checks work">
					<p>
						Two kinds of checks feed a normalized status model:
					</p>
					<ul className="list-disc space-y-1 pl-5">
						<li>
							<span className="text-slate-200">status-api</span> — parses the
							statuspage.io indicator (Cloudflare, GitHub, Oracle) into
							operational / degraded / down.
						</li>
						<li>
							<span className="text-slate-200">http</span> — measures HTTP
							status code and latency for providers without an open status API.
						</li>
					</ul>
					<p>
						Checks run in parallel with a 5s timeout, so one slow provider never
						blocks the page.
					</p>
				</Panel>

				<Panel title="Tech stack">
					<ul className="space-y-1.5">
						<li>
							<span className="text-slate-200">React Router 7</span> — SSR with
							server-side data loaders.
						</li>
						<li>
							<span className="text-slate-200">Cloudflare Workers</span> —
							edge runtime; checks and rendering run close to the user.
						</li>
						<li>
							<span className="text-slate-200">TypeScript + Tailwind CSS 4</span>{" "}
							— typed end to end, liquid-glass UI.
						</li>
						<li>
							<span className="text-slate-200">Vite + Wrangler</span> — build and
							deploy toolchain.
						</li>
					</ul>
				</Panel>

				<Panel title="Contact">
					<p>
						Built by <span className="text-slate-200">Márcio Araújo</span> —
						DevOps / SRE. This is a portfolio and learning project; feedback and
						ideas are welcome.
					</p>
					<div className="flex flex-wrap gap-3 pt-1">
						<a
							href="https://github.com/marciosaraujo"
							className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 backdrop-blur-md transition hover:border-cyan-300/50 hover:text-cyan-100"
						>
							GitHub ↗
						</a>
						<a
							href="mailto:marcio@marcioaraujo.net"
							className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 backdrop-blur-md transition hover:border-cyan-300/50 hover:text-cyan-100"
						>
							marcio@marcioaraujo.net
						</a>
						<a
							href="https://github.com/marciosaraujo/multi-cloud-dash"
							className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 backdrop-blur-md transition hover:border-cyan-300/50 hover:text-cyan-100"
						>
							Source repo ↗
						</a>
					</div>
				</Panel>
			</div>
		</Shell>
	);
}
