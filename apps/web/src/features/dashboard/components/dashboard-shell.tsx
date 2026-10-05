import { useEffect, useState } from "react"
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  Boxes,
  ChevronDown,
  CircleHelp,
  FlaskConical,
  GitBranch,
  LayoutDashboard,
  Menu,
  Radio,
  Settings2,
  Workflow,
  X,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { Brand } from "@workspace/shared/components/brand"
import type { DashboardModel } from "../hooks/use-dashboard-model"

const navigation = [
  { label: "Overview", path: "/dashboard", icon: LayoutDashboard },
  { label: "Changes", path: "/dashboard/changes", icon: Radio },
  { label: "Integration", path: "/dashboard/integration", icon: Boxes },
  { label: "Evidence", path: "/dashboard/evidence", icon: FlaskConical },
  { label: "Activity", path: "/dashboard/activity", icon: Activity },
]

export function DashboardShell({
  children,
  model,
}: {
  children: React.ReactNode
  model: DashboardModel
}) {
  const [menu, setMenu] = useState(false)
  const path = window.location.pathname.replace(/\/$/, "")
  const current =
    navigation.find((item) =>
      item.path === "/dashboard"
        ? path === item.path
        : path.startsWith(item.path)
    )?.label ?? (path.includes("onboarding") ? "Setup" : "Settings")
  useEffect(() => {
    document.title = `${current} — rebnd`
  }, [current])
  const pending = model.state.changes.filter(
    (change) => change.status === "Needs review"
  ).length
  return (
    <div className="dashboard-theme dashboard-canvas min-h-dvh bg-background text-foreground">
      <a
        href="#dashboard-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-primary focus:p-3"
      >
        Skip to dashboard
      </a>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[224px] flex-col overflow-y-auto border-r-2 border-[#2a2a2a] bg-[#141414] text-[#ececec] transition-transform lg:visible lg:translate-x-0",
          menu ? "visible translate-x-0" : "invisible -translate-x-full"
        )}
      >
        <div className="flex h-[76px] items-center justify-between border-b border-white/15 px-6">
          <Brand />
          <button
            onClick={() => setMenu(false)}
            aria-label="Close navigation"
            className="lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mx-4 mt-6 border border-white/20 p-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center border border-primary bg-primary font-heading text-lg font-semibold text-primary-foreground">
              a.
            </span>
            <div>
              <p className="text-xs font-medium">Acme workspace</p>
              <p className="mt-1 font-mono text-[9px] text-white/45">
                PILOT / DEMO
              </p>
            </div>
            <ChevronDown className="ml-auto size-3 text-white/40" />
          </div>
        </div>
        <p className="eyebrow mt-8 mb-3 px-6 text-white/35">Workspace</p>
        <nav aria-label="Dashboard navigation" className="space-y-1 px-3">
          {navigation.map(({ label, path: href, icon: Icon }) => {
            const active =
              href === "/dashboard" ? path === href : path.startsWith(href)
            return (
              <a
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 border px-3 py-3 text-xs transition-colors",
                  active
                    ? "border-[#737373] bg-[#303030] text-[#eeeeee] shadow-[3px_3px_0_#050505]"
                    : "border-transparent text-white/65 hover:border-white/15 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="size-4" strokeWidth={1.7} />
                {label}
                {label === "Changes" && pending > 0 && (
                  <span
                    className={cn(
                      "ml-auto px-1.5 py-0.5 font-mono text-[9px]",
                      active ? "bg-black/10" : "bg-[#353535] text-[#eeeeee]"
                    )}
                  >
                    {pending}
                  </span>
                )}
              </a>
            )
          })}
        </nav>
        <div className="mt-auto px-4 pb-5">
          <div className="mb-5 border border-white/15 p-3">
            <div className="flex items-center gap-2 text-[11px]">
              <Workflow className="size-3.5 text-primary" />
              One workflow. Full context.
            </div>
            <p className="mt-2 text-[10px] leading-5 text-white/45">
              Your assertions stay yours.
              <br />
              Your team decides what ships.
            </p>
            <a
              href="/dashboard/onboarding"
              className="mt-3 flex items-center justify-between text-[10px] text-primary"
            >
              Review setup
              <ArrowUpRight className="size-3" />
            </a>
          </div>
          <a
            href="/dashboard/settings"
            className={cn(
              "mb-1 flex items-center gap-3 p-3 text-xs",
              current === "Settings"
                ? "bg-[#353535] text-[#eeeeee]"
                : "text-white/65 hover:text-white"
            )}
          >
            <Settings2 className="size-4" />
            Settings
          </a>
          <a
            href="/#questions"
            className="flex items-center gap-3 p-3 text-xs text-white/65 hover:text-white"
          >
            <CircleHelp className="size-4" />
            Help & product scope
            <ArrowUpRight className="ml-auto size-3" />
          </a>
          <div className="mt-4 flex items-center gap-3 border-t border-white/15 pt-5">
            <span className="flex size-8 items-center justify-center border border-white/25 font-mono text-xs">
              YO
            </span>
            <div>
              <p className="text-xs">Your workspace</p>
              <p className="mt-1 text-[10px] text-white/40">
                Owner · local demo
              </p>
            </div>
            <a
              href="/"
              aria-label="Back to homepage"
              className="ml-auto text-white/50"
            >
              <ArrowDownLeft className="size-4" />
            </a>
          </div>
        </div>
      </aside>
      {menu && (
        <button
          aria-label="Close navigation overlay"
          onClick={() => setMenu(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}
      <div className="lg:pl-[224px]">
        <header className="flex h-[76px] items-center justify-between gap-3 border-b-2 bg-card px-5 sm:px-8">
          <div className="flex items-center gap-3 text-xs">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenu(true)}
              aria-label="Open dashboard navigation"
              className="lg:hidden"
            >
              <Menu />
            </Button>
            <GitBranch className="hidden size-4 text-muted-foreground sm:block" />
            <span className="hidden text-muted-foreground sm:inline">
              acme / billing-api
            </span>
            <span className="hidden text-muted-foreground/50 sm:inline">/</span>
            <span>{current}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="border border-border bg-secondary px-2 py-1 font-mono text-[9px] tracking-wide">
              DEMO WORKSPACE
            </span>
            <a
              href="/#how-it-works"
              aria-label="Read how rebnd works"
              className="text-muted-foreground hover:text-foreground"
            >
              <BookOpen className="size-4" />
            </a>
          </div>
        </header>
        <main
          id="dashboard-main"
          className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9 xl:px-10"
        >
          {model.notice && (
            <div
              role="status"
              className="mb-5 flex items-start justify-between gap-4 border border-border bg-primary/30 p-3 text-xs leading-5"
            >
              <span>{model.notice}</span>
              <button
                onClick={() => model.setNotice("")}
                aria-label="Dismiss notification"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
          {children}
          <footer className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-border/20 pt-5 font-mono text-[9px] text-muted-foreground">
            <span>REBND / HUMAN REVIEW, ALWAYS.</span>
            <span>Synthetic demo data · no repository connected</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
