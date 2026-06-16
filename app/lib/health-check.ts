import type {
	ServiceDefinition,
	ServiceHealth,
	ServiceStatus,
} from "./services";

const TIMEOUT_MS = 5000;
const CACHE_TTL_S = 60;
const USER_AGENT = "multi-cloud-dash/1.0 (+health-check)";

// statuspage.io v2 status.json schema (Cloudflare, GitHub, Oracle, ...)
interface StatuspageStatus {
	status?: {
		indicator?: "none" | "minor" | "major" | "critical" | string;
		description?: string;
	};
}

function indicatorToStatus(indicator: string | undefined): ServiceStatus {
	switch (indicator) {
		case "none":
			return "up";
		case "minor":
		case "major":
			return "degraded";
		case "critical":
			return "down";
		default:
			return "unknown";
	}
}

function httpCodeToStatus(code: number): ServiceStatus {
	if (code >= 200 && code < 400) return "up";
	// 429 (rate limit) and 5xx are loss-of-visibility, not provider downtime —
	// they map to UNKNOWN, never DOWN (spec §6). Other 4xx is degraded.
	if (code === 429 || code >= 500) return "unknown";
	if (code >= 400) return "degraded";
	return "unknown";
}

async function runCheck(def: ServiceDefinition): Promise<ServiceHealth> {
	const checkedAt = new Date().toISOString();
	const start = Date.now();

	const base: ServiceHealth = {
		serviceId: def.id,
		name: def.name,
		provider: def.provider,
		status: "unknown",
		latencyMs: null,
		checkedAt,
	};

	try {
		const res = await fetch(def.url, {
			headers: {
				"User-Agent": USER_AGENT,
				Accept:
					def.type === "status-api" ? "application/json" : "text/html,*/*",
			},
			signal: AbortSignal.timeout(TIMEOUT_MS),
			redirect: "follow",
		});
		const latencyMs = Date.now() - start;

		if (def.type === "status-api") {
			let indicator: string | undefined;
			let message: string | undefined;
			try {
				const data = (await res.json()) as StatuspageStatus;
				indicator = data.status?.indicator;
				message = data.status?.description;
			} catch {
				// Unparseable body: fall back to the HTTP code.
			}
			return {
				...base,
				status: indicator
					? indicatorToStatus(indicator)
					: httpCodeToStatus(res.status),
				latencyMs,
				statusCode: res.status,
				indicator,
				message,
			};
		}

		return {
			...base,
			status: httpCodeToStatus(res.status),
			latencyMs,
			statusCode: res.status,
		};
	} catch (err) {
		const latencyMs = Date.now() - start;
		const message =
			err instanceof Error && err.name === "TimeoutError"
				? `Timed out after ${TIMEOUT_MS}ms`
				: err instanceof Error
					? err.message
					: "Unknown error";
		// Timeout / DNS / connection errors are loss-of-visibility, not confirmed
		// downtime — UNKNOWN, never DOWN (spec §6). Only a provider's own status
		// API reporting "critical" yields DOWN.
		return { ...base, status: "unknown", latencyMs: null, message };
	}
}

// Cache a health result in the edge Cache API for CACHE_TTL_S seconds.
// Keyed by serviceId via a synthetic request URL.
function cacheKey(serviceId: string): Request {
	return new Request(
		`https://health-cache.internal/service/${encodeURIComponent(serviceId)}`,
	);
}

// `caches.default` is a Cloudflare Workers extension not present in the DOM
// CacheStorage type, so reach it through a narrow local interface.
interface EdgeCacheStorage {
	default: Cache;
}

function edgeCache(): Cache | undefined {
	if (typeof caches === "undefined") return undefined;
	return (caches as unknown as Partial<EdgeCacheStorage>).default;
}

export async function checkService(
	def: ServiceDefinition,
): Promise<ServiceHealth> {
	const cache = edgeCache();
	const key = cacheKey(def.id);

	if (cache) {
		const hit = await cache.match(key);
		if (hit) {
			return (await hit.json()) as ServiceHealth;
		}
	}

	const health = await runCheck(def);

	if (cache) {
		const body = new Response(JSON.stringify(health), {
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": `max-age=${CACHE_TTL_S}`,
			},
		});
		await cache.put(key, body);
	}

	return health;
}

// Workers free tier allows only 6 simultaneous outbound connections per
// invocation (spec §7), so cap concurrency rather than fan out all at once.
const MAX_CONCURRENCY = 6;

async function mapLimit<T, R>(
	items: T[],
	limit: number,
	fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
	const out: PromiseSettledResult<R>[] = new Array(items.length);
	let next = 0;
	async function worker() {
		while (next < items.length) {
			const i = next++;
			try {
				out[i] = { status: "fulfilled", value: await fn(items[i]) };
			} catch (reason) {
				out[i] = { status: "rejected", reason };
			}
		}
	}
	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, worker),
	);
	return out;
}

export async function checkAll(
	defs: ServiceDefinition[],
): Promise<ServiceHealth[]> {
	const results = await mapLimit(defs, MAX_CONCURRENCY, (d) =>
		checkService(d),
	);
	return results.map((r, i) =>
		r.status === "fulfilled"
			? r.value
			: {
					serviceId: defs[i].id,
					name: defs[i].name,
					provider: defs[i].provider,
					status: "unknown" as const,
					latencyMs: null,
					checkedAt: new Date().toISOString(),
					message: "Check failed unexpectedly",
				},
	);
}
