import { useState } from "react"
import { FileCode2, LockKeyhole, Save, ShieldCheck } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { PageHeading } from "@workspace/shared/components/page-heading"
import { StatusBadge } from "@workspace/shared/components/status-badge"
import { subscriptionAssertions as assertions } from "@workspace/shared/examples/subscription"
import type { DashboardModel } from "../hooks/use-dashboard-model"

export function IntegrationPage({ model }: { model: DashboardModel }) {
  const [version, setVersion] = useState(model.state.inventoryVersion)
  return (
    <>
      <PageHeading
        eyebrow="Integration / selected repository"
        title="Know what you’re protecting."
        description="A versioned inventory for one deliberately bounded workflow."
        action={
          <Button
            render={<a href="/dashboard/onboarding" />}
            variant="outline"
            className="h-10 px-4 text-xs"
          >
            Review setup
          </Button>
        }
      />
      <section className="neo-panel mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 bg-primary/25 px-5 py-4">
          <h2 className="font-heading text-xl">acme / billing-api</h2>
          <StatusBadge
            tone={model.state.evidenceStale ? "warning" : "positive"}
          >
            {model.state.evidenceStale
              ? "Review required"
              : "Approved inventory"}
          </StatusBadge>
        </div>
        <div className="grid gap-6 p-5 md:grid-cols-2">
          <dl className="space-y-4 text-xs">
            {[
              ["Provider", "Example subscription API"],
              ["Runtime", "TypeScript / Node.js 22"],
              ["Base commit", "a8f2c91"],
              ["Workflow", "Subscription entitlement"],
              ["Contract pin", "fixture-v1 · declared"],
              ["Target version", "fixture-v2 · approved"],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-wrap justify-between gap-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (version.trim() !== model.state.inventoryVersion)
                model.update(
                  {
                    inventoryVersion: version.trim(),
                    evidenceStale: true,
                    revision: model.state.revision + 1,
                  },
                  "Inventory updated; evidence marked stale",
                  "Review and approve the new workflow revision before execution"
                )
            }}
            className="border bg-background p-4"
          >
            <label htmlFor="sdk-version" className="field-label">
              Resolved SDK version
            </label>
            <input
              id="sdk-version"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              required
              maxLength={40}
              className="field-input"
            />
            <p className="mt-3 text-[11px] leading-6 text-muted-foreground">
              Declared pin: ^1.8.0 · packages/billing/package.json:14
              <br />
              Resolved from pnpm-lock.yaml:82. Editing the inventory invalidates
              dependent evidence.
            </p>
            <Button
              type="submit"
              variant="outline"
              className="mt-4 px-3 text-xs"
              disabled={version.trim() === model.state.inventoryVersion}
            >
              <Save />
              Save inventory revision
            </Button>
          </form>
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="neo-panel">
          <h2 className="border-b-2 px-5 py-4 font-heading text-lg">
            Supported source paths
          </h2>
          <div className="space-y-5 p-5">
            {[
              ["Entrypoint", "src/webhooks/subscription.ts:18"],
              ["Shallow wrapper", "src/services/entitlements.ts:34"],
              ["Manifest", "packages/billing/package.json:14"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="mb-2 text-[10px] text-muted-foreground">
                  {label}
                </p>
                <p className="flex items-start gap-2 font-mono text-[11px] break-all">
                  <FileCode2 className="size-3.5 shrink-0" />
                  {value}
                </p>
              </div>
            ))}
            <p className="border-t border-border/20 pt-4 text-[11px] leading-6 text-muted-foreground">
              Mapped at a8f2c91. Dynamic loading, reflection, generated clients,
              and deep cross-service paths are outside the supported scope.
            </p>
          </div>
        </section>
        <section className="neo-panel">
          <div className="flex items-center justify-between border-b-2 px-5 py-4">
            <h2 className="font-heading text-lg">Approved behavior</h2>
            <LockKeyhole className="size-4" />
          </div>
          <div className="divide-y divide-border/15 px-5">
            {assertions.map((item) => (
              <div key={item.id} className="py-4">
                <p className="flex items-center gap-2 text-xs">
                  <ShieldCheck className="size-3.5" />
                  {item.name}
                  <span className="ml-auto font-mono text-[9px] text-muted-foreground">
                    {item.id}
                  </span>
                </p>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
          <div className="border-t bg-background px-5 py-3 font-mono text-[10px]">
            Approval revision {model.state.revision} · hash demo-7d4ae920
          </div>
        </section>
      </div>
    </>
  )
}
