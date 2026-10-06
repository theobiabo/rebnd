import { useState, type ReactNode } from "react"
import {
  Activity,
  Boxes,
  FlaskConical,
  LayoutDashboard,
  Menu,
  Radio,
  Settings2,
  X,
} from "lucide-react"
import { Brand } from "@workspace/shared/components/brand"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { SignOutDialog } from "@/features/auth/components/sign-out-dialog"
import { authClient } from "@/lib/auth-client"

const navigation = [
  { title: "Overview", path: "/dashboard", icon: LayoutDashboard },
  { title: "Integration", path: "/dashboard/integration", icon: Boxes },
  { title: "Changes", path: "/dashboard/changes", icon: Radio },
  { title: "Evidence", path: "/dashboard/evidence", icon: FlaskConical },
  { title: "Activity", path: "/dashboard/activity", icon: Activity },
  { title: "Settings", path: "/dashboard/settings", icon: Settings2 },
]
export function WorkspaceShell({
  children,
  name,
  repository,
}: {
  children: ReactNode
  name?: string
  repository?: string
}) {
  const { data } = authClient.useSession()
  const [open, setOpen] = useState(false)
  const current = window.location.pathname.replace(/\/$/, "")
  return (
    <div className="dashboard-theme dashboard-canvas min-h-dvh bg-background text-foreground">
      <a
        href="#workspace-main"
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-card focus:p-4"
      >
        Skip to workspace
      </a>
      {open && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-black/70 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r-2 border-border bg-card lg:visible lg:translate-x-0",
          open ? "visible translate-x-0" : "invisible -translate-x-full"
        )}
      >
        <div className="flex h-[76px] items-center justify-between border-b border-border px-6">
          <Brand />
          <button
            aria-label="Close navigation"
            className="lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mx-4 my-6 border border-border p-3">
          <p className="truncate text-sm">{name ?? "Your workspace"}</p>
          <p className="mt-2 font-mono text-[9px] text-muted-foreground">
            OWNER / PILOT
          </p>
        </div>
        <nav className="space-y-1 px-3" aria-label="Workspace navigation">
          {navigation.map(({ title, path, icon: Icon }) => (
            <a
              key={path}
              href={path}
              aria-current={current === path ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 border px-3 py-3 text-xs",
                current === path
                  ? "border-border bg-secondary"
                  : "border-transparent text-muted-foreground hover:bg-secondary"
              )}
            >
              <Icon className="size-4" />
              {title}
            </a>
          ))}
        </nav>
        <div className="mt-auto p-5">
          <p className="truncate text-xs">{data?.user.name}</p>
          <p className="mt-1 truncate text-[10px] text-muted-foreground">
            {data?.user.email}
          </p>
          <SignOutDialog />
        </div>
      </aside>
      <div className="lg:pl-56">
        <header className="flex h-[76px] items-center justify-between gap-3 border-b-2 border-border bg-card px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </Button>
            <span className="truncate text-xs text-muted-foreground">
              {repository ?? "Set up your first integration"}
            </span>
          </div>
          <span className="shrink-0 border border-border px-2 py-1 font-mono text-[9px]">
            PRIVATE WORKSPACE
          </span>
        </header>
        <main
          id="workspace-main"
          className="mx-auto max-w-6xl px-5 py-8 sm:px-8"
        >
          {children}
          <footer className="mt-12 border-t border-border pt-5 font-mono text-[9px] text-muted-foreground">
            REBND / HUMAN REVIEW, ALWAYS.
          </footer>
        </main>
      </div>
    </div>
  )
}
