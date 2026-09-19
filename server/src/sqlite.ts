import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import type { DB, Param } from './db'

/** node:sqlite adapter used by the local demo server and the tests. Never imported by the Worker. */
export function sqliteDb(path = ':memory:', schemaPath: URL = new URL('../schema.sql', import.meta.url)): DB {
  const raw = new DatabaseSync(path)
  raw.exec('PRAGMA foreign_keys = ON')
  raw.exec(readFileSync(schemaPath, 'utf8'))
  return {
    first: async <T>(sql: string, ...p: Param[]) => ((raw.prepare(sql).get(...p) as T | undefined) ?? null),
    all: async <T>(sql: string, ...p: Param[]) => raw.prepare(sql).all(...p) as T[],
    run: async (sql: string, ...p: Param[]) => ({ changes: Number(raw.prepare(sql).run(...p).changes) }),
  }
}
