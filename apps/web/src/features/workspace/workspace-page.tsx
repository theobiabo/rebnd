import { useEffect } from "react"
import { Button } from "@workspace/ui/components/button"
import { PageHeading } from "@workspace/shared/components/page-heading"
import { useWorkspace } from "./hooks/use-workspace"
import { WorkspaceShell } from "./components/workspace-shell"
import { InstallationForm } from "./components/installation-form"
import { WorkflowForm } from "./components/workflow-form"
import {
  ActivityPanel,
  ChangesPanel,
  EmptyPanel,
  EvidencePanel,
  OverviewPanel,
  SettingsPanel,
} from "./components/workspace-panels"

const headings: Record<string, [string, string]> = {
  overview: [
    "Keep the connection.",
    "Your integration, approvals, and next steps in one place.",
  ],
  integration: [
    "One workflow. Your rules.",
    "Version the inventory and approve the exact behavior that matters.",
  ],
  changes: [
    "Upstream changes. In context.",
    "Review changes against your selected workflow and target version.",
  ],
  evidence: [
    "Evidence you can inspect.",
    "Reproducible results, tied to the workflow revision you approved.",
  ],
  activity: [
    "Every decision, recorded.",
    "Recent workspace activity and immutable approval history.",
  ],
  settings: [
    "Set the boundaries.",
    "Control monitoring and execution independently.",
  ],
}
export function WorkspacePage() {
  const model = useWorkspace()
  const section =
    window.location.pathname.replace(/\/$/, "").split("/")[2] ?? "overview"
  const heading = headings[section] ?? [
    "That page isn’t here.",
    "Return to the overview to continue.",
  ]
  const title = heading[0]
  useEffect(() => {
    document.title = `${title} — rebnd`
  }, [title])
  const content = !model.data ? (
    <InstallationForm model={model} />
  ) : section === "overview" ? (
    <OverviewPanel model={model} />
  ) : section === "integration" || section === "onboarding" ? (
    <WorkflowForm key={model.data.workflow?.id ?? "new"} model={model} />
  ) : section === "changes" ? (
    <ChangesPanel model={model} />
  ) : section === "evidence" ? (
    <EvidencePanel model={model} />
  ) : section === "activity" ? (
    <ActivityPanel model={model} />
  ) : section === "settings" ? (
    <SettingsPanel model={model} />
  ) : (
    <EmptyPanel
      title="Page not found."
      description="Use the workspace navigation to continue."
    />
  )
  return (
    <WorkspaceShell
      name={model.data?.installation.name}
      repository={model.data?.installation.repository}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <PageHeading
          eyebrow="Workspace / owner"
          title={heading[0]}
          description={heading[1]}
        />
        <Button
          variant="outline"
          disabled={model.busy || model.loading}
          onClick={() => void model.refresh()}
        >
          Refresh
        </Button>
      </div>
      {model.error && (
        <p
          role="alert"
          className="mb-6 border border-border bg-card p-4 text-sm leading-6"
        >
          {model.error}
        </p>
      )}
      {model.notice && (
        <p
          role="status"
          className="mb-6 border border-border bg-card p-4 text-xs"
        >
          {model.notice}
        </p>
      )}
      {model.loading ? (
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      ) : model.error && !model.data ? (
        <Button onClick={() => void model.refresh()}>Retry connection</Button>
      ) : (
        content
      )}
    </WorkspaceShell>
  )
}
