import { ResetDemoDialog } from "../components/reset-demo-dialog"
import { useState } from "react"
import { Pause, Play, Save } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { PageHeading } from "@workspace/shared/components/page-heading"
import type { DashboardModel } from "../hooks/use-dashboard-model"

export function SettingsPage({ model }: { model: DashboardModel }) {
  const [resetOpen, setResetOpen] = useState(false)
  const [budget, setBudget] = useState(model.state.budget)
  const [retention, setRetention] = useState(model.state.retention)
  const [checks, setChecks] = useState(model.state.checks)
  const [publishing, setPublishing] = useState(model.state.publishing)
  return (
    <>
      <PageHeading
        eyebrow="Workspace / Settings"
        title="Boundaries, by design."
        description="Control what rebnd can watch, run, and prepare for review."
      />
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const changed = checks !== model.state.checks
          model.update(
            {
              budget,
              retention,
              checks,
              publishing,
              ...(changed
                ? { evidenceStale: true, revision: model.state.revision + 1 }
                : {}),
            },
            "Workspace settings saved",
            changed
              ? "Check commands changed; dependent evidence is stale"
              : "Demo permissions and limits updated"
          )
        }}
        className="space-y-6"
      >
        <section className="neo-panel">
          <h2 className="border-b-2 px-5 py-4 font-heading text-lg">
            Operation controls
          </h2>
          <div className="grid gap-6 p-5 md:grid-cols-2">
            {(["monitoring", "execution"] as const).map((key) => (
              <div
                key={key}
                className="flex items-start justify-between gap-4 border bg-background p-4"
              >
                <div>
                  <h3 className="text-sm capitalize">{key}</h3>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    {key === "monitoring"
                      ? "Daily checks of approved sources. Can run with execution paused."
                      : "Only approved workflow checks. Pausing prevents new runs."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => model.toggle(key)}
                >
                  {model.state[key] ? <Pause /> : <Play />}
                  {model.state[key] ? "Pause" : "Resume"}
                </Button>
              </div>
            ))}
          </div>
        </section>
        <section className="neo-panel">
          <h2 className="border-b-2 px-5 py-4 font-heading text-lg">
            Execution & resource limits
          </h2>
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="checks">
                Existing repository checks
              </label>
              <input
                id="checks"
                required
                maxLength={200}
                className="field-input font-mono text-xs"
                value={checks}
                onChange={(event) => setChecks(event.target.value)}
              />
              <p className="mt-2 text-[10px] text-muted-foreground">
                Changing commands requires a new approval revision. Commands are
                never executed in this demo.
              </p>
            </div>
            <div>
              <label htmlFor="budget" className="field-label">
                Verification allowance
              </label>
              <input
                id="budget"
                type="number"
                min={1}
                max={100}
                required
                className="field-input"
                value={budget}
                onChange={(event) => setBudget(Number(event.target.value))}
              />
              <p className="mt-2 text-[10px] text-muted-foreground">
                Runs per month · pause at the cap
              </p>
            </div>
            <div>
              <label htmlFor="retention" className="field-label">
                Evidence retention
              </label>
              <select
                id="retention"
                className="field-input"
                value={retention}
                onChange={(event) => setRetention(Number(event.target.value))}
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Pilot limits: 1 active workflow run · 2 workers · 15-minute
              timeout · 2 infrastructure retries. Audit metadata: 90 days.
            </p>
          </div>
        </section>
        <section className="neo-panel">
          <h2 className="border-b-2 px-5 py-4 font-heading text-lg">
            Publishing permission
          </h2>
          <div className="p-5">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-[#d5d5d5]"
                checked={publishing}
                onChange={(event) => setPublishing(event.target.checked)}
              />
              <span>
                Enable PR publishing in the demo configuration
                <span className="mt-2 block text-xs leading-6 text-muted-foreground">
                  Actual publication requires passing gates, current evidence,
                  and a separate trusted publisher. This preview grants no
                  GitHub permissions and never publishes, merges, or deploys.
                </span>
              </span>
            </label>
          </div>
        </section>
        <section className="neo-panel">
          <h2 className="border-b-2 px-5 py-4 font-heading text-lg">
            Source trust & network policy
          </h2>
          <div className="p-5 text-xs leading-7 text-muted-foreground">
            Allowlisted source categories: official release notes, SDK releases,
            and migration guides. The demo uses synthetic contracts; official
            provider URLs will be selected during onboarding. Isolated runs
            permit only approved package retrieval and separately approved test
            endpoints.
          </div>
        </section>
        <Button type="submit" className="h-11 gap-2 px-5 text-xs">
          <Save />
          Save workspace settings
        </Button>
      </form>
      <section className="mt-8 border-t border-border/25 pt-6">
        <h2 className="font-heading text-lg">Demo workspace</h2>
        <p className="mt-2 max-w-xl text-xs leading-6 text-muted-foreground">
          Restore the original synthetic examples and local preferences. This
          does not affect an external repository or account.
        </p>
        <Button
          variant="outline"
          className="mt-4 px-3 text-xs"
          onClick={() => setResetOpen(true)}
        >
          Reset demo data
        </Button>
      </section>
      <ResetDemoDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        onReset={() => {
          model.reset()
          setBudget(20)
          setRetention(30)
          setChecks("pnpm typecheck && pnpm test")
          setPublishing(false)
        }}
      />
    </>
  )
}
