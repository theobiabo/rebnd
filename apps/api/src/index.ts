import { serve } from "@hono/node-server"
import { createAuth } from "./auth/auth"
import { readEnvironment } from "./config/env"
import { createDatabase, createPool } from "./db/database"
import { createApp } from "./http/app"

import { GithubClient } from "./modules/github/client"
import { GithubService } from "./modules/github/service"

const env = readEnvironment()
const pool = createPool(env.DATABASE_URL)
const db = createDatabase(pool)
const app = createApp(
  db,
  createAuth(pool, env),
  env.WEB_ORIGIN,
  new GithubService(db, new GithubClient(env), env.GITHUB_APP_WEBHOOK_SECRET)
)
const server = serve({ fetch: app.fetch, port: env.PORT }, ({ port }) =>
  console.info(`rebnd API listening on port ${port}`)
)
let closing = false
function shutdown() {
  if (closing) return
  closing = true
  const timeout = setTimeout(() => process.exit(1), 10000).unref()
  server.close(() => {
    void pool.end().finally(() => {
      clearTimeout(timeout)
      process.exit(0)
    })
  })
}
process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)
pool.on("error", () =>
  console.error(JSON.stringify({ event: "database.connection_error" }))
)
