import { Link } from "react-router";

export function Shell({
	children,
	lastUpdatedAt,
}: {
	children: React.ReactNode;
	lastUpdatedAt?: string | null;
}) {
	return (
		<div className="min-h-screen">
			<header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl">
				<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
					<Link to="/" className="flex items-center gap-2.5">
						<span className="relative flex size-2.5">
							<span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/70" />
							<span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
						</span>
						<span className="font-semibold tracking-tight">
							Multi-Cloud Health
						</span>
						<span className="hidden border-l border-white/10 pl-2.5 font-mono text-[11px] text-slate-500 sm:inline">
							Márcio Araújo · DevOps/SRE
						</span>
					</Link>

					<div className="flex items-center gap-3 text-xs">
						{lastUpdatedAt ? (
							<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-slate-300 backdrop-blur-md">
								Last update {new Date(lastUpdatedAt).toLocaleTimeString()}
							</span>
						) : null}
						<Link
							to="/about"
							className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300 backdrop-blur-md transition hover:border-cyan-300/50 hover:text-cyan-100"
						>
							About
						</Link>
						<a
							href="https://github.com/marciosaraujo/multi-cloud-dash"
							className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300 backdrop-blur-md transition hover:border-cyan-300/50 hover:text-cyan-100"
						>
							Source
						</a>
					</div>
				</div>
			</header>
			<main className="mx-auto max-w-6xl px-4 py-8 md:py-10">{children}</main>
		</div>
	);
}
