import { createSign } from "node:crypto"
import type { Environment } from "../../config/env"
import { ApiError } from "../../http/errors"

export type GithubInstallation = {
  id: number
  account: { id: number; login: string; type: string }
  suspended_at: string | null
  repository_selection: string
}
export type GithubRepository = {
  id: number
  full_name: string
  default_branch: string
  archived: boolean
  disabled: boolean
}
export class GithubClient {
  constructor(
    private readonly env: Environment,
    private readonly transport: typeof fetch = fetch
  ) {}
  get configured() {
    return Boolean(
      this.env.GITHUB_APP_ID &&
      this.env.GITHUB_APP_SLUG &&
      this.env.GITHUB_APP_PRIVATE_KEY &&
      this.env.GITHUB_APP_WEBHOOK_SECRET
    )
  }
  get installUrl() {
    return `https://github.com/apps/${this.env.GITHUB_APP_SLUG}/installations/new`
  }
  private jwt() {
    if (!this.configured)
      throw new ApiError(
        503,
        "GITHUB_NOT_CONFIGURED",
        "The GitHub App needs to be configured by the workspace administrator."
      )
    const now = Math.floor(Date.now() / 1000)
    const encode = (value: unknown) =>
      Buffer.from(JSON.stringify(value)).toString("base64url")
    const data = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iat: now - 60, exp: now + 540, iss: this.env.GITHUB_APP_ID })}`
    const signature = createSign("RSA-SHA256")
      .update(data)
      .sign(this.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, "\n"), "base64url")
    return `${data}.${signature}`
  }
  async request<T>(
    path: string,
    token: string,
    method = "GET",
    body?: unknown
  ): Promise<T> {
    const response = await this.transport(`https://api.github.com${path}`, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    if (!response.ok)
      throw new ApiError(
        503,
        "GITHUB_UNAVAILABLE",
        `GitHub could not complete this request (${response.status}). Check the App’s installation and permissions.`
      )
    return response.json() as Promise<T>
  }
  async findPersonalInstallation(accountId: string) {
    for (let page = 1; page <= 100; page++) {
      const installations = await this.request<GithubInstallation[]>(
        `/app/installations?per_page=100&page=${page}`,
        this.jwt()
      )
      const match = installations.find(
        (item) =>
          item.account.type === "User" && String(item.account.id) === accountId
      )
      if (match) return match
      if (installations.length < 100) return null
    }
    throw new ApiError(
      503,
      "GITHUB_INSTALLATION_LOOKUP_LIMIT",
      "Could not locate the installation. Please try again later."
    )
  }
  installation(id: number) {
    return this.request<GithubInstallation>(
      `/app/installations/${id}`,
      this.jwt()
    )
  }
  async token(id: number, repositoryId?: number, notifications = false) {
    const result = await this.request<{ token: string }>(
      `/app/installations/${id}/access_tokens`,
      this.jwt(),
      "POST",
      {
        permissions: notifications
          ? { issues: "write", contents: "read" }
          : { contents: "read" },
        ...(repositoryId ? { repository_ids: [repositoryId] } : {}),
      }
    )
    return result.token
  }
  async repositories(id: number) {
    const token = await this.token(id)
    const repositories: GithubRepository[] = []
    for (let page = 1; page <= 100; page++) {
      const result = await this.request<{ repositories: GithubRepository[] }>(
        `/installation/repositories?per_page=100&page=${page}`,
        token
      )
      repositories.push(...result.repositories)
      if (result.repositories.length < 100)
        return repositories.filter((repo) => !repo.archived && !repo.disabled)
    }
    throw new ApiError(
      422,
      "TOO_MANY_REPOSITORIES",
      "Select fewer repositories in the GitHub App installation."
    )
  }
}
