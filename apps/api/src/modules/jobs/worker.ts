import { setTimeout } from "node:timers/promises"
import { readEnvironment } from "../../config/env"
import { createDatabase, createPool } from "../../db/database"
import { processNextJob } from "./processor"

const pool = createPool(readEnvironment().DATABASE_URL)
const db = createDatabase(pool)
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
      if (!(await processNextJob(db))) await setTimeout(1000)
    } catch {
      console.error(JSON.stringify({ event: "worker.attempt_failed" }))
      await setTimeout(2000)
    }
  }
} finally {
  await pool.end()
}
