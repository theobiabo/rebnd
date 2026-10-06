# rebnd

An integration maintenance application with a React frontend, Hono/Node.js control plane, PostgreSQL persistence, and GitHub authentication.

## Development

Configure the database and GitHub OAuth credentials using [the API setup guide](apps/api/README.md) before starting the full application.

```sh
bun install
bun run dev
bun run build
bun run lint
bun run typecheck
bun run test
```

## Structure

```text
apps/web/src/
  App.tsx                         Route entry point
  features/auth/                 GitHub sign-in and session protection
  features/workspace/            API-backed private workspace
  lib/                           Auth and API clients
  features/marketing/            Homepage and product demonstration
    components/                  Workflow preview and marketing dialogs
  features/dashboard/            Public synthetic demo
    components/                  Dashboard shell, change table, and domain-specific UI
    pages/                       Overview, changes, inventory, evidence,
                                 activity, settings, and onboarding
    hooks/                       Local workspace state and actions
    data/                        Explicit synthetic demonstration fixtures
    types.ts                     Local dashboard state types
apps/api/src/
  auth/                          Better Auth configuration
  config/                        Validated environment
  db/                            PostgreSQL connections and migrations
  http/                          API routes and middleware
  modules/                       Installation commands and leased jobs
packages/shared/src/
  components/                    Brand, page heading, and status badge
  providers/                     Reusable theme provider
  types/                         Shared demo integration types
  contracts/                     Shared API validation and response types
  examples/                      Shared synthetic workflow assertions
  utils/                         Browser JSON download helper
packages/ui/src/
  components/                    Shared shadcn primitives
  styles/globals.css             Color, typography, border, and theme tokens
```

## Package boundaries

Apps consume reusable application components and contracts from `@workspace/shared` through explicit package exports. Shared code can depend on `@workspace/ui`, but neither package imports app code. Feature-specific state, screens, and fixtures remain under the app's feature folders. Low-level shadcn components stay in `@workspace/ui`.

```tsx
import { Brand } from "@workspace/shared/components/brand"
import { PageHeading } from "@workspace/shared/components/page-heading"
import { StatusBadge } from "@workspace/shared/components/status-badge"
import type { Change } from "@workspace/shared/types/integration"
```

The shared package exports TypeScript source for the app bundler, matching the existing UI package. Bun links the workspace dependency, Turbo includes its lint and typecheck tasks, and the UI stylesheet explicitly scans shared components for Tailwind classes. No app alias points into the shared package's source tree.

## Routes

The homepage lives at `/`. `/auth` uses GitHub social authentication. `/dashboard` and its integration, changes, evidence, activity, and settings routes require a valid server session and read/write PostgreSQL through the API.

`/demo` retains the synthetic example workspace, including the existing change-detail and onboarding screens. Its actions remain local to the browser and never mutate a real installation.

The web host must serve `index.html` for application routes and proxy `/api/*` to the backend. Vite handles both during development. Use `http://localhost:5173` consistently with the configured OAuth callback.

## Implementation scope

The control plane implements tenant-scoped installation management, immutable workflow revisions, exact-hash approval, candidate review, run requests/cancellation, evidence reads, audit history, and persistent GitHub sessions. Mutations enforce revisions and idempotency keys. Shared contracts live under `packages/shared`.

Repository scanning needs a separate selected-repository GitHub App. Provider adapters, source monitoring, isolated execution, artifact storage, retention deletion, and trusted PR publishing remain capability blockers. The API never converts missing infrastructure into verified evidence or a fake PR. See [API contracts and setup](apps/api/README.md) for endpoints, configuration, and explicit limitations.

## Visual system

Funnel Display for headings, Geist for interface text, hard borders, square controls, and restrained offset shadows. The marketing page keeps its acid-lime accent (`#c8f46b`) and dark dither artwork. The dashboard has a separate monochrome theme: layered charcoal work surfaces, off-white primary buttons, and a dark navigation rail. Subtle grayscale dither textures sit behind the workspace and next-action panel. Status labels and border treatments distinguish outcomes without color.
