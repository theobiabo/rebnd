import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  FileCheck2,
  GitBranch,
  GitPullRequest,
  Pause,
  Play,
  Radio,
  ShieldCheck,
  Workflow,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { PageHeading } from "@workspace/shared/components/page-heading"
import { StatusBadge } from "@workspace/shared/components/status-badge"
import { ChangesTable } from "../components/changes-table"
import type { DashboardModel } from "../hooks/use-dashboard-model"

export function OverviewPage({ model }: { model: DashboardModel }) {
  const { state } = model
  const needsReview = state.changes.filter(
    (change) => change.status === "Needs review"
  ).length
  const verified = state.changes.filter(
    (change) => change.status === "Verified"
  ).length
  return (
    <>
      <PageHeading
        eyebrow="Your workspace / 05 October 2026"
        title="Keep the connection."
        description="Everything your integration needs. Nothing it doesn’t."
        action={
          <Button
            className="h-10 gap-3 px-4 text-xs"
            disabled={
              !state.execution ||
              state.approvedRevision !== state.revision ||
              !state.onboarded
            }
            onClick={() => model.previewRun("CHG-024")}
          >
            <Play className="size-3.5" />
            Preview approved checks
          </Button>
        }
      />
      <div className="mb-7 grid grid-cols-2 border-2 bg-card lg:grid-cols-4">
        {[
          {
            label: "Protected workflows",
            value: state.onboarded ? "01" : "00",
            sub: "One repository. One workflow.",
            icon: Workflow,
          },
          {
            label: "Needs your review",
            value: String(needsReview).padStart(2, "0"),
            sub: "An engineer makes the call.",
            icon: GitPullRequest,
          },
          {
            label: "Verified examples",
            value: state.evidenceStale
              ? "00"
              : String(verified).padStart(2, "0"),
            sub: "Synthetic fixture evidence.",
            icon: FileCheck2,
          },
          {
            label: "Monitoring",
            value: state.monitoring
              ? state.freshness === "Fresh"
                ? "Active"
                : "Stale"
              : "Paused",
            sub: state.monitoring
              ? "Last checked 09:30 · daily cadence."
              : "New source checks paused.",
            icon: Radio,
          },
        ].map(({ label, value, sub, icon: Icon }, index) => (
          <div
            key={label}
            className={`relative px-5 py-5 ${index < 3 ? "lg:border-r" : ""} ${index < 2 ? "border-b lg:border-b-0" : ""} ${index % 2 === 0 ? "border-r" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
                {label}
              </p>
              <Icon className="size-3.5 text-muted-foreground" />
            </div>
            <p
              className={`mt-4 font-heading text-[34px] leading-none font-medium tracking-tight ${index === 1 ? "inline-block bg-secondary px-1.5" : ""}`}
            >
              {value}
            </p>
            <p className="mt-3 text-[10px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>
      <div className="mb-7 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
        <section className="neo-panel neo-shadow">
          <div className="flex items-center justify-between gap-3 border-b-2 px-5 py-4">
            <span className="eyebrow">Protected workflow / 001</span>
            <StatusBadge
              tone={
                state.onboarded && !state.evidenceStale ? "positive" : "warning"
              }
            >
              {state.evidenceStale
                ? "Approval needed"
                : state.onboarded
                  ? "Approved"
                  : "Scan only"}
            </StatusBadge>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center border-2 bg-secondary">
                <Workflow className="size-5" />
              </span>
              <div>
                <h2 className="font-heading text-xl font-medium">
                  Subscription entitlement
                </h2>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Receive an event. Update access exactly once.
                </p>
              </div>
            </div>
            <div className="my-6 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
              <div className="border bg-background px-2 py-3 text-center font-mono text-[9px]">
                WEBHOOK
              </div>
              <ArrowRight className="size-3 text-muted-foreground" />
              <div className="border bg-background px-2 py-3 text-center font-mono text-[9px]">
                HANDLER
              </div>
              <ArrowRight className="size-3 text-muted-foreground" />
              <div className="border bg-primary/25 px-2 py-3 text-center font-mono text-[9px]">
                ENTITLEMENT
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-4 border-t border-border/20 pt-4 text-[11px]">
              <div>
                <dt className="mb-1.5 text-muted-foreground">
                  Repository / base
                </dt>
                <dd className="flex items-center gap-1.5 font-mono text-[10px]">
                  <GitBranch className="size-3" />
                  billing-api · a8f2c91
                </dd>
              </div>
              <div>
                <dt className="mb-1.5 text-muted-foreground">SDK / contract</dt>
                <dd className="font-mono text-[10px]">
                  {state.inventoryVersion} / fixture-v1
                </dd>
              </div>
              <div>
                <dt className="mb-1.5 text-muted-foreground">
                  Approval revision
                </dt>
                <dd>rev {state.revision} · 3 fixed assertions</dd>
              </div>
              <div>
                <dt className="mb-1.5 text-muted-foreground">Evidence level</dt>
                <dd>
                  {state.evidenceStale
                    ? "Stale · reapproval needed"
                    : "Synthetic fixture demo"}
                </dd>
              </div>
            </dl>
          </div>
          <a
            href="/demo/integration"
            className="flex items-center justify-between border-t-2 bg-background px-5 py-3 text-xs hover:bg-primary/25"
          >
            Inspect integration
            <ArrowUpRight className="size-4" />
          </a>
        </section>
        <section className="dashboard-dither flex flex-col border-2 bg-[#222222]">
          <div className="flex items-center gap-2 border-b-2 px-5 py-4">
            <ShieldCheck className="size-4" />
            <span className="eyebrow">You’re in the loop</span>
          </div>
          <div className="flex flex-1 flex-col p-5">
            <p className="font-heading text-[26px] leading-tight font-medium">
              One change.
              <br />
              Your next decision.
            </p>
            <p className="mt-4 text-xs leading-6 text-muted-foreground">
              {needsReview
                ? "A new event schema sits outside your approved target. Review the scope before rebnd can verify it."
                : "Your review queue is clear. Inspect the evidence before taking the next step."}
            </p>
            <a
              href={
                needsReview
                  ? "/demo/changes/CHG-025"
                  : "/demo/evidence"
              }
              className="mt-5 inline-flex items-center gap-3 self-start border-b border-foreground pb-1 text-xs font-medium"
            >
              {needsReview ? "Review target change" : "Inspect evidence"}
              <ArrowUpRight className="size-4" />
            </a>
            <div className="mt-auto space-y-2 pt-7 text-[10px]">
              {[
                "No production credentials",
                "Assertions cannot be weakened",
                "You review and merge",
              ].map((text) => (
                <div key={text} className="flex items-center gap-2">
                  <Check className="size-3" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <ChangesTable changes={state.changes} compact />
      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
        <section className="neo-panel">
          <div className="flex items-center justify-between border-b-2 px-5 py-4">
            <h2 className="font-heading text-lg font-medium">
              The paper trail
            </h2>
            <a
              href="/demo/activity"
              aria-label="View full activity history"
            >
              <ArrowUpRight className="size-4" />
            </a>
          </div>
          <div className="px-5">
            {state.activity.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 border-b border-border/15 py-4 last:border-0"
              >
                <span className="mt-1.5 size-2 shrink-0 border bg-primary" />
                <div>
                  <p className="text-xs">{event.action}</p>
                  <p className="mt-1.5 text-[10px] leading-5 text-muted-foreground">
                    {event.detail}
                  </p>
                </div>
                <span className="ml-auto pt-0.5 font-mono text-[9px] text-muted-foreground">
                  {event.time}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="neo-panel">
          <div className="flex items-center gap-2 border-b-2 px-5 py-4">
            <Clock3 className="size-4" />
            <h2 className="font-heading text-lg font-medium">On your terms</h2>
          </div>
          <div className="px-5">
            {(["monitoring", "execution"] as const).map((key) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 border-b border-border/15 py-4"
              >
                <div>
                  <p className="text-xs capitalize">{key}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {state[key] ? "Active" : "Paused"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => model.toggle(key)}
                  aria-label={`${state[key] ? "Pause" : "Resume"} ${key}`}
                  className="gap-2 px-2 text-[10px]"
                >
                  {state[key] ? <Pause /> : <Play />}
                  {state[key] ? "Pause" : "Resume"}
                </Button>
              </div>
            ))}
            <a
              href="/demo/settings"
              className="flex items-center justify-between py-4 text-[11px]"
            >
              Limits & permissions
              <ChevronRight className="size-3" />
            </a>
          </div>
        </section>
      </div>
    </>
  )
}
