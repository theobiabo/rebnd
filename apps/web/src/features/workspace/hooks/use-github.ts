import { useCallback, useEffect, useRef, useState } from "react"
import type {
  GithubStatus,
  GithubRepository,
} from "@workspace/shared/contracts/github"
import { api } from "@/lib/api-client"

export function useGithub() {
  const [status, setStatus] = useState<GithubStatus | null>(null)
  const [repositories, setRepositories] = useState<GithubRepository[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(true)
  const started = useRef(false)
  const refresh = useCallback(async () => {
    setBusy(true)
    setError("")
    try {
      const next = await api<GithubStatus>("/github")
      setStatus(next)
      setRepositories(
        next.configured && next.connection?.status === "active"
          ? (await api<{ items: GithubRepository[] }>("/github/repositories"))
              .items
          : []
      )
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Could not load GitHub."
      )
    } finally {
      setBusy(false)
    }
  }, [])
  useEffect(() => {
    if (started.current) return
    started.current = true
    async function initialize() {
      const query = new URLSearchParams(window.location.search)
      if (query.has("installation_id") && query.has("state")) {
        try {
          await api("/github/complete", {
            method: "POST",
            body: JSON.stringify({
              installationId: Number(query.get("installation_id")),
              state: query.get("state"),
            }),
          })
          window.history.replaceState(null, "", window.location.pathname)
        } catch (failure) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not finish connecting GitHub."
          )
          setBusy(false)
          return
        }
      }
      await refresh()
    }
    void initialize()
  }, [refresh])
  async function connect() {
    setBusy(true)
    setError("")
    try {
      const result = await api<{ url: string }>("/github/connect", {
        method: "POST",
        body: "{}",
      })
      window.location.assign(result.url)
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Could not connect GitHub."
      )
      setBusy(false)
    }
  }
  return { status, repositories, error, busy, refresh, connect }
}
export type GithubModel = ReturnType<typeof useGithub>
