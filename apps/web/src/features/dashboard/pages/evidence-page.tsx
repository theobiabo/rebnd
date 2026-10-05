import { downloadJson } from "@workspace/shared/utils/download-json"
import { Download, FileCheck2, LockKeyhole, ShieldCheck } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { PageHeading } from "@workspace/shared/components/page-heading"
import { StatusBadge } from "@workspace/shared/components/status-badge"
import { subscriptionAssertions as assertions } from "@workspace/shared/examples/subscription"
import type { DashboardModel } from "../hooks/use-dashboard-model"

export function EvidencePage({ model }: { model: DashboardModel }) {
  const stale = model.state.evidenceStale
  const download = () => {
    const manifest = {
      kind: "synthetic-ui-demo",
      change: "CHG-024",
      source: "synthetic-contract-v2",
      baseSha: "a8f2c91",
      candidateSha: "c4d9b02",
      approvalRevision: model.state.evidenceRevision,
      evidenceStale: stale,
      assertionHash: "demo-7d4ae920",
      runtime: "node:22-demo",
      target: "fixture-v2",
      assertions,
      results: {
        baseline: [true, true, true],
        unpatched: [false, true, true],
        patched: [true, true, true],
      },
      productionCompatibility: "not established",
      commandsExecuted: false,
    }
    downloadJson("rebnd-demo-manifest.json", manifest)
    model.setNotice(
      "Downloaded the synthetic example manifest. No checks were executed."
    )
  }
  return (
    <>
      <PageHeading
        eyebrow="Evidence / RUN-008"
        title="Proof you can inspect."
        description="One assertion bundle. Three comparisons. Nothing quietly changed."
        action={
          <Button className="h-10 gap-2 px-4 text-xs" onClick={download}>
            <Download />
            Export demo manifest
          </Button>
        }
      />
      <div
        className={`mb-6 flex items-start gap-3 border-2 p-4 ${stale ? "bg-[#292929]" : "bg-primary/25"}`}
      >
        <ShieldCheck className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="text-sm font-medium">
            {stale
              ? "Evidence is stale. The inventory changed."
              : "Synthetic fixture evidence · CHG-024"}
          </p>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            {stale
              ? "Review the current inventory and approve a new workflow revision. This historical example cannot authorize publication."
              : "This is an illustrative run, not an official provider compatibility claim. No production environment was exercised."}
          </p>
        </div>
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Current baseline",
            subtitle: "Current contract · unchanged code",
            result: "3 / 3 pass",
            tone: "positive",
          },
          {
            title: "Target, unpatched",
            subtitle: "Target fixture · unchanged code",
            result: "1 / 3 fail",
            tone: "negative",
          },
          {
            title: "Target, patched",
            subtitle: "Same target fixture · candidate",
            result: "3 / 3 pass",
            tone: "positive",
          },
        ].map((item, index) => (
          <section key={item.title} className="neo-panel">
            <div className="flex items-center justify-between border-b-2 px-4 py-3">
              <span className="font-mono text-[10px]">
                0{index + 1} / COMPARISON
              </span>
              <FileCheck2 className="size-4" />
            </div>
            <div className="p-5">
              <h2 className="font-heading text-xl">{item.title}</h2>
              <p className="mt-2 text-[10px] text-muted-foreground">
                {item.subtitle}
              </p>
              <p
                className={`mt-6 font-heading text-3xl ${index === 1 ? "text-destructive" : "text-[#c5c5c5]"}`}
              >
                {item.result}
              </p>
              <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                Example exit code: {index === 1 ? "1" : "0"}
              </p>
            </div>
          </section>
        ))}
      </div>
      <section className="neo-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 px-5 py-4">
          <h2 className="font-heading text-lg">Approved assertions</h2>
          <StatusBadge tone="positive">Unchanged hash</StatusBadge>
        </div>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead className="border-b bg-background font-mono text-[9px] text-muted-foreground uppercase">
              <tr>
                <th className="px-5 py-3">Invariant</th>
                <th className="p-3">Baseline</th>
                <th className="p-3">Unpatched</th>
                <th className="p-3">Patched</th>
              </tr>
            </thead>
            <tbody>
              {assertions.map((assertion, index) => (
                <tr
                  key={assertion.id}
                  className="border-b border-border/15 last:border-0"
                >
                  <td className="px-5 py-4">
                    <p>{assertion.name}</p>
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      {assertion.id} · {assertion.detail}
                    </p>
                  </td>
                  <td className="p-3 text-[#c5c5c5]">PASS</td>
                  <td
                    className={`p-3 ${index === 0 ? "text-destructive" : "text-[#c5c5c5]"}`}
                  >
                    {index === 0 ? "FAIL" : "PASS"}
                  </td>
                  <td className="p-3 text-[#c5c5c5]">PASS</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 border-t bg-background px-5 py-3 text-[10px] text-muted-foreground">
          <LockKeyhole className="size-3" />
          Read-only assertion bundle · demo hash 7d4a…e920
        </div>
      </section>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="neo-panel p-5">
          <h2 className="mb-5 font-heading text-lg">Reproduction context</h2>
          <dl className="space-y-4 text-xs">
            {[
              ["Base → candidate", "a8f2c91 → c4d9b02"],
              [
                "Workflow / approval",
                `subscription-entitlement / rev ${model.state.evidenceRevision}`,
              ],
              ["Runtime image", "node:22 · demo image"],
              ["Target input", "synthetic-contract-v2 / fixture-002"],
              ["Dependency lock", "demo-lock-91b0"],
              ["Assertion bundle", "demo-7d4ae920"],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-wrap justify-between gap-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-mono text-[10px]">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="neo-panel p-5">
          <h2 className="mb-4 font-heading text-lg">Existing checks</h2>
          <div className="space-y-3 font-mono text-[11px]">
            <p className="flex justify-between border-b border-border/15 pb-3">
              <span>TypeScript compilation</span>
              <span className="text-[#c5c5c5]">PASS → PASS</span>
            </p>
            <p className="flex justify-between border-b border-border/15 pb-3">
              <span>Repository test suite</span>
              <span className="text-[#c5c5c5]">PASS → PASS</span>
            </p>
            <p className="flex justify-between">
              <span>Assertion integrity</span>
              <span className="text-[#c5c5c5]">UNCHANGED</span>
            </p>
          </div>
          <p className="mt-6 border-l-2 pl-3 text-xs leading-6 text-muted-foreground">
            These results demonstrate the evidence layout. A real run must
            include complete artifact hashes, version-specific source
            provenance, redacted logs, and executable reproduction commands.
          </p>
        </section>
      </div>
    </>
  )
}
