import type { DailyAgg } from "~/lib/history";

const BAR_COLOR: Record<string, string> = {
	up: "bg-emerald-400",
	degraded: "bg-amber-400",
	down: "bg-rose-400",
	unknown: "bg-slate-500",
};

// 30-day uptime bar. Days without data render grey (no-data is more honest than
// all-green — real systems have blind spots, spec §9.1). Range is parametric.
export function UptimeBar({
	days,
	range = 30,
}: {
	days: DailyAgg[];
	range?: number;
}) {
	const recent = days.slice(-range);
	// Pad the front so the bar is always `range` wide, oldest slots blank.
	const pad = Math.max(0, range - recent.length);
	const slots: (DailyAgg | null)[] = [
		...Array.from({ length: pad }, () => null),
		...recent,
	];

	return (
		<div
			className="flex items-end gap-[2px]"
			aria-label={`${range}-day uptime`}
		>
			{slots.map((d, i) => (
				<span
					key={d ? d.date : `pad-${i}`}
					title={
						d
							? `${d.date} · ${d.uptimePct}% uptime · p95 ${d.p95LatencyMs ?? "—"}ms · ${d.checks} checks`
							: "no data"
					}
					className={`h-7 w-[6px] rounded-[2px] ${d ? BAR_COLOR[d.worst] : "bg-slate-700/50"}`}
				/>
			))}
		</div>
	);
}
