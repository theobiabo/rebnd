# rebnd API

Hono on Node.js 22.18+ with PostgreSQL, Better Auth, shared Zod contracts, and a PostgreSQL-backed job outbox. The owner is the tenant boundary for the pilot. No app code executes inside the API or job worker.

## Local setup

From the repository root:

```sh
bun install
docker compose up -d postgres
cp apps/api/.env.example apps/api/.env
openssl rand -base64 32
```

Put the generated value in `BETTER_AUTH_SECRET`. Create a GitHub OAuth app with homepage `http://localhost:5173` and authorization callback `http://localhost:5173/api/auth/callback/github`. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `apps/api/.env`.

```sh
bun run db:migrate
bun run dev
```

Run the job worker in another terminal:

```sh
bun run worker
```

Open `http://localhost:5173/auth`. Use `localhost` consistently; `127.0.0.1` has a different cookie origin. Vite forwards `/api` to port 3000. `/health` checks the process; `/ready` checks database/schema availability. The API fails startup with field names when required configuration is missing.

The Compose password is for the local database only. Keep real credentials in environment variables or a secret manager. Production requires HTTPS, a managed PostgreSQL connection with certificate verification, and a reverse proxy serving `/api/*` through the web origin. Do not expose PostgreSQL publicly. Configure the edge to rate-limit unauthenticated traffic and pass only trusted client IP headers. Run database migrations before deploying the API and run the worker separately. `bun run build` compiles API, worker, and migration entrypoints; inside `apps/api`, production commands are `bun run db:migrate:production`, `bun run start`, and `bun run worker:start`.

## Authentication

`/api/auth/*` is handled by Better Auth. GitHub OAuth requests identity scopes only (`read:user`, `user:email`); it does not request repository access. Sign-in creates an account on the first successful callback. Email/password authentication and automatic account linking are disabled.

OAuth state and callback checks are enabled, tokens are encrypted at rest using the auth secret, and sessions live in PostgreSQL. Cookies are HttpOnly, SameSite=Lax, and Secure in production. Sessions last seven days with daily renewal; cookie session caching is disabled so server revocation is immediate. Sign-out deletes the session. Database-backed auth limits allow 60 requests per minute; authenticated control-plane limits allow 120 per owner per minute.

The frontend uses the same origin. Every control-plane mutation requires that exact `Origin`, JSON, `Idempotency-Key`, and `expectedRevision`. No user ID or owner ID supplied in a request body is trusted. Every resource query is scoped to the authenticated owner. Cross-owner resource IDs return 404.

## Optional Better Auth dashboard

Installations can connect to Better Auth Infrastructure using the included `dash()` server plugin and `dashClient()` client plugin. Set the server-only `BETTER_AUTH_API_KEY` to enable the connection; leave it blank to keep the cloud integration disabled. Do not prefix it with `VITE_` or commit it. Activity tracking is disabled by default.

Register the running server with base path `/api/auth` in the Better Auth dashboard. Localhost requires a temporary HTTPS tunnel; production should use the stable HTTPS application origin. Keep GitHub's callback set to the browser-facing app origin, independently of the dashboard's server connection URL. The local callback remains `http://localhost:5173/api/auth/callback/github`.

Connecting grants the Better Auth dashboard administrative access to auth users and sessions and enables authentication event reporting. Plugin endpoints require signed dashboard authorization; ordinary application sessions do not grant dashboard administrator access. Hono forwards all auth HTTP methods to Better Auth so dashboard operations reach the plugin's own authorization checks.

A temporary tunnel is a development connection and stops working when the tunnel or local API is stopped. No tunnel is launched automatically by this repository. GitHub login still uses `http://localhost:5173`; the tunnel URL is only the dashboard connection address. The configured cloud project is [Rebnd](https://dash.better-auth.com/rebnd) on the free Starter plan, and its development OAuth application is owned by `theobiabo`. Production setup requires a stable HTTPS origin and a separately registered production callback.

## API contract

All paths below are prefixed with `/api/v1`. Request and response types live in `packages/shared/src/contracts/api.ts`.

| Method | Path | Operation |
| --- | --- | --- |
| GET | `/installations` | List the owner's installations |
| POST | `/installations` | Create a scan-only installation |
| GET | `/installations/:id` | Read installation and current workflow |
| PATCH | `/installations/:id/settings` | Update pauses, budget, retention access window |
| POST | `/installations/:id/workflows` | Save a new immutable workflow revision |
| GET | `/installations/:id/workflows` | Read workflow history |
| POST | `/installations/:id/approvals` | Approve the exact workflow and artifact hash |
| POST | `/installations/:id/scans` | Request a read-only inventory scan |
| GET | `/installations/:id/changes` | List candidate changes |
| GET | `/installations/:id/changes/:changeId` | Read a change |
| POST | `/installations/:id/changes/:changeId/approve` | Approve a target within the approved workflow |
| POST | `/installations/:id/changes/:changeId/ignore` | Ignore with a reason |
| POST | `/installations/:id/changes/:changeId/restore` | Restore for review |
| POST | `/installations/:id/runs` | Request verification of an approved change |
| GET | `/installations/:id/runs` | List runs |
| GET | `/installations/:id/runs/:runId` | Read run state and blockers |
| POST | `/installations/:id/runs/:runId/cancel` | Cancel queued or running work |
| POST | `/installations/:id/runs/:runId/publish` | Evaluate publication gates; unavailable until publisher exists |
| GET | `/installations/:id/evidence` | List evidence with staleness |
| GET | `/installations/:id/evidence/:evidenceId/manifest` | Authorized, audited JSON download |
| GET | `/installations/:id/activity` | Read chronological audit history |
| POST | `/installations/:id/revoke` | Stop work and revoke an installation |

List endpoints accept `limit` (1–100; default 25) and `offset`. Responses contain `items` and `nextOffset`. The frontend shows the latest 25 entries per section.

Create an installation with `{ "name": "Billing", "repository": "owner/repository", "defaultBranch": "main", "expectedRevision": 0 }`. Subsequent mutations include the installation's latest revision. Header `Idempotency-Key` must be 16–128 alphanumeric, underscore, or hyphen characters; a UUID works.

A repeated key with the same normalized request returns the original response. Reusing it for different input returns 409. Owner-level transactional locking serializes mutations; stale revisions return 409 with the current installation/workflow in `error.details`. The audit event, state transition, idempotency response, and queued job commit together. Keys currently remain durable without automatic expiry.

Workflow creation requires a repository SHA, explicit source paths, provider/versions, assertion descriptions, assertion artifact SHA-256, check commands, and official HTTPS source URLs. Approval binds the exact revision and artifact hash. These are owner declarations, not scanner-verified findings. Saving a new revision cancels pending work, invalidates approval, and makes older evidence stale. No owner endpoint can create source findings, mark verification passed, or upload trusted evidence.

Errors use `{ "error": { "code", "message", "requestId", "details"? } }`. Validation errors are 422; authentication 401; origin failures 403; hidden/missing resources 404; state conflicts and capability blockers 409; rate limits 429. Requests are limited to 64 KiB. Responses containing workspace or session data are not cacheable.

## Jobs and capability boundaries

Each installation allows one active run, a configurable monthly allowance (20 by default), a 15-minute total deadline, and at most two infrastructure retries after the first attempt. Jobs use transactional inserts, leases, lease tokens, and `FOR UPDATE SKIP LOCKED`. Expired leases become eligible for redelivery. The worker polls once per second and processes one job at a time. Cancellation clears leases and prevents stale completion. Monitoring pause cancels scans; execution pause cancels all current work; revocation stops both. A worker transition increments the installation revision.

The first provider and authoritative target evidence source remain unselected in the product specification. Accordingly:

- GitHub OAuth authentication is implemented. Selected-repository access needs a separate GitHub App integration. Scan jobs finish as `blocked / GITHUB_APP_REQUIRED`; they never claim a successful scan.
- Verification requires a current approval, approved target change, and trusted evidence input hash. A queued verification blocks with `PROVIDER_ADAPTER_REQUIRED` until a provider adapter and isolated runner are implemented.
- Publication is always blocked. No branch, PR, merge, deployment, or provider mutation is performed. A future publisher must verify artifact hashes, comparative failures/passes, approved paths, base SHA, and deduplicate the remote PR before enabling this capability.
- Source monitoring, AST scanning, encrypted artifact storage, automatic retention deletion, provider execution, and trusted PR publication are not implemented. The retained-evidence setting currently controls download access, not physical deletion or backup expiry. Evidence is read-only through this API; trusted services will populate it in a later phase.

These blockers are intentional capability boundaries, not successful mock operations. The public `/demo` is a separate synthetic UI and cannot write to the API.

## Validation

```sh
bun run --cwd apps/api test
bun run --cwd apps/api typecheck
bun run --cwd apps/api lint
bun run build
```

Tests run PostgreSQL SQL through an isolated PGlite database without external credentials. They exercise real Better Auth sessions, a mocked GitHub OAuth round trip, cookie tampering/expiry, logout, callback/state protection, tenant isolation, idempotency, revision conflicts, immutable approvals, cancellation, blocked jobs, and audit pagination. GitHub network responses are mocked only inside the OAuth test; live credentials are still required for a real login.

## Layout

- `src/auth`: GitHub provider and persistent session configuration
- `src/config`: validated server environment
- `src/db`: connection lifecycle and checksum-verified migrations
- `src/http`: middleware, errors, and route composition
- `src/modules/installations`: tenant-scoped persistence and transactional commands
- `src/modules/jobs`: leased job processing and worker lifecycle
- `tests`: database and authentication integration tests

Better Auth schema migrations use the installed library's migration API. Application SQL migrations are ordered, transactional, and recorded with checksums. Do not edit an already-applied SQL migration; add the next numbered file.

References: [Better Auth GitHub setup](https://better-auth.com/docs/authentication/github), [Hono integration](https://better-auth.com/docs/integrations/hono), [GitHub OAuth scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps).

### GitHub App repository connections

GitHub sign-in remains a separate OAuth app. Register a private development GitHub App with homepage `http://localhost:5173` and setup URL `http://localhost:5173/dashboard/integration`. Enable redirect on update. Do not enable OAuth during installation. Keep SSL verification enabled. Grant Contents: read, Issues: read/write, and the mandatory Metadata: read permission. Installation and installation-repositories events are automatically delivered by GitHub; no additional event subscriptions are needed.

Set the webhook URL to a stable HTTPS endpoint ending in `/api/webhooks/github`. Configure a random webhook secret of at least 32 characters. Put `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `GITHUB_APP_PRIVATE_KEY`, and `GITHUB_APP_WEBHOOK_SECRET` in the server environment. Store the PEM as a quoted value with literal `\n` escapes; the client restores the newlines. Never use `VITE_` variables for these values or commit private keys. Run database migrations and restart both API and worker after changing environment variables.

From Integration, select Connect GitHub. Install on the personal account used for sign-in, choosing Only select repositories. The pilot deliberately rejects organization installations and all-repository access. A short-lived, single-use state is bound to the signed-in owner, and the server checks the installation account against the linked GitHub account ID. Repository selection comes from live GitHub installation access, not arbitrary names entered in the browser.

For notifications, supply an existing open issue or PR number in the integration’s repository and enable comments. Future worker run outcomes enter a durable outbox in the same transaction as the run status. The notification worker obtains a short-lived token restricted to that repository, checks current access, and posts a status comment. It retries failures with backoff up to five times and reconciles comments by a unique marker after ambiguous network failures. Disabling notifications cancels pending delivery. An already in-flight GitHub request may finish. Delivery status is shown in Integration and Settings. GitHub decides who receives email or inbox notifications according to subscriptions and user preferences.

Signed installation deletion/suspension webhooks revoke the connection and cancel pending notifications. Repository access is checked live before each delivery, including when a webhook is missed. Removed repositories become unavailable. Reconnect explicitly after restoring an installation. Existing manually scoped workspaces can use notifications only after the matching repository is granted to the App.

This connects repository access and run-status notifications. Provider-specific scanning, isolated verification, automatic issue creation and PR publishing are still separate adapters; a connection alone never marks a run as verified. Production needs a stable public webhook host and managed secrets; a temporary development tunnel is not a deployment.
