// The database: Cloudflare D1 (SQLite), bound to the Worker as DB (wrangler.jsonc).
// `sql` is a tagged template, as before: sql`SELECT … WHERE id = ${id}` resolves to the rows.
// SQLite has no boolean, so true/false go in as 1/0 and the columns below come back as booleans.
import { env } from 'cloudflare:workers';

const BOOL = new Set(['deceased', 'is_root', 'root', 'apart', 'engaged', 'can_export']);
const bind = (v) => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : v);

export async function sql(strings, ...values) {
  const { results } = await env.DB.prepare(strings.join('?')).bind(...values.map(bind)).all();
  for (const row of results) for (const k in row) if (BOOL.has(k) && row[k] != null) row[k] = Boolean(row[k]);
  return results;
}
