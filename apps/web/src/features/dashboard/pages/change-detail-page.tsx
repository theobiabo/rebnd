import { useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileCode2,
  GitPullRequest,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { PageHeading } from "@workspace/shared/components/page-heading"
import { ChangeBadge } from "../components/change-badge"
import { StatusBadge } from "@workspace/shared/components/status-badge"
import type { DashboardModel } from "../hooks/use-dashboard-model"

export function ChangeDetailPage({
  model,
  id,
}: {
  model: DashboardModel
  id: string
}) {
  const change = model.state.changes.find((item) => item.id === id)
  const [reason, setReason] = useState("")
  const [ignoring, setIgnoring] = useState(false)
  const [approved, setApproved] = useState(false)
  const [showPr, setShowPr] = useState(false)
  if (!change)
    return (
      <>
        <PageHeading
          eyebrow="Changes"
          title="Change not found."
          description="This change is not part of the current demo workspace."
        />
        <a href="/demo/changes" className="underline">
          Back to changes
        </a>
      </>
    )
  return (
    <>
      <a
        href="/demo/changes"
        className="mb-5 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        All changes
      </a>
      <PageHeading
        eyebrow={`${change.id} / ${change.kind}`}
        title={change.title}
        description="Subscription entitlement · acme/billing-api"
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <ChangeBadge status={change.status} />
        <StatusBadge>Target: {change.version}</StatusBadge>
        <span className="font-mono text-[10px] text-muted-foreground">
          {change.date} · base a8f2c91
        </span>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <div className="space-y-6">
          <section className="neo-panel">
            <h2 className="border-b-2 px-5 py-4 font-heading text-lg">
              01 / Source & applicability
            </h2>
            <div className="p-5">
              <StatusBadge tone="warning">
                Synthetic source · not an actual provider release
              </StatusBadge>
              <p className="mt-5 text-sm leading-7">{change.description}</p>
              <dl className="mt-5 space-y-3 border-t border-border/20 pt-5 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Source snapshot</dt>
                  <dd className="font-mono text-[10px]">
                    demo-contract-{change.version}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">
                    Applicable transition
                  </dt>
                  <dd className="font-mono text-[10px]">
                    fixture-v1 → {change.version}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Why this repository</dt>
                  <dd>Direct call in approved handler</dd>
                </div>
              </dl>
              <p className="mt-5 text-[11px] leading-6 text-muted-foreground">
                A real source record includes its official URL, version range,
                retrieval time, content hash, and source excerpt. No official
                notice is represented by this demo.
              </p>
            </div>
          </section>
          <section className="neo-panel">
            <h2 className="border-b-2 px-5 py-4 font-heading text-lg">
              02 / Supported code path
            </h2>
            <div className="p-5">
              <div className="flex items-start gap-3">
                <FileCode2 className="mt-0.5 size-4 shrink-0" />
                <div className="min-w-0">
                  <p className="font-mono text-xs break-all">
                    {change.file}:{change.line}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    At commit a8f2c91 · direct handler · shallow wrapper
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2 font-mono text-[10px]">
                <span className="border bg-background p-2">
                  event.data.object
                </span>
                <ArrowRight className="size-3" />
                <span className="border bg-background p-2">
                  handleSubscription
                </span>
                <ArrowRight className="size-3" />
                <span className="border bg-primary/25 p-2">
                  updateEntitlement
                </span>
              </div>
            </div>
          </section>
          {change.status === "Verified" && (
            <section className="neo-panel">
              <div className="flex items-center justify-between border-b-2 px-5 py-4">
                <h2 className="font-heading text-lg">03 / Focused candidate</h2>
                <span className="font-mono text-[10px]">1 file · +1 −1</span>
              </div>
              <div className="overflow-x-auto py-4 font-mono text-[11px]">
                <p className="min-w-max bg-[#242424] px-5 py-2 text-destructive">
                  − const id = subscription.subscription_id;
                </p>
                <p className="min-w-max bg-[#333333] px-5 py-2 text-[#e0e0e0]">
                  + const id = subscription.subscription.id;
                </p>
              </div>
              <a
                href="/demo/evidence"
                className="flex items-center justify-between border-t px-5 py-3 text-xs"
              >
                Inspect all three comparisons
                <ArrowRight className="size-4" />
              </a>
            </section>
          )}
        </div>
        <aside className="space-y-5">
          <section className="neo-panel neo-shadow">
            <div className="border-b-2 bg-secondary px-5 py-4">
              <h2 className="font-heading text-lg">The next decision</h2>
            </div>
            <div className="space-y-4 p-5">
              {change.status === "Blocked" ? (
                <>
                  <StatusBadge tone="negative">
                    Compatibility unverified
                  </StatusBadge>
                  <p className="text-xs leading-6">
                    {id === "CHG-023"
                      ? "Define cancellation ordering with the workflow owner and supply an authoritative target contract. Verification and publication remain blocked."
                      : "Supply a version-specific target fixture before verifying this change. The target is approved, but no evidence input is available. No patch was generated."}
                  </p>
                  <a
                    href="/demo/integration"
                    className="inline-block text-xs underline"
                  >
                    Review approved behavior
                  </a>
                </>
              ) : change.status === "Ignored" ? (
                <>
                  <p className="text-xs leading-6">
                    Ignored with reason: {change.reason}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => model.restoreChange(id)}
                    className="w-full"
                  >
                    Restore for review
                  </Button>
                </>
              ) : change.status === "Needs review" ? (
                <>
                  <p className="text-xs leading-6">
                    Approve target {change.version} within the existing workflow
                    scope. Assertions and permitted repair classes stay
                    unchanged.
                  </p>
                  <label className="flex items-start gap-2 border bg-background p-3 text-xs leading-5">
                    <input
                      type="checkbox"
                      className="mt-1 accent-[#d5d5d5]"
                      checked={approved}
                      onChange={(event) => setApproved(event.target.checked)}
                    />
                    I reviewed the target, assertions, allowed paths, and
                    execution policy.
                  </label>
                  <Button
                    className="h-10 w-full"
                    disabled={!approved}
                    onClick={() => model.approve(id)}
                  >
                    <Check />
                    Approve demo target
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs leading-6">
                    {change.status === "Verified"
                      ? "The example patch preserves all three assertions. Inspect the evidence before preparing a review."
                      : "The target is approved. Preview how comparative verification will be presented."}
                  </p>
                  {model.state.evidenceStale && (
                    <p className="text-xs text-destructive">
                      Inventory changed. Approve the current revision first.
                    </p>
                  )}
                  <Button
                    className="h-10 w-full"
                    disabled={
                      !model.state.execution ||
                      model.state.approvedRevision !== model.state.revision ||
                      !model.state.onboarded
                    }
                    onClick={() => model.previewRun(id)}
                  >
                    Preview verification
                  </Button>
                  {change.status === "Verified" && (
                    <Button
                      variant="outline"
                      className="h-10 w-full"
                      onClick={() => setShowPr(!showPr)}
                    >
                      <GitPullRequest />
                      {showPr ? "Hide PR package" : "Preview PR package"}
                    </Button>
                  )}
                </>
              )}
              {change.status !== "Ignored" && (
                <button
                  onClick={() => setIgnoring(!ignoring)}
                  className="text-[11px] text-muted-foreground underline"
                >
                  {ignoring ? "Cancel ignore" : "Ignore this change"}
                </button>
              )}
              {ignoring && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (reason.trim()) {
                      model.ignore(id, reason.trim())
                      setIgnoring(false)
                    }
                  }}
                >
                  <label className="field-label" htmlFor="ignore-reason">
                    Reason for ignoring
                  </label>
                  <textarea
                    id="ignore-reason"
                    required
                    minLength={3}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="field-input min-h-24"
                    placeholder="Explain why this change can wait…"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    className="mt-3 w-full"
                  >
                    Save reason & ignore
                  </Button>
                </form>
              )}
            </div>
          </section>
          <section className="border-2 bg-background p-5">
            <div className="flex items-center gap-2 text-xs font-medium">
              <ShieldCheck className="size-4" />
              Approved repair boundaries
            </div>
            <ul className="mt-4 space-y-3 text-[11px] text-muted-foreground">
              <li>Field mappings and explicit renames only</li>
              <li>Up to 5 source files / 200 source lines</li>
              <li>Only src/webhooks/subscription.ts</li>
              <li>No assertion or CI changes</li>
              <li>
                Publishing{" "}
                {model.state.publishing
                  ? "enabled in demo settings"
                  : "disabled"}{" "}
                · human merge
              </li>
            </ul>
          </section>
        </aside>
      </div>
      {showPr && (
        <section className="neo-panel mt-6 p-6">
          <StatusBadge>Preview only · not published</StatusBadge>
          <h2 className="mt-4 font-heading text-xl">
            fix: preserve subscription entitlement mapping
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Updates the nested subscription identifier in the approved handler.
            The synthetic target fails INV-001 before the patch and passes
            afterwards. Assertions and existing checks remain unchanged.
          </p>
          <a
            href="/demo/evidence"
            className="mt-4 inline-flex items-center gap-2 text-xs underline"
          >
            Review evidence package
            <ArrowRight className="size-3" />
          </a>
        </section>
      )}
    </>
  )
}
