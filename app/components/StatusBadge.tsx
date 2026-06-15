import type { ServiceStatus } from "~/lib/services";

const STYLES: Record<
	ServiceStatus,
	{ dot: string; pill: string; label: string }
> = {
	up: {
		dot: "bg-emerald-400",
		pill: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
		label: "Operational",
	},
	degraded: {
		dot: "bg-amber-400",
		pill: "border-amber-400/40 bg-amber-400/10 text-amber-300",
		label: "Degraded",
	},
	down: {
		dot: "bg-rose-400",
		pill: "border-rose-400/40 bg-rose-400/10 text-rose-300",
		label: "Down",
	},
	unknown: {
		dot: "bg-slate-400",
		pill: "border-slate-400/40 bg-slate-400/10 text-slate-300",
		label: "Unknown",
	},
};

export function StatusBadge({ status }: { status: ServiceStatus }) {
	const s = STYLES[status];
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-md ${s.pill}`}
		>
			<span className={`size-1.5 rounded-full ${s.dot}`} />
			{s.label}
		</span>
	);
}
