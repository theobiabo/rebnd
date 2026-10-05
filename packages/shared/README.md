# @workspace/shared

Reusable rebnd application components, providers, types, examples, and browser utilities. Applications import only the public subpaths defined in `package.json`.

| Export                      | Purpose                                                      |
| --------------------------- | ------------------------------------------------------------ |
| `components/brand`          | Shared rebnd wordmark                                        |
| `components/password-field` | Labeled password input with an accessible visibility toggle  |
| `components/page-heading`   | Page title, description, and action layout                   |
| `components/status-badge`   | Presentation for semantic status tones                       |
| `providers/theme-provider`  | Optional theme provider and `useTheme` hook                  |
| `types/integration`         | Change, status, and activity types                           |
| `examples/subscription`     | Synthetic subscription assertions used by both product demos |
| `utils/download-json`       | Download JSON from a browser event handler                   |

Keep route navigation, feature state, and application-specific business rules in the consuming app. Use `@workspace/ui` for shadcn primitives. This package must not import from `apps/` or depend on app aliases.

React is a peer dependency. Source is consumed directly by the app bundler; there is no separate compiled distribution. Run `bun run lint` and `bun run typecheck` in this package, or run the same commands from the repository root to verify all workspaces.
