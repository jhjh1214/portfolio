/** The tiny slice of a SQL database the API needs. Implemented over D1 (Workers) and node:sqlite (demo and tests). */
export type Param = string | number | null

export interface DB {
  first<T = Record<string, unknown>>(sql: string, ...params: Param[]): Promise<T | null>
  all<T = Record<string, unknown>>(sql: string, ...params: Param[]): Promise<T[]>
  run(sql: string, ...params: Param[]): Promise<{ changes: number }>
}

// Structural type for Cloudflare's D1Database so this file needs no Workers types.
interface D1Like {
  prepare(sql: string): {
    bind(...p: Param[]): {
      first<T>(): Promise<T | null>
      all(): Promise<{ results: unknown[] }>
      run(): Promise<{ meta: { changes: number } }>
    }
  }
}

export function d1(db: D1Like): DB {
  return {
    first: (sql, ...p) => db.prepare(sql).bind(...p).first(),
    all: async <T>(sql: string, ...p: Param[]) => (await db.prepare(sql).bind(...p).all()).results as T[],
    run: async (sql, ...p) => ({ changes: (await db.prepare(sql).bind(...p).run()).meta.changes }),
  }
}
