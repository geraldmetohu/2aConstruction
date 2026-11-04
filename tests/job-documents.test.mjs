// Job documents: additive migration, upload, share with client, hide (never delete).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { typescriptLoader } from './helpers/load-typescript.mjs';

const require = createRequire(import.meta.url);
const { PGlite } = require('@electric-sql/pglite');
const load = typescriptLoader();
const store = load('app/lib/takeoff/store.ts');
const jobs = load('app/lib/takeoff/jobs-store.ts');
const docs = load('app/lib/takeoff/job-documents.ts');

const pg = new PGlite();
const wrap = c => ({ query: async (text, params = []) => (await c.query(text, params)).rows });
const db = { ...wrap(pg), transaction: fn => pg.transaction(tx => fn(wrap(tx))) };
let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log('ok -', name); };
const mig = n => readFileSync(new URL(`../prisma/migrations/${n}/migration.sql`, import.meta.url), 'utf8');

await pg.exec(mig('20261101120000_add_takeoff_quotes'));
await pg.exec(mig('20261102120000_add_takeoff_jobs'));
const q = await store.createQuote(db, { clientName: 'Jane', clientEmail: 'jane@example.com', siteAddress: '1 High St' }, { input: {}, result: { totals: { gross: 1 } }, customer: { gross: 1 }, rates: {}, prices: {} }, 'admin');
const Q = q.id;

await test('works before the migration (empty list, clear error on upload)', async () => {
  assert.deepEqual(await docs.listDocuments(db, Q), []);
  await assert.rejects(docs.addDocuments(db, Q, [{ url: 'https://x/a.pdf', fileName: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 10, category: 'PLANS' }], 'admin'), /migration/);
});

const sql = mig('20261104120000_add_job_documents');
await pg.exec(sql); await pg.exec(sql);

await test('migration only adds', async () => {
  assert.equal(/\b(DROP|DELETE FROM|TRUNCATE)\b/i.test(sql), false);
  assert.equal(await docs.documentsReady(db), true);
});

await test('upload, share and hide', async () => {
  await docs.addDocuments(db, Q, [
    { url: 'https://x/plans_rev-B.pdf', fileName: 'plans_rev-B.pdf', mimeType: 'application/pdf', sizeBytes: 123456, category: 'PLANS' },
    { url: 'https://x/calcs.pdf', fileName: 'calcs.pdf', mimeType: 'application/pdf', sizeBytes: 999, category: 'STRUCTURAL', visibleToClient: true },
  ], 'admin');
  let all = await docs.listDocuments(db, Q);
  assert.equal(all.length, 2);
  assert.ok(all.some(d => d.title === 'plans rev B'));
  assert.equal((await docs.listDocuments(db, Q, true)).length, 1);
  const plans = all.find(d => d.category === 'PLANS');
  await docs.updateDocument(db, Q, plans.id, { visibleToClient: true, title: 'Plans – revision B' }, 'admin');
  assert.equal((await docs.listDocuments(db, Q, true)).length, 2);
  const ev = await jobs.listEvents(db, Q, true);
  assert.ok(ev.some(e => /shared with you: Plans – revision B/.test(e.message)));
  await docs.updateDocument(db, Q, plans.id, { hidden: true }, 'admin');
  assert.equal((await docs.listDocuments(db, Q)).length, 1);
  assert.equal((await db.query(`SELECT count(*)::int n FROM "TakeoffJobDocument"`))[0].n, 2); // hidden, not deleted
  await assert.rejects(docs.addDocuments(db, Q, [{ url: 'http://bad', fileName: 'x', mimeType: '', sizeBytes: 0, category: 'OTHER' }], 'admin'));
});

console.log(`\n${passed} job document tests passed`);
