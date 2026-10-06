import type { Database } from "../../db/database"
import { audit, getDocument, saveDocument } from "../installations/repository"

type Job = {
  id: string
  owner_id: string
  installation_id: string
  run_id: string
  lease_token: string
  attempts: number
  created_at: Date
}
export async function processNextJob(db: Database): Promise<boolean> {
  const job = await db.transaction(async (connection) => {
    const result = await connection.query<Job>(
      `SELECT * FROM jobs WHERE (status = 'pending' AND available_at <= now()) OR (status = 'leased' AND lease_until < now()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`
    )
    const item = result.rows[0]
    if (!item) return null
    item.lease_token = crypto.randomUUID()
    item.attempts += 1
    await connection.query(
      "UPDATE jobs SET status = 'leased', attempts = $2, lease_token = $3, lease_until = now() + interval '30 seconds' WHERE id = $1",
      [item.id, item.attempts, item.lease_token]
    )
    return item
  })
  if (!job) return false
  await db.transaction(async (connection) => {
    await connection.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      job.owner_id,
    ])
    const lease = await connection.query(
      "SELECT id FROM jobs WHERE id = $1 AND status = 'leased' AND lease_token = $2 AND lease_until > now() FOR UPDATE",
      [job.id, job.lease_token]
    )
    if (!lease.rows.length) return
    const installation = await getDocument(
      connection,
      "installations",
      job.owner_id,
      job.installation_id
    )
    const run = await getDocument(
      connection,
      "runs",
      job.owner_id,
      job.run_id,
      installation.id
    )
    if (run.status !== "queued" && run.status !== "running") {
      await connection.query(
        "UPDATE jobs SET status = 'completed', lease_token = NULL, lease_until = NULL WHERE id = $1",
        [job.id]
      )
      return
    }
    const cancelled =
      installation.state === "revoked" ||
      (run.kind === "scan"
        ? installation.monitoringPaused
        : installation.executionPaused ||
          run.workflowId !== installation.approvedWorkflowId)
    const expired = Date.now() - Date.parse(run.createdAt) >= 15 * 60 * 1000
    const exhausted = job.attempts > 3
    run.status = cancelled
      ? "cancelled"
      : expired || exhausted
        ? "failed"
        : "blocked"
    run.reasonCode = cancelled
      ? "POLICY_CHANGED"
      : expired
        ? "JOB_TIMEOUT"
        : exhausted
          ? "RETRY_EXHAUSTED"
          : run.kind === "scan"
            ? "GITHUB_APP_REQUIRED"
            : "PROVIDER_ADAPTER_REQUIRED"
    run.reason = cancelled
      ? "The installation policy changed before the job started."
      : expired
        ? "The job exceeded its 15-minute deadline."
        : exhausted
          ? "The infrastructure retry budget was exhausted."
          : run.kind === "scan"
            ? "Connect a selected-repository GitHub App before scanning. GitHub sign-in grants identity access only."
            : "Select the provider and target evidence source, and configure an isolated runner before verification. No code was executed."
    run.finishedAt = new Date().toISOString()
    await saveDocument(connection, "runs", job.owner_id, run)
    installation.revision += 1
    installation.updatedAt = run.finishedAt
    await saveDocument(connection, "installations", job.owner_id, installation)
    await audit(
      connection,
      job.owner_id,
      installation.id,
      `run.${run.status}`,
      `${run.id}: ${run.reasonCode}`
    )
    await connection.query(
      "UPDATE jobs SET status = 'completed', lease_token = NULL, lease_until = NULL WHERE id = $1",
      [job.id]
    )
  })
  return true
}
