import { AuthPage } from "@/features/auth/auth-page"
import { RequireSession } from "@/features/auth/components/require-session"
import { DashboardPage } from "@/features/dashboard/dashboard-page"
import { MarketingPage } from "@/features/marketing/marketing-page"
import { WorkspacePage } from "@/features/workspace/workspace-page"

export function App() {
  const path = window.location.pathname
  if (path === "/auth") return <AuthPage />
  if (path === "/demo" || path.startsWith("/demo/")) return <DashboardPage />
  if (path === "/dashboard" || path.startsWith("/dashboard/"))
    return (
      <RequireSession>
        <WorkspacePage />
      </RequireSession>
    )
  return <MarketingPage />
}
