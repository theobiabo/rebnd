import { setTimeout } from "node:timers/promises"
import { readEnvironment } from "../../config/env"
import { createDatabase, createPool } from "../../db/database"
import { processNextJob } from "./processor"

import { GithubClient } from "../github/client"
import { GithubService } from "../github/service"
import { processNextNotification } from "../github/notifications"

const env = readEnvironment()
const pool = createPool(env.DATABASE_URL)
const db = createDatabase(pool)
const github = new GithubService(
  db,
  new GithubClient(env),
  env.GITHUB_APP_WEBHOOK_SECRET
)
let stopping = false
process.on("SIGTERM", () => {
  stopping = true
})
process.on("SIGINT", () => {
  stopping = true
})
try {
  while (!stopping) {
    try {
      const job = await processNextJob(db)
      const notification = await processNextNotification(db, github)
      if (!job && !notification) await setTimeout(1000)
    } catch {
      console.error(JSON.stringify({ event: "worker.attempt_failed" }))
      await setTimeout(2000)
    }
  }
} finally {
  await pool.end()
}
