import { beforeAll, afterAll, describe, expect, it, vi } from "vitest"
import { createHmac } from "node:crypto"
import { createApp } from "../src/http/app"
import { testDatabase, testEnvironment } from "./database"
import { processNextJob } from "../src/modules/jobs/processor"
import type {
  MutationResult,
  RunRecord,
  WorkflowInput,
} from "@workspace/shared/contracts/api"

let fixture: Awaited<ReturnType<typeof testDatabase>>
let app: ReturnType<typeof createApp>
let ownerCookie: string
let otherCookie: string
let ownerId: string
const origin = testEnvironment.WEB_ORIGIN
function signedCookie(token: string) {
  const signature = createHmac("sha256", testEnvironment.BETTER_AUTH_SECRET)
    .update(token)
    .digest("base64")
  return `better-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`
}
async function send(
  path: string,
  body?: unknown,
  options: {
    cookie?: string
    key?: string
    origin?: string
    method?: string
  } = {}
) {
  return app.request(`${origin}/api/v1${path}`, {
    method: options.method ?? (body ? "POST" : "GET"),
    headers: {
      Cookie: options.cookie ?? ownerCookie,
      Origin: options.origin ?? origin,
      "Content-Type": "application/json",
      "Idempotency-Key": options.key ?? crypto.randomUUID(),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}
const definition: Omit<WorkflowInput, "expectedRevision"> = {
  name: "Entitlement",
  entrypoint: "src/webhook.ts",
  baseSha: "a".repeat(40),
  provider: "fixture-provider",
  sdkVersion: "1.0.0",
  apiVersion: null,
  targetVersion: "2.0",
  allowedPaths: ["src/webhook.ts"],
  checkCommands: ["bun test"],
  assertions: [
    { id: "once", description: "One entitlement transition per unique event" },
  ],
  assertionArtifactHash: "b".repeat(64),
  sourceUrls: ["https://example.com/release"],
}
beforeAll(async () => {
  fixture = await testDatabase()
  const context = await fixture.auth.$context
  const owner = await context.internalAdapter.createUser(
    { name: "Owner", email: "owner@example.test", emailVerified: true },
    { method: "oauth", oauth: { providerId: "github" } }
  )
  const other = await context.internalAdapter.createUser(
    { name: "Other", email: "other@example.test", emailVerified: true },
    { method: "oauth", oauth: { providerId: "github" } }
  )
  ownerId = owner.id
  ownerCookie = signedCookie(
    (await context.internalAdapter.createSession(owner.id))!.token
  )
  otherCookie = signedCookie(
    (await context.internalAdapter.createSession(other.id))!.token
  )
  app = createApp(fixture.db, fixture.auth, origin)
}, 60000)
afterAll(async () => {
  await fixture?.close()
})

describe("persistent, authenticated control plane", () => {
  let current: MutationResult
  let scan: RunRecord
  it("rejects missing and tampered sessions", async () => {
    expect(
      (await send("/installations", undefined, { cookie: "" })).status
    ).toBe(401)
    expect(
      (
        await send("/installations", undefined, {
          cookie: ownerCookie + "tampered",
        })
      ).status
    ).toBe(401)
  })
  it("creates an installation and replays an identical idempotent request", async () => {
    const body = {
      name: "Billing",
      repository: "acme/billing",
      expectedRevision: 0,
    }
    const key = crypto.randomUUID()
    const response = await send("/installations", body, { key })
    expect(response.status).toBe(201)
    current = await response.json()
    expect(current.installation.revision).toBe(1)
    expect(await (await send("/installations", body, { key })).json()).toEqual(
      current
    )
    expect(
      (await send("/installations", { ...body, name: "Other" }, { key })).status
    ).toBe(409)
    const list = await (await send("/installations")).json()
    expect(list.items).toHaveLength(1)
  })
  it("rejects cross-owner reads and writes without leaking existence", async () => {
    const path = `/installations/${current.installation.id}`
    expect((await send(path, undefined, { cookie: otherCookie })).status).toBe(
      404
    )
    expect(
      (
        await send(
          `${path}/settings`,
          { expectedRevision: 1, executionPaused: false },
          { cookie: otherCookie, method: "PATCH" }
        )
      ).status
    ).toBe(404)
    expect(
      (await send(`${path}/activity`, undefined, { cookie: otherCookie }))
        .status
    ).toBe(404)
  })
  it("rejects foreign origins, invalid JSON, missing keys and unknown fields", async () => {
    expect(
      (await send("/installations", {}, { origin: "https://evil.test" })).status
    ).toBe(403)
    expect(
      (
        await send(
          "/installations",
          { name: "Other", repository: "acme/other", expectedRevision: 0 },
          { key: "" }
        )
      ).status
    ).toBe(400)
    expect(
      (
        await send(
          `/installations/${current.installation.id}/settings`,
          { expectedRevision: 1, ownerId: "attacker" },
          { method: "PATCH" }
        )
      ).status
    ).toBe(422)
    const response = await app.request(`${origin}/api/v1/installations`, {
      method: "POST",
      body: "{",
      headers: {
        Cookie: ownerCookie,
        Origin: origin,
        "Content-Type": "application/json",
      },
    })
    expect(response.status).toBe(400)
  })
  it("rejects path traversal and binds approval to the exact saved artifact", async () => {
    const path = `/installations/${current.installation.id}`
    expect(
      (
        await send(`${path}/workflows`, {
          ...definition,
          entrypoint: "../secrets",
          expectedRevision: 1,
        })
      ).status
    ).toBe(422)
    const response = await send(`${path}/workflows`, {
      ...definition,
      expectedRevision: 1,
    })
    expect(response.status).toBe(200)
    current = await response.json()
    expect(current.installation.state).toBe("awaiting_approval")
    expect(
      (
        await send(`${path}/approvals`, {
          expectedRevision: 2,
          workflowId: current.workflow!.id,
          assertionArtifactHash: "c".repeat(64),
        })
      ).status
    ).toBe(409)
    current = await (
      await send(`${path}/approvals`, {
        expectedRevision: 2,
        workflowId: current.workflow!.id,
        assertionArtifactHash: definition.assertionArtifactHash,
      })
    ).json()
    expect(current.workflow!.approvedBy).toBe(ownerId)
    expect(current.installation.approvedWorkflowId).toBe(current.workflow!.id)
  })
  it("returns current state on stale revisions and blocks unapproved execution", async () => {
    const path = `/installations/${current.installation.id}`
    const conflict = await send(
      `${path}/settings`,
      { expectedRevision: 1, executionPaused: false },
      { method: "PATCH" }
    )
    expect(conflict.status).toBe(409)
    expect((await conflict.json()).error.details.installation.revision).toBe(3)
    const run = await send(`${path}/runs`, {
      expectedRevision: 3,
      changeId: crypto.randomUUID(),
    })
    expect((await run.json()).error.code).toBe("EXECUTION_PAUSED")
    expect(
      (
        await send(
          `${path}/settings`,
          { expectedRevision: 3, publishingEnabled: true },
          { method: "PATCH" }
        )
      ).status
    ).toBe(409)
  })
  it("atomically queues scans, enforces one active run and allows cancellation", async () => {
    const path = `/installations/${current.installation.id}`
    current = await (
      await send(`${path}/scans`, {
        expectedRevision: current.installation.revision,
      })
    ).json()
    scan = current.run!
    expect(scan.status).toBe("queued")
    expect(
      (
        await send(`${path}/scans`, {
          expectedRevision: current.installation.revision,
        })
      ).status
    ).toBe(409)
    current = await (
      await send(`${path}/runs/${scan.id}/cancel`, {
        expectedRevision: current.installation.revision,
        reason: "Changed my mind",
      })
    ).json()
    expect(current.run!.status).toBe("cancelled")
    expect(await processNextJob(fixture.db)).toBe(false)
  })
  it("marks unavailable integration work blocked without inventing success", async () => {
    const path = `/installations/${current.installation.id}`
    current = await (
      await send(`${path}/scans`, {
        expectedRevision: current.installation.revision,
      })
    ).json()
    const runId = current.run!.id
    expect(await processNextJob(fixture.db)).toBe(true)
    const run = await (await send(`${path}/runs/${runId}`)).json()
    expect(run.status).toBe("blocked")
    expect(run.reasonCode).toBe("GITHUB_APP_REQUIRED")
    current = await (await send(path)).json()
    expect(current.installation.monitoringLastSuccessAt).toBeNull()
  })
  it("invalidates approvals when an immutable workflow revision is added", async () => {
    const path = `/installations/${current.installation.id}`
    const oldId = current.workflow!.id
    current = await (
      await send(`${path}/workflows`, {
        ...definition,
        name: "New revision",
        expectedRevision: current.installation.revision,
      })
    ).json()
    expect(current.workflow!.id).not.toBe(oldId)
    expect(current.installation.approvedWorkflowId).toBeNull()
    expect(current.workflow!.approvedAt).toBeNull()
    const history = await (await send(`${path}/workflows`)).json()
    expect(history.items).toHaveLength(2)
    expect(
      history.items.find((item: { id: string }) => item.id === oldId).approvedAt
    ).not.toBeNull()
  })
  it("enforces target approval and provenance before queueing verification", async () => {
    const path = `/installations/${current.installation.id}`
    current = await (
      await send(`${path}/approvals`, {
        expectedRevision: current.installation.revision,
        workflowId: current.workflow!.id,
        assertionArtifactHash: definition.assertionArtifactHash,
      })
    ).json()
    current = await (
      await send(
        `${path}/settings`,
        {
          expectedRevision: current.installation.revision,
          executionPaused: false,
        },
        { method: "PATCH" }
      )
    ).json()
    const changeId = crypto.randomUUID()
    const change = {
      id: changeId,
      installationId: current.installation.id,
      title: "Fixture change",
      targetVersion: "2.0",
      status: "needs_review",
      reason: null,
      sourceUrl: "https://example.com/release",
      sourceHash: "d".repeat(64),
      evidenceInputHash: null,
      approvedWorkflowId: null,
      createdAt: new Date().toISOString(),
    }
    await fixture.db.query(
      "INSERT INTO changes(id, owner_id, installation_id, identity, document) VALUES($1,$2,$3,$4,$5::jsonb)",
      [
        changeId,
        ownerId,
        current.installation.id,
        "fixture-change",
        JSON.stringify(change),
      ]
    )
    const unapproved = await send(`${path}/runs`, {
      expectedRevision: current.installation.revision,
      changeId,
    })
    expect((await unapproved.json()).error.code).toBe(
      "TARGET_APPROVAL_REQUIRED"
    )
    current = await (
      await send(`${path}/changes/${changeId}/approve`, {
        expectedRevision: current.installation.revision,
      })
    ).json()
    const missing = await send(`${path}/runs`, {
      expectedRevision: current.installation.revision,
      changeId,
    })
    expect((await missing.json()).error.code).toBe(
      "TARGET_EVIDENCE_UNAVAILABLE"
    )
    await fixture.db.query(
      "UPDATE changes SET document = document || jsonb_build_object('evidenceInputHash', $2::text) WHERE id = $1",
      [changeId, "e".repeat(64)]
    )
    current = await (
      await send(`${path}/runs`, {
        expectedRevision: current.installation.revision,
        changeId,
      })
    ).json()
    expect(current.run!.status).toBe("queued")
    const runId = current.run!.id
    expect(
      (await send(`${path}/runs/${runId}`, undefined, { cookie: otherCookie }))
        .status
    ).toBe(404)
    await processNextJob(fixture.db)
    const run = await (await send(`${path}/runs/${runId}`)).json()
    expect(run.reasonCode).toBe("PROVIDER_ADAPTER_REQUIRED")
    current = await (await send(path)).json()
    const blocked = await send(`${path}/runs/${runId}/publish`, {
      expectedRevision: current.installation.revision,
    })
    expect((await blocked.json()).error.code).toBe("PUBLICATION_BLOCKED")
    current = await (
      await send(`${path}/changes/${changeId}/ignore`, {
        expectedRevision: current.installation.revision,
        reason: "Not applicable to this integration",
      })
    ).json()
    expect(current.change!.status).toBe("ignored")
    current = await (
      await send(`${path}/changes/${changeId}/restore`, {
        expectedRevision: current.installation.revision,
      })
    ).json()
    expect(current.change!.approvedWorkflowId).toBeNull()
  })
  it("serves evidence only to the owner and marks it stale after revision changes", async () => {
    const path = `/installations/${current.installation.id}`
    const runs = await (await send(`${path}/runs`)).json()
    const id = crypto.randomUUID()
    const evidence = {
      id,
      installationId: current.installation.id,
      runId: runs.items[0].id,
      workflowId: current.workflow!.id,
      level: "local_regression",
      manifest: {
        synthetic: true,
        assertions: definition.assertionArtifactHash,
      },
      createdAt: new Date().toISOString(),
      stale: false,
    }
    await fixture.db.query(
      "INSERT INTO evidence(id, owner_id, installation_id, run_id, workflow_id, document) VALUES($1,$2,$3,$4,$5,$6::jsonb)",
      [
        id,
        ownerId,
        current.installation.id,
        evidence.runId,
        evidence.workflowId,
        JSON.stringify(evidence),
      ]
    )
    const evidenceList = await (await send(`${path}/evidence`)).json()
    expect(evidenceList.items[0]).not.toHaveProperty("manifest")
    const manifestPath = `${path}/evidence/${id}/manifest`
    expect(
      (await send(manifestPath, undefined, { cookie: otherCookie })).status
    ).toBe(404)
    const download = await send(manifestPath)
    expect(download.status).toBe(200)
    expect(download.headers.get("content-disposition")).toContain("attachment")
    expect(download.headers.get("cache-control")).toBe("no-store")
    current = await (
      await send(`${path}/workflows`, {
        ...definition,
        expectedRevision: current.installation.revision,
      })
    ).json()
    expect((await (await send(manifestPath)).json()).stale).toBe(true)
    await fixture.db.query(
      "UPDATE evidence SET document = document || jsonb_build_object('createdAt', $2::text) WHERE id = $1",
      [id, new Date(Date.now() - 31 * 86400000).toISOString()]
    )
    expect((await send(manifestPath)).status).toBe(404)
  })
  it("serializes concurrent edits and preserves independent pause controls", async () => {
    const path = `/installations/${current.installation.id}`
    const responses = await Promise.all([
      send(
        `${path}/settings`,
        {
          expectedRevision: current.installation.revision,
          monitoringPaused: true,
        },
        { method: "PATCH" }
      ),
      send(
        `${path}/settings`,
        {
          expectedRevision: current.installation.revision,
          monitoringPaused: true,
        },
        { method: "PATCH" }
      ),
    ])
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ])
    current = await (await send(path)).json()
    expect(current.installation.monitoringPaused).toBe(true)
    expect(current.installation.executionPaused).toBe(false)
    const paused = await send(`${path}/scans`, {
      expectedRevision: current.installation.revision,
    })
    expect((await paused.json()).error.code).toBe("MONITORING_PAUSED")
    current = await (
      await send(
        `${path}/settings`,
        {
          expectedRevision: current.installation.revision,
          monitoringPaused: false,
        },
        { method: "PATCH" }
      )
    ).json()
  })
  it("recovers lost job leases and enforces timeout and retry budgets", async () => {
    const path = `/installations/${current.installation.id}`
    for (const expected of ["JOB_TIMEOUT", "RETRY_EXHAUSTED"]) {
      current = await (
        await send(`${path}/scans`, {
          expectedRevision: current.installation.revision,
        })
      ).json()
      const runId = current.run!.id
      if (expected === "JOB_TIMEOUT")
        await fixture.db.query(
          "UPDATE runs SET document = document || jsonb_build_object('createdAt', $2::text) WHERE id = $1",
          [runId, new Date(Date.now() - 16 * 60000).toISOString()]
        )
      await fixture.db.query(
        "UPDATE jobs SET status = 'leased', lease_token = $2, lease_until = now() - interval '1 second', attempts = $3 WHERE run_id = $1",
        [runId, crypto.randomUUID(), expected === "RETRY_EXHAUSTED" ? 3 : 1]
      )
      expect(await processNextJob(fixture.db)).toBe(true)
      const run = await (await send(`${path}/runs/${runId}`)).json()
      expect(run.status).toBe("failed")
      expect(run.reasonCode).toBe(expected)
      current = await (await send(path)).json()
    }
  })
  it("blocks new work when the owner-defined allowance is exhausted", async () => {
    const path = `/installations/${current.installation.id}`
    current = await (
      await send(
        `${path}/settings`,
        { expectedRevision: current.installation.revision, monthlyRunLimit: 1 },
        { method: "PATCH" }
      )
    ).json()
    const response = await send(`${path}/scans`, {
      expectedRevision: current.installation.revision,
    })
    expect((await response.json()).error.code).toBe("QUOTA_EXHAUSTED")
  })
  it("records audit events and returns bounded pages", async () => {
    const response = await send(
      `/installations/${current.installation.id}/activity?limit=2`
    )
    const page = await response.json()
    expect(page.items).toHaveLength(2)
    expect(page.nextOffset).toBe(2)
    expect(
      (
        await send(
          `/installations/${current.installation.id}/activity?limit=10000`
        )
      ).status
    ).toBe(422)
  })
  it("revokes installations and prevents subsequent mutations", async () => {
    const path = `/installations/${current.installation.id}`
    current = await (
      await send(`${path}/revoke`, {
        expectedRevision: current.installation.revision,
        reason: "End of pilot",
      })
    ).json()
    expect(current.installation.state).toBe("revoked")
    expect(
      (
        await send(`${path}/scans`, {
          expectedRevision: current.installation.revision,
        })
      ).status
    ).toBe(409)
  })
})

describe("GitHub authentication", () => {
  it("starts OAuth with identity scopes, a state cookie and the configured callback", async () => {
    const response = await app.request(`${origin}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "github",
        callbackURL: `${origin}/dashboard`,
      }),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    const url = new URL(body.url)
    expect(url.origin).toBe("https://github.com")
    expect(url.searchParams.get("scope")).toContain("user:email")
    expect(url.searchParams.get("scope")).not.toContain("repo")
    expect(url.searchParams.get("state")).toBeTruthy()
    expect(url.searchParams.get("redirect_uri")).toBe(
      `${origin}/api/auth/callback/github`
    )
    expect(response.headers.get("set-cookie")).toContain("HttpOnly")
  })
  it("rejects untrusted callback URLs and callbacks without OAuth state", async () => {
    const start = await app.request(`${origin}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "github",
        callbackURL: "https://evil.test/steal",
      }),
    })
    expect(start.status).toBe(403)
    const callback = await app.request(
      `${origin}/api/auth/callback/github?code=invalid&state=invalid`
    )
    expect(callback.status).toBe(302)
    expect(callback.headers.get("location")).toContain("error=")
    expect(callback.headers.get("set-cookie") ?? "").not.toContain(
      "session_token="
    )
  })
  it("completes OAuth, persists encrypted tokens and rejects replayed state", async () => {
    const start = await app.request(`${origin}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "github",
        callbackURL: `${origin}/dashboard`,
      }),
    })
    const authorization = new URL((await start.json()).url)
    const cookies = start.headers
      .getSetCookie()
      .map((cookie) => cookie.split(";")[0])
      .join("; ")
    const state = authorization.searchParams.get("state")!
    vi.stubGlobal("fetch", async (input: Request | URL | string) => {
      const url = String(input instanceof Request ? input.url : input)
      if (url.startsWith("https://github.com/login/oauth/access_token"))
        return Response.json({
          access_token: "test-only-github-token",
          token_type: "bearer",
          scope: "read:user,user:email",
        })
      if (url === "https://api.github.com/user/emails")
        return Response.json([
          { email: "github@example.test", primary: true, verified: true },
        ])
      if (url === "https://api.github.com/user")
        return Response.json({
          id: 900123,
          login: "test-owner",
          name: "GitHub Owner",
          email: "github@example.test",
          avatar_url: "https://avatars.githubusercontent.com/u/900123",
        })
      throw new Error(`Unexpected test network request: ${url}`)
    })
    try {
      const callbackURL = `${origin}/api/auth/callback/github?code=test-code&state=${encodeURIComponent(state)}`
      const callback = await app.request(callbackURL, {
        headers: { Cookie: cookies },
      })
      expect(callback.status).toBe(302)
      expect(callback.headers.get("location")).toBe(`${origin}/dashboard`)
      const sessionCookies = callback.headers
        .getSetCookie()
        .map((cookie) => cookie.split(";")[0])
        .join("; ")
      const session = await app.request(`${origin}/api/auth/get-session`, {
        headers: { Cookie: sessionCookies },
      })
      expect((await session.json()).user.email).toBe("github@example.test")
      const account = await fixture.db.query<{ accessToken: string }>(
        'SELECT "accessToken" FROM account WHERE "accountId" = $1',
        ["900123"]
      )
      expect(account.rows[0].accessToken).toBeTruthy()
      expect(account.rows[0].accessToken).not.toBe("test-only-github-token")
      const replay = await app.request(callbackURL, {
        headers: { Cookie: cookies },
      })
      expect(replay.headers.get("location")).toContain("error=")
    } finally {
      vi.unstubAllGlobals()
    }
  })
  it("rejects expired sessions and revokes the server session on sign-out", async () => {
    const context = await fixture.auth.$context
    const expired = await context.internalAdapter.createSession(ownerId)
    await fixture.db.query(
      'UPDATE "session" SET "expiresAt" = now() - interval \'1 hour\' WHERE token = $1',
      [expired!.token]
    )
    expect(
      (
        await send("/installations", undefined, {
          cookie: signedCookie(expired!.token),
        })
      ).status
    ).toBe(401)
    const response = await app.request(`${origin}/api/auth/sign-out`, {
      method: "POST",
      headers: {
        Origin: origin,
        Cookie: ownerCookie,
        "Content-Type": "application/json",
      },
      body: "{}",
    })
    expect(response.status).toBe(200)
    expect((await send("/installations")).status).toBe(401)
  })
})
