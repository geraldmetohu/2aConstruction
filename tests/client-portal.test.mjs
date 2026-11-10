// Client portal: requested start, project manager, stage invoices (raised once, when due) and the snagging list –
// against in-memory PostgreSQL (PGlite). No application database is used.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { typescriptLoader } from './helpers/load-typescript.mjs';

const require = createRequire(import.meta.url);
const { PGlite } = require('@electric-sql/pglite');
const load = typescriptLoader();
const store = load('app/lib/takeoff/store.ts');
const jobs = load('app/lib/takeoff/jobs-store.ts');
const calc = load('app/lib/takeoff/jobs.ts');
const portal = load('app/lib/takeoff/portal-store.ts');

const pg = new PGlite();
const wrap = c => ({ query: async (text, params = []) => (await c.query(text, params)).rows });
const db = { ...wrap(pg), transaction: fn => pg.transaction(tx => fn(wrap(tx))) };
let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log('ok -', name); };
const rejects = async (p, re) => { await assert.rejects(p, e => re.test(String(e.message ?? e))); };
const sql = name => readFileSync(new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url), 'utf8');

await pg.exec(sql('20261101120000_add_takeoff_quotes'));
await pg.exec(sql('20261102120000_add_takeoff_jobs'));
const q = await store.createQuote(db, { clientName: 'Jane Client', clientEmail: 'jane@example.com', siteAddress: '1 High St' },
  { input: {}, result: { totals: { gross: 12000 } }, customer: { gross: 12000 }, rates: {}, prices: {} }, 'admin');
await store.sendQuote(db, q.id, 'admin');
await store.acceptQuote(db, q.id, 'jane@example.com', 1, 'Jane Client');
const Q = q.id;
await jobs.getJob(db, Q);

await test('migration is additive, can run twice, and keeps existing jobs', async () => {
  assert.equal(await portal.portalReady(db), false);
  await pg.exec(sql('20261112120000_client_portal'));
  await pg.exec(sql('20261112120000_client_portal'));
  assert.equal(await portal.portalReady(db), true);
  assert.equal((await jobs.listJobs(db)).length, 1);
  assert.deepEqual(await portal.getPortalInfo(db, Q), { requestedStart: null, managerName: '', managerPhone: '', managerEmail: '' });
});

await test('requested start and project manager are saved and logged for the client', async () => {
  await portal.setRequestedStart(db, Q, '2027-02-01', 'jane@example.com');
  await portal.setManager(db, Q, { name: 'Sam Manager', phone: '07700 900123', email: 'sam@example.com' }, 'admin');
  const p = await portal.getPortalInfo(db, Q);
  assert.equal(p.requestedStart, '2027-02-01'); assert.equal(p.managerName, 'Sam Manager');
  const ev = await jobs.listEvents(db, Q, true);
  assert.ok(ev.some(e => /start from 2027-02-01/.test(e.message)));
  assert.ok(ev.some(e => /Sam Manager is your project manager/.test(e.message)));
});

const schedule = [
  { n: 1, label: 'Deposit', when: 'On signing', percent: 10, amount: 1200, kind: 'DEPOSIT' },
  { n: 2, label: 'Stage payment 1', when: 'On completion of: Demolition, Structure', percent: 40, amount: 4800, kind: 'STAGE', stages: ['A', 'B'] },
  { n: 3, label: 'Stage payment 2', when: 'On completion of: Finishes', percent: 40, amount: 4800, kind: 'STAGE', stages: ['C'] },
  { n: 4, label: 'Final payment', when: 'On practical completion', percent: 10, amount: 1200, kind: 'FINAL' },
];
const st = (stage, status) => ({ stage, label: stage, days: 1, status, percent: status === 'DONE' ? 100 : 0, note: '', late: false });

await test('invoices fall due: deposit at once, a stage payment when all its stages are done, final on completion', async () => {
  const due = (stages, status, already = []) => calc.invoicesDue(schedule, stages, status, '2027-02-10', new Set(already)).map(r => r.n);
  assert.deepEqual(due([st('A', 'DONE'), st('B', 'IN_PROGRESS'), st('C', 'NOT_STARTED')], 'IN_PROGRESS'), [1]);
  assert.deepEqual(due([st('A', 'DONE'), st('B', 'DONE'), st('C', 'NOT_STARTED')], 'IN_PROGRESS', [1]), [2]);
  assert.deepEqual(due([st('A', 'DONE'), st('B', 'DONE'), st('C', 'DONE')], 'IN_PROGRESS', [1, 2]), [3]);
  assert.deepEqual(due([st('A', 'DONE'), st('B', 'DONE'), st('C', 'DONE')], 'COMPLETED', [1, 2, 3]), [4]);
  // Old schedules without stage links: a stage payment is due on its planned date.
  const old = [{ n: 2, label: 'Stage payment 1', when: '', percent: 50, amount: 100, date: '2027-02-09' }, { n: 3, label: 'Stage payment 2', when: '', percent: 50, amount: 100, date: '2027-03-01' }];
  assert.deepEqual(calc.invoicesDue(old, [], 'IN_PROGRESS', '2027-02-10', new Set()).map(r => r.n), [2]);
  assert.deepEqual(calc.invoiceAmounts({ amount: 1200 }, { net: 10000, gross: 12000 }), { net: 1000, vat: 200, gross: 1200 });
  assert.equal(calc.invoiceNumber('2A-0042', 3), '2A-0042-INV03');
});

await test('an invoice is issued once per payment, with amounts that add up', async () => {
  const inv = { scheduleNo: 1, number: '2A-0042-INV01', label: 'Deposit', description: 'On signing', issuedOn: '2027-01-20', dueOn: '2027-01-27', net: 1000, vat: 200, gross: 1200 };
  await rejects(portal.issueInvoice(db, Q, { ...inv, gross: 1300 }, 'system'), /add up/);
  const first = await portal.issueInvoice(db, Q, inv, 'system');
  assert.equal(first.number, '2A-0042-INV01'); assert.equal(first.gross, 1200); assert.equal(first.dueOn, '2027-01-27');
  assert.equal(await portal.issueInvoice(db, Q, inv, 'system'), null); // second run raises nothing (and so emails nothing)
  const list = await portal.listInvoices(db, Q);
  assert.equal(list.length, 1); assert.equal(list[0].emailedAt, null);
  await portal.markInvoiceEmailed(db, list[0].id);
  assert.ok((await portal.listInvoices(db, Q))[0].emailedAt);
});

await test('snags: either side adds and marks done; only uploaded https photos; nothing is deleted', async () => {
  await rejects(portal.addSnag(db, Q, { title: ' ', detail: '', location: '', photoUrl: '' }, 'jane@example.com', 'CLIENT'), /Describe/);
  await rejects(portal.addSnag(db, Q, { title: 'Paint', detail: '', location: '', photoUrl: 'javascript:alert(1)' }, 'jane@example.com', 'CLIENT'), /uploaded/);
  const a = await portal.addSnag(db, Q, { title: 'Scuff on landing wall', detail: '', location: 'Landing', photoUrl: 'https://utfs.io/f/s.jpg' }, 'jane@example.com', 'CLIENT');
  await portal.addSnag(db, Q, { title: 'Bedroom door catches', detail: '', location: 'Bedroom 3', photoUrl: '' }, 'admin', 'ADMIN');
  await portal.setSnagStatus(db, Q, a.id, 'DONE', 'admin', 'ADMIN');
  let list = await portal.listSnags(db, Q);
  assert.equal(list.length, 2); assert.equal(list[1].id, a.id); // done ones sort last
  assert.equal(list[1].status, 'DONE'); assert.equal(list[1].doneByKind, 'ADMIN');
  await portal.setSnagStatus(db, Q, a.id, 'OPEN', 'jane@example.com', 'CLIENT');
  list = await portal.listSnags(db, Q);
  assert.equal(list.find(s => s.id === a.id).status, 'OPEN'); assert.equal(list.find(s => s.id === a.id).doneAt, null);
  const ev = await jobs.listEvents(db, Q, true);
  assert.ok(ev.some(e => /Client added a snag: Scuff on landing wall \(Landing\)/.test(e.message)));
  assert.ok(ev.some(e => /Client reopened “Scuff on landing wall”/.test(e.message)));
  // A snag can't be changed through another job.
  const other = await store.createQuote(db, { clientName: 'B', clientEmail: 'b@example.com', siteAddress: '2 High St' }, { input: {}, result: {}, customer: {}, rates: {}, prices: {} }, 'admin');
  await rejects(portal.setSnagStatus(db, other.id, a.id, 'DONE', 'b@example.com', 'CLIENT'), /not found/);
});

console.log(`\n${passed} client portal tests passed`);
