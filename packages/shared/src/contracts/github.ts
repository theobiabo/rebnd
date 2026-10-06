export type GithubStatus = {
  configured: boolean
  connection: { account: string; status: string; installationId: string } | null
}
export type GithubRepository = {
  id: number
  name: string
  defaultBranch: string
}
export type GithubNotifications = {
  settings: { target_number: number; enabled: boolean } | null
  deliveries: {
    id: string
    status: string
    attempts: number
    last_error: string | null
    created_at: string
  }[]
}
