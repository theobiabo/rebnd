import { z } from "zod"

const text = z.string().trim().min(1).max(500)
const sha = z.string().regex(/^[a-f0-9]{40}$/)
const hash = z.string().regex(/^[a-f0-9]{64}$/)
const path = z
  .string()
  .min(1)
  .max(240)
  .regex(/^[a-zA-Z0-9_./-]+$/)
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value
        .split("/")
        .some((part) => part === ".." || part === ".git" || part === ".github")
  )
export const expectedRevisionSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
})
export const installationInputSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    repository: z
      .string()
      .regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/)
      .max(200),
    defaultBranch: z.string().trim().min(1).max(150).default("main"),
    expectedRevision: z.literal(0),
  })
  .strict()
export const settingsInputSchema = expectedRevisionSchema
  .extend({
    monitoringPaused: z.boolean().optional(),
    executionPaused: z.boolean().optional(),
    publishingEnabled: z.boolean().optional(),
    monthlyRunLimit: z.number().int().min(1).max(100).optional(),
    evidenceRetentionDays: z.number().int().min(1).max(30).optional(),
  })
  .strict()
export const workflowInputSchema = expectedRevisionSchema
  .extend({
    name: text,
    entrypoint: path,
    baseSha: sha,
    provider: text,
    sdkVersion: text,
    apiVersion: text.nullable(),
    targetVersion: text,
    allowedPaths: z.array(path).min(1).max(5),
    checkCommands: z.array(text).min(1).max(10),
    assertions: z
      .array(
        z
          .object({
            id: z
              .string()
              .regex(/^[a-z0-9_-]+$/)
              .max(80),
            description: text,
          })
          .strict()
      )
      .min(1)
      .max(30),
    assertionArtifactHash: hash,
    sourceUrls: z
      .array(z.url().refine((url) => new URL(url).protocol === "https:"))
      .min(1)
      .max(10),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.assertions.map((item) => item.id)).size ===
      value.assertions.length,
    { message: "Assertion IDs must be unique" }
  )
export const approvalInputSchema = expectedRevisionSchema
  .extend({
    workflowId: z.uuid(),
    assertionArtifactHash: hash,
  })
  .strict()
export const reasonInputSchema = expectedRevisionSchema
  .extend({ reason: z.string().trim().min(3).max(1000) })
  .strict()
export const runInputSchema = expectedRevisionSchema
  .extend({ changeId: z.uuid() })
  .strict()
export const pageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
})

export type InstallationInput = z.infer<typeof installationInputSchema>
export type SettingsInput = z.infer<typeof settingsInputSchema>
export type WorkflowInput = z.infer<typeof workflowInputSchema>
export type WorkflowDefinition = Omit<WorkflowInput, "expectedRevision">
export type Installation = {
  id: string
  name: string
  repository: string
  defaultBranch: string
  revision: number
  state: "scan_only" | "awaiting_approval" | "active" | "revoked"
  monitoringPaused: boolean
  executionPaused: boolean
  publishingEnabled: boolean
  monthlyRunLimit: number
  evidenceRetentionDays: number
  workflowId: string | null
  approvedWorkflowId: string | null
  monitoringLastSuccessAt: string | null
  createdAt: string
  updatedAt: string
}
export type WorkflowRevision = {
  id: string
  installationId: string
  number: number
  definition: WorkflowDefinition
  approvedAt: string | null
  approvedBy: string | null
  createdAt: string
}
export type ChangeRecord = {
  id: string
  installationId: string
  title: string
  targetVersion: string
  status: "needs_review" | "ready" | "ignored" | "blocked" | "unsupported"
  reason: string | null
  sourceUrl: string
  sourceHash: string
  evidenceInputHash: string | null
  approvedWorkflowId: string | null
  createdAt: string
}
export type RunRecord = {
  id: string
  installationId: string
  workflowId: string | null
  changeId: string | null
  kind: "scan" | "verification"
  status:
    "queued" | "running" | "blocked" | "cancelled" | "failed" | "completed"
  reasonCode: string | null
  reason: string | null
  createdAt: string
  finishedAt: string | null
}
export type EvidenceRecord = {
  id: string
  installationId: string
  runId: string
  workflowId: string
  level: "local_regression" | "target_fixture" | "target_sandbox"
  manifest: Record<string, unknown>
  createdAt: string
  stale: boolean
}
export type EvidenceSummary = Omit<EvidenceRecord, "manifest">
export type AuditRecord = {
  id: string
  action: string
  actorId: string
  detail: string
  createdAt: string
}
export type Workspace = {
  installation: Installation
  workflow: WorkflowRevision | null
}
export type MutationResult = Workspace & {
  run?: RunRecord
  change?: ChangeRecord
}
export type ApiErrorBody = {
  error: { code: string; message: string; requestId: string; details?: unknown }
}
export type Page<T> = { items: T[]; nextOffset: number | null }
