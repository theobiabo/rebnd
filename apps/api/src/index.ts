import { serve } from "@hono/node-server"
import { createAuth } from "./auth/auth"
import { readEnvironment } from "./config/env"
import { createDatabase, createPool } from "./db/database"
import { createApp } from "./http/app"

const env = readEnvironment()
const pool = createPool(env.DATABASE_URL)
const app = createApp(
  createDatabase(pool),
  createAuth(pool, env),
  env.WEB_ORIGIN
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
