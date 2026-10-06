import type { RunRecord } from "@workspace/shared/contracts/api"
import type { Database, SqlExecutor } from "../../db/database"
import { getDocument } from "../installations/repository"
import { GithubService } from "./service"
import { ApiError } from "../../http/errors"

export async function enqueueNotification(
  db: SqlExecutor,
  ownerId: string,
  installationId: string,
  run: RunRecord
) {
  await db.query(
    `INSERT INTO github_notifications(id, owner_id, installation_id, run_id, target_number)
    SELECT $1, $2, $3, $4, target_number FROM github_notification_settings WHERE owner_id = $2 AND installation_id = $3 AND enabled = true
    ON CONFLICT(run_id) DO NOTHING`,
    [crypto.randomUUID(), ownerId, installationId, run.id]
  )
}
type Notification = {
  id: string
  owner_id: string
  installation_id: string
  run_id: string
  target_number: number
  attempts: number
  lease_token: string
}
export async function processNextNotification(
  db: Database,
  github: GithubService
) {
  if (!github.client.configured) return false
  const item = await db.transaction(async (tx) => {
    const result = await tx.query<Notification>(
      "SELECT * FROM github_notifications WHERE status = 'pending' AND available_at <= now() AND (lease_until IS NULL OR lease_until < now()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1"
    )
    const row = result.rows[0]
    if (!row) return null
    row.lease_token = crypto.randomUUID()
    row.attempts += 1
    await tx.query(
      "UPDATE github_notifications SET attempts = $2, lease_token = $3, lease_until = now() + interval '5 minutes' WHERE id = $1",
      [row.id, row.attempts, row.lease_token]
    )
    return row
  })
  if (!item) return false
  try {
    const installation = await getDocument(
      db,
      "installations",
      item.owner_id,
      item.installation_id
    )
    const settings = await db.query(
      "SELECT installation_id FROM github_notification_settings WHERE installation_id = $1 AND owner_id = $2 AND enabled = true AND target_number = $3",
      [item.installation_id, item.owner_id, item.target_number]
    )
    const connection = await github.connection(item.owner_id)
    if (
      installation.state === "revoked" ||
      !settings.rows.length ||
      connection?.status !== "active"
    ) {
      await db.query(
        "UPDATE github_notifications SET status = 'cancelled', lease_token = NULL, lease_until = NULL WHERE id = $1 AND lease_token = $2",
        [item.id, item.lease_token]
      )
      return true
    }
    const repository = await github.verifyRepository(
      item.owner_id,
      installation.repository
    )
    const token = await github.client.token(
      Number(connection.github_installation_id),
      repository.id,
      true
    )
    const run = await getDocument(
      db,
      "runs",
      item.owner_id,
      item.run_id,
      item.installation_id
    )
    const marker = `<!-- rebnd:notification:${item.id} -->`
    const path = `/repos/${repository.full_name}/issues/${item.target_number}/comments`
    let commentId: number | undefined
    let exhausted = true
    for (let page = 1; page <= 100; page++) {
      const comments = await github.client.request<
        {
          id: number
          body: string
          performed_via_github_app?: { slug: string }
        }[]
      >(`${path}?per_page=100&page=${page}`, token)
      commentId = comments.find(
        (comment) =>
          comment.body.includes(marker) &&
          comment.performed_via_github_app?.slug ===
            new URL(github.client.installUrl).pathname.split("/")[2]
      )?.id
      if (commentId || comments.length < 100) {
        exhausted = false
        break
      }
    }
    if (exhausted)
      throw new ApiError(
        422,
        "COMMENT_LIMIT",
        "Use a notification thread with fewer comments."
      )
    const escape = (value: string) =>
      value
        .replace(/@/g, "＠")
        .replace(/[<>]/g, "")
        .replace(/[\\`*_[\]]/g, "\\$&")
    if (!commentId) {
      const lease = await db.query(
        "SELECT id FROM github_notifications WHERE id = $1 AND lease_token = $2 AND lease_until > now() + interval '30 seconds' AND status = 'pending'",
        [item.id, item.lease_token]
      )
      if (!lease.rows.length) return true
      const comment = await github.client.request<{ id: number }>(
        path,
        token,
        "POST",
        {
          body: `### rebnd · ${escape(run.kind)} ${escape(run.status)}\n\n${escape(run.reason ?? "Run status updated.")}\n\nRun: \`${run.id}\`\n\nThis update reports workflow status; it does not certify compatibility or approve a merge.\n\n${marker}`,
        }
      )
      commentId = comment.id
    }
    await db.query(
      "UPDATE github_notifications SET status = 'delivered', comment_id = $3, last_error = NULL, lease_token = NULL, lease_until = NULL WHERE id = $1 AND lease_token = $2 AND status = 'pending'",
      [item.id, item.lease_token, commentId]
    )
  } catch (error) {
    await db.query(
      "UPDATE github_notifications SET status = $3, last_error = $4, available_at = now() + ($5 * interval '1 second'), lease_token = NULL, lease_until = NULL WHERE id = $1 AND lease_token = $2 AND status = 'pending'",
      [
        item.id,
        item.lease_token,
        item.attempts >= 5 ? "failed" : "pending",
        error instanceof ApiError ? error.code : "DELIVERY_FAILED",
        Math.min(3600, 30 * 2 ** item.attempts),
      ]
    )
  }
  return true
}
