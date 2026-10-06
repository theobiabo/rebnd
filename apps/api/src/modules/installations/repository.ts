import type {
  AuditRecord,
  ChangeRecord,
  EvidenceRecord,
  Installation,
  RunRecord,
  WorkflowRevision,
} from "@workspace/shared/contracts/api"
import type { SqlExecutor } from "../../db/database"
import { notFound } from "../../http/errors"

type Documents = {
  installations: Installation
  workflow_revisions: WorkflowRevision
  changes: ChangeRecord
  runs: RunRecord
  evidence: EvidenceRecord
  audit_events: AuditRecord
}
export async function getDocument<K extends keyof Documents>(
  db: SqlExecutor,
  table: K,
  ownerId: string,
  id: string,
  installationId?: string
): Promise<Documents[K]> {
  const result = await db.query<{ document: Documents[K] }>(
    `SELECT document FROM ${table} WHERE owner_id = $1 AND id = $2${installationId ? " AND installation_id = $3" : ""}`,
    installationId ? [ownerId, id, installationId] : [ownerId, id]
  )
  return result.rows[0]?.document ?? notFound()
}
export async function saveDocument<K extends keyof Documents>(
  db: SqlExecutor,
  table: K,
  ownerId: string,
  value: Documents[K]
) {
  await db.query(
    `UPDATE ${table} SET document = $3::jsonb WHERE owner_id = $1 AND id = $2`,
    [ownerId, value.id, JSON.stringify(value)]
  )
}
export async function listDocuments<
  K extends Exclude<keyof Documents, "installations">,
>(
  db: SqlExecutor,
  table: K,
  ownerId: string,
  installationId: string,
  limit: number,
  offset: number
) {
  await getDocument(db, "installations", ownerId, installationId)
  const result = await db.query<{ document: Documents[K] }>(
    `SELECT document FROM ${table} WHERE owner_id = $1 AND installation_id = $2 ORDER BY document->>'createdAt' DESC, id DESC LIMIT $3 OFFSET $4`,
    [ownerId, installationId, limit + 1, offset]
  )
  return {
    items: result.rows.slice(0, limit).map((row) => row.document),
    nextOffset: result.rows.length > limit ? offset + limit : null,
  }
}
export async function audit(
  db: SqlExecutor,
  ownerId: string,
  installationId: string,
  action: string,
  detail: string
) {
  const record: AuditRecord = {
    id: crypto.randomUUID(),
    actorId: ownerId,
    action,
    detail,
    createdAt: new Date().toISOString(),
  }
  await db.query(
    "INSERT INTO audit_events(id, owner_id, installation_id, document) VALUES($1, $2, $3, $4::jsonb)",
    [record.id, ownerId, installationId, JSON.stringify(record)]
  )
}
