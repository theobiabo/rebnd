import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto"
import { z } from "zod"
import type { Database } from "../../db/database"
import { ApiError } from "../../http/errors"
import { GithubClient } from "./client"

const hash = (value: string) => createHash("sha256").update(value).digest("hex")
const eventSchema = z.object({
  action: z.string().optional(),
  installation: z.object({ id: z.number().int().positive() }).optional(),
})
export class GithubService {
  constructor(
    private readonly db: Database,
    readonly client: GithubClient,
    private readonly webhookSecret?: string
  ) {}
  async connection(ownerId: string) {
    const result = await this.db.query<{
      github_installation_id: string
      account_login: string
      status: string
    }>(
      "SELECT github_installation_id, account_login, status FROM github_connections WHERE owner_id = $1",
      [ownerId]
    )
    return result.rows[0] ?? null
  }
  async start(ownerId: string) {
    if (!this.client.configured)
      throw new ApiError(
        503,
        "GITHUB_NOT_CONFIGURED",
        "The GitHub App is not configured yet."
      )
    const linked = await this.connection(ownerId)
    if (linked?.status === "active")
      return {
        url: `https://github.com/settings/installations/${linked.github_installation_id}`,
      }
    const identities = await this.db.query<{ accountId: string }>(
      'SELECT "accountId" FROM account WHERE "userId" = $1 AND "providerId" = $2',
      [ownerId, "github"]
    )
    const existing = identities.rows[0]
      ? await this.client.findPersonalInstallation(identities.rows[0].accountId)
      : null
    const state = randomBytes(32).toString("base64url")
    await this.db.transaction(async (tx) => {
      await tx.query(
        "DELETE FROM github_install_states WHERE owner_id = $1 OR expires_at < now()",
        [ownerId]
      )
      await tx.query(
        "INSERT INTO github_install_states(state_hash, owner_id, expires_at) VALUES($1, $2, now() + interval '15 minutes')",
        [hash(state), ownerId]
      )
    })
    if (existing) {
      await this.complete(ownerId, { state, installationId: existing.id })
      return { url: "/dashboard/integration" }
    }
    return {
      url: `${this.client.installUrl}?state=${encodeURIComponent(state)}`,
    }
  }
  async complete(ownerId: string, input: unknown) {
    const { state, installationId } = z
      .object({
        state: z.string().min(32).max(128),
        installationId: z.number().int().positive().safe(),
      })
      .parse(input)
    const pending = await this.db.query(
      "SELECT state_hash FROM github_install_states WHERE state_hash = $1 AND owner_id = $2 AND expires_at > now()",
      [hash(state), ownerId]
    )
    if (!pending.rows.length)
      throw new ApiError(
        403,
        "INVALID_INSTALL_STATE",
        "This connection link expired. Start connecting GitHub again."
      )
    const installation = await this.client.installation(installationId)
    const identity = await this.db.query<{ accountId: string }>(
      'SELECT "accountId" FROM account WHERE "userId" = $1 AND "providerId" = $2',
      [ownerId, "github"]
    )
    if (
      installation.account.type !== "User" ||
      !identity.rows.some(
        (row) => row.accountId === String(installation.account.id)
      )
    )
      throw new ApiError(
        403,
        "INSTALLATION_OWNER_MISMATCH",
        "Install the App on the personal GitHub account you use to sign in. Organization connections are not supported yet."
      )
    if (
      installation.suspended_at ||
      installation.repository_selection !== "selected"
    )
      throw new ApiError(
        422,
        "SELECTED_REPOSITORIES_REQUIRED",
        "Choose only selected repositories in an active GitHub App installation."
      )
    await this.db.transaction(async (tx) => {
      const consumed = await tx.query(
        "DELETE FROM github_install_states WHERE state_hash = $1 AND owner_id = $2 AND expires_at > now() RETURNING state_hash",
        [hash(state), ownerId]
      )
      if (!consumed.rows.length)
        throw new ApiError(
          403,
          "INVALID_INSTALL_STATE",
          "This connection link has already been used."
        )
      await tx.query(
        "INSERT INTO github_connections(owner_id, github_installation_id, account_login) VALUES($1, $2, $3) ON CONFLICT(owner_id) DO UPDATE SET github_installation_id = excluded.github_installation_id, account_login = excluded.account_login, status = 'active', updated_at = now()",
        [ownerId, installationId, installation.account.login]
      )
    })
    return { connected: true }
  }
  async repositories(ownerId: string) {
    const connection = await this.connection(ownerId)
    if (!connection || connection.status !== "active") return []
    const installation = await this.client.installation(
      Number(connection.github_installation_id)
    )
    if (
      installation.suspended_at ||
      installation.repository_selection !== "selected"
    )
      throw new ApiError(
        403,
        "GITHUB_ACCESS_CHANGED",
        "Restore selected-repository access in GitHub to continue."
      )
    return this.client.repositories(Number(connection.github_installation_id))
  }
  async verifyRepository(ownerId: string, name: string) {
    const repo = (await this.repositories(ownerId)).find(
      (item) => item.full_name.toLowerCase() === name.toLowerCase()
    )
    if (!repo)
      throw new ApiError(
        403,
        "REPOSITORY_NOT_CONNECTED",
        "Select a repository accessible to your GitHub App installation."
      )
    return repo
  }
  async webhook(
    raw: string,
    signature: string,
    delivery: string,
    event: string
  ) {
    if (!this.webhookSecret)
      throw new ApiError(
        503,
        "GITHUB_NOT_CONFIGURED",
        "GitHub webhooks are not configured."
      )
    const expected = `sha256=${createHmac("sha256", this.webhookSecret).update(raw).digest("hex")}`
    if (
      !/^sha256=[a-f0-9]{64}$/.test(signature) ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    )
      throw new ApiError(401, "INVALID_SIGNATURE", "Invalid webhook signature.")
    z.uuid().parse(delivery)
    if (!["ping", "installation", "installation_repositories"].includes(event))
      return { accepted: true }
    let body: unknown
    try {
      body = JSON.parse(raw)
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Invalid webhook body.")
    }
    const payload = eventSchema.parse(body)
    return this.db.transaction(async (tx) => {
      const inserted = await tx.query(
        "INSERT INTO github_deliveries(delivery_id, event) VALUES($1, $2) ON CONFLICT DO NOTHING RETURNING delivery_id",
        [delivery, event]
      )
      if (!inserted.rows.length) return { accepted: true, duplicate: true }
      if (
        event === "installation" &&
        ["deleted", "suspend"].includes(payload.action ?? "") &&
        payload.installation
      ) {
        await tx.query(
          "UPDATE github_connections SET status = 'revoked', updated_at = now() WHERE github_installation_id = $1",
          [payload.installation.id]
        )
        await tx.query(
          "UPDATE github_notifications SET status = 'cancelled', last_error = 'GitHub access revoked' WHERE status = 'pending' AND owner_id IN (SELECT owner_id FROM github_connections WHERE github_installation_id = $1)",
          [payload.installation.id]
        )
      }
      return { accepted: true }
    })
  }
}
