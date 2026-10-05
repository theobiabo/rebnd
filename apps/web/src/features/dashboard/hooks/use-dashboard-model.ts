import { useState } from "react"
import { initialState } from "../data/demo-data"
import type { DashboardState } from "../types"

const storageKey = "rebnd-dashboard-demo-v1"

function restore(): DashboardState {
  try {
    const saved = JSON.parse(
      localStorage.getItem(storageKey) ?? "null"
    ) as DashboardState | null
    if (
      saved &&
      Array.isArray(saved.changes) &&
      saved.changes.every(
        (change) =>
          typeof change.id === "string" && typeof change.status === "string"
      ) &&
      Array.isArray(saved.activity) &&
      typeof saved.monitoring === "boolean" &&
      typeof saved.execution === "boolean"
    )
      return { ...initialState, ...saved }
  } catch {
    return initialState
  }
  return initialState
}

export function useDashboardModel() {
  const [state, setState] = useState(restore)
  const [notice, setNotice] = useState("")

  const update = (
    patch: Partial<DashboardState>,
    action: string,
    detail: string
  ) => {
    const next: DashboardState = {
      ...state,
      ...patch,
      activity: [
        {
          id: crypto.randomUUID(),
          action,
          detail,
          time: new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date()),
          actor: "You",
        },
        ...state.activity,
      ],
    }
    setState(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setNotice(`${action}. Saved in this browser only.`)
    } catch {
      setNotice(
        `${action}. Browser storage is unavailable; this change lasts for this visit only.`
      )
    }
  }
  const toggle = (key: "monitoring" | "execution") =>
    update(
      { [key]: !state[key] },
      `${key === "monitoring" ? "Monitoring" : "Execution"} ${state[key] ? "paused" : "resumed"}`,
      `Demo control · approval revision ${state.revision}`
    )
  const approve = (id: string) =>
    update(
      {
        changes: state.changes.map((change) =>
          change.id === id ? { ...change, status: "Ready" } : change
        ),
      },
      "Target approved",
      `${id} · existing assertions preserved`
    )
  const ignore = (id: string, reason: string) =>
    update(
      {
        changes: state.changes.map((change) =>
          change.id === id
            ? {
                ...change,
                ignoredFrom: change.status,
                status: "Ignored",
                reason,
              }
            : change
        ),
      },
      "Change ignored",
      `${id} · ${reason}`
    )
  const restoreChange = (id: string) =>
    update(
      {
        changes: state.changes.map((change) =>
          change.id === id
            ? {
                ...change,
                status: change.ignoredFrom ?? "Needs review",
                reason: undefined,
                ignoredFrom: undefined,
              }
            : change
        ),
      },
      "Change restored for review",
      id
    )
  const previewRun = (id: string) => {
    if (
      !state.execution ||
      state.approvedRevision !== state.revision ||
      !state.onboarded
    ) {
      setNotice(
        "Resume execution and approve the current workflow before previewing verification."
      )
      return
    }
    const change = state.changes.find((item) => item.id === id)
    if (!change || !["Ready", "Verified"].includes(change.status)) {
      setNotice("Approve the target before previewing verification.")
      return
    }
    if (id !== "CHG-024") {
      update(
        {
          changes: state.changes.map((item) =>
            item.id === id ? { ...item, status: "Blocked" } : item
          ),
        },
        "Verification blocked",
        `${id} · target-version fixture unavailable; no repair generated`
      )
      return
    }
    update(
      {
        evidenceStale: false,
        evidenceRevision: state.revision,
        changes: state.changes.map((item) =>
          item.id === id ? { ...item, status: "Verified" } : item
        ),
      },
      "Example evidence generated",
      `${id} · synthetic demo, no code executed`
    )
  }
  const reset = () => {
    setState(initialState)
    try {
      localStorage.removeItem(storageKey)
    } catch {
      setNotice("Demo reset for this visit. Browser storage is unavailable.")
      return
    }
    setNotice("Example workspace reset. No external data was changed.")
  }
  return {
    reset,
    state,
    notice,
    setNotice,
    update,
    toggle,
    approve,
    ignore,
    restoreChange,
    previewRun,
  }
}

export type DashboardModel = ReturnType<typeof useDashboardModel>
