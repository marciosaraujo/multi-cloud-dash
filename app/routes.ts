import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("providers/:providerId", "routes/provider.tsx"),
	route("services/:serviceId", "routes/service.tsx"),
	route("about", "routes/about.tsx"),
	route("api/state", "routes/api.state.tsx"),
	route("api/history", "routes/api.history.tsx"),
] satisfies RouteConfig;
