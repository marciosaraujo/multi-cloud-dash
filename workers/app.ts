import { createRequestHandler } from "react-router";
import { checkAll } from "~/lib/health-check";
import { recordChecks } from "~/lib/history";
import { SERVICES } from "~/lib/services";

declare module "react-router" {
	export interface AppLoadContext {
		cloudflare: {
			env: Env;
			ctx: ExecutionContext;
		};
	}
}

const requestHandler = createRequestHandler(
	() => import("virtual:react-router/server-build"),
	import.meta.env.MODE,
);

export default {
	fetch(request, env, ctx) {
		return requestHandler(request, {
			cloudflare: { env, ctx },
		});
	},
	// Cron (*/5 UTC): run the existing checks and fold them into KV state.
	async scheduled(_event, env, _ctx) {
		const results = await checkAll(SERVICES);
		await recordChecks(env, results);
	},
} satisfies ExportedHandler<Env>;
