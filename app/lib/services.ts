export type ProviderId =
	| "cloudflare"
	| "azure"
	| "azure-devops"
	| "github"
	| "aws"
	| "oracle";

export type ServiceType = "status-api" | "http";

export interface ServiceDefinition {
	id: string;
	name: string;
	provider: ProviderId;
	type: ServiceType;
	url: string;
	description?: string;
}

export type ServiceStatus = "up" | "degraded" | "down" | "unknown";

export interface ServiceHealth {
	serviceId: string;
	name: string;
	provider: ProviderId;
	status: ServiceStatus;
	latencyMs: number | null;
	statusCode?: number;
	checkedAt: string; // ISO timestamp
	indicator?: string; // statuspage indicator: "none" | "minor" | "major" | "critical"
	message?: string;
}

export interface ProviderMeta {
	id: ProviderId;
	name: string;
}

export const PROVIDERS: ProviderMeta[] = [
	{ id: "cloudflare", name: "Cloudflare" },
	{ id: "azure", name: "Azure" },
	{ id: "azure-devops", name: "Azure DevOps" },
	{ id: "github", name: "GitHub" },
	{ id: "aws", name: "AWS" },
	{ id: "oracle", name: "Oracle Cloud" },
];

export const SERVICES: ServiceDefinition[] = [
	// Cloudflare
	{
		id: "cloudflare-global-status",
		name: "Cloudflare Global Status",
		provider: "cloudflare",
		type: "status-api",
		url: "https://www.cloudflarestatus.com/api/v2/status.json",
		description: "Cloudflare global incident indicator",
	},
	{
		id: "cloudflare-summary",
		name: "Cloudflare Summary",
		provider: "cloudflare",
		type: "status-api",
		url: "https://www.cloudflarestatus.com/api/v2/summary.json",
		description: "Cloudflare components, incidents and scheduled maintenance",
	},

	// Azure
	{
		id: "azure-status-page",
		name: "Azure Status Page",
		provider: "azure",
		type: "http",
		url: "https://status.azure.com/en-us/status",
		description: "HTTP check for Azure public status page",
	},

	// Azure DevOps
	{
		id: "azure-devops-portal",
		name: "Azure DevOps Portal",
		provider: "azure-devops",
		type: "http",
		url: "https://dev.azure.com",
		description: "HTTP check for Azure DevOps portal edge",
	},

	// GitHub
	{
		id: "github-api",
		name: "GitHub Public API",
		provider: "github",
		type: "http",
		url: "https://api.github.com",
		description: "HTTP check for GitHub REST API root endpoint",
	},
	{
		id: "github-status-page",
		name: "GitHub Status Page",
		provider: "github",
		type: "status-api",
		url: "https://www.githubstatus.com/api/v2/status.json",
		description: "GitHub global incident indicator",
	},

	// AWS
	{
		id: "aws-health-dashboard",
		name: "AWS Health Dashboard",
		provider: "aws",
		type: "http",
		url: "https://health.aws.amazon.com/health/status",
		description: "HTTP check for AWS Health Dashboard",
	},

	// Oracle Cloud
	{
		id: "oracle-status-components",
		name: "Oracle Cloud Status Components",
		provider: "oracle",
		type: "status-api",
		url: "https://ocistatus.oraclecloud.com/api/v2/status.json",
		description: "Oracle Cloud Infrastructure global status indicator",
	},
	{
		id: "oracle-status-page",
		name: "Oracle Cloud Status Page",
		provider: "oracle",
		type: "http",
		url: "https://ocistatus.oraclecloud.com/",
		description: "HTTP check for Oracle Cloud status page",
	},
];

export function getService(id: string): ServiceDefinition | undefined {
	return SERVICES.find((s) => s.id === id);
}

export function getServicesByProvider(
	provider: string,
): ServiceDefinition[] {
	return SERVICES.filter((s) => s.provider === provider);
}

export function getProvider(id: string): ProviderMeta | undefined {
	return PROVIDERS.find((p) => p.id === id);
}
