import type { Route } from "./+types/api.history";
import { readHistory } from "~/lib/history";

// Daily aggregates as JSON.
export async function loader({ context }: Route.LoaderArgs) {
	const history = await readHistory(context.cloudflare.env);
	return Response.json(history);
}
