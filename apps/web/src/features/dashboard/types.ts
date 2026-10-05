import type { Activity, Change } from "@workspace/shared/types/integration"

export type DashboardState = {
  monitoring: boolean
  execution: boolean
  publishing: boolean
  checks: string
  retention: number
  budget: number
  changes: Change[]
  activity: Activity[]
  onboarded: boolean
  approvedRevision: number
  evidenceRevision: number
  revision: number
  inventoryVersion: string
  evidenceStale: boolean
  freshness: "Fresh" | "Stale"
}
