import type { Hono } from "hono"
import { z } from "zod"
import type { Database } from "../../db/database"
import type { GithubService } from "./service"
import { getDocument, audit } from "../installations/repository"
import { ApiError } from "../../http/errors"

export type GithubRouteEnv = {
  Variables: { ownerId: string; requestId: string }
}
export function registerGithubRoutes(
  app: Hono<GithubRouteEnv>,
  db: Database,
  github: GithubService
) {
  app.get("/api/v1/github", async (c) => {
    const connection = await github.connection(c.get("ownerId"))
    return c.json({
      configured: github.client.configured,
      connection: connection
        ? {
            account: connection.account_login,
            status: connection.status,
            installationId: String(connection.github_installation_id),
          }
        : null,
    })
  })
  app.post("/api/v1/github/connect", async (c) =>
    c.json(await github.start(c.get("ownerId")))
  )
  app.post("/api/v1/github/complete", async (c) =>
    c.json(await github.complete(c.get("ownerId"), await c.req.json()))
  )
  app.get("/api/v1/github/repositories", async (c) =>
    c.json({
      items: (await github.repositories(c.get("ownerId"))).map((repo) => ({
        id: repo.id,
        name: repo.full_name,
        defaultBranch: repo.default_branch,
      })),
    })
  )
  app.get(
    "/api/v1/installations/:installationId/github-notifications",
    async (c) => {
      const id = z.uuid().parse(c.req.param("installationId"))
      const owner = c.get("ownerId")
      await getDocument(db, "installations", owner, id)
      const settings = await db.query<{
        target_number: number
        enabled: boolean
      }>(
        "SELECT target_number, enabled FROM github_notification_settings WHERE owner_id = $1 AND installation_id = $2",
        [owner, id]
      )
      const deliveries = await db.query(
        "SELECT id, status, attempts, last_error, created_at FROM github_notifications WHERE owner_id = $1 AND installation_id = $2 ORDER BY created_at DESC LIMIT 10",
        [owner, id]
      )
      return c.json({
        settings: settings.rows[0] ?? null,
        deliveries: deliveries.rows,
      })
    }
  )
  app.post(
    "/api/v1/installations/:installationId/github-notifications",
    async (c) => {
      const id = z.uuid().parse(c.req.param("installationId"))
      const owner = c.get("ownerId")
      const input = z
        .object({
          targetNumber: z.number().int().min(1).max(2147483647),
          enabled: z.boolean(),
        })
        .strict()
        .parse(await c.req.json())
      const installation = await getDocument(db, "installations", owner, id)
      if (installation.state === "revoked")
        throw new ApiError(
          409,
          "INSTALLATION_REVOKED",
          "This integration was revoked."
        )
      if (input.enabled) {
        const repository = await github.verifyRepository(
          owner,
          installation.repository
        )
        const connection = await github.connection(owner)
        const token = await github.client.token(
          Number(connection!.github_installation_id),
          repository.id,
          true
        )
        const issue = await github.client.request<{
          locked: boolean
          state: string
        }>(`/repos/${repository.full_name}/issues/${input.targetNumber}`, token)
        if (issue.locked || issue.state !== "open")
          throw new ApiError(
            422,
            "INVALID_NOTIFICATION_TARGET",
            "Choose an open, unlocked issue or pull request in this repository."
          )
      }
      await db.transaction(async (tx) => {
        await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", [owner])
        await tx.query(
          "INSERT INTO github_notification_settings(installation_id, owner_id, target_number, enabled) VALUES($1, $2, $3, $4) ON CONFLICT(installation_id) DO UPDATE SET target_number = excluded.target_number, enabled = excluded.enabled",
          [id, owner, input.targetNumber, input.enabled]
        )
        await tx.query(
          "UPDATE github_notifications SET status = 'cancelled' WHERE owner_id = $1 AND installation_id = $2 AND status = 'pending' AND ($3 = false OR target_number <> $4)",
          [owner, id, input.enabled, input.targetNumber]
        )
        await audit(
          tx,
          owner,
          id,
          "github.notifications_updated",
          `${input.enabled ? "enabled" : "disabled"}: #${input.targetNumber}`
        )
      })
      return c.json({ saved: true })
    }
  )
}
