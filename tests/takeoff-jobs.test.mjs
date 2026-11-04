// Jobs: progress, activity, photos, client actions & supplies, payments, expenses, workers, check-ins
// and pay owed – against in-memory PostgreSQL (PGlite). No application database is used.
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

const pg = new PGlite();
const wrap = c => ({ query: async (text, params = []) => (await c.query(text, params)).rows });
const db = { ...wrap(pg), transaction: fn => pg.transaction(tx => fn(wrap(tx))) };
let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log('ok -', name); };
const rejects = async (p, re) => { await assert.rejects(p, e => re.test(String(e.message ?? e))); };

await pg.exec(`CREATE TABLE "Existing" (id int primary key, name text); INSERT INTO "Existing" VALUES (1, 'live row');`);
await pg.exec(readFileSync(new URL('../prisma/migrations/20261101120000_add_takeoff_quotes/migration.sql', import.meta.url), 'utf8'));
assert.equal(await jobs.jobsReady(db), false);
await pg.exec(readFileSync(new URL('../prisma/migrations/20261102120000_add_takeoff_jobs/migration.sql', import.meta.url), 'utf8'));

const client = { clientName: 'Jane Client', clientEmail: 'jane@example.com', siteAddress: '1 High St' };
const q = await store.createQuote(db, client, { input: {}, result: { totals: { gross: 12000 } }, customer: { gross: 12000 }, rates: {}, prices: {} }, 'admin');
await store.sendQuote(db, q.id, 'admin');
await store.acceptQuote(db, q.id, 'jane@example.com', 1, 'Jane Client');
const Q = q.id;

await test('migration is additive; jobs list shows accepted quotes', async () => {
  assert.deepEqual(await db.query(`SELECT * FROM "Existing"`), [{ id: 1, name: 'live row' }]);
  assert.equal(await jobs.jobsReady(db), true);
  const list = await jobs.listJobs(db);
  assert.equal(list.length, 1); assert.equal(list[0].status, 'PLANNED'); assert.equal(list[0].gross, 12000);
});

await test('status, start date and stage progress create client-visible activity', async () => {
  await jobs.updateJob(db, Q, { startDate: '2027-01-11' }, 'admin');
  await jobs.setStage(db, Q, 'Loft · Demolition', { status: 'IN_PROGRESS', percent: 40, note: 'Roof stripped' }, 'admin', 'Loft – Demolition');
  const job = await jobs.getJob(db, Q);
  assert.equal(job.startDate, '2027-01-11'); assert.equal(job.status, 'IN_PROGRESS');
  const [s] = await jobs.listStages(db, Q);
  assert.equal(s.percent, 40);
  await jobs.setStage(db, Q, 'Loft · Demolition', { status: 'DONE', percent: 10, note: '' }, 'admin');
  assert.equal((await jobs.listStages(db, Q))[0].percent, 100);
  const events = await jobs.listEvents(db, Q, true);
  assert.ok(events.some(e => /in progress \(40%\) – Roof stripped/.test(e.message)));
  assert.equal(await jobs.unreadSince(db, Q, 'CLIENT'), events.length);
  await store.markSeen(db, Q, 'CLIENT');
  assert.equal(await jobs.unreadSince(db, Q, 'CLIENT'), 0);
});

await test('photos: only https uploads; hidden from client until shared; favourites; never deleted', async () => {
  await rejects(jobs.addPhotos(db, Q, [{ url: 'javascript:alert(1)' }], 'admin'), /https/);
  await jobs.addPhotos(db, Q, [{ url: 'https://utfs.io/f/a.jpg', caption: 'Before' }, { url: 'https://utfs.io/f/b.jpg' }], 'admin');
  assert.equal((await jobs.listPhotos(db, Q, true)).length, 0);
  const [p] = await jobs.listPhotos(db, Q);
  await jobs.updatePhoto(db, p.id, { visibleToClient: true, favourite: true }, 'admin');
  assert.equal((await jobs.listPhotos(db, Q, true)).length, 1);
  assert.equal((await jobs.listFavouritePhotos(db)).length, 1);
  await jobs.updatePhoto(db, p.id, { hidden: true }, 'admin');
  assert.equal((await jobs.listPhotos(db, Q, true)).length, 0);
  await rejects(db.query(`DELETE FROM "TakeoffJobPhoto"`), /cannot be deleted/);
});

await test('client actions: asked, answered by client, closed by admin', async () => {
  const a = await jobs.addAction(db, Q, { kind: 'DECISION', title: 'Choose tile colour', detail: '', dueDate: '2027-02-01' }, 'admin');
  await jobs.answerAction(db, Q, a.id, 'Warm grey', 'jane@example.com');
  assert.equal((await jobs.listActions(db, Q))[0].status, 'ANSWERED');
  await jobs.setActionStatus(db, Q, a.id, 'DONE', 'admin');
  await rejects(jobs.answerAction(db, Q, a.id, 'x', 'jane'), /closed/);
  assert.equal(await jobs.unreadSince(db, Q, 'ADMIN'), 1, 'admin sees the client answer as new');
});

await test('client supplies and our orders are tracked per item / stage', async () => {
  await jobs.setSupply(db, Q, 'Bathroom|Tiles', 'ORDERED', 'Topps Tiles, arriving Tuesday', 'jane@example.com', 'CLIENT', 'Tiles');
  await jobs.setSupply(db, Q, 'Bathroom|Tiles', 'DELIVERED', '', 'jane@example.com', 'CLIENT', 'Tiles');
  const s = await jobs.listSupplies(db, Q);
  assert.equal(s.length, 1); assert.equal(s[0].status, 'DELIVERED');
  await jobs.setOrder(db, Q, 'Loft · Roof structure', { status: 'ORDERED', supplier: 'Selco', note: '' }, 'admin');
  assert.equal((await jobs.listOrders(db, Q))[0].supplier, 'Selco');
});

await test('payments: client reports, admin confirms or rejects; schedule applied in order', async () => {
  await jobs.recordPayment(db, Q, { scheduleNo: 1, amount: 1200, method: 'BANK_TRANSFER', reference: 'Q-DEP', paidOn: '2027-01-04', note: '' }, 'jane@example.com', 'CLIENT');
  let [p] = await jobs.listPayments(db, Q);
  assert.equal(p.status, 'REPORTED');
  await jobs.reviewPayment(db, p.id, 'CONFIRMED', 'admin');
  await rejects(jobs.reviewPayment(db, p.id, 'CONFIRMED', 'admin'), /Only payments reported/);
  await jobs.recordPayment(db, Q, { scheduleNo: 2, amount: 2000, method: 'BANK_TRANSFER', reference: '', paidOn: '2027-01-29', note: '' }, 'admin', 'ADMIN');
  const pays = await jobs.listPayments(db, Q);
  const schedule = [
    { n: 1, label: 'Deposit', when: '', date: '2027-01-04', percent: 10, amount: 1200 },
    { n: 2, label: 'Stage 1', when: '', date: '2027-01-27', percent: 40, amount: 4800 },
    { n: 3, label: 'Final', when: '', date: '2027-04-01', percent: 50, amount: 6000 },
  ];
  const due = calc.paymentsDue(schedule, pays, '2027-02-01');
  assert.equal(due.received, 3200); assert.equal(due.outstanding, 8800);
  assert.deepEqual(due.rows.map(r => r.state), ['PAID', 'OVERDUE', 'UPCOMING']);
  assert.equal(due.rows[1].balance, 2800);
  await rejects(jobs.recordPayment(db, Q, { scheduleNo: null, amount: 0, method: 'X', reference: '', paidOn: '2027-01-01', note: '' }, 'a', 'ADMIN'), /amount/);
});

let W;
await test('workers: saved, rated 1–10, check-in only when assigned, link by token', async () => {
  W = (await jobs.saveWorker(db, { name: 'Ardit', kind: 'EMPLOYEE', trade: 'Carpenter', phone: '07700 900000', email: 'ardit@example.com', payBasis: 'DAY', dayRate: 200, notes: '', active: true })).id;
  const S = (await jobs.saveWorker(db, { name: 'Sparks Ltd', kind: 'SUBCONTRACTOR', trade: 'Electrician', phone: '', email: '', payBasis: 'JOB', dayRate: null, notes: '', active: true })).id;
  await jobs.rateWorker(db, W, 8, 'Tidy', Q, 'admin'); await jobs.rateWorker(db, W, 9, '', null, 'admin');
  await rejects(jobs.rateWorker(db, W, 11, '', null, 'admin'), /1 to 10/);
  const list = await jobs.listWorkers(db);
  assert.equal(list.find(w => w.id === W).rating, 8.5);
  await rejects(jobs.checkIn(db, W, Q, 'IN', {}, 'WORKER'), /not assigned/);
  await jobs.assignWorker(db, Q, W, { trade: 'Carpenter', payBasis: 'DAY', dayRate: null, agreedPrice: null, active: true }, 'admin');
  await jobs.assignWorker(db, Q, S, { trade: 'Electrician', payBasis: 'JOB', dayRate: null, agreedPrice: 1800, active: true }, 'admin');
  await jobs.setWorkerToken(db, W, 'hash-abc');
  assert.equal((await jobs.workerByToken(db, 'hash-abc')).name, 'Ardit');
  assert.equal(await jobs.workerByToken(db, 'nope'), null);
});

await test('days worked from check-ins and pay owed (day rate and price per job)', async () => {
  await jobs.checkIn(db, W, Q, 'IN', { lat: 51.5, lng: -0.1, accuracy: 20 }, 'WORKER', '', '2027-01-11T08:00:00Z');
  await jobs.checkIn(db, W, Q, 'OUT', {}, 'WORKER', '', '2027-01-11T16:30:00Z');
  await jobs.checkIn(db, W, Q, 'IN', {}, 'WORKER', '', '2027-01-12T08:00:00Z');
  await jobs.checkIn(db, W, Q, 'OUT', {}, 'WORKER', '', '2027-01-12T11:00:00Z');
  await jobs.checkIn(db, W, Q, 'IN', {}, 'ADMIN', 'forgot phone', '2027-01-13T08:00:00Z');
  const ci = await jobs.listCheckIns(db, { quoteId: Q });
  const days = calc.daysWorked(ci.filter(c => c.workerId === W));
  assert.deepEqual(days.map(d => d.value), [1, 0.5, 1]);
  assert.equal(days[2].missingOut, true);
  await jobs.addExpense(db, { quoteId: Q, workerId: W, category: 'LABOUR', description: 'Week 1', supplier: '', amount: 300, spentOn: '2027-01-15' }, 'admin');
  const [a] = await jobs.listAssignments(db, { quoteId: Q, workerId: W });
  const exp = await jobs.listExpenses(db, { quoteId: Q });
  const owed = calc.payOwed(a, ci, exp, 200);
  assert.deepEqual({ days: owed.days, earned: owed.earned, paid: owed.paid, balance: owed.balance, missingOut: owed.missingOut }, { days: 2.5, earned: 500, paid: 300, balance: 200, missingOut: 1 });
  const sub = (await jobs.listAssignments(db, { quoteId: Q })).find(x => x.payBasis === 'JOB');
  assert.equal(calc.payOwed(sub, ci, exp, null).balance, 1800);
  await rejects(db.query(`DELETE FROM "TakeoffCheckIn"`), /immutable/);
});

await test('money in and out by month; expenses can be voided not deleted', async () => {
  await jobs.addExpense(db, { quoteId: Q, workerId: null, category: 'MATERIALS', description: 'Timber', supplier: 'Selco', amount: 950.5, spentOn: new Date().toISOString().slice(0, 10) }, 'admin');
  await jobs.recordPayment(db, Q, { scheduleNo: null, amount: 500, method: 'BANK_TRANSFER', reference: '', paidOn: new Date().toISOString().slice(0, 10), note: '' }, 'admin', 'ADMIN');
  const m = await jobs.monthlyMoney(db, 12);
  assert.equal(m.length, 12);
  assert.equal(m.at(-1).moneyIn, 500); assert.equal(m.at(-1).moneyOut, 950.5);
  const e = (await jobs.listExpenses(db, { quoteId: Q })).find(x => x.description === 'Timber');
  await jobs.voidExpense(db, e.id);
  assert.equal((await jobs.monthlyMoney(db, 1))[0].moneyOut, 0);
  await rejects(db.query(`DELETE FROM "TakeoffExpense"`), /cannot be deleted/);
});

await test('client contact details and access notes', async () => {
  await jobs.saveClientInfo(db, Q, { contacts: [{ name: 'Tom (partner)', role: 'Partner', phone: '07700 900111', email: '' }], accessNotes: 'Key safe 1234; dog in garden' }, 'jane@example.com', 'CLIENT');
  const job = await jobs.getJob(db, Q);
  assert.equal(job.clientContacts[0].name, 'Tom (partner)'); assert.match(job.accessNotes, /Key safe/);
});

console.log(`\n${passed} jobs storage tests passed`);
