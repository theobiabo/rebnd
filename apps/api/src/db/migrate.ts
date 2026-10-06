import { readFile, readdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { createHash } from "node:crypto"
import { getMigrations } from "better-auth/db/migration"
import { authOptions } from "../auth/auth"
import { readEnvironment } from "../config/env"
import { createPool } from "./database"

const env = readEnvironment()
const pool = createPool(env.DATABASE_URL)
const connection = await pool.connect()
try {
  await connection.query("SELECT pg_advisory_lock(83719241)")
  const authMigration = await getMigrations(authOptions(pool, env))
  await authMigration.runMigrations()
  await connection.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())"
  )
  const directory = fileURLToPath(new URL("./migrations/", import.meta.url))
  for (const name of (await readdir(directory))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    const sql = await readFile(`${directory}/${name}`, "utf8")
    const checksum = createHash("sha256").update(sql).digest("hex")
    const existing = await connection.query(
      "SELECT checksum FROM schema_migrations WHERE name = $1",
      [name]
    )
    if (existing.rows.length) {
      if (existing.rows[0].checksum !== checksum)
        throw new Error(`Applied migration changed: ${name}`)
      continue
    }
    await connection.query("BEGIN")
    try {
      await connection.query(sql)
      await connection.query(
        "INSERT INTO schema_migrations(name, checksum) VALUES($1, $2)",
        [name, checksum]
      )
      await connection.query("COMMIT")
      console.info(`Applied ${name}`)
    } catch (error) {
      await connection.query("ROLLBACK")
      throw error
    }
  }
} finally {
  await connection.query("SELECT pg_advisory_unlock(83719241)")
  connection.release()
  await pool.end()
}
