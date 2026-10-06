import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import type { WorkspaceModel } from "../hooks/use-workspace"
import type { ChangeRecord } from "@workspace/shared/contracts/api"

export function OverviewPanel({ model }: { model: WorkspaceModel }) {
  const data = model.data!
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Workflow", data.workflow?.definition.name ?? "Not configured"],
          [
            "Approval",
            data.workflow?.approvedAt
              ? `Revision ${data.workflow.number}`
              : "Review required",
          ],
          [
            "Monitoring",
            data.installation.monitoringLastSuccessAt
              ? new Date(
                  data.installation.monitoringLastSuccessAt
                ).toLocaleString()
              : "No successful scan",
          ],
        ].map(([label, value]) => (
          <div key={label} className="border-2 border-border bg-card p-5">
            <p className="eyebrow text-muted-foreground">{label}</p>
            <p className="mt-4 text-sm">{value}</p>
          </div>
        ))}
      </div>
      <section className="border-2 border-border bg-card p-6">
        <p className="eyebrow text-muted-foreground">
          Next step / selected repository
        </p>
        <h2 className="mt-4 font-heading text-2xl">
          {data.installation.repository}
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
          Define the workflow and review its exact approval contract. Scanning
          requires a separate GitHub App connection; your sign-in grants no
          repository permissions.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button render={<a href="/dashboard/integration" />}>
            Review workflow
          </Button>
          <Button
            variant="outline"
            disabled={model.busy || data.installation.monitoringPaused}
            onClick={() => void model.execute(`${model.base}/scans`)}
          >
            Request scan
          </Button>
        </div>
      </section>
      <RunsPanel model={model} />
    </div>
  )
}
export function RunsPanel({ model }: { model: WorkspaceModel }) {
  const runs = model.data!.runs
  return (
    <section className="border border-border bg-card">
      <div className="border-b border-border p-5">
        <h2 className="text-sm">Recent runs</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Latest 25 requests · refresh to see worker updates
        </p>
      </div>
      {runs.length ? (
        runs.map((run) => (
          <div
            key={run.id}
            className="border-b border-border p-5 last:border-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm capitalize">
                {run.kind} · {run.status}
              </p>
              <time className="text-xs text-muted-foreground">
                {new Date(run.createdAt).toLocaleString()}
              </time>
            </div>
            {run.reason && (
              <p className="mt-3 text-xs leading-6 text-muted-foreground">
                {run.reason}
              </p>
            )}
            {["queued", "running"].includes(run.status) && (
              <Button
                className="mt-3"
                variant="outline"
                disabled={model.busy}
                onClick={() =>
                  void model.execute(`${model.base}/runs/${run.id}/cancel`, {
                    reason: "Cancelled by the owner from the workspace.",
                  })
                }
              >
                Cancel run
              </Button>
            )}
          </div>
        ))
      ) : (
        <p className="p-6 text-sm text-muted-foreground">
          No runs requested yet.
        </p>
      )}
    </section>
  )
}
function ChangeCard({
  change,
  model,
}: {
  change: ChangeRecord
  model: WorkspaceModel
}) {
  const [reason, setReason] = useState("")
  return (
    <article className="border border-border bg-card p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="text-sm">{change.title}</h2>
        <span className="font-mono text-[10px] uppercase">
          {change.status.replaceAll("_", " ")}
        </span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Target {change.targetVersion} ·{" "}
        {change.reason ?? "Review applicability before execution."}
      </p>
      <a
        href={
          /^https:\/\//.test(change.sourceUrl) ? change.sourceUrl : undefined
        }
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-xs underline"
      >
        Official source
      </a>
      <div className="mt-5 flex flex-wrap gap-3">
        {change.status === "ignored" ? (
          <Button
            disabled={model.busy}
            variant="outline"
            onClick={() =>
              void model.execute(`${model.base}/changes/${change.id}/restore`)
            }
          >
            Restore for review
          </Button>
        ) : (
          <>
            <Button
              disabled={model.busy}
              onClick={() =>
                void model.execute(`${model.base}/changes/${change.id}/approve`)
              }
            >
              Approve target
            </Button>
            <Button
              disabled={model.busy || change.status !== "ready"}
              variant="outline"
              onClick={() =>
                void model.execute(`${model.base}/runs`, {
                  changeId: change.id,
                })
              }
            >
              Request verification
            </Button>
          </>
        )}
      </div>
      {change.status !== "ignored" && (
        <form
          className="mt-5 flex flex-wrap gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void model.execute(`${model.base}/changes/${change.id}/ignore`, {
              reason,
            })
          }}
        >
          <input
            aria-label="Reason for ignoring change"
            required
            minLength={3}
            maxLength={1000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason for ignoring this change"
            className="min-w-0 flex-1 border border-border bg-background px-3 py-2 text-xs"
          />
          <Button disabled={model.busy} type="submit" variant="outline">
            Ignore
          </Button>
        </form>
      )}
    </article>
  )
}
export function ChangesPanel({ model }: { model: WorkspaceModel }) {
  return (
    <div className="space-y-4">
      {model.data!.changes.length ? (
        model.data!.changes.map((change) => (
          <ChangeCard key={change.id} change={change} model={model} />
        ))
      ) : (
        <EmptyPanel
          title="No candidate changes yet."
          description="Monitoring has not established a successful scan. This does not mean your integration is up to date."
        />
      )}
    </div>
  )
}
export function EvidencePanel({ model }: { model: WorkspaceModel }) {
  return (
    <div className="space-y-4">
      {model.data!.evidence.length ? (
        model.data!.evidence.map((item) => (
          <article key={item.id} className="border border-border bg-card p-5">
            <h2 className="text-sm">
              {item.level.replaceAll("_", " ")} ·{" "}
              {item.stale ? "Stale approval" : "Current approval"}
            </h2>
            <p className="my-3 text-xs text-muted-foreground">
              Run {item.runId}
            </p>
            <a
              className="text-xs underline"
              href={`/api/v1${model.base}/evidence/${item.id}/manifest`}
            >
              Download reproduction manifest
            </a>
          </article>
        ))
      ) : (
        <EmptyPanel
          title="Evidence starts with a verified run."
          description="No evidence has been produced. Provider adapters and isolated execution must be configured before compatibility can be evaluated."
        />
      )}
    </div>
  )
}
export function ActivityPanel({ model }: { model: WorkspaceModel }) {
  return (
    <section className="border border-border bg-card">
      {model.data!.activity.map((item) => (
        <article
          key={item.id}
          className="border-b border-border p-5 last:border-0"
        >
          <div className="flex flex-wrap justify-between gap-3">
            <h2 className="text-xs">{item.action}</h2>
            <time className="text-[11px] text-muted-foreground">
              {new Date(item.createdAt).toLocaleString()}
            </time>
          </div>
          <p className="mt-3 text-xs leading-6 break-words text-muted-foreground">
            {item.detail}
          </p>
        </article>
      ))}
    </section>
  )
}
export function SettingsPanel({ model }: { model: WorkspaceModel }) {
  const installation = model.data!.installation
  return (
    <section className="border-2 border-border bg-card p-6">
      <h2 className="font-heading text-2xl">Your boundaries.</h2>
      {(["monitoringPaused", "executionPaused"] as const).map((key) => (
        <div
          key={key}
          className="mt-6 flex items-center justify-between gap-4 border-b border-border pb-6"
        >
          <div>
            <p className="text-sm">
              {key === "monitoringPaused" ? "Monitoring" : "Execution"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {installation[key] ? "Paused" : "Enabled"}
            </p>
          </div>
          <Button
            disabled={model.busy}
            variant="outline"
            onClick={() =>
              void model.execute(
                `${model.base}/settings`,
                { [key]: !installation[key] },
                "PATCH"
              )
            }
          >
            {installation[key] ? "Resume" : "Pause"}
          </Button>
        </div>
      ))}
      <p className="mt-6 text-xs leading-7 text-muted-foreground">
        Publishing is disabled until the separate trusted publisher is
        configured. Current allowance: {installation.monthlyRunLimit} runs per
        calendar month. Evidence access window:{" "}
        {installation.evidenceRetentionDays} days.
      </p>
    </section>
  )
}
export function EmptyPanel({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <section className="border-2 border-border bg-card p-8">
      <h2 className="font-heading text-2xl">{title}</h2>
      <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
        {description}
      </p>
    </section>
  )
}
