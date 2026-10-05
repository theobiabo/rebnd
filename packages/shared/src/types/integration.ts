export type ChangeStatus =
  "Needs review" | "Verified" | "Blocked" | "Ignored" | "Ready"
export type Change = {
  id: string
  title: string
  description: string
  kind: string
  version: string
  status: ChangeStatus
  date: string
  file: string
  line: number
  ignoredFrom?: ChangeStatus
  reason?: string
}
export type Activity = {
  id: string
  action: string
  detail: string
  time: string
  actor: string
}
