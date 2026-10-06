import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { createApp } from "../src/http/app"
import { readEnvironment } from "../src/config/env"
import { testDatabase, testEnvironment } from "./database"

let fixture: Awaited<ReturnType<typeof testDatabase>>
beforeAll(async () => {
  vi.stubGlobal("fetch", async () => Response.json({ keys: [] }))
  fixture = await testDatabase({
    BETTER_AUTH_API_KEY: "test-only-dashboard-key",
  })
}, 60000)
afterAll(async () => {
  await fixture?.close()
  vi.unstubAllGlobals()
})

describe("optional Better Auth dashboard", () => {
  it("treats an empty dashboard key as disabled", () => {
    const env = readEnvironment({
      ...testEnvironment,
      PORT: "3000",
      BETTER_AUTH_API_KEY: "",
    })
    expect(env.BETTER_AUTH_API_KEY).toBeUndefined()
  })
  it("rejects unsigned dashboard access for read and mutation endpoints", async () => {
    const app = createApp(fixture.db, fixture.auth, testEnvironment.WEB_ORIGIN)
    const validate = await app.request(
      `${testEnvironment.WEB_ORIGIN}/api/auth/dash/validate`
    )
    expect(validate.status).toBe(401)
    const remove = await app.request(
      `${testEnvironment.WEB_ORIGIN}/api/auth/dash/sessions/revoke`,
      {
        method: "POST",
        headers: {
          Origin: testEnvironment.WEB_ORIGIN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: "untrusted" }),
      }
    )
    expect(remove.status).toBe(401)
  })
})
