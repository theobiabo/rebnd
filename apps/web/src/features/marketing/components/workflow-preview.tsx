import { useState } from "react"
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  CircleCheck,
  FileCode2,
  GitFork,
  Radio,
  ShieldCheck,
  Workflow,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

function Status({
  children,
  muted = false,
}: {
  children: React.ReactNode
  muted?: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[9px] tracking-wide whitespace-nowrap",
        muted
          ? "border-border text-muted-foreground"
          : "border-primary/20 bg-primary/5 text-primary"
      )}
    >
      <span
        className={cn(
          "size-1 rounded-full",
          muted ? "bg-muted-foreground" : "bg-primary"
        )}
      />
      {children}
    </span>
  )
}

export function AppPreview({ onOpen }: { onOpen: () => void }) {
  const [tab, setTab] = useState("patch")
  const tabs = [
    { id: "change", label: "The change", icon: Radio },
    { id: "patch", label: "The patch", icon: FileCode2 },
    { id: "evidence", label: "The proof", icon: ShieldCheck },
  ]
  return (
    <div className="overflow-hidden rounded-none border-2 border-border bg-[#0d120f] shadow-[5px_5px_0_var(--border)]">
      <div className="flex items-center justify-between border-b bg-card px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3 text-xs">
          <GitFork className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            acme / <span className="text-foreground">billing-api</span>
          </span>
          <span className="hidden rounded border px-1.5 py-0.5 text-[9px] text-muted-foreground sm:block">
            PRIVATE
          </span>
        </div>
        <Status muted>ILLUSTRATIVE DEMO</Status>
      </div>
      <div className="grid lg:grid-cols-[235px_1fr]">
        <aside className="flex flex-col border-b bg-card/40 p-5 lg:border-r lg:border-b-0">
          <p className="eyebrow mb-5 text-muted-foreground">
            Protected workflow
          </p>
          <div className="mb-1 flex items-center gap-2 text-sm">
            <Workflow className="size-4 text-primary" />
            Subscription entitlement
          </div>
          <p className="mt-2 pl-6 text-[11px] leading-5 text-muted-foreground">
            Receive event → update access
          </p>
          <div className="mt-7 hidden space-y-6 lg:block">
            {[
              "Provider change detected",
              "Workflow impact mapped",
              "Target failure reproduced",
              "Focused patch verified",
            ].map((label, i) => (
              <div
                key={label}
                className="flex items-center gap-2.5 text-[11px]"
              >
                <CircleCheck className="size-3.5 text-primary/80" />
                <span
                  className={
                    i === 3 ? "text-foreground" : "text-muted-foreground"
                  }
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-auto hidden pt-8 lg:block">
            <div className="rounded-md border border-primary/15 bg-primary/5 p-3">
              <ShieldCheck className="mb-2 size-4 text-primary" />
              <p className="text-[11px]">Your assertions. Unchanged.</p>
              <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                sha256: 7d4a…e920
              </p>
            </div>
          </div>
        </aside>
        <div className="min-w-0">
          <div
            className="flex gap-1 border-b px-3 sm:px-5"
            role="tablist"
            aria-label="Explore the example repair"
          >
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                id={`tab-${id}`}
                role="tab"
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                tabIndex={tab === id ? 0 : -1}
                onClick={() => setTab(id)}
                onKeyDown={(event) => {
                  const index = tabs.findIndex((item) => item.id === id)
                  const next =
                    event.key === "ArrowRight"
                      ? (index + 1) % tabs.length
                      : event.key === "ArrowLeft"
                        ? (index + tabs.length - 1) % tabs.length
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? tabs.length - 1
                            : -1
                  if (next >= 0) {
                    event.preventDefault()
                    setTab(tabs[next]!.id)
                    document.getElementById(`tab-${tabs[next]!.id}`)?.focus()
                  }
                }}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-3 py-4 text-xs transition-colors sm:px-4",
                  tab === id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
          <div
            id={`panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            className="min-h-[278px]"
          >
            {tab === "patch" && (
              <>
                <div className="flex items-center justify-between border-b border-border/60 px-5 py-3 font-mono text-[10px]">
                  <span className="text-muted-foreground">
                    src/webhooks/subscription.ts
                  </span>
                  <span>
                    <span className="text-primary">+1</span>
                    <span className="ml-2 text-destructive">−1</span>
                  </span>
                </div>
                <div className="overflow-x-auto py-4">
                  <div className="min-w-[470px]">
                    <div
                      className="code-line text-muted-foreground"
                      data-line="18"
                    >
                      export async function handleSubscription(event) {"{"}
                    </div>
                    <div
                      className="code-line text-muted-foreground"
                      data-line="19"
                    >
                      {"  "}const subscription = event.data.object;
                    </div>
                    <div
                      className="code-line bg-destructive/8 text-destructive"
                      data-line="20"
                    >
                      − const id = subscription.subscription_id;
                    </div>
                    <div
                      className="code-line bg-primary/8 text-primary"
                      data-line="20"
                    >
                      + const id = subscription.subscription.id;
                    </div>
                    <div
                      className="code-line text-muted-foreground"
                      data-line="21"
                    >
                      {"  "}await updateEntitlement(id, event.id);
                    </div>
                    <div
                      className="code-line text-muted-foreground"
                      data-line="22"
                    >
                      {"}"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-5 pb-4 text-[10px] text-muted-foreground">
                  <Check className="size-3 text-primary" />1 file changed
                  <span className="mx-1 text-border">/</span>No assertion
                  changes
                </div>
              </>
            )}
            {tab === "change" && (
              <div className="space-y-5 p-5 sm:p-6">
                <div className="flex items-center gap-2 text-xs text-primary">
                  <Radio className="size-4" />A field moved. Your workflow is
                  affected.
                </div>
                <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                  In this hypothetical target contract, the subscription
                  identifier moves into a nested object. The existing handler
                  reads a field that is no longer present.
                </p>
                <div className="rounded-md border bg-muted/40 p-4 font-mono text-xs">
                  <span className="text-destructive">subscription_id</span>
                  <ArrowRight className="mx-3 inline size-3" />
                  <span className="text-primary">subscription.id</span>
                </div>
                <p className="text-[11px] leading-5 text-muted-foreground">
                  Source: synthetic demo contract · target-fixture-v2
                  <br />
                  This example does not describe an actual provider release.
                </p>
              </div>
            )}
            {tab === "evidence" && (
              <div className="p-5 sm:p-6">
                <p className="mb-5 text-sm">
                  Same assertions. Same target input. A different result.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      title: "Current baseline",
                      status: "3 / 3 pass",
                      pass: true,
                    },
                    {
                      title: "Target, unpatched",
                      status: "1 / 3 fail",
                      pass: false,
                    },
                    {
                      title: "Target, patched",
                      status: "3 / 3 pass",
                      pass: true,
                    },
                  ].map((result) => (
                    <div
                      key={result.title}
                      className="rounded-md border bg-card px-2 py-4 sm:px-3"
                    >
                      <p className="text-[10px] leading-4 text-muted-foreground">
                        {result.title}
                      </p>
                      <p
                        className={cn(
                          "mt-3 font-mono text-xs sm:text-sm",
                          result.pass ? "text-primary" : "text-destructive"
                        )}
                      >
                        {result.status}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex gap-2 text-[11px] text-muted-foreground">
                  <ShieldCheck className="size-4 shrink-0 text-primary" />
                  Assertion hash unchanged across all three comparisons.
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground">
                  Synthetic fixture results for demonstration, not a production
                  guarantee.
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-primary/[0.025] px-5 py-3.5">
            <span className="flex items-center gap-2 text-[11px] text-primary">
              <CheckCheck className="size-4" />
              Ready for human review
            </span>
            <button
              onClick={onOpen}
              className="flex items-center gap-2 text-[11px] hover:text-primary"
            >
              View example pull request
              <ArrowUpRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
