import { useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileCode2,
  GitBranch,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { PageHeading } from "@workspace/shared/components/page-heading"
import { subscriptionAssertions as assertions } from "@workspace/shared/examples/subscription"
import type { DashboardModel } from "../hooks/use-dashboard-model"

const steps = [
  "Repository",
  "Read-only scan",
  "Inventory",
  "Workflow",
  "Assertions",
  "Approval",
]
export function OnboardingPage({ model }: { model: DashboardModel }) {
  const [step, setStep] = useState(0)
  const [consent, setConsent] = useState(false)
  const [complete, setComplete] = useState(false)
  return (
    <>
      <PageHeading
        eyebrow="Installation / guided setup"
        title="Start with a clear boundary."
        description="One repository. One workflow. Explicit approval at every meaningful step."
      />
      <ol className="mb-7 grid grid-cols-3 border-2 bg-card lg:grid-cols-6">
        {steps.map((label, index) => (
          <li
            key={label}
            className={`flex items-center gap-2 border-r border-border/20 px-3 py-4 text-[10px] ${index === step ? "bg-secondary font-medium" : "text-muted-foreground"}`}
          >
            <span className="font-mono">
              {index < step ? <Check className="size-3" /> : `0${index + 1}`}
            </span>
            {label}
          </li>
        ))}
      </ol>
      <section className="neo-panel mx-auto max-w-3xl">
        <div className="border-b-2 px-6 py-5">
          <p className="eyebrow mb-2 text-muted-foreground">
            Step {step + 1} / 6
          </p>
          <h2 className="font-heading text-2xl">
            {complete
              ? model.state.onboarded
                ? "Workflow approval saved."
                : "Scan-only mode saved."
              : steps[step]}
          </h2>
        </div>
        <div className="min-h-[290px] space-y-5 p-6">
          {complete ? (
            <>
              <div className="flex size-12 items-center justify-center border-2 bg-secondary">
                <Check className="size-6" />
              </div>
              <p className="text-sm leading-7">
                Revision {model.state.revision} is approved in this browser. You
                can inspect the inventory and preview comparative verification
                from the dashboard.
              </p>
              <p className="text-xs leading-6 text-muted-foreground">
                This setup is illustrative. No GitHub permission was requested,
                no repository was scanned, and no checks were executed.
              </p>
              <Button render={<a href="/demo" />} className="h-10 px-4">
                Open dashboard
                <ArrowRight />
              </Button>
            </>
          ) : (
            <>
              {step === 0 && (
                <>
                  <p className="text-sm leading-7 text-muted-foreground">
                    The GitHub integration will request read access to only the
                    selected repository. Write access is a separate, optional
                    permission.
                  </p>
                  <div className="flex items-center gap-3 border-2 bg-primary/20 p-4">
                    <GitBranch className="size-5" />
                    <div>
                      <p className="text-sm">acme / billing-api</p>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                        PRIVATE · EXAMPLE REPOSITORY
                      </p>
                    </div>
                    <Check className="ml-auto size-4" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Demo selection only. No external account connection is made.
                  </p>
                </>
              )}
              {step === 1 && (
                <>
                  <p className="text-sm leading-7 text-muted-foreground">
                    Review the static scan summary. Repository code is not
                    executed during discovery.
                  </p>
                  {[
                    "Manifest and lockfile located",
                    "TypeScript / Node.js 22 detected",
                    "Direct SDK import mapped",
                    "One workflow entrypoint proposed",
                  ].map((text) => (
                    <p key={text} className="flex items-center gap-3 text-xs">
                      <Check className="size-4 text-[#c5c5c5]" />
                      {text}
                    </p>
                  ))}
                  <p className="border-t pt-4 font-mono text-[10px]">
                    Base commit: a8f2c91 · synthetic scan result
                  </p>
                </>
              )}
              {step === 2 && (
                <>
                  <p className="text-sm leading-7 text-muted-foreground">
                    Confirm declared and resolved versions before approving the
                    inventory.
                  </p>
                  <dl className="space-y-4 text-xs">
                    {[
                      ["Provider", "Example subscription API"],
                      ["SDK declared", "^1.8.0"],
                      ["SDK resolved", model.state.inventoryVersion],
                      ["Current contract", "fixture-v1"],
                      ["Target contract", "fixture-v2"],
                    ].map(([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between border-b border-border/15 pb-3"
                      >
                        <dt className="text-muted-foreground">{key}</dt>
                        <dd className="font-mono">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
              {step === 3 && (
                <>
                  <h3 className="font-heading text-xl">
                    Subscription entitlement
                  </h3>
                  <p className="text-sm leading-7 text-muted-foreground">
                    A valid subscription event updates local access exactly
                    once. Direct SDK calls and shallow wrappers are the
                    supported boundary.
                  </p>
                  <div className="flex items-start gap-3 border bg-background p-4">
                    <FileCode2 className="size-4 shrink-0" />
                    <p className="font-mono text-xs break-all">
                      src/webhooks/subscription.ts:18
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ordering and cancellation behavior require separate owner
                    decisions.
                  </p>
                </>
              )}
              {step === 4 && (
                <>
                  {assertions.map((assertion) => (
                    <div
                      key={assertion.id}
                      className="border bg-background p-4"
                    >
                      <p className="flex items-center gap-2 text-sm">
                        <ShieldCheck className="size-4" />
                        {assertion.name}
                      </p>
                      <p className="mt-2 text-xs leading-6 text-muted-foreground">
                        {assertion.detail}
                      </p>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    The generator cannot weaken, skip, or replace this approved
                    bundle.
                  </p>
                </>
              )}
              {step === 5 && (
                <>
                  <dl className="space-y-3 text-xs">
                    {[
                      ["Target", "fixture-v2"],
                      [
                        "Allowed edits",
                        "Field mappings in the approved handler",
                      ],
                      ["Repair limits", "5 files / 200 source lines"],
                      ["Existing checks", model.state.checks],
                      ["Network", "Approved package retrieval only"],
                      [
                        "Execution",
                        "Isolated, synthetic fixtures, no production access",
                      ],
                      ["Publishing", "Disabled · separate permission required"],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="grid grid-cols-[105px_1fr] gap-3"
                      >
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="leading-5 break-words">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <label className="flex items-start gap-3 border-2 bg-primary/20 p-4 text-xs leading-6">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(event) => setConsent(event.target.checked)}
                      className="mt-1.5 accent-[#d5d5d5]"
                    />
                    I approve these assertions, paths, limits, and target for
                    the demo workflow revision.
                  </label>
                </>
              )}
            </>
          )}
        </div>
        {!complete && (
          <div className="flex flex-wrap justify-between gap-3 border-t-2 bg-background p-5">
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
            >
              <ArrowLeft />
              Back
            </Button>
            {step === 5 ? (
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    model.update(
                      { onboarded: false, execution: false, publishing: false },
                      "Scan-only mode saved",
                      "Execution and publishing are disabled"
                    )
                    setComplete(true)
                  }}
                >
                  Keep scan-only
                </Button>
                <Button
                  disabled={!consent}
                  onClick={() => {
                    model.update(
                      {
                        onboarded: true,
                        execution: true,
                        publishing: false,
                        approvedRevision: model.state.revision,
                      },
                      "Workflow revision approved",
                      `Revision ${model.state.revision} · existing evidence must be rerun after inventory changes`
                    )
                    setComplete(true)
                  }}
                >
                  Approve workflow
                  <Check />
                </Button>
              </div>
            ) : (
              <Button onClick={() => setStep(step + 1)}>
                Continue
                <ArrowRight />
              </Button>
            )}
          </div>
        )}
      </section>
    </>
  )
}
