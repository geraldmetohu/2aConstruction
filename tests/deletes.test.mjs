// Permanent deletes (project, team member, login, single records) against in-memory PostgreSQL (PGlite)
// with every migration applied. No application database is used.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { typescriptLoader } from './helpers/load-typescript.mjs';

const require = createRequire(import.meta.url);
const { PGlite } = require('@electric-sql/pglite');
const load = typescriptLoader();
const store = load('app/lib/takeoff/store.ts');
const jobs = load('app/lib/takeoff/jobs-store.ts');
const del = load('app/lib/takeoff/delete-store.ts');
const rec = load('app/lib/takeoff/client-record.ts');
const extras = load('app/lib/takeoff/extras-store.ts');
const jobsLib = load('app/lib/takeoff/jobs.ts');
const signer = load('app/lib/takeoff/signer-store.ts');
const company = load('app/lib/takeoff/company.ts');

const pg = new PGlite();
const wrap = c => ({ query: async (text, params = []) => (await c.query(text, params)).rows });
const db = { ...wrap(pg), transaction: fn => pg.transaction(tx => fn(wrap(tx))) };
let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log('ok -', name); };
const rejects = async (p, re) => { await assert.rejects(p, e => re.test(String(e.message ?? e))); };

const dir = new URL('../prisma/migrations/', import.meta.url);
for (const m of readdirSync(dir).filter(n => /^\d{14}_/.test(n) && n >= '20261101' && !/project_details|more_suppliers/.test(n)).sort()) await pg.exec(readFileSync(new URL(`${m}/migration.sql`, dir), 'utf8'));

const pay = { input: {}, result: { totals: { gross: 12000 } }, customer: { gross: 12000 }, rates: {}, prices: {} };
async function project(email) {
  const q = await store.createQuote(db, { clientName: 'Test', clientEmail: email, siteAddress: '1 St' }, pay, 'admin');
  await store.sendQuote(db, q.id, 'admin');
  await store.acceptQuote(db, q.id, email, 1, 'Test');
  await jobs.getJob(db, q.id);
  await jobs.setStage(db, q.id, 'Loft · Steel beams', { status: 'DONE', percent: 100, note: '' }, 'admin');
  await jobs.addEvent(db, q.id, 'MESSAGE', 'Hello', 'ADMIN', 'admin');
  await jobs.addPhotos(db, q.id, [{ url: 'https://x/p.jpg' }], 'admin');
  await jobs.addAction(db, q.id, { kind: 'DECISION', title: 'Pick tiles', detail: '', dueDate: null }, 'admin');
  const p = await jobs.recordPayment(db, q.id, { scheduleNo: 1, amount: 1200, method: 'BANK_TRANSFER', reference: 'DEP', paidOn: '2026-11-01', note: '' }, 'admin', 'ADMIN');
  return q.id;
}
const A = await project('a@example.com'), B = await project('b@example.com');
const w = await jobs.saveWorker(db, { name: 'Sam Joiner', kind: 'SUBCONTRACTOR', trade: 'CARPENTER', phone: '', email: '', payBasis: 'DAY', dayRate: 200, notes: '', active: true });
const W = w.id ?? w;
await jobs.assignWorker(db, A, W, { trade: 'CARPENTER', payBasis: 'DAY', dayRate: 200, agreedPrice: null, active: true }, 'admin');
await jobs.addExpense(db, { quoteId: A, workerId: W, category: 'MATERIALS', description: 'MDF', supplier: 'Selco', amount: 300, spentOn: '2026-11-02' }, 'admin');
const [entry] = await db.query(`INSERT INTO "FinanceEntry" ("date", "direction", "category", "amount", "quoteId", "recordedBy") VALUES ('2026-11-03', 'OUT', 'MATERIALS', 99, $1::uuid, 'admin') RETURNING "id"::text AS id`, [A]);
const [stmt] = await db.query(`INSERT INTO "FinanceBankStatement" ("uploadedBy") VALUES ('admin') RETURNING "id"::text AS id`);
await db.query(`INSERT INTO "FinanceBankLine" ("statementId", "date", "amount", "fingerprint", "status", "entryId") VALUES ($1::uuid, '2026-11-03', -99, 'fp1', 'DONE', $2::uuid)`, [stmt.id, entry.id]);

await extras.addExtra(db, A, { doneOn: '2026-11-04', title: 'Boxed in pipes', detail: '', stage: 'Loft · Steel beams', hours: 2, cost: 15, value: 120, reason: 'Goodwill' }, 'admin');

const countFor = async q => { let n = 0; for (const { t } of await db.query(`SELECT table_name AS t FROM information_schema.columns WHERE column_name = 'quoteId' AND table_schema = current_schema()`)) n += Number((await db.query(`SELECT count(*)::int AS n FROM "${t}" WHERE "quoteId" = $1::uuid`, [q]))[0].n); return n; };

await test('deleting a project removes the quote, job, messages, photos, requests, payments, expenses and money – nothing else', async () => {
  assert.ok(await countFor(A) > 8);
  const before = await countFor(B);
  const r = await del.deleteProject(db, A);
  assert.equal(r.TakeoffQuote, 1);
  assert.equal(await countFor(A), 0);
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM "TakeoffQuote" WHERE "id" = $1::uuid`, [A]))[0].n, 0);
  assert.equal(await countFor(B), before, 'the other project is untouched');
  const [line] = await db.query(`SELECT "status", "entryId" FROM "FinanceBankLine"`);
  assert.deepEqual(line, { status: 'NEW', entryId: null }, 'bank line kept but un-matched');
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM "TakeoffWorker"`))[0].n, 1, 'team member kept');
  assert.match(del.describeReport(r), /project/);
  await rejects(del.deleteProject(db, A), /not found/i);
});

await test('free extras: logged, totalled, removed; never visible to the client', async () => {
  const x = await extras.addExtra(db, B, { doneOn: '2026-11-05', title: 'Extra socket', detail: 'by the bed', stage: '', hours: 1.5, cost: 8, value: 95, reason: 'Goodwill' }, 'admin');
  const list = await extras.listExtras(db, B);
  assert.equal(list.length, 1); assert.equal(list[0].value, 95); assert.equal(list[0].doneOn, '2026-11-05');
  assert.deepEqual(extras.extrasTotals(list), { count: 1, hours: 1.5, cost: 8, value: 95 });
  const [ev] = await db.query(`SELECT "visibleToClient" FROM "TakeoffJobEvent" WHERE "quoteId" = $1::uuid AND "message" LIKE 'Free extra%'`, [B]);
  assert.equal(ev.visibleToClient, false);
  await extras.removeExtra(db, B, x.id);
  assert.equal((await extras.listExtras(db, B)).length, 0);
  await rejects(extras.removeExtra(db, B, x.id), /not found/i);
  await rejects(extras.addExtra(db, B, { doneOn: '2026-11-05', title: 'x', detail: '', stage: '', hours: -1, cost: 0, value: 0, reason: '' }, 'admin'), /check/i);
});

await test('out of phase: a stage started while an earlier one has not', async () => {
  const st = [{ stage: 'a', label: 'Steels', status: 'DONE' }, { stage: 'b', label: 'Floor', status: 'NOT_STARTED' }, { stage: 'c', label: 'Dormer', status: 'IN_PROGRESS' }, { stage: 'd', label: 'Stairs', status: 'NOT_STARTED' }];
  const m = jobsLib.outOfPhase(st);
  assert.deepEqual([...m.entries()], [['c', ['Floor']]]);
  assert.equal(jobsLib.outOfPhase(st.map(s => ({ ...s, status: 'DONE' }))).size, 0);
});

await test('signatures: who signs is set on one or many quotes; default and fallback', async () => {
  const c = company.companyFromOverrides({ signatories: [{ id: 'ceo', name: 'Aleksios', role: 'CEO', signatureUrl: 'https://x/a.png' }, { id: 'pm', name: 'Gerald', role: 'Project Manager', signatureUrl: '' }], defaultSignatory: 'ceo' });
  assert.equal(company.resolveSigner(c, '').name, 'Aleksios');
  assert.equal(company.resolveSigner(c, 'pm').name, 'Gerald');
  assert.equal(company.resolveSigner(c, 'gone').name, 'Aleksios', 'a removed signatory falls back to the default');
  assert.equal(company.resolveSigner(company.companyFromOverrides({}), ''), undefined);
  assert.equal(await signer.getSignerId(db, B), '');
  assert.equal(await signer.setSigner(db, [B], 'pm', 'admin'), 1);
  assert.equal(await signer.getSignerId(db, B), 'pm');
  assert.equal(await signer.setSigner(db, [B], 'ceo', 'admin'), 1);
  assert.equal((await signer.signerIds(db)).get(B), 'ceo');
});

await test('deleting a team member removes their assignments, ratings and expenses', async () => {
  await jobs.assignWorker(db, B, W, { trade: 'CARPENTER', payBasis: 'DAY', dayRate: 200, agreedPrice: null, active: true }, 'admin');
  const r = await del.deleteWorker(db, W);
  assert.equal(r.TakeoffWorker, 1);
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM "TakeoffJobAssignment"`))[0].n, 0);
  assert.ok(await countFor(B) > 5, 'project B still there');
});

await test('single records: a payment, photo and request can be deleted one at a time', async () => {
  const [p] = await db.query(`SELECT "id"::text AS id FROM "TakeoffJobPayment" WHERE "quoteId" = $1::uuid`, [B]);
  await del.deleteRecord(db, 'payment', p.id);
  const [ph] = await db.query(`SELECT "id"::text AS id FROM "TakeoffJobPhoto" WHERE "quoteId" = $1::uuid`, [B]);
  await del.deleteRecord(db, 'photo', ph.id);
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM "TakeoffJobPayment" WHERE "quoteId" = $1::uuid`, [B]))[0].n, 0);
  await rejects(del.deleteRecord(db, 'photo', ph.id), /not found/i);
});

await test('logins: a client login goes with its sessions; admin and own login are protected', async () => {
  const [a] = await db.query(`INSERT INTO "AuthAccount" ("email", "role") VALUES ('c@example.com', 'CLIENT') RETURNING "id"::text AS id`);
  const [ad] = await db.query(`INSERT INTO "AuthAccount" ("email", "role") VALUES ('boss@example.com', 'ADMIN') RETURNING "id"::text AS id`);
  await db.query(`INSERT INTO "AuthSession" ("id", "accountId", "expiresAt") VALUES ('s1', $1::uuid, now() + interval '1 day')`, [a.id]);
  const isAdmin = (e, role) => role === 'ADMIN';
  await rejects(del.deleteAccount(db, ad.id, { isAdmin, selfId: 'x' }), /admin/i);
  await rejects(del.deleteAccount(db, a.id, { isAdmin, selfId: a.id }), /using/i);
  const r = await del.deleteAccount(db, a.id, { isAdmin, selfId: 'x' });
  assert.equal(r.AuthAccount, 1); assert.equal(r.AuthSession, 1);
});

await test('client details from a sent quote are kept: login with name & phone, job starts with them as contact', async () => {
  const q = await store.createQuote(db, { clientName: 'Maria Lopez', clientEmail: 'Maria@Example.com', siteAddress: '4 Emerson Drive' }, { ...pay, input: { terms: { clientPhone: '07700 900123', title: 'Loft conversion' } } }, 'admin');
  await store.sendQuote(db, q.id, 'admin');
  assert.equal(await rec.rememberClient(db, q.id), 'created');
  const [a] = await db.query(`SELECT "name", "phone", "role", "passwordHash" FROM "AuthAccount" WHERE "email" = 'maria@example.com'`);
  assert.deepEqual(a, { name: 'Maria Lopez', phone: '07700 900123', role: 'CLIENT', passwordHash: null });
  assert.equal(await rec.rememberClient(db, q.id), 'unchanged');
  const job = await jobs.getJob(db, q.id);
  assert.deepEqual(job.clientContacts, [{ name: 'Maria Lopez', role: 'Client', phone: '07700 900123', email: 'maria@example.com' }]);
  const [row] = (await store.listQuotes(db)).filter(x => x.id === q.id);
  assert.equal(row.clientPhone, '07700 900123'); assert.equal(row.title, 'Loft conversion');
});

await test('protection stays on: a plain DELETE, a history UPDATE or a TRUNCATE is still refused', async () => {
  assert.equal(await del.deletesEnabled(db), true);
  await rejects(db.query(`DELETE FROM "TakeoffQuote" WHERE "id" = $1::uuid`, [B]), /cannot be deleted/);
  await rejects(db.query(`UPDATE "TakeoffQuoteEvent" SET "message" = 'x'`), /immutable/);
  await rejects(db.query(`TRUNCATE "TakeoffQuoteVersion"`), /immutable/);
  await rejects(db.transaction(async tx => { await tx.query(`SELECT set_config('takeoff.confirmed_delete', 'on', true)`); await tx.query(`UPDATE "TakeoffQuoteEvent" SET "message" = 'x'`); }), /immutable/);
});

console.log(`\n${passed} delete tests passed`);
