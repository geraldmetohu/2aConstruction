// Database download: every table, read in chunks (each response stays well under Vercel's 4.5 MB limit), so
// the admin page and the weekly PC script can save a complete copy locally. Read-only – nothing is changed.
// Pure functions (no "server-only") so tests can run them.
import type { Sql } from "../takeoff/store";

/** Sign-in sessions, one-time links and attempt logs are security tokens, not business data – never exported. */
export const EXCLUDED_TABLES = new Set(["AuthSession", "AuthToken", "AuthAttempt"]);
const CHUNK_BYTES = 3_000_000;

export interface TableInfo { name: string; rows: number; key: string[] }

export async function listTables(db: Sql): Promise<TableInfo[]> {
  const tables = await db.query<{ name: string; key: string[] | null }>(`
    SELECT t.table_name AS "name",
      (SELECT array_agg(k.column_name::text ORDER BY k.ordinal_position) FROM information_schema.table_constraints c
         JOIN information_schema.key_column_usage k ON k.constraint_name = c.constraint_name AND k.table_schema = c.table_schema AND k.table_name = c.table_name
         WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name AND c.constraint_type = 'PRIMARY KEY') AS "key"
    FROM information_schema.tables t WHERE t.table_schema = current_schema() AND t.table_type = 'BASE TABLE' ORDER BY t.table_name`);
  const out: TableInfo[] = [];
  for (const t of tables.filter(t => !EXCLUDED_TABLES.has(t.name))) {
    const [c] = await db.query<{ n: number }>(`SELECT count(*)::int AS "n" FROM "${t.name.replace(/"/g, '""')}"`);
    out.push({ name: t.name, rows: c?.n ?? 0, key: t.key ?? [] });
  }
  return out;
}

/** One chunk of a table as JSON rows (Postgres does the conversion, so every type comes out right). */
export async function readChunk(db: Sql, table: string, offset: number): Promise<{ table: string; offset: number; json: string; rows: number; next: number | null }> {
  const all = await listTablesCached(db);
  const t = all.find(x => x.name === table);
  if (!t) throw new Error("Unknown table");
  const q = `"${t.name.replace(/"/g, '""')}"`;
  const order = t.key.length ? t.key.map(k => `"${k.replace(/"/g, '""')}"`).join(", ") : "ctid";
  const parts: string[] = []; let bytes = 0, at = offset;
  for (;;) {
    const rows = await db.query<{ j: string }>(`SELECT row_to_json(x)::text AS "j" FROM (SELECT * FROM ${q} ORDER BY ${order} LIMIT 500 OFFSET $1) x`, [at]);
    for (const r of rows) { parts.push(r.j); bytes += r.j.length + 1; at++; if (bytes >= CHUNK_BYTES) break; }
    if (bytes >= CHUNK_BYTES || rows.length < 500) {
      const more = bytes >= CHUNK_BYTES && at < t.rows;
      return { table: t.name, offset, json: `[${parts.join(",")}]`, rows: parts.length, next: more ? at : null };
    }
  }
}

// The table list doesn't change during a download; avoid recounting every table for each chunk.
let cache: { at: number; list: TableInfo[] } | null = null;
async function listTablesCached(db: Sql) {
  if (!cache || Date.now() - cache.at > 60_000) cache = { at: Date.now(), list: await listTables(db) };
  return cache.list;
}
