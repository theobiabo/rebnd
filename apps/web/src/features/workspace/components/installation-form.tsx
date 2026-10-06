import { useState, type FormEvent } from "react"
import { Button } from "@workspace/ui/components/button"
import type { WorkspaceModel } from "../hooks/use-workspace"

export const fieldClass =
  "mt-2 h-11 w-full border border-border bg-background px-3 text-sm outline-none focus:border-foreground"
import type { GithubModel } from "../hooks/use-github"

export function InstallationForm({
  model,
  github,
}: {
  model: WorkspaceModel
  github: GithubModel
}) {
  const [name, setName] = useState("")
  const [repository, setRepository] = useState("")
  async function submit(event: FormEvent) {
    event.preventDefault()
    await model.execute("/installations", {
      name,
      repository,
      defaultBranch:
        github.repositories.find((item) => item.name === repository)
          ?.defaultBranch ?? "main",
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
        <select
          required
          value={repository}
          onChange={(event) => setRepository(event.target.value)}
          className={fieldClass}
          disabled={github.busy || !github.repositories.length}
        >
          <option value="">Select a connected repository</option>
          {github.repositories.map((repo) => (
            <option key={repo.id} value={repo.name}>
              {repo.name}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs leading-6 text-muted-foreground">
        Only repositories granted to your GitHub App installation are available.
      </p>
      <Button disabled={model.busy || github.busy || !repository} type="submit">
        {model.busy ? "Creating…" : "Create installation"}
      </Button>
    </form>
  )
}
