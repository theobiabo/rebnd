import { AuthPage } from "@/features/auth/auth-page"
import { DashboardPage } from "@/features/dashboard/dashboard-page"
import { MarketingPage } from "@/features/marketing/marketing-page"

export function App() {
  if (window.location.pathname === "/auth") return <AuthPage />

  return window.location.pathname.startsWith("/dashboard") ? (
    <DashboardPage />
  ) : (
    <MarketingPage />
  )
}
