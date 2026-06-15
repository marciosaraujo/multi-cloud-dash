import type { ServiceHealth, ServiceStatus } from "./services";

// Worst status wins for any rollup.
const RANK: Record<ServiceStatus, number> = {
	up: 0,
	unknown: 1,
	degraded: 2,
	down: 3,
};

export function rollupStatus(items: ServiceHealth[]): ServiceStatus {
	if (items.length === 0) return "unknown";
	return items.reduce<ServiceStatus>(
		(worst, h) => (RANK[h.status] > RANK[worst] ? h.status : worst),
		"up",
	);
}

export interface StatusCounts {
	up: number;
	degraded: number;
	down: number;
	unknown: number;
	total: number;
}

export function countStatuses(items: ServiceHealth[]): StatusCounts {
	return {
		up: items.filter((h) => h.status === "up").length,
		degraded: items.filter((h) => h.status === "degraded").length,
		down: items.filter((h) => h.status === "down").length,
		unknown: items.filter((h) => h.status === "unknown").length,
		total: items.length,
	};
}

export function latestCheck(items: ServiceHealth[]): string | null {
	return items.reduce<string | null>(
		(latest, h) => (!latest || h.checkedAt > latest ? h.checkedAt : latest),
		null,
	);
}

export interface OverviewMetrics {
	totalProviders: number;
	totalServices: number;
	healthyProviders: number;
	impactedProviders: number;
	impactedServices: number;
	servicesUpPct: number; // 0–100, current snapshot (not historical uptime)
	lastUpdatedAt: string | null;
}

export function overviewMetrics(
	health: ServiceHealth[],
	providerIds: string[],
): OverviewMetrics {
	const healthyProviders = providerIds.filter((id) => {
		const items = health.filter((h) => h.provider === id);
		return items.length > 0 && rollupStatus(items) === "up";
	}).length;

	const counts = countStatuses(health);
	const impactedServices = counts.degraded + counts.down;

	return {
		totalProviders: providerIds.length,
		totalServices: health.length,
		healthyProviders,
		impactedProviders: providerIds.length - healthyProviders,
		impactedServices,
		servicesUpPct:
			counts.total > 0 ? Math.round((counts.up / counts.total) * 100) : 0,
		lastUpdatedAt: latestCheck(health),
	};
}
