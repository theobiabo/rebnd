import { PGlite } from "@electric-sql/pglite"
import { readFile } from "node:fs/promises"
import type { Pool } from "pg"
import { getMigrations } from "better-auth/db/migration"
import { createAuth, authOptions } from "../src/auth/auth"
import type { Database, SqlExecutor } from "../src/db/database"
import type { Environment } from "../src/config/env"

export const testEnvironment: Environment = {
  NODE_ENV: "test",
  PORT: 3000,
  DATABASE_URL: "postgres://test:test@localhost/test",
  WEB_ORIGIN: "http://localhost:5173",
  BETTER_AUTH_URL: "http://localhost:5173",
  BETTER_AUTH_SECRET: "test-only-secret-32-characters-long-do-not-deploy",
  GITHUB_CLIENT_ID: "test-client-id",
  GITHUB_CLIENT_SECRET: "test-client-secret",
}
export async function testDatabase() {
  const pg = new PGlite()
  const client = {
    async query(sql: string, values?: unknown[]) {
      const result = await pg.query(sql, values)
      return { ...result, rowCount: result.affectedRows }
    },
    release() {},
  }
  const pool = {
    ...client,
    connect: async () => client,
    end: async () => {},
  } as unknown as Pool
  await (
    await getMigrations(authOptions(pool, testEnvironment))
  ).runMigrations()
  const auth = createAuth(pool, testEnvironment)
  await pg.exec(
    await readFile(
      new URL("../src/db/migrations/001_control_plane.sql", import.meta.url),
      "utf8"
    )
  )
  const execute: SqlExecutor["query"] = async (sql, values) =>
    pg.query(sql, values)
  const db: Database = {
    query: execute,
    transaction: (operation) =>
      pg.transaction((transaction) =>
        operation({ query: (sql, values) => transaction.query(sql, values) })
      ),
  }
  return { db, auth, pg, close: () => pg.close() }
}
