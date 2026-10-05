# rebnd

An integration maintenance product interface built with React, TypeScript, Vite, Tailwind CSS, and shared shadcn components.

## Development

```sh
bun install
bun run dev
bun run build
bun run lint
bun run typecheck
```

## Structure

```text
apps/web/src/
  App.tsx                         Route entry point
  features/auth/                 Sign-in, sign-up, and password reset UI
  features/marketing/            Homepage and product demonstration
    components/                  Workflow preview and marketing dialogs
  features/dashboard/
    components/                  Dashboard shell, change table, and domain-specific UI
    pages/                       Overview, changes, inventory, evidence,
                                 activity, settings, and onboarding
    hooks/                       Local workspace state and actions
    data/                        Explicit synthetic demonstration fixtures
    types.ts                     Local dashboard state types
packages/shared/src/
  components/                    Brand, page heading, and status badge
  providers/                     Reusable theme provider
  types/                         Shared integration and activity contracts
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

The homepage lives at `/`. The auth preview lives at `/auth`, with `?mode=signup` and `?mode=reset` variants. These forms validate input but do not authenticate, send email, or store credentials. The dashboard starts at `/dashboard`; its child routes are `/changes`, `/changes/:id`, `/integration`, `/evidence`, `/activity`, `/settings`, and `/onboarding`.

The web host must serve `index.html` for application routes. Vite provides this fallback during development and preview.

## Interface scope

The dashboard is a frontend demo. All provider changes, repositories, versions, source records, and verification results are synthetic. Actions persist under `rebnd-dashboard-demo-v1` in browser local storage. Settings includes a confirmed reset action.

Monitoring and execution pause independently. Target approval is explicit, missing evidence blocks verification, ignored changes can be restored, and inventory or check-command edits invalidate evidence. The current revision must be approved before a new example verification can be produced.

No GitHub connection, provider polling, code execution, PR publication, authentication, or backend service is implemented. A production implementation must enforce every permission and evidence gate server-side.

## Visual system

Funnel Display for headings, Geist for interface text, hard borders, square controls, and restrained offset shadows. The marketing page keeps its acid-lime accent (`#c8f46b`) and dark dither artwork. The dashboard has a separate monochrome theme: layered charcoal work surfaces, off-white primary buttons, and a dark navigation rail. Subtle grayscale dither textures sit behind the workspace and next-action panel. Status labels and border treatments distinguish outcomes without color.
