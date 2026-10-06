import { useState, type FormEvent } from "react"
import { Button } from "@workspace/ui/components/button"
import type { WorkspaceModel } from "../hooks/use-workspace"

export const fieldClass =
  "mt-2 h-11 w-full border border-border bg-background px-3 text-sm outline-none focus:border-foreground"
export function InstallationForm({ model }: { model: WorkspaceModel }) {
  const [name, setName] = useState("")
  const [repository, setRepository] = useState("")
  async function submit(event: FormEvent) {
    event.preventDefault()
    await model.execute("/installations", {
      name,
      repository,
      defaultBranch: "main",
    })
  }
  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="max-w-xl space-y-6 border-2 border-border bg-card p-6 sm:p-8"
    >
      <div>
        <h2 className="font-heading text-2xl">Start with one repository.</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Save your integration’s scope. You’ll review the workflow and approve
          its assertions before any execution.
        </p>
      </div>
      <label className="block text-xs">
        Workspace name
        <input
          required
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Billing integration"
          className={fieldClass}
        />
      </label>
      <label className="block text-xs">
        GitHub repository
        <input
          required
          pattern="[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+"
          value={repository}
          onChange={(event) => setRepository(event.target.value)}
          placeholder="owner/repository"
          className={fieldClass}
        />
      </label>
      <p className="text-xs leading-6 text-muted-foreground">
        Selecting a repository does not grant access. A separate GitHub App
        connection is required for scanning.
      </p>
      <Button disabled={model.busy} type="submit">
        {model.busy ? "Creating…" : "Create installation"}
      </Button>
    </form>
  )
}
