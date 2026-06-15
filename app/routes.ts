import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("providers/:providerId", "routes/provider.tsx"),
	route("services/:serviceId", "routes/service.tsx"),
	route("about", "routes/about.tsx"),
] satisfies RouteConfig;
