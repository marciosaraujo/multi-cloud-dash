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
  statuspage indicator, message, the underlying endpoint, plus a **30-day uptime
  bar**, **latency sparkline**, real uptime %, and a "degraded since" badge.
- **History & persistence** — a cron trigger records every check into Cloudflare
  KV (live snapshot + 31 days of daily aggregates), so uptime is measured over
  time rather than invented. See below.
- **Server-side rendering** on Cloudflare Workers with short edge caching, so the
  status you see reflects the current state rather than a stale snapshot.
- **JSON API** — `/api/state` and `/api/history` expose the raw KV data.
- **Liquid-glass UI** — dark glassmorphism theme built with Tailwind CSS 4.

## Monitored providers

Cloudflare · Azure · Azure DevOps · GitHub · AWS · Oracle Cloud.

Two kinds of checks feed a normalized status model:

- **`status-api`** — parses the [statuspage.io](https://www.atlassian.com/software/statuspage)
  v2 indicator (Cloudflare, GitHub, Oracle) into `up` / `degraded` / `down`.
- **`http`** — measures HTTP status code and latency for providers without an
  open, unauthenticated status API (Azure, Azure DevOps, AWS).

Checks run with a 5s timeout and at most 6 concurrent outbound connections (the
Workers free-tier limit), so one slow provider never blocks the page. Results
are cached ~60s in the Cloudflare Cache API.

**Status model is deliberately conservative:** a timeout, DNS error, rate limit
(`429`) or `5xx` maps to `unknown` — a loss of visibility — **never `down`**.
Only a provider's own status API declaring `critical` yields `down`. Uptime is
**strict**: only fully operational counts as available.

> **Known limitation:** `http` checks measure the availability of a provider's
> public status page, not the real health of that cloud. Some pages block
> non-browser clients and may therefore report degraded/unknown. Authenticated
> health APIs (Azure Resource Health, AWS Health, etc.) are future work.

## Architecture

- **`app/lib/services.ts`** — static config: the `SERVICES` to monitor, the
  `PROVIDERS` list, and the `ServiceDefinition` / `ServiceHealth` types.
- **`app/lib/health-check.ts`** — `checkService` / `checkAll` run the fetches
  (5s timeout, custom `User-Agent`, 6-way concurrency cap) and normalize results;
  edge cache lives here.
- **`app/lib/history.ts`** — Workers KV persistence: `recordChecks` folds a round
  of checks into the live snapshot and flushes daily aggregates; `readState` /
  `readHistory` feed the loaders.
- **`app/lib/metrics.ts`** — derives provider rollups and overview KPIs from
  `ServiceHealth[]`.
- **`app/routes/`** — route modules whose server-side loaders call the
  health-check and history functions. Routes are registered in `app/routes.ts`.
- **`workers/app.ts`** — Cloudflare Worker entry: hands requests to React
  Router's request handler, and runs `scheduled()` on the cron trigger.

### History & persistence

A cron trigger (`*/5 * * * *`, UTC) runs the same checks every 5 minutes and
writes to a single KV namespace (`HEALTH_KV`), two keys only:

- **`state:current`** — live snapshot, overwritten each cycle (~288 writes/day):
  status, latency ring (for the sparkline), `degradedSince`, and the running
  daily tally.
- **`history:daily`** — rolling **31-day** aggregates per service (uptime %,
  worst status, avg/p95 latency), written **once per UTC-day rollover** so the
  whole thing stays at ~289 writes/day — well under the free-tier 1,000/day cap.

Days with no data render grey, not green — real systems have blind spots. The
namespace is created once, by hand (control-plane, not idempotent):

```bash
npx wrangler kv namespace create HEALTH_KV --update-config
npx wrangler kv namespace create HEALTH_KV --preview --update-config
npm run cf-typegen   # types env.HEALTH_KV
```

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

The repo is connected to Cloudflare's Git integration, so a push to `main`
deploys automatically (cron trigger included). To deploy by hand instead:

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
- A 24h / 7d / 30d / 90d range selector over the stored history.
- Public incident timeline from the providers' Atlassian status feeds.
- Alerts / webhooks on status transitions (Slack, Teams, email).
- User-defined custom endpoints.

## License

MIT
