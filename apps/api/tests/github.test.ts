import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { createHmac, generateKeyPairSync } from "node:crypto"
import { testDatabase, testEnvironment } from "./database"
import { GithubClient } from "../src/modules/github/client"
import { GithubService } from "../src/modules/github/service"
import { InstallationService } from "../src/modules/installations/service"
import { createApp } from "../src/http/app"
import {
  enqueueNotification,
  processNextNotification,
} from "../src/modules/github/notifications"
import { processNextJob } from "../src/modules/jobs/processor"

let fixture: Awaited<ReturnType<typeof testDatabase>>
let github: GithubService
let owner: string
let other: string
let app: ReturnType<typeof createApp>
const secret = "test-webhook-secret-that-is-long-enough"
const environment = {
  ...testEnvironment,
  GITHUB_APP_ID: "123",
  GITHUB_APP_SLUG: "rebnd-test",
  GITHUB_APP_PRIVATE_KEY: "test-key",
  GITHUB_APP_WEBHOOK_SECRET: secret,
}
const client = new GithubClient(environment)
const remoteInstallation = {
  id: 77,
  account: { id: 42, login: "owner", type: "User" },
  suspended_at: null,
  repository_selection: "selected",
}
const repositories = [
  {
    id: 99,
    full_name: "owner/repo",
    default_branch: "main",
    archived: false,
    disabled: false,
  },
]
const installation = vi
  .spyOn(client, "installation")
  .mockResolvedValue(remoteInstallation)
vi.spyOn(client, "repositories").mockResolvedValue(repositories)
vi.spyOn(client, "token").mockResolvedValue("scoped-test-token")
const request = vi.spyOn(client, "request")
beforeAll(async () => {
  fixture = await testDatabase()
  const ctx = await fixture.auth.$context
  owner = (
    await ctx.internalAdapter.createUser(
      {
        name: "Owner",
        email: "github-owner@example.test",
        emailVerified: true,
      },
      { method: "oauth", oauth: { providerId: "github" } }
    )
  ).id
  other = (
    await ctx.internalAdapter.createUser(
      {
        name: "Other",
        email: "github-other@example.test",
        emailVerified: true,
      },
      { method: "oauth", oauth: { providerId: "github" } }
    )
  ).id
  await ctx.internalAdapter.createAccount({
    userId: owner,
    providerId: "github",
    accountId: "42",
  })
  await ctx.internalAdapter.createAccount({
    userId: other,
    providerId: "github",
    accountId: "43",
  })
  github = new GithubService(fixture.db, client, secret)
  app = createApp(
    fixture.db,
    {
      handler: fixture.auth.handler,
      api: {
        getSession: async ({ headers }) =>
          headers.get("X-Test-Owner")
            ? {
                user: {
                  id: headers.get("X-Test-Owner")!,
                  name: "Owner",
                  email: "test@example.test",
                },
              }
            : null,
      },
    },
    testEnvironment.WEB_ORIGIN,
    github
  )
}, 60000)
afterAll(async () => {
  await fixture?.close()
})
async function state(user = owner) {
  return new URL((await github.start(user)).url).searchParams.get("state")!
}
async function send(path: string, body?: unknown, user = owner) {
  return app.request(`/api/v1${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "X-Test-Owner": user,
      Origin: testEnvironment.WEB_ORIGIN,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}
function webhook(
  action: string,
  delivery = crypto.randomUUID(),
  tamper = false
) {
  const body = JSON.stringify({ action, installation: { id: 77 } })
  const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`
  return app.request("/api/webhooks/github", {
    method: "POST",
    headers: {
      "X-Hub-Signature-256": signature,
      "X-GitHub-Delivery": delivery,
      "X-GitHub-Event": "installation",
    },
    body: tamper ? `${body} ` : body,
  })
}
describe("GitHub repository authorization and notifications", () => {
  it("requires a session and an unexpired, owner-bound, single-use state", async () => {
    expect((await send("/github", undefined, "")).status).toBe(401)
    const token = await state()
    await expect(
      github.complete(other, { state: token, installationId: 77 })
    ).rejects.toMatchObject({ code: "INVALID_INSTALL_STATE" })
    await fixture.db.query(
      "UPDATE github_install_states SET expires_at = now() - interval '1 second'"
    )
    await expect(
      github.complete(owner, { state: token, installationId: 77 })
    ).rejects.toMatchObject({ code: "INVALID_INSTALL_STATE" })
    const current = await state()
    await github.complete(owner, { state: current, installationId: 77 })
    await expect(
      github.complete(owner, { state: current, installationId: 77 })
    ).rejects.toMatchObject({ code: "INVALID_INSTALL_STATE" })
  })
  it("rejects another GitHub account, organization and all-repository access", async () => {
    await expect(
      github.complete(other, { state: await state(other), installationId: 77 })
    ).rejects.toMatchObject({ code: "INSTALLATION_OWNER_MISMATCH" })
    installation.mockResolvedValueOnce({
      ...remoteInstallation,
      account: { ...remoteInstallation.account, type: "Organization" },
    })
    await expect(
      github.complete(owner, { state: await state(), installationId: 77 })
    ).rejects.toMatchObject({ code: "INSTALLATION_OWNER_MISMATCH" })
    installation.mockResolvedValueOnce({
      ...remoteInstallation,
      repository_selection: "all",
    })
    await expect(
      github.complete(owner, { state: await state(), installationId: 77 })
    ).rejects.toMatchObject({ code: "SELECTED_REPOSITORIES_REQUIRED" })
  })
  it("rejects ungranted repositories before creation", async () => {
    expect(
      (
        await send("/installations", {
          name: "Unauthorized",
          repository: "other/private",
        })
      ).status
    ).toBe(403)
    expect((await send("/github/repositories")).status).toBe(200)
  })
  it("validates notification targets, tenant ownership and retries without repeating delivered comments", async () => {
    const service = new InstallationService(fixture.db)
    const workspace = await service.execute(
      owner,
      crypto.randomUUID(),
      "create",
      {
        name: "Test",
        expectedRevision: 0,
        repository: "owner/repo",
        defaultBranch: "main",
      }
    )
    const id = workspace.installation.id
    const path = `/installations/${id}/github-notifications`
    expect((await send(path, undefined, other)).status).toBe(404)
    request.mockResolvedValueOnce({ locked: true, state: "open" })
    expect((await send(path, { targetNumber: 12, enabled: true })).status).toBe(
      422
    )
    request.mockResolvedValueOnce({ locked: false, state: "open" })
    expect((await send(path, { targetNumber: 12, enabled: true })).status).toBe(
      200
    )
    await service.execute(
      owner,
      crypto.randomUUID(),
      "scan",
      { expectedRevision: workspace.installation.revision },
      id
    )
    await processNextJob(fixture.db)
    const row = (
      await fixture.db.query<{ id: string }>(
        "SELECT id FROM github_notifications WHERE installation_id = $1",
        [id]
      )
    ).rows[0]
    expect(row).toBeDefined()
    request.mockRejectedValueOnce(new Error("network unavailable"))
    expect(await processNextNotification(fixture.db, github)).toBe(true)
    expect(
      (
        await fixture.db.query<{ status: string }>(
          "SELECT status FROM github_notifications WHERE id = $1",
          [row.id]
        )
      ).rows[0].status
    ).toBe("pending")
    await fixture.db.query(
      "UPDATE github_notifications SET available_at = now() WHERE id = $1",
      [row.id]
    )
    request.mockResolvedValueOnce([
      {
        id: 555,
        body: `<!-- rebnd:notification:${row.id} -->`,
        performed_via_github_app: { slug: "rebnd-test" },
      },
    ])
    const count = request.mock.calls.length
    await processNextNotification(fixture.db, github)
    expect(request.mock.calls.length).toBe(count + 1)
    expect(
      (
        await fixture.db.query<{ status: string; comment_id: number }>(
          "SELECT status, comment_id FROM github_notifications WHERE id = $1",
          [row.id]
        )
      ).rows[0]
    ).toMatchObject({ status: "delivered", comment_id: 555 })
    expect(await processNextNotification(fixture.db, github)).toBe(false)
    expect((await send(path)).status).toBe(200)
  })
  it("posts run comments once and cancels pending delivery when preferences are disabled", async () => {
    const current = (
      await fixture.db.query<{
        id: string
        document: import("@workspace/shared/contracts/api").Installation
      }>("SELECT id, document FROM installations WHERE owner_id = $1 LIMIT 1", [
        owner,
      ])
    ).rows[0]
    const service = new InstallationService(fixture.db)
    await service.execute(
      owner,
      crypto.randomUUID(),
      "scan",
      { expectedRevision: current.document.revision },
      current.id
    )
    await processNextJob(fixture.db)
    request.mockResolvedValueOnce([]).mockResolvedValueOnce({ id: 556 })
    await processNextNotification(fixture.db, github)
    const call = request.mock.calls.at(-1)!
    expect(call[0]).toBe("/repos/owner/repo/issues/12/comments")
    expect(call[2]).toBe("POST")
    expect(call[3]).toMatchObject({
      body: expect.stringContaining("scan blocked"),
    })
    const latest = (
      await fixture.db.query<{
        document: import("@workspace/shared/contracts/api").Installation
      }>("SELECT document FROM installations WHERE id = $1", [current.id])
    ).rows[0].document
    await service.execute(
      owner,
      crypto.randomUUID(),
      "scan",
      { expectedRevision: latest.revision },
      current.id
    )
    await processNextJob(fixture.db)
    expect(
      (
        await send(`/installations/${current.id}/github-notifications`, {
          targetNumber: 12,
          enabled: false,
        })
      ).status
    ).toBe(200)
    const count = request.mock.calls.length
    expect(await processNextNotification(fixture.db, github)).toBe(false)
    expect(request.mock.calls.length).toBe(count)
  })
  it("rejects forged webhooks, deduplicates deliveries and revokes access", async () => {
    expect((await webhook("deleted", crypto.randomUUID(), true)).status).toBe(
      401
    )
    expect((await github.connection(owner))?.status).toBe("active")
    const delivery = crypto.randomUUID()
    expect((await webhook("deleted", delivery)).status).toBe(200)
    expect(await (await webhook("deleted", delivery)).json()).toMatchObject({
      duplicate: true,
    })
    expect((await github.connection(owner))?.status).toBe("revoked")
    expect(await github.repositories(owner)).toEqual([])
  })
  it("keeps notification enqueue idempotent", async () => {
    const result = await fixture.db.query<{
      owner_id: string
      installation_id: string
      run_id: string
    }>("SELECT * FROM github_notifications LIMIT 1")
    const row = result.rows[0]
    const run = (
      await fixture.db.query<{
        document: import("@workspace/shared/contracts/api").RunRecord
      }>("SELECT document FROM runs WHERE id = $1", [row.run_id])
    ).rows[0].document
    await enqueueNotification(
      fixture.db,
      row.owner_id,
      row.installation_id,
      run
    )
    expect(
      (
        await fixture.db.query(
          "SELECT id FROM github_notifications WHERE run_id = $1",
          [row.run_id]
        )
      ).rows
    ).toHaveLength(1)
  })
})
it("mints expiring app JWTs and restricts publisher tokens to the selected repository", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 })
  const transport = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(JSON.stringify({ token: "ephemeral" }), { status: 201 })
    )
  const githubClient = new GithubClient(
    {
      ...environment,
      GITHUB_APP_PRIVATE_KEY: privateKey
        .export({ type: "pkcs8", format: "pem" })
        .toString(),
    },
    transport
  )
  await githubClient.token(77, 99, true)
  const options = transport.mock.calls[0][1]!
  expect(JSON.parse(options.body as string)).toEqual({
    permissions: { issues: "write", contents: "read" },
    repository_ids: [99],
  })
  const jwt = (options.headers as Record<string, string>).Authorization.slice(7)
  const claims = JSON.parse(
    Buffer.from(jwt.split(".")[1], "base64url").toString()
  )
  expect(claims.exp - claims.iat).toBe(600)
  expect(claims.iss).toBe("123")
})
