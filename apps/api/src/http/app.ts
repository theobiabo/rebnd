import { Hono } from "hono"
import { cors } from "hono/cors"
import { bodyLimit } from "hono/body-limit"
import { secureHeaders } from "hono/secure-headers"
import { requestId } from "hono/request-id"
import { z, ZodError } from "zod"
import {
  pageQuerySchema,
  type Installation,
} from "@workspace/shared/contracts/api"
import type { Auth } from "../auth/auth"
import type { Database } from "../db/database"
import {
  InstallationService,
  workspace,
  type Command,
} from "../modules/installations/service"
import {
  audit,
  getDocument,
  listDocuments,
} from "../modules/installations/repository"
import { ApiError } from "./errors"

type Session = {
  user: { id: string; name: string; email: string; image?: string | null }
}
export type AuthGateway = {
  handler: Auth["handler"]
  api: {
    getSession: (options: { headers: Headers }) => Promise<Session | null>
  }
}
type AppEnv = { Variables: { ownerId: string; requestId: string } }
export function createApp(db: Database, auth: AuthGateway, webOrigin: string) {
  const app = new Hono<AppEnv>()
  const service = new InstallationService(db)
  app.use("*", requestId())
  app.use("*", secureHeaders())
  app.use(
    "/api/*",
    cors({
      origin: webOrigin,
      credentials: true,
      allowHeaders: ["Content-Type", "Idempotency-Key"],
      allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
      exposeHeaders: ["X-Request-Id"],
      maxAge: 600,
    })
  )
  app.use(
    "/api/*",
    bodyLimit({
      maxSize: 65536,
      onError: () => {
        throw new ApiError(
          413,
          "BODY_TOO_LARGE",
          "Requests must be smaller than 64 KiB."
        )
      },
    })
  )
  app.use("/api/*", async (c, next) => {
    c.header("Cache-Control", "no-store")
    await next()
  })
  app.get("/health", (c) => c.json({ status: "ok" }))
  app.get("/ready", async (c) => {
    try {
      await db.query("SELECT 1 FROM installations LIMIT 1")
      return c.json({ status: "ready" })
    } catch {
      return c.json({ status: "unavailable" }, 503)
    }
  })
  app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  app.use("/api/v1/*", async (c, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
      if (c.req.header("Origin") !== webOrigin)
        throw new ApiError(
          403,
          "ORIGIN_REJECTED",
          "Mutations must come from the configured application origin."
        )
      if (
        !c.req
          .header("Content-Type")
          ?.toLowerCase()
          .startsWith("application/json")
      )
        throw new ApiError(
          400,
          "JSON_REQUIRED",
          "Send an application/json request body."
        )
    }
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session)
      throw new ApiError(
        401,
        "UNAUTHENTICATED",
        "Sign in to access your workspace."
      )
    c.set("ownerId", session.user.id)
    const result = await db.query<{ count: number }>(
      `INSERT INTO api_rate_limits(owner_id, window_start, count) VALUES($1, now(), 1) ON CONFLICT(owner_id) DO UPDATE SET count = CASE WHEN api_rate_limits.window_start < now() - interval '1 minute' THEN 1 ELSE api_rate_limits.count + 1 END, window_start = CASE WHEN api_rate_limits.window_start < now() - interval '1 minute' THEN now() ELSE api_rate_limits.window_start END RETURNING count`,
      [session.user.id]
    )
    if (result.rows[0].count > 120) {
      c.header("Retry-After", "60")
      throw new ApiError(
        429,
        "RATE_LIMITED",
        "Too many requests. Try again in a minute."
      )
    }
    await next()
  })
  app.get("/api/v1/installations", async (c) => {
    const { limit, offset } = pageQuerySchema.parse(c.req.query())
    const result = await db.query<{ document: Installation }>(
      "SELECT document FROM installations WHERE owner_id = $1 ORDER BY document->>'createdAt' DESC, id DESC LIMIT $2 OFFSET $3",
      [c.get("ownerId"), limit + 1, offset]
    )
    return c.json({
      items: result.rows.slice(0, limit).map((row) => row.document),
      nextOffset: result.rows.length > limit ? offset + limit : null,
    })
  })
  app.use("/api/v1/installations/:installationId/*", async (c, next) => {
    z.uuid().parse(c.req.param("installationId"))
    await next()
  })
  app.get("/api/v1/installations/:installationId", async (c) =>
    c.json(
      await workspace(
        db,
        c.get("ownerId"),
        z.uuid().parse(c.req.param("installationId"))
      )
    )
  )
  const base = "/api/v1/installations/:installationId"
  const mutations: ["post" | "patch", string, Command][] = [
    ["post", "/api/v1/installations", "create"],
    ["patch", `${base}/settings`, "settings"],
    ["post", `${base}/workflows`, "workflow"],
    ["post", `${base}/approvals`, "approve"],
    ["post", `${base}/scans`, "scan"],
    ["post", `${base}/runs`, "run"],
    ["post", `${base}/runs/:resourceId/cancel`, "cancel"],
    ["post", `${base}/runs/:resourceId/publish`, "publish"],
    ["post", `${base}/changes/:resourceId/ignore`, "ignore"],
    ["post", `${base}/changes/:resourceId/restore`, "restore"],
    ["post", `${base}/changes/:resourceId/approve`, "approve-target"],
    ["post", `${base}/revoke`, "revoke"],
  ]
  for (const [method, path, command] of mutations) {
    app[method](path, async (c) => {
      const id = c.req.param("installationId")
      const resourceId = c.req.param("resourceId")
      if (id) z.uuid().parse(id)
      if (resourceId) z.uuid().parse(resourceId)
      let input: unknown
      try {
        input = await c.req.json()
      } catch {
        throw new ApiError(
          400,
          "INVALID_JSON",
          "The request body is not valid JSON."
        )
      }
      const result = await service.execute(
        c.get("ownerId"),
        c.req.header("Idempotency-Key") ?? "",
        command,
        input,
        id,
        resourceId
      )
      return c.json(result, command === "create" ? 201 : 200)
    })
  }
  const lists = {
    changes: "changes",
    runs: "runs",
    evidence: "evidence",
    activity: "audit_events",
    workflows: "workflow_revisions",
  } as const
  for (const [path, table] of Object.entries(lists)) {
    app.get(`${base}/${path}`, async (c) => {
      const id = z.uuid().parse(c.req.param("installationId"))
      const { limit, offset } = pageQuerySchema.parse(c.req.query())
      if (table === "evidence") {
        const page = await listDocuments(
          db,
          "evidence",
          c.get("ownerId"),
          id,
          limit,
          offset
        )
        const current = await workspace(db, c.get("ownerId"), id)
        const items = page.items.map(({ manifest, ...item }) => {
          void manifest
          return {
            ...item,
            stale: item.workflowId !== current.installation.approvedWorkflowId,
          }
        })
        return c.json({ ...page, items })
      }
      return c.json(
        await listDocuments(db, table, c.get("ownerId"), id, limit, offset)
      )
    })
  }
  app.get(`${base}/runs/:resourceId`, async (c) =>
    c.json(
      await getDocument(
        db,
        "runs",
        c.get("ownerId"),
        z.uuid().parse(c.req.param("resourceId")),
        z.uuid().parse(c.req.param("installationId"))
      )
    )
  )
  app.get(`${base}/changes/:resourceId`, async (c) =>
    c.json(
      await getDocument(
        db,
        "changes",
        c.get("ownerId"),
        z.uuid().parse(c.req.param("resourceId")),
        z.uuid().parse(c.req.param("installationId"))
      )
    )
  )
  app.get(`${base}/evidence/:resourceId/manifest`, async (c) => {
    const ownerId = c.get("ownerId")
    const id = z.uuid().parse(c.req.param("installationId"))
    const evidence = await getDocument(
      db,
      "evidence",
      ownerId,
      z.uuid().parse(c.req.param("resourceId")),
      id
    )
    const installation = await getDocument(db, "installations", ownerId, id)
    if (
      Date.parse(evidence.createdAt) +
        installation.evidenceRetentionDays * 86400000 <
      Date.now()
    )
      throw new ApiError(
        404,
        "EVIDENCE_EXPIRED",
        "This evidence is outside the retention window."
      )
    await audit(db, ownerId, id, "evidence.downloaded", evidence.id)
    c.header(
      "Content-Disposition",
      `attachment; filename="rebnd-evidence-${evidence.id}.json"`
    )
    return c.json({
      ...evidence,
      stale: evidence.workflowId !== installation.approvedWorkflowId,
    })
  })
  app.notFound((c) =>
    c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "This endpoint does not exist.",
          requestId: c.get("requestId"),
        },
      },
      404
    )
  )
  app.onError((error, c) => {
    const failure =
      error instanceof ApiError
        ? error
        : error instanceof ZodError
          ? new ApiError(
              422,
              "VALIDATION_ERROR",
              "Check the request fields.",
              error.flatten()
            )
          : null
    if (!failure)
      console.error(
        JSON.stringify({
          event: "request.failed",
          requestId: c.get("requestId"),
          errorType: error.name,
        })
      )
    return c.json(
      {
        error: {
          code: failure?.code ?? "INTERNAL_ERROR",
          message: failure?.message ?? "The request could not be completed.",
          requestId: c.get("requestId"),
          ...(failure?.details ? { details: failure.details } : {}),
        },
      },
      failure?.status ?? 500
    )
  })
  return app
}
