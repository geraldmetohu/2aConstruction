// Admin tools against in-memory PostgreSQL (PGlite) with the migrations applied: error log, notification
// settings, materials, reviews, acceptance signatures, marketing contacts & campaigns, database backup,
// calendar feed and accounting exports. No application database is used.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { typescriptLoader } from './helpers/load-typescript.mjs';

const require = createRequire(import.meta.url);
const { PGlite } = require('@electric-sql/pglite');
const load = typescriptLoader();
const store = load('app/lib/takeoff/store.ts');
const jobs = load('app/lib/takeoff/jobs-store.ts');
const errors = load('app/lib/errors/error-log.ts');
const settings = load('app/lib/settings/app-settings.ts');
const materials = load('app/lib/takeoff/materials.ts');
const reviews = load('app/lib/reviews/reviews.ts');
const sig = load('app/lib/takeoff/acceptance-signature.ts');
const contacts = load('app/lib/marketing/contacts.ts');
const campaigns = load('app/lib/marketing/campaigns.ts');
const render = load('app/lib/marketing/render.ts');
const templates = load('app/lib/marketing/templates.ts');
const backup = load('app/lib/backup/backup.ts');
const zipLib = load('app/lib/backup/zip.ts');
const ics = load('app/lib/calendar/ics.ts');
const accounting = load('app/lib/finance/accounting-export.ts');
const del = load('app/lib/takeoff/delete-store.ts');

const pg = new PGlite();
const wrap = c => ({ query: async (text, params = []) => (await c.query(text, params)).rows });
const db = { ...wrap(pg), transaction: fn => pg.transaction(tx => fn(wrap(tx))) };
let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log('ok -', name); };

const dir = new URL('../prisma/migrations/', import.meta.url);
for (const m of readdirSync(dir).filter(n => /^\d{14}_/.test(n) && n >= '20261101' && !/project_details|more_suppliers/.test(n)).sort()) await pg.exec(readFileSync(new URL(`${m}/migration.sql`, dir), 'utf8'));
// The legacy estimator table (made by Prisma before these migrations).
await pg.exec(`CREATE TABLE "Client" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "email" text NOT NULL, "fullName" text NOT NULL, "marketingAccepted" boolean NOT NULL DEFAULT false, "createdAt" timestamp DEFAULT now())`);

const pay = { input: {}, result: { totals: { gross: 12000 } }, customer: { gross: 12000 }, rates: {}, prices: {} };
async function project(email, name = 'Test Client') {
  const q = await store.createQuote(db, { clientName: name, clientEmail: email, siteAddress: '1 St, RM11 1AA' }, pay, 'admin');
  await store.sendQuote(db, q.id, 'admin');
  await store.acceptQuote(db, q.id, email, 1, name);
  await jobs.getJob(db, q.id);
  return q.id;
}
const A = await project('anna@example.com', 'Anna Smith');

await test('error log: one row per problem, ids grouped, one email per 6 hours', async () => {
  const e1 = await errors.recordError(db, { source: 'server', message: 'Boom for 3f2b8c1e-1111-4222-8333-944455556666', path: '/dashboard/jobs/3f2b8c1e-1111-4222-8333-944455556666', stack: 'Error\n at x (a.js:1)' });
  const e2 = await errors.recordError(db, { source: 'server', message: 'Boom for 0a0b0c0d-1111-4222-8333-944455556666', path: '/dashboard/jobs/0a0b0c0d-1111-4222-8333-944455556666', stack: 'Error\n at x (a.js:1)' });
  assert.equal(e1.row.id, e2.row.id); assert.equal(e2.row.count, 2);
  assert.equal(e1.email, true); assert.equal(e2.email, false, 'no second email for the same problem');
  await errors.resolveError(db, e1.row.id);
  assert.equal((await errors.listErrors(db, { open: true })).length, 0);
  await errors.recordError(db, { source: 'server', message: 'Boom for 3f2b8c1e-1111-4222-8333-944455556666', path: '/dashboard/jobs/x' });
  assert.equal((await errors.listErrors(db, { open: true })).length, 1);
});

await test('notifications: morning list and client reminders start OFF; settings saved', async () => {
  assert.deepEqual(await settings.getNotifications(db), { morningList: false, clientReminders: false, portalDigest: true, reviewRequests: true });
  await settings.saveNotifications(db, { morningList: true, clientReminders: false, portalDigest: false, reviewRequests: true });
  assert.equal((await settings.getNotifications(db)).morningList, true);
  const t1 = await settings.secretToken(db, 'calendarToken'), t2 = await settings.secretToken(db, 'calendarToken');
  assert.equal(t1, t2); assert.ok(t1.length >= 30);
  assert.notEqual(await settings.secretToken(db, 'calendarToken', true), t1);
});

await test('materials: every quote material by stage, confirmed one by one, extras added, stage done flagged', async () => {
  const L = (stage, description, quantity, total, extra = {}) => ({ stage, description, quantity, unit: 'nr', total, kind: 'MATERIAL', area: 'Loft', ...extra });
  const lines = [L('Loft · Steels', 'UB 152x89', 2, 400), L('Loft · Steels', 'UB 152x89', 1, 200, { area: 'Stairs' }), L('Loft · Floor', 'Joist C24', 20, 300), L('Loft · Floor', 'Labour', 1, 900, { kind: 'LABOUR' }),
    L('Loft · Floor', 'Tiles', 10, 0, { clientSupplied: true }), L('Loft · Floor', 'Excluded', 1, 10, { excluded: true })];
  const stages = [{ stage: 'Loft · Steels', label: 'Steels', status: 'DONE' }, { stage: 'Loft · Floor', label: 'Floor', status: 'NOT_STARTED' }];
  let list = materials.materialsFor(lines, stages, []);
  assert.equal(list.length, 2);
  const steel = list[0].items[0];
  assert.equal(steel.quantity, 3); assert.equal(steel.quotedCost, 600); assert.deepEqual(steel.areas, ['Loft', 'Stairs']);
  assert.equal(list[1].items.length, 2, 'labour and excluded lines are left out; client items listed');
  assert.equal(list[1].total, 1, 'client-supplied items are not ours to buy');
  await materials.setMaterials(db, A, [steel], { status: 'DELIVERED', supplier: 'Selco' }, 'admin');
  await materials.addExtraMaterial(db, A, { stage: 'Loft · Floor', description: 'Extra noggins', quantity: 12, unit: 'nr', status: 'ORDERED', supplier: '', cost: 30, note: '' }, 'admin');
  list = materials.materialsFor(lines, stages, await materials.listMaterials(db, A));
  assert.equal(list[0].items[0].status, 'DELIVERED'); assert.equal(list[0].items[0].supplier, 'Selco');
  assert.ok(list[1].items.some(i => i.extra && i.description === 'Extra noggins'));
  assert.deepEqual([...materials.confirmedStages(list)], [['Loft · Steels', 'DELIVERED']]);
  await materials.setMaterials(db, A, [steel], { note: 'left at side gate' }, 'admin');
  assert.equal((await materials.listMaterials(db, A)).find(m => m.itemKey === steel.itemKey).status, 'DELIVERED', 'a note alone keeps the status');
  const extra = (await materials.listMaterials(db, A)).find(m => m.extra);
  assert.equal(await materials.removeExtraMaterial(db, A, extra.itemKey), true);
  assert.equal(await materials.removeExtraMaterial(db, A, steel.itemKey), false, 'quote items can only be marked not needed');
});

await test('reviews: client writes, shown only when approved and allowed; asked once a week after handover', async () => {
  await jobs.updateJob(db, A, { status: 'COMPLETED' }, 'admin');
  assert.equal((await reviews.dueReviewRequests(db, 7)).length, 0, 'not a week yet');
  await pg.query(`UPDATE "TakeoffJob" SET "completedAt" = now() - interval '8 days' WHERE "quoteId" = $1`, [A]);
  assert.deepEqual((await reviews.dueReviewRequests(db, 7)).map(r => r.quoteId), [A]);
  await reviews.markReviewRequested(db, A);
  assert.equal((await reviews.dueReviewRequests(db, 7)).length, 0, 'asked once');
  const r = await reviews.saveReview(db, A, { rating: 5, title: 'Great', body: 'Brilliant team, tidy and on time.', displayName: 'Anna S.', area: 'RM11', allowPublish: false });
  assert.equal(await reviews.setReviewStatus(db, r.id, 'APPROVED', 'admin'), false, 'cannot publish without permission');
  await reviews.saveReview(db, A, { rating: 5, title: 'Great', body: 'Brilliant team, tidy and on time.', displayName: 'Anna S.', area: 'RM11', allowPublish: true });
  assert.equal((await reviews.publishedReviews(db)).length, 0);
  assert.equal(await reviews.setReviewStatus(db, r.id, 'APPROVED', 'admin', 'Thank you!'), true);
  const pub = await reviews.publishedReviews(db);
  assert.equal(pub.length, 1); assert.equal(pub[0].reply, 'Thank you!');
  await reviews.saveReview(db, A, { rating: 4, title: '', body: 'Edited after a month – still great.', displayName: 'Anna S.', area: 'RM11', allowPublish: true });
  assert.equal((await reviews.publishedReviews(db)).length, 0, 'an edit goes back for approval');
});

await test('acceptance signature: PNG only, saved with name, IP and device', async () => {
  const png = 'data:image/png;base64,' + 'A'.repeat(1200);
  assert.equal(sig.validSignatureImage(png), true);
  assert.equal(sig.validSignatureImage('data:image/svg+xml;base64,AAAA'), false);
  assert.equal(sig.validSignatureImage('data:image/png;base64,AAAA'), false, 'too small to be a signature');
  await sig.saveAcceptanceSignature(db, { quoteId: A, version: 1, signedName: 'Anna Smith', email: 'anna@example.com', image: png, ip: '1.2.3.4', userAgent: 'iPhone' });
  const s = await sig.clientSignedFor(db, A);
  assert.equal(s.name, 'Anna Smith'); assert.equal(s.ip, '1.2.3.4'); assert.match(s.date, /^\d{4}-\d{2}-\d{2}$/);
});

await test('marketing: only people who said yes, or asked for a quote, can be emailed; unsubscribes stick', async () => {
  await pg.query(`INSERT INTO "Client" ("email", "fullName", "marketingAccepted") VALUES ('terms.only@example.com', 'Tom Terms', true), ('Yes.Please@example.com', 'Yasmin Yes', true)`);
  await contacts.recordConsent(db, { email: 'Yes.Please@example.com', name: 'Yasmin Yes', source: 'ESTIMATOR' });
  let list = await contacts.marketingContacts(db);
  const by = e => list.find(c => c.email === e);
  assert.equal(by('terms.only@example.com').basis, 'NONE', 'agreeing to the terms is not marketing consent');
  assert.equal(by('yes.please@example.com').basis, 'CONSENT');
  assert.equal(by('anna@example.com').basis, 'SOFT_OPT_IN');
  assert.equal(list.filter(contacts.sendable).length, 2);
  await contacts.recordUnsubscribe(db, 'yes.please@example.com', 'RESEND');
  await contacts.recordConsent(db, { email: 'yes.please@example.com', source: 'ESTIMATOR' });
  list = await contacts.marketingContacts(db);
  assert.equal(by('yes.please@example.com').unsubscribed, true, 'a later form tick does not undo an unsubscribe');
  await contacts.recordUnsubscribe(db, 'anna@example.com');
  list = await contacts.marketingContacts(db);
  assert.equal(by('anna@example.com').unsubscribed, true);
  assert.equal(list.filter(contacts.sendable).length, 0);
  await contacts.recordConsent(db, { email: 'yes.please@example.com', source: 'OFFICE', note: 'phoned' }, true);
  list = await contacts.marketingContacts(db);
  assert.equal(contacts.sendable(by('yes.please@example.com')), true, 'the office can re-add someone who asks again');
});

await test('marketing: emails render with company details, personalisation and unsubscribe; campaigns recorded', async () => {
  const c = templates.STARTER_TEMPLATES[0].content;
  const company = { name: '2A Construction Ltd', address: '1 High St, London', phone: '020', email: 'x@y.z' };
  const b = render.renderMarketing(c, { base: 'https://site', company, mode: 'broadcast' });
  assert.ok(b.html.includes('{{{RESEND_UNSUBSCRIBE_URL}}}') && b.html.includes('{{{contact.first_name|there}}}'));
  assert.ok(b.html.includes('https://site/extention.jpeg') && b.html.includes('2A Construction Ltd'));
  const t = render.renderMarketing({ ...c, heading: '<script>x</script>' }, { base: 'https://site', company, mode: 'test', testFirstName: 'Gerald' });
  assert.ok(t.html.includes('Hi Gerald,') && !t.html.includes('<script>x'));
  assert.ok(templates.STARTER_TEMPLATES.length >= 8 && templates.STARTER_TEMPLATES.every(x => x.content.subject && x.content.paragraphs.length));
  const id = await campaigns.createCampaign(db, { name: 'Spring', subject: c.subject, fromAddress: 'm@x', content: c, html: b.html, recipients: [{ email: 'a@x.com', name: 'A', basis: 'CONSENT' }] }, 'admin');
  await campaigns.finishCampaign(db, id, { broadcastId: 'b1' });
  const [row] = await campaigns.listCampaigns(db);
  assert.equal(row.status, 'SENT'); assert.equal(row.recipients, 1);
  assert.ok((await campaigns.recentlyEmailed(db, 14)).has('a@x.com'));
  const tid = await campaigns.saveTemplate(db, { name: 'Mine', content: c }, 'admin');
  await campaigns.saveTemplate(db, { id: tid, name: 'Mine 2', content: c }, 'admin');
  assert.deepEqual((await campaigns.listTemplates(db)).map(x => x.name), ['Mine 2']);
});

await test('backup: every table except sign-in tokens, read in chunks, zip is valid', async () => {
  const tables = await backup.listTables(db);
  const names = tables.map(t => t.name);
  assert.ok(names.includes('TakeoffQuote') && names.includes('Client') && names.includes('AuthAccount'));
  assert.ok(!names.includes('AuthSession') && !names.includes('AuthToken') && !names.includes('AuthAttempt'));
  const c = await backup.readChunk(db, 'TakeoffQuote', 0);
  const rows = JSON.parse(c.json);
  assert.equal(rows.length, tables.find(t => t.name === 'TakeoffQuote').rows); assert.equal(c.next, null);
  assert.equal(rows[0].clientEmail, 'anna@example.com');
  await assert.rejects(backup.readChunk(db, 'AuthSession', 0), /Unknown table/);
  await assert.rejects(backup.readChunk(db, '"; DROP TABLE x; --', 0), /Unknown table/);
  assert.equal(zipLib.crc32(new TextEncoder().encode('hello')), 0x3610a686);
  const csv = zipLib.rowsToCsv([{ a: 1, b: 'x,y', c: { d: 1 } }, { a: 2 }]);
  assert.ok(csv.includes('"x,y"') && csv.includes('"{""d"":1}"'));
});

await test('calendar: valid iCalendar with all-day events, escaped and folded', async () => {
  const out = ics.toIcs('Jobs', [{ uid: 'u1@x', title: 'Steels, beams; and a very long title that goes on and on to make the line longer than seventy five characters', start: '2026-11-20', end: '2026-11-22', location: '1 St' }, { uid: 'bad', title: 'x', start: 'nope' }]);
  assert.ok(out.startsWith('BEGIN:VCALENDAR\r\n') && out.trimEnd().endsWith('END:VCALENDAR'));
  assert.ok(out.includes('DTSTART;VALUE=DATE:20261120') && out.includes('DTEND;VALUE=DATE:20261123'));
  assert.ok(out.includes('Steels\\, beams\; and'));
  assert.equal((out.match(/BEGIN:VEVENT/g) ?? []).length, 1, 'events without a valid date are skipped');
  assert.ok(out.split('\r\n').every(l => Buffer.byteLength(l) <= 75));
});

await test('accounting: Xero sales, bills and transactions CSVs', async () => {
  const x = {
    today: '2026-11-18', settings: { vatRegistered: true },
    entries: [{ id: 'e1', date: '2026-10-02', direction: 'OUT', method: 'BANK', category: 'INSURANCE', description: 'Policy', counterparty: 'Hiscox', quoteId: null, workerId: null, jobCostId: null, recurringId: null, amount: 600, vat: 0, vatTreatment: 'EXEMPT', cisLabour: 0, cisMaterials: 0, cisDeducted: 0, days: null, bankLineId: null },
      { id: 'e2', date: '2026-10-03', direction: 'OUT', method: 'BANK', category: 'HMRC_VAT', description: 'VAT', counterparty: 'HMRC', quoteId: null, workerId: null, jobCostId: null, recurringId: null, amount: 900, vat: 0, vatTreatment: 'OUTSIDE', cisLabour: 0, cisMaterials: 0, cisDeducted: 0, days: null, bankLineId: null }],
    expenses: [{ id: 'x1', quoteId: 'q1', workerId: null, category: 'MATERIALS', description: 'Steel', supplier: 'Selco', amount: 120, vat: 20, vatTreatment: 'STANDARD', method: 'CARD', spentOn: '2026-10-05', bankLineId: null }],
    payments: [{ id: 'p1', quoteId: 'q1', amount: 1200, paidOn: '2026-10-06', method: 'BANK_TRANSFER', status: 'CONFIRMED', reference: '', linked: false }],
    invoices: [{ quoteId: 'q1', number: 'Q-1-01', label: 'Deposit', issuedOn: '2026-10-01', dueOn: '2026-10-08', net: 1000, vat: 200, gross: 1200 }, { quoteId: 'q1', number: 'Q-1-02', label: 'Old', issuedOn: '2025-01-01', dueOn: '2025-01-08', net: 1, vat: 0, gross: 1 }],
    jobs: [{ quoteId: 'q1', reference: 'Q-1', clientName: 'Anna, Smith', siteAddress: '1 St', jobStatus: 'IN_PROGRESS', contractNet: 0, contractGross: 0, plannedCost: 0, vatPercent: 20, acceptedAt: null }],
    jobCosts: [], recurring: [], workers: [], assignments: [], workDays: [], bank: { toDo: 0, lastClosing: null, lastDate: null, statements: 0 },
  };
  const s = accounting.xeroSalesCsv(x, '2026-04-06', '2027-04-05');
  assert.equal(s.count, 1);
  assert.ok(s.csv.includes('"Anna, Smith",,1 St,Q-1-01,Q-1,01/10/2026,08/10/2026,Deposit,1,1000,200,20% (VAT on Income),200,GBP'));
  const b = accounting.xeroBillsCsv(x, '2026-04-06', '2027-04-05');
  assert.equal(b.count, 2, 'tax payments are not bills');
  assert.ok(b.csv.includes(',100,310,20% (VAT on Expenses),20,GBP') && b.csv.includes('433,Exempt Expenses'));
  const t = accounting.transactionsCsv(x, '2026-04-06', '2027-04-05');
  assert.equal(t.count, 4);
  assert.ok(t.csv.includes('2026-10-06,1200,IN') && t.csv.includes('2026-10-03,-900,OUT'));
});

await test('deleting a project also removes its materials, review, signature and digest notices', async () => {
  await materials.addExtraMaterial(db, A, { stage: '', description: 'Sand', quantity: 1, unit: 'bag', status: 'NEEDED', supplier: '', cost: null, note: '' }, 'admin');
  await del.deleteProject(db, A);
  for (const t of ['TakeoffJobMaterial', 'TakeoffReview', 'TakeoffReviewRequest', 'TakeoffAcceptanceSignature', 'TakeoffQuote'])
    assert.equal((await pg.query(`SELECT count(*)::int AS n FROM "${t}"`)).rows[0].n, 0, t);
});

console.log(`\n${passed} admin tool tests passed`);
