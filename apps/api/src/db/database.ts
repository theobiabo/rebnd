import { Pool } from "pg"

export interface SqlExecutor {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: unknown[]
  ): Promise<{ rows: T[] }>
}
export interface Database extends SqlExecutor {
  transaction<T>(operation: (connection: SqlExecutor) => Promise<T>): Promise<T>
}
export function createDatabase(pool: Pool): Database {
  return {
    query: (sql, values) => pool.query(sql, values),
    async transaction(operation) {
      const connection = await pool.connect()
      try {
        await connection.query("BEGIN")
        const result = await operation(connection)
        await connection.query("COMMIT")
        return result
      } catch (error) {
        await connection.query("ROLLBACK")
        throw error
      } finally {
        connection.release()
      }
    },
  }
}
export function createPool(connectionString: string) {
  return new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 10000,
  })
}
