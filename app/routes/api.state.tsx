import type { Route } from "./+types/api.state";
import { readState } from "~/lib/history";

// Live snapshot as JSON — lets the page poll "updated Ns ago" without a reload.
export async function loader({ context }: Route.LoaderArgs) {
	const state = await readState(context.cloudflare.env);
	return Response.json(state ?? {});
}
