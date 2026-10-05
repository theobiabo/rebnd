import { subscriptionAssertions } from "@workspace/shared/examples/subscription"
import { downloadJson } from "@workspace/shared/utils/download-json"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Check, Copy, Download, GitPullRequest } from "lucide-react"
import { Button } from "@workspace/ui/components/button"

export function PullRequestDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const manifest = {
    kind: "illustrative-demo",
    workflow: "subscription-entitlement",
    source: "synthetic-contract-v2",
    evidenceLevel: "synthetic demo only",
    changedFiles: ["src/webhooks/subscription.ts"],
    assertions: subscriptionAssertions.map((assertion) => assertion.detail),
    results: {
      baseline: "3/3 pass",
      targetUnpatched: "1/3 fail",
      targetPatched: "3/3 pass",
    },
    productionCompatibility: "not established",
  }
  const download = () => downloadJson("rebnd-example-evidence.json", manifest)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto border p-6 sm:max-w-2xl sm:p-8">
        <DialogHeader>
          <p className="eyebrow mb-2 text-primary">
            Example pull request · synthetic fixtures
          </p>
          <DialogTitle className="pr-5 font-heading text-2xl leading-tight font-light">
            Preserve entitlement updates in the target contract
          </DialogTitle>
          <DialogDescription className="leading-6">
            A preview of the review package rebnd is designed to prepare. No
            repository is connected and no pull request has been published.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <GitPullRequest className="size-4 text-primary" />
          <span>rebnd/fix-subscription-mapping</span>
        </div>
        <div className="border-y py-5">
          <h3 className="mb-2 text-sm">What changed</h3>
          <p className="text-sm leading-6 text-muted-foreground">
            The hypothetical target fixture nests the subscription identifier.
            This patch updates one field mapping within the approved handler and
            leaves the approved assertions unchanged.
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm">Approved behavior</h3>
          <ul className="space-y-3">
            {manifest.assertions.map((assertion) => (
              <li
                key={assertion}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <Check className="size-3.5 shrink-0 text-primary" />
                {assertion}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border bg-background p-4 text-xs leading-6">
          <p className="text-muted-foreground">
            Current baseline{" "}
            <span className="float-right text-primary">PASS</span>
          </p>
          <p className="text-muted-foreground">
            Target without patch{" "}
            <span className="float-right text-destructive">FAIL</span>
          </p>
          <p className="text-muted-foreground">
            Target with patch{" "}
            <span className="float-right text-primary">PASS</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={download} className="h-10 px-4">
            <Download />
            Download example evidence
          </Button>
          <Button
            variant="outline"
            className="h-10 px-4"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  JSON.stringify(manifest, null, 2)
                )
                setCopied(true)
                setCopyError(false)
              } catch {
                setCopyError(true)
              }
            }}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy manifest"}
          </Button>
        </div>
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {copyError
            ? "Clipboard unavailable. You can download the evidence file instead."
            : "Demo evidence only. An actual run also requires source provenance, commit and artifact hashes, environment identity, and reproduction commands."}
        </p>
      </DialogContent>
    </Dialog>
  )
}
