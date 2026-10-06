import { useEffect, useState } from "react"
import type {
  AuditRecord,
  ChangeRecord,
  EvidenceSummary,
  Installation,
  MutationResult,
  Page,
  RunRecord,
  Workspace,
} from "@workspace/shared/contracts/api"
import { api, mutate } from "@/lib/api-client"

export type WorkspaceData = Workspace & {
  changes: ChangeRecord[]
  runs: RunRecord[]
  evidence: EvidenceSummary[]
  activity: AuditRecord[]
}
async function fetchWorkspace(
  signal?: AbortSignal
): Promise<WorkspaceData | null> {
  const { items } = await api<Page<Installation>>("/installations", { signal })
  const installation = items.find((item) => item.state !== "revoked")
  if (!installation) return null
  const path = `/installations/${installation.id}`
  const [current, changes, runs, evidence, activity] = await Promise.all([
    api<Workspace>(path, { signal }),
    api<Page<ChangeRecord>>(`${path}/changes`, { signal }),
    api<Page<RunRecord>>(`${path}/runs`, { signal }),
    api<Page<EvidenceSummary>>(`${path}/evidence`, { signal }),
    api<Page<AuditRecord>>(`${path}/activity`, { signal }),
  ])
  return {
    ...current,
    changes: changes.items,
    runs: runs.items,
    evidence: evidence.items,
    activity: activity.items,
  }
}

export function useWorkspace() {
  const [data, setData] = useState<WorkspaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  useEffect(() => {
    const controller = new AbortController()
    void fetchWorkspace(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "Unable to load workspace."
          )
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])
  const refresh = async () => {
    setError("")
    try {
      setData(await fetchWorkspace())
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to refresh.")
    }
  }
  const execute = async (
    path: string,
    body: Record<string, unknown> = {},
    method = "POST"
  ) => {
    if (busy) return false
    setBusy(true)
    setError("")
    setNotice("")
    try {
      await mutate<MutationResult>(
        path,
        { ...body, expectedRevision: data?.installation.revision ?? 0 },
        method
      )
      setData(await fetchWorkspace())
      setNotice("Saved to your workspace.")
      return true
    } catch (error) {
      setError(error instanceof Error ? error.message : "The request failed.")
      await fetchWorkspace()
        .then(setData)
        .catch(() => undefined)
      return false
    } finally {
      setBusy(false)
    }
  }
  return {
    data,
    loading,
    busy,
    error,
    notice,
    refresh,
    execute,
    base: data ? `/installations/${data.installation.id}` : "/installations",
  }
}
export type WorkspaceModel = ReturnType<typeof useWorkspace>
