// Saved quotes, versions, client notices/choices, rate sets and supplier prices,
// against a real in-memory PostgreSQL (PGlite). No application database is used.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { typescriptLoader, root } from './helpers/load-typescript.mjs';

const require = createRequire(import.meta.url);
const { PGlite } = require('@electric-sql/pglite');
const load = typescriptLoader();
const store = load('app/lib/takeoff/store.ts');

const pg = new PGlite();
const wrap = c => ({ query: async (text, params = []) => (await c.query(text, params)).rows });
const db = { ...wrap(pg), transaction: fn => pg.transaction(tx => fn(wrap(tx))) };

let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log('ok -', name); };
const rejects = async (p, re) => { await assert.rejects(p, e => re.test(String(e.message ?? e))); };
const payload = gross => ({ input: { a: 1 }, result: { totals: { gross } }, customer: { gross }, rates: {}, prices: {} });

// A pre-existing table with live data must be untouched by the migration.
await pg.exec(`CREATE TABLE "Existing" (id int primary key, name text); INSERT INTO "Existing" VALUES (1, 'live row');`);
assert.equal(await store.storageReady(db), false);
await pg.exec(readFileSync(new URL('../prisma/migrations/20261101120000_add_takeoff_quotes/migration.sql', import.meta.url), 'utf8'));

await test('migration is additive and storage is detected', async () => {
  assert.deepEqual((await db.query(`SELECT * FROM "Existing"`)), [{ id: 1, name: 'live row' }]);
  assert.equal(await store.storageReady(db), true);
});

const client = { clientName: 'Jane Client', clientEmail: 'Jane@Example.com', siteAddress: '1 High St' };
let id;
await test('create, save drafts, concurrency check', async () => {
  const q = await store.createQuote(db, client, payload(1000), 'admin-1');
  id = q.id;
  assert.match(q.reference, /^Q-\d{6}-[0-9A-Z]{4}$/);
  const s = await store.saveVersion(db, id, 1, client, payload(1100), 'Added hallway', 'admin-1');
  assert.deepEqual({ version: s.version, notified: s.notified }, { version: 2, notified: false });
  assert.match(s.reference, /^Q-/);
  await rejects(store.saveVersion(db, id, 1, client, payload(1200), 'stale', 'admin-2'), /Reload before saving/);
  assert.equal((await store.listClientQuotes(db, 'jane@example.com')).length, 0, 'drafts are invisible to clients');
});

await test('send publishes the latest version to the client', async () => {
  const r = await store.sendQuote(db, id, 'admin-1');
  assert.equal(r.version, 2);
  const list = await store.listClientQuotes(db, 'JANE@example.com');
  assert.equal(list.length, 1); assert.equal(list[0].gross, 1100); assert.equal(list[0].unseen, 1);
  assert.equal((await store.listClientQuotes(db, 'other@example.com')).length, 0);
  assert.equal(await store.getClientQuote(db, id, 'other@example.com'), null);
});

await test('editing after sending notifies the client in the portal', async () => {
  await store.markSeen(db, id, 'CLIENT');
  assert.equal((await store.listClientQuotes(db, 'jane@example.com'))[0].unseen, 0);
  const s = await store.saveVersion(db, id, 2, client, payload(1300), 'Changed flooring to engineered oak', 'admin-1');
  assert.deepEqual({ version: s.version, notified: s.notified }, { version: 3, notified: true });
  const c = await store.getClientQuote(db, id, 'jane@example.com');
  assert.equal(c.version.version, 3);
  assert.equal(c.unseen.length, 1);
  assert.match(c.unseen[0].message, /engineered oak/);
});

await test('client choices create a new published version and alert the admin', async () => {
  const before = (await store.listQuotes(db)).find(q => q.id === id);
  assert.equal(before.unread, 0);
  await rejects(store.saveClientChoices(db, id, 'jane@example.com', 2, payload(1400), 'stale'), /reload/i);
  const r = await store.saveClientChoices(db, id, 'jane@example.com', 3, payload(1450), 'Paint type: Premium');
  assert.equal(r.version, 4);
  const after = (await store.listQuotes(db)).find(q => q.id === id);
  assert.equal(after.unread, 1); assert.equal(after.gross, 1450);
  await store.markSeen(db, id, 'ADMIN');
  assert.equal((await store.listQuotes(db)).find(q => q.id === id).unread, 0);
});

await test('acceptance locks the quote', async () => {
  await rejects(store.acceptQuote(db, id, 'jane@example.com', 3, 'Jane Client'), /updated since/);
  await store.acceptQuote(db, id, 'jane@example.com', 4, 'Jane Client');
  const g = await store.getQuote(db, id);
  assert.equal(g.quote.status, 'ACCEPTED'); assert.equal(g.quote.acceptedName, 'Jane Client');
  assert.equal(g.versions.length, 4);
  assert.deepEqual(g.events.map(e => e.kind).sort(), ['ACCEPTED', 'CLIENT_CHOICE', 'CREATED', 'SAVED', 'SENT', 'UPDATED_AFTER_SEND'].sort());
  await rejects(store.saveVersion(db, id, 4, client, payload(1), 'x', 'admin'), /accepted/);
});

await test('history is immutable and quotes cannot be deleted', async () => {
  await rejects(db.query(`UPDATE "TakeoffQuoteVersion" SET "reason" = 'x'`), /immutable/);
  await rejects(db.query(`DELETE FROM "TakeoffQuoteEvent"`), /immutable/);
  await rejects(db.query(`DELETE FROM "TakeoffQuote"`), /cannot be deleted/);
});

await test('rate sets are versioned with a stale check', async () => {
  assert.equal(await store.latestRateSet(db), null);
  await store.saveRateSet(db, 0, { labour: { paint_walls: { price: 14 } } }, 'Decorator price list', 'admin');
  await rejects(store.saveRateSet(db, 0, {}, 'stale', 'admin'), /Reload/);
  const r = await store.latestRateSet(db);
  assert.equal(r.version, 1); assert.equal(r.overrides.labour.paint_walls.price, 14);
});

await test('supplier links, observations and lowest current ex-VAT price', async () => {
  await store.upsertLink(db, { rateKey: 'plasterboard_125', supplier: 'SELCO', url: 'https://www.selcobw.com/x', packQuantity: 1, vatIncluded: true, active: true }, 'admin');
  await store.upsertLink(db, { rateKey: 'plasterboard_125', supplier: 'BUILDER_DEPOT', url: 'https://www.builderdepot.co.uk/y', packQuantity: 1, vatIncluded: false, active: true }, 'admin');
  await store.upsertLink(db, { rateKey: 'plasterboard_125', supplier: 'SELCO', url: 'https://www.selcobw.com/x2', packQuantity: 1, vatIncluded: true, active: true }, 'admin');
  const links = await store.listLinks(db);
  assert.equal(links.length, 2); assert.equal(links.find(l => l.supplier === 'SELCO').url, 'https://www.selcobw.com/x2');
  assert.equal((await store.linksDue(db)).length, 2);
  await store.recordObservation(db, links.find(l => l.supplier === 'SELCO'), { ok: true, packPrice: 12.6 });        // inc VAT → 10.50 ex
  await store.recordObservation(db, links.find(l => l.supplier === 'BUILDER_DEPOT'), { ok: true, packPrice: 11 }); // ex VAT
  await store.recordObservation(db, links.find(l => l.supplier === 'BUILDER_DEPOT'), { ok: false, error: 'Page changed' });
  const cur = await store.currentSupplierPrices(db);
  assert.equal(cur.length, 1); assert.equal(cur[0].supplier, 'SELCO'); assert.ok(Math.abs(cur[0].unitPriceExVat - 10.5) < 1e-6);
  assert.equal((await store.linksDue(db)).length, 0);
  const latest = await store.latestObservations(db);
  assert.equal(latest.find(o => o.supplier === 'BUILDER_DEPOT').status, 'FAILED');
});

await test('more merchants migration keeps every row and adds suggestions', async () => {
  const before = await db.query(`SELECT count(*)::int AS n FROM "TakeoffSupplierLink"`);
  assert.equal(await store.suggestionsReady(db), false);
  await rejects(store.upsertLink(db, { rateKey: 'osb_18', supplier: 'SCREWFIX', url: 'https://www.screwfix.com/p/x/123', packQuantity: 1, vatIncluded: true, active: true }, 'a'), /check/i);
  await pg.exec(readFileSync(new URL('../prisma/migrations/20261110120000_more_suppliers/migration.sql', import.meta.url), 'utf8'));
  assert.deepEqual(await db.query(`SELECT count(*)::int AS n FROM "TakeoffSupplierLink"`), before);
  assert.deepEqual((await db.query(`SELECT * FROM "Existing"`)), [{ id: 1, name: 'live row' }]);
  assert.equal(await store.suggestionsReady(db), true);
  await store.upsertLink(db, { rateKey: 'osb_18', supplier: 'SCREWFIX', url: 'https://www.screwfix.com/p/x/123', packQuantity: 1, vatIncluded: true, active: true }, 'a');
  await rejects(store.upsertLink(db, { rateKey: 'osb_18', supplier: 'AMAZON', url: 'https://amazon.co.uk/x', packQuantity: 1, vatIncluded: true, active: true }, 'a'), /check/i);
  assert.deepEqual(await store.materialsToSearch(db, 'SCREWFIX', ['osb_18', 'pir_100']), ['pir_100']);
  await store.addSuggestion(db, { rateKey: 'pir_100', supplier: 'SCREWFIX', url: 'https://www.screwfix.com/p/pir/9', productName: 'PIR board 100mm 2.4 x 1.2m', packPrice: 42.5, imageUrl: null, packGuess: 1, packSure: true, score: 0.8 });
  assert.deepEqual(await store.materialsToSearch(db, 'SCREWFIX', ['osb_18', 'pir_100']), []);
  const sug = await store.listSuggestions(db);
  assert.equal(sug.length, 1); assert.equal(sug[0].packPrice, 42.5);
});

console.log(`\n${passed} takeoff storage tests passed`);
void root;
