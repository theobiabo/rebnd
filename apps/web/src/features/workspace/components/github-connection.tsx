import { GitBranch, ArrowUpRight } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import type { GithubModel } from "../hooks/use-github"

export function GithubConnection({ model }: { model: GithubModel }) {
  const connected = model.status?.connection?.status === "active"
  return (
    <section
      className="mb-6 border-2 border-border bg-card p-6 sm:p-8"
      aria-labelledby="github-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="mb-3 flex items-center gap-2 font-mono text-[10px] text-muted-foreground uppercase">
            <GitBranch className="size-4" /> Repository connection
          </p>
          <h2 id="github-heading" className="font-heading text-2xl">
            {connected
              ? `Connected to ${model.status?.connection?.account}`
              : "Give rebnd a repository."}
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            {model.status && !model.status.configured
              ? "The GitHub App needs its server credentials before you can connect."
              : "Install rebnd on your personal GitHub account and choose only the repositories you want it to access."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            disabled={model.busy || !model.status?.configured}
            onClick={() => void model.connect()}
          >
            {connected ? "Manage connection" : "Connect GitHub"}
            <ArrowUpRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            disabled={model.busy}
            onClick={() => void model.refresh()}
          >
            Refresh
          </Button>
        </div>
      </div>
      {model.error && (
        <p role="alert" className="mt-4 text-sm">
          {model.error}
        </p>
      )}
      {connected && (
        <p className="mt-5 border-t border-border pt-4 font-mono text-[10px] text-muted-foreground">
          {model.repositories.length} AVAILABLE REPOSITORIES · SELECTED ACCESS
        </p>
      )}
    </section>
  )
}
