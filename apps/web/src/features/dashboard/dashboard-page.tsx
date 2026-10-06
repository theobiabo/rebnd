import { DashboardShell } from "./components/dashboard-shell"
import { ChangesTable } from "./components/changes-table"
import { PageHeading } from "@workspace/shared/components/page-heading"
import { useDashboardModel } from "./hooks/use-dashboard-model"
import { ActivityPage } from "./pages/activity-page"
import { ChangeDetailPage } from "./pages/change-detail-page"
import { EvidencePage } from "./pages/evidence-page"
import { IntegrationPage } from "./pages/integration-page"
import { OnboardingPage } from "./pages/onboarding-page"
import { OverviewPage } from "./pages/overview-page"
import { SettingsPage } from "./pages/settings-page"

export function DashboardPage() {
  const model = useDashboardModel()
  const path = window.location.pathname.replace(/\/$/, "")
  const content =
    path === "/demo" ? (
      <OverviewPage model={model} />
    ) : path === "/demo/changes" ? (
      <>
        <PageHeading
          eyebrow="Change inbox / approved sources"
          title="Upstream changes. In context."
          description="Review applicability, verify impact, and keep a reason for every decision."
        />
        <ChangesTable changes={model.state.changes} />
      </>
    ) : path.startsWith("/demo/changes/") ? (
      <ChangeDetailPage
        id={decodeURIComponent(path.split("/").pop() ?? "")}
        model={model}
      />
    ) : path === "/demo/evidence" ? (
      <EvidencePage model={model} />
    ) : path === "/demo/integration" ? (
      <IntegrationPage model={model} />
    ) : path === "/demo/activity" ? (
      <ActivityPage model={model} />
    ) : path === "/demo/settings" ? (
      <SettingsPage model={model} />
    ) : path === "/demo/onboarding" ? (
      <OnboardingPage model={model} />
    ) : (
      <>
        <PageHeading
          eyebrow="404 / Workspace"
          title="That page isn’t here."
          description="Return to your workspace to review the current integration."
        />
        <a href="/demo" className="underline">
          Back to overview
        </a>
      </>
    )
  return <DashboardShell model={model}>{content}</DashboardShell>
}
