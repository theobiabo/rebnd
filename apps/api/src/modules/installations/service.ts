import { createHash } from "node:crypto"
import {
  approvalInputSchema,
  expectedRevisionSchema,
  installationInputSchema,
  reasonInputSchema,
  runInputSchema,
  settingsInputSchema,
  workflowInputSchema,
  type Installation,
  type MutationResult,
  type RunRecord,
  type Workspace,
} from "@workspace/shared/contracts/api"
import type { Database, SqlExecutor } from "../../db/database"
import { ApiError } from "../../http/errors"
import { audit, getDocument, saveDocument } from "./repository"

export type Command =
  | "create"
  | "settings"
  | "workflow"
  | "approve"
  | "scan"
  | "run"
  | "cancel"
  | "ignore"
  | "restore"
  | "approve-target"
  | "publish"
  | "revoke"
const schemas = {
  create: installationInputSchema,
  settings: settingsInputSchema,
  workflow: workflowInputSchema,
  approve: approvalInputSchema,
  scan: expectedRevisionSchema.strict(),
  run: runInputSchema,
  cancel: reasonInputSchema,
  ignore: reasonInputSchema,
  restore: expectedRevisionSchema.strict(),
  "approve-target": expectedRevisionSchema.strict(),
  publish: expectedRevisionSchema.strict(),
  revoke: reasonInputSchema,
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`
  return JSON.stringify(value) ?? "null"
}
export function digest(value: unknown) {
  return createHash("sha256").update(canonical(value)).digest("hex")
}
export async function workspace(
  db: SqlExecutor,
  ownerId: string,
  installationId: string
): Promise<Workspace> {
  const installation = await getDocument(
    db,
    "installations",
    ownerId,
    installationId
  )
  const workflow = installation.workflowId
    ? await getDocument(
        db,
        "workflow_revisions",
        ownerId,
        installation.workflowId,
        installationId
      )
    : null
  return { installation, workflow }
}
async function stopRuns(
  db: SqlExecutor,
  ownerId: string,
  installationId: string,
  reason: string
) {
  await db.query(
    `UPDATE runs SET document = document || jsonb_build_object('status', 'cancelled', 'reasonCode', 'CANCELLED', 'reason', $3::text, 'finishedAt', $4::text) WHERE owner_id = $1 AND installation_id = $2 AND document->>'status' IN ('queued', 'running')`,
    [ownerId, installationId, reason, new Date().toISOString()]
  )
  await db.query(
    "UPDATE jobs SET status = 'cancelled', lease_token = NULL, lease_until = NULL WHERE owner_id = $1 AND installation_id = $2 AND status IN ('pending', 'leased')",
    [ownerId, installationId]
  )
}
async function enqueue(
  db: SqlExecutor,
  ownerId: string,
  installation: Installation,
  kind: RunRecord["kind"],
  runKey: string,
  changeId: string | null
): Promise<RunRecord> {
  const existing = await db.query<{ document: RunRecord }>(
    "SELECT document FROM runs WHERE owner_id = $1 AND installation_id = $2 AND run_key = $3",
    [ownerId, installation.id, runKey]
  )
  if (existing.rows[0]) return existing.rows[0].document
  const active = await db.query(
    "SELECT id FROM runs WHERE owner_id = $1 AND installation_id = $2 AND document->>'status' IN ('queued', 'running')",
    [ownerId, installation.id]
  )
  if (active.rows.length)
    throw new ApiError(
      409,
      "RUN_ACTIVE",
      "This installation already has an active run."
    )
  const counts = await db.query<{ count: string }>(
    "SELECT count(*) FROM runs WHERE owner_id = $1 AND installation_id = $2 AND (document->>'createdAt')::timestamptz >= date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'",
    [ownerId, installation.id]
  )
  if (Number(counts.rows[0].count) >= installation.monthlyRunLimit)
    throw new ApiError(
      409,
      "QUOTA_EXHAUSTED",
      "The monthly run allowance is exhausted. Review the budget before requesting more runs."
    )
  const run: RunRecord = {
    id: crypto.randomUUID(),
    installationId: installation.id,
    workflowId: installation.workflowId,
    changeId,
    kind,
    status: "queued",
    reason: null,
    reasonCode: null,
    createdAt: new Date().toISOString(),
    finishedAt: null,
  }
  await db.query(
    "INSERT INTO runs(id, owner_id, installation_id, run_key, document) VALUES($1,$2,$3,$4,$5::jsonb)",
    [run.id, ownerId, installation.id, runKey, JSON.stringify(run)]
  )
  await db.query(
    "INSERT INTO jobs(id, owner_id, installation_id, run_id) VALUES($1,$2,$3,$4)",
    [crypto.randomUUID(), ownerId, installation.id, run.id]
  )
  return run
}
export class InstallationService {
  constructor(private db: Database) {}

  async execute(
    ownerId: string,
    key: string,
    command: Command,
    input: unknown,
    installationId?: string,
    resourceId?: string
  ): Promise<MutationResult> {
    const parsed = schemas[command].safeParse(input)
    if (!parsed.success)
      throw new ApiError(
        422,
        "VALIDATION_ERROR",
        "Check the request fields.",
        parsed.error.flatten()
      )
    if (!/^[a-zA-Z0-9_-]{16,128}$/.test(key))
      throw new ApiError(
        400,
        "IDEMPOTENCY_KEY_REQUIRED",
        "Send a unique Idempotency-Key header of 16–128 characters."
      )
    const requestHash = digest({
      command,
      installationId,
      resourceId,
      input: parsed.data,
    })
    return this.db.transaction(async (db) => {
      await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [ownerId])
      if (installationId)
        await getDocument(db, "installations", ownerId, installationId)
      const previous = await db.query<{
        request_hash: string
        response: MutationResult
      }>(
        "SELECT request_hash, response FROM idempotency_keys WHERE owner_id = $1 AND key = $2",
        [ownerId, key]
      )
      if (previous.rows[0]) {
        if (previous.rows[0].request_hash !== requestHash)
          throw new ApiError(
            409,
            "IDEMPOTENCY_CONFLICT",
            "This key was already used for a different request."
          )
        return previous.rows[0].response
      }
      const result =
        command === "create"
          ? await this.create(db, ownerId, parsed.data)
          : await this.mutate(
              db,
              ownerId,
              command,
              parsed.data,
              installationId!,
              resourceId
            )
      await db.query(
        "INSERT INTO idempotency_keys(owner_id, key, request_hash, response) VALUES($1,$2,$3,$4::jsonb)",
        [ownerId, key, requestHash, JSON.stringify(result)]
      )
      return result
    })
  }

  private async create(
    db: SqlExecutor,
    ownerId: string,
    input: unknown
  ): Promise<MutationResult> {
    const value = installationInputSchema.parse(input)
    const count = await db.query<{ count: string }>(
      "SELECT count(*) FROM installations WHERE owner_id = $1 AND document->>'state' <> 'revoked'",
      [ownerId]
    )
    if (Number(count.rows[0].count) >= 1)
      throw new ApiError(
        409,
        "INSTALLATION_LIMIT",
        "The pilot supports one active installation per owner."
      )
    const now = new Date().toISOString()
    const installation: Installation = {
      id: crypto.randomUUID(),
      name: value.name,
      repository: value.repository,
      defaultBranch: value.defaultBranch,
      revision: 1,
      state: "scan_only",
      monitoringPaused: false,
      executionPaused: true,
      publishingEnabled: false,
      monthlyRunLimit: 20,
      evidenceRetentionDays: 30,
      workflowId: null,
      approvedWorkflowId: null,
      monitoringLastSuccessAt: null,
      createdAt: now,
      updatedAt: now,
    }
    await db.query(
      "INSERT INTO installations(id, owner_id, document) VALUES($1,$2,$3::jsonb)",
      [installation.id, ownerId, JSON.stringify(installation)]
    )
    await audit(
      db,
      ownerId,
      installation.id,
      "installation.created",
      "Repository selection saved; repository access has not been granted."
    )
    return { installation, workflow: null }
  }

  private async mutate(
    db: SqlExecutor,
    ownerId: string,
    command: Exclude<Command, "create">,
    input: unknown,
    id: string,
    resourceId?: string
  ): Promise<MutationResult> {
    const current = await workspace(db, ownerId, id)
    const installation = current.installation
    const { expectedRevision } = expectedRevisionSchema.parse(input)
    if (expectedRevision !== installation.revision)
      throw new ApiError(
        409,
        "REVISION_CONFLICT",
        "The workspace changed. Refresh before retrying.",
        current
      )
    if (installation.state === "revoked")
      throw new ApiError(
        409,
        "INSTALLATION_REVOKED",
        "This installation has been revoked."
      )
    let workflow = current.workflow
    const extra: Pick<MutationResult, "run" | "change"> = {}
    let detail = `Revision ${installation.revision + 1}`
    switch (command) {
      case "settings": {
        const { expectedRevision: _, ...settings } =
          settingsInputSchema.parse(input)
        void _
        if (settings.publishingEnabled)
          throw new ApiError(
            409,
            "PUBLISHER_UNAVAILABLE",
            "Configure the separate GitHub App publisher before enabling publishing."
          )
        Object.assign(installation, settings)
        if (settings.executionPaused)
          await stopRuns(db, ownerId, id, "Execution paused by the owner.")
        if (settings.monitoringPaused) {
          await db.query(
            `UPDATE runs SET document = document || jsonb_build_object('status', 'cancelled', 'reasonCode', 'MONITORING_PAUSED', 'reason', 'Monitoring paused by the owner.', 'finishedAt', $3::text) WHERE owner_id = $1 AND installation_id = $2 AND document->>'kind' = 'scan' AND document->>'status' IN ('queued', 'running')`,
            [ownerId, id, new Date().toISOString()]
          )
          await db.query(
            "UPDATE jobs SET status = 'cancelled', lease_token = NULL WHERE owner_id = $1 AND installation_id = $2 AND run_id IN (SELECT id FROM runs WHERE owner_id = $1 AND installation_id = $2 AND document->>'status' = 'cancelled')",
            [ownerId, id]
          )
        }
        break
      }
      case "workflow": {
        const { expectedRevision: _, ...definition } =
          workflowInputSchema.parse(input)
        void _
        workflow = {
          id: crypto.randomUUID(),
          installationId: id,
          number: (workflow?.number ?? 0) + 1,
          definition,
          approvedAt: null,
          approvedBy: null,
          createdAt: new Date().toISOString(),
        }
        await db.query(
          "INSERT INTO workflow_revisions(id, owner_id, installation_id, document) VALUES($1,$2,$3,$4::jsonb)",
          [workflow.id, ownerId, id, JSON.stringify(workflow)]
        )
        installation.workflowId = workflow.id
        installation.approvedWorkflowId = null
        installation.state = "awaiting_approval"
        await stopRuns(
          db,
          ownerId,
          id,
          "Workflow revision changed; prior approvals and evidence are stale."
        )
        detail = `Created immutable workflow revision ${workflow.number}; prior evidence is stale.`
        break
      }
      case "approve": {
        const value = approvalInputSchema.parse(input)
        if (
          !workflow ||
          workflow.id !== value.workflowId ||
          workflow.definition.assertionArtifactHash !==
            value.assertionArtifactHash
        )
          throw new ApiError(
            409,
            "APPROVAL_MISMATCH",
            "Approve the exact current workflow and assertion artifact hash."
          )
        if (workflow.approvedAt)
          throw new ApiError(
            409,
            "ALREADY_APPROVED",
            "This workflow revision is already approved."
          )
        workflow = {
          ...workflow,
          approvedAt: new Date().toISOString(),
          approvedBy: ownerId,
        }
        await saveDocument(db, "workflow_revisions", ownerId, workflow)
        installation.approvedWorkflowId = workflow.id
        installation.state = "active"
        detail = `Approved workflow ${workflow.id} with assertion artifact ${value.assertionArtifactHash}.`
        break
      }
      case "scan": {
        if (installation.monitoringPaused)
          throw new ApiError(
            409,
            "MONITORING_PAUSED",
            "Resume monitoring before requesting a scan."
          )
        extra.run = await enqueue(
          db,
          ownerId,
          installation,
          "scan",
          digest({ id, revision: installation.revision, kind: "scan" }),
          null
        )
        break
      }
      case "run": {
        if (installation.executionPaused)
          throw new ApiError(
            409,
            "EXECUTION_PAUSED",
            "Resume execution before requesting verification."
          )
        if (!workflow || installation.approvedWorkflowId !== workflow.id)
          throw new ApiError(
            409,
            "APPROVAL_REQUIRED",
            "Approve the current workflow before requesting verification."
          )
        const { changeId } = runInputSchema.parse(input)
        const change = await getDocument(db, "changes", ownerId, changeId, id)
        if (
          change.status !== "ready" ||
          change.approvedWorkflowId !== workflow.id ||
          change.targetVersion !== workflow.definition.targetVersion
        )
          throw new ApiError(
            409,
            "TARGET_APPROVAL_REQUIRED",
            "Approve this change for the current workflow and target version."
          )
        if (!change.evidenceInputHash)
          throw new ApiError(
            409,
            "TARGET_EVIDENCE_UNAVAILABLE",
            "Version-specific target evidence is required before execution."
          )
        const runKey = digest({
          ownerId,
          repository: installation.repository,
          workflow: workflow.id,
          change: change.id,
          baseSha: workflow.definition.baseSha,
          target: change.targetVersion,
          input: change.evidenceInputHash,
        })
        extra.run = await enqueue(
          db,
          ownerId,
          installation,
          "verification",
          runKey,
          changeId
        )
        break
      }
      case "cancel": {
        const run = await getDocument(db, "runs", ownerId, resourceId!, id)
        if (!["queued", "running"].includes(run.status))
          throw new ApiError(
            409,
            "RUN_NOT_ACTIVE",
            "Only queued or running work can be cancelled."
          )
        const { reason } = reasonInputSchema.parse(input)
        extra.run = {
          ...run,
          status: "cancelled",
          reason,
          reasonCode: "CANCELLED",
          finishedAt: new Date().toISOString(),
        }
        await saveDocument(db, "runs", ownerId, extra.run)
        await db.query(
          "UPDATE jobs SET status = 'cancelled', lease_token = NULL, lease_until = NULL WHERE owner_id = $1 AND installation_id = $2 AND run_id = $3",
          [ownerId, id, run.id]
        )
        detail = reason
        break
      }
      case "ignore":
      case "restore":
      case "approve-target": {
        const change = await getDocument(
          db,
          "changes",
          ownerId,
          resourceId!,
          id
        )
        if (command === "approve-target") {
          if (
            !workflow ||
            installation.approvedWorkflowId !== workflow.id ||
            change.targetVersion !== workflow.definition.targetVersion
          )
            throw new ApiError(
              409,
              "APPROVAL_REQUIRED",
              "The current approved workflow must include this target version."
            )
          if (change.status === "unsupported" || change.status === "ignored")
            throw new ApiError(
              409,
              "CHANGE_NOT_APPROVABLE",
              "Restore ignored changes or resolve unsupported mappings before approval."
            )
          change.status = "ready"
          change.approvedWorkflowId = workflow.id
          change.reason = null
        } else {
          if (command === "restore" && change.status !== "ignored")
            throw new ApiError(
              409,
              "CHANGE_NOT_IGNORED",
              "Only ignored changes can be restored."
            )
          change.status = command === "ignore" ? "ignored" : "needs_review"
          change.reason =
            command === "ignore" ? reasonInputSchema.parse(input).reason : null
          change.approvedWorkflowId = null
          await stopRuns(
            db,
            ownerId,
            id,
            "Change disposition changed; review required."
          )
        }
        await saveDocument(db, "changes", ownerId, change)
        extra.change = change
        detail = `${change.id}: ${change.reason ?? change.status}`
        break
      }
      case "publish": {
        const run = await getDocument(db, "runs", ownerId, resourceId!, id)
        if (
          run.status !== "completed" ||
          run.workflowId !== installation.approvedWorkflowId ||
          installation.executionPaused
        )
          throw new ApiError(
            409,
            "PUBLICATION_BLOCKED",
            "Publishing requires completed verification for the current approval and active execution."
          )
        throw new ApiError(
          409,
          "PUBLISHER_UNAVAILABLE",
          "Trusted publishing and artifact verification are not configured. No pull request was created."
        )
      }
      case "revoke": {
        detail = reasonInputSchema.parse(input).reason
        installation.state = "revoked"
        installation.monitoringPaused = true
        installation.executionPaused = true
        installation.publishingEnabled = false
        await stopRuns(db, ownerId, id, "Installation revoked.")
        break
      }
    }
    installation.revision += 1
    installation.updatedAt = new Date().toISOString()
    await saveDocument(db, "installations", ownerId, installation)
    await audit(db, ownerId, id, `installation.${command}`, detail)
    return { installation, workflow, ...extra }
  }
}
