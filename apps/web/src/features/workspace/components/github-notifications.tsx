import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Button } from "@workspace/ui/components/button"
import type { GithubNotifications as Notifications } from "@workspace/shared/contracts/github"
import { api } from "@/lib/api-client"
import { fieldClass } from "./installation-form"

export function GithubNotifications({
  installationId,
  repository,
}: {
  installationId: string
  repository: string
}) {
  const [data, setData] = useState<Notifications | null>(null)
  const [target, setTarget] = useState("")
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const path = `/installations/${installationId}/github-notifications`
  const apply = useCallback((next: Notifications) => {
    setData(next)
    setTarget(next.settings ? String(next.settings.target_number) : "")
    setEnabled(next.settings?.enabled ?? false)
  }, [])
  async function load() {
    try {
      apply(await api<Notifications>(path))
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not load notifications."
      )
    }
  }
  useEffect(() => {
    let active = true
    void api<Notifications>(path)
      .then((next) => {
        if (active) apply(next)
      })
      .catch((failure: unknown) => {
        if (active)
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not load notifications."
          )
      })
    return () => {
      active = false
    }
  }, [path, apply])
  async function save(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    setMessage("")
    try {
      await api(path, {
        method: "POST",
        body: JSON.stringify({ targetNumber: Number(target), enabled }),
      })
      setMessage("Notification preferences saved.")
      await load()
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not save notifications."
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="my-6 border-2 border-border bg-card p-6 sm:p-8">
      <h2 className="font-heading text-2xl">
        Keep the conversation in GitHub.
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        Send run outcomes and blocked verification updates to an open issue or
        pull request in {repository}.
      </p>
      <form
        onSubmit={(event) => void save(event)}
        className="mt-5 max-w-md space-y-4"
      >
        <label className="block text-xs">
          Issue or pull request number
          <input
            required
            type="number"
            min="1"
            max="2147483647"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className={fieldClass}
            placeholder="42"
          />
        </label>
        <label className="flex items-center gap-3 text-xs">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Send GitHub comments for future runs
        </label>
        <div className="flex gap-3">
          <Button type="submit" disabled={busy || !data}>
            {busy ? "Saving…" : "Save notifications"}
          </Button>
          <Button type="button" variant="outline" onClick={() => void load()}>
            Refresh delivery
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
      </form>
      {!!data?.deliveries.length && (
        <ul className="mt-6 divide-y divide-border border-t border-border">
          {data.deliveries.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap justify-between gap-2 py-3 font-mono text-[10px]"
            >
              <span>{new Date(item.created_at).toLocaleString()}</span>
              <span>
                {item.status} · {item.attempts} attempts
                {item.last_error ? ` · ${item.last_error}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
