// Latency sparkline from the live latencyRing (~48 samples). Pure SVG polyline,
// no deps (spec §9.2).
export function Sparkline({
	values,
	width = 56,
	height = 20,
}: {
	values: number[];
	width?: number;
	height?: number;
}) {
	if (values.length < 2) return null;

	const min = Math.min(...values);
	const max = Math.max(...values);
	const span = max - min || 1;
	const step = width / (values.length - 1);

	const points = values
		.map((v, i) => {
			const x = i * step;
			const y = height - ((v - min) / span) * height;
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(" ");

	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			className="overflow-visible"
			aria-hidden="true"
		>
			<polyline
				points={points}
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinejoin="round"
				strokeLinecap="round"
				className="text-cyan-300"
			/>
		</svg>
	);
}
