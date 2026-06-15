# Multi-Cloud Health Dashboard

**Live:** [multi-cloud-dash.marciosaraujo.workers.dev](https://multi-cloud-dash.marciosaraujo.workers.dev)

An edge-native infrastructure health dashboard that aggregates the public status
of critical cloud and SaaS providers into a single, fast, liquid-glass view.
Built with **React Router 7** (SSR), **TypeScript**, **Tailwind CSS 4**, and
**Cloudflare Workers**.

Instead of jumping between separate status pages, you get a global overview plus
per-provider and per-service detail — rendered at the edge, close to the user.

## Features

- **Overview** — global status across all providers with at-a-glance KPIs
  (healthy providers, impacted services, services up now).
- **Per-provider pages** (`/providers/:providerId`) — every monitored service for
  a provider with its current status.
- **Per-service detail** (`/services/:serviceId`) — latency, HTTP status,
  statuspage indicator, message, and the underlying endpoint.
- **Server-side rendering** on Cloudflare Workers with short edge caching, so the
  status you see reflects the current state rather than a stale snapshot.
- **Liquid-glass UI** — dark glassmorphism theme built with Tailwind CSS 4.

## Monitored providers

Cloudflare · Azure · Azure DevOps · GitHub · AWS · Oracle Cloud.

Two kinds of checks feed a normalized status model:

- **`status-api`** — parses the [statuspage.io](https://www.atlassian.com/software/statuspage)
  v2 indicator (Cloudflare, GitHub, Oracle) into `up` / `degraded` / `down`.
- **`http`** — measures HTTP status code and latency for providers without an
  open, unauthenticated status API (Azure, Azure DevOps, AWS).

Checks run in parallel with a 5s timeout, so one slow provider never blocks the
page. Results are cached ~60s in the Cloudflare Cache API.

> **Known limitation:** `http` checks measure the availability of a provider's
> public status page, not the real health of that cloud. Some pages block
> non-browser clients and may therefore report degraded/down. Authenticated
> health APIs (Azure Resource Health, AWS Health, etc.) are future work.

## Architecture

- **`app/lib/services.ts`** — static config: the `SERVICES` to monitor, the
  `PROVIDERS` list, and the `ServiceDefinition` / `ServiceHealth` types.
- **`app/lib/health-check.ts`** — `checkService` / `checkAll` run the fetches
  (timeout, custom `User-Agent`, `Promise.allSettled`) and normalize results;
  edge cache lives here.
- **`app/lib/metrics.ts`** — derives provider rollups and overview KPIs from
  `ServiceHealth[]`.
- **`app/routes/`** — route modules whose server-side loaders call the
  health-check functions. Routes are registered in `app/routes.ts`.
- **`workers/app.ts`** — Cloudflare Worker entry that hands requests to React
  Router's request handler.

## Tech stack

- React Router 7 (SSR, data loaders)
- TypeScript
- Tailwind CSS 4
- Cloudflare Workers (edge runtime) + Wrangler
- Vite

## Why this stack

**React Router 7** fits a status dashboard well:

- **Server-side data loaders** — each route fetches provider status on the
  server before rendering. The browser receives complete HTML with the data
  already in it; no loading spinners and no API keys shipped to the client.
- **One framework, server + client** — the same route module runs SSR and then
  hydrates for client-side navigation, so moving between providers is instant
  without full page reloads.
- **Type-safe routes** — generated route types (`./+types/*`) keep loader data,
  params, and components in sync at compile time.

**Cloudflare Workers** make deploy and operations simple:

- **One command to ship** — `npm run deploy` builds and pushes the Worker
  globally; there are no servers, containers, or scaling config to manage.
- **Runs at the edge** — rendering and the outbound status checks execute close
  to the user, and the built-in [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)
  provides the ~60s result cache without extra infrastructure.
- **Safe rollouts** — `wrangler versions upload` / `deploy` allow previewing a
  version and promoting (or gradually rolling out) it after verification.
- **Built-in observability** — Worker logs and metrics are available in the
  Cloudflare dashboard out of the box.

## Security

- **No secrets in the client** — all status checks run server-side in the
  Worker. The browser only receives rendered HTML, so no API keys or tokens are
  exposed.
- **Read-only, no user data** — the app only performs outbound `GET` requests to
  public status endpoints. It stores no user data and accepts no user input that
  reaches those requests.
- **Hardened outbound calls** — every check uses a 5s timeout and is wrapped in
  `Promise.allSettled`, so a hanging or hostile endpoint can't block rendering or
  crash the page.
- **Secrets, when added** — future authenticated checks should use
  [Wrangler secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
  (`wrangler secret put`), never committed to the repo. `.env` and `.dev.vars`
  are already gitignored.

## Local development

Requires Node.js (LTS) and npm.

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173` (Vite picks the next free port if it's
taken).

### Useful scripts

```bash
npm run typecheck   # regenerate Cloudflare types, then tsc -b
npm run lint        # ESLint
npm run format      # Prettier
npm run check       # typecheck + build + dry-run deploy
npm run cf-typegen  # regenerate binding types after editing wrangler.json
```

## Deployment

Deploys to Cloudflare Workers via Wrangler:

```bash
npm run build
npm run deploy
```

To ship a preview version and promote it after verification:

```bash
npx wrangler versions upload
npx wrangler versions deploy
```

## Roadmap

- Protected `/sre/internal` route with raw responses, logs, and internal checks.
- Historical storage (Cloudflare KV / D1) for real uptime over time and a
  24h/7d/30d range selector.
- Alerts / webhooks on status transitions (Slack, Teams, email).
- User-defined custom endpoints.

## License

MIT
