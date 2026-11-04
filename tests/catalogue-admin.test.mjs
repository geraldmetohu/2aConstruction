import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { root, typescriptLoader } from './helpers/load-typescript.mjs';

const validation = typescriptLoader()('app/lib/catalogue/validation.ts');
const form = obj => { const f = new FormData(); for (const [key, value] of Object.entries(obj)) f.set(key, String(value)); return f; };

test('decimal inputs reject invalid commercial amounts and keep exact decimal strings', () => {
  for (const value of ['NaN', 'Infinity', '-1', '1e4', '1,000', '12.12345', '1000000000', '']) assert.equal(validation.decimal().safeParse(value).success, false, value);
  assert.equal(validation.decimal().parse(' 280.1234 '), '280.1234');
  assert.equal(validation.decimal(6, true).safeParse('0').success, false);
});
test('access allowlist requires an identity and an exact normalized email match', () => {
  assert.equal(validation.isCatalogueAdmin(null, 'admin@example.invalid'), false);
  assert.equal(validation.isCatalogueAdmin({ email: 'admin@example.invalid' }, 'admin@example.invalid'), false);
  assert.equal(validation.isCatalogueAdmin({ id: 'client', email: 'admin@example.invalid.attacker.test' }, 'admin@example.invalid'), false);
  assert.equal(validation.isCatalogueAdmin({ id: 'admin', email: 'ADMIN@example.invalid' }, ' admin@example.invalid , other@example.invalid '), true);
  assert.equal(validation.isCatalogueAdmin({ id: 'admin', email: 'admin@example.invalid' }, ''), false);
});
test('ambiguous repeated form fields and malformed recipe data are rejected', () => {
  const repeated = form({ revision: '1' }); repeated.append('revision', '2');
  assert.throws(() => validation.formValues(repeated));
  const id = '11111111-1111-4111-8111-111111111111';
  const base = { itemId: id, revision: '1', condition: 'NEW_INSTALLATION', assumptions: '', supporting: '[]', labour: '[]' };
  assert.equal(validation.recipeSchema.safeParse({ ...base, supporting: 'invalid JSON' }).success, false);
  assert.equal(validation.recipeSchema.safeParse({ ...base, supporting: JSON.stringify([{ itemId: id, quantity: '1', mandatory: true, defaultSelected: false }]) }).success, false);
  assert.equal(validation.recipeSchema.safeParse({ ...base, labour: JSON.stringify([{ roleId: id, hours: '1', teamSize: 0, rateBasis: 'HOURLY' }]) }).success, false);
});

test('real server actions persist only new catalogue data through Prisma', { timeout: 90000 }, async t => {
  const db = new PGlite();
  const sql = await readFile(path.join(root, 'prisma/migrations/20260925120000_add_estimating_foundation/migration.sql'), 'utf8');
  await db.exec(sql);
  await db.exec(`CREATE TABLE "User" (id text PRIMARY KEY, note text); INSERT INTO "User" VALUES ('legacy', 'Original data');`);
  const server = new PGLiteSocketServer({ db, port: 0, host: '127.0.0.1', maxConnections: 1 });
  await server.start();
  const connection = server.getServerConn();
  const url = connection.startsWith('postgres') ? connection : `postgresql://postgres:postgres@${connection}/postgres`;
  const prisma = new PrismaClient({ datasources: { db: { url: `${url}${url.includes('?') ? '&' : '?'}connection_limit=1&sslmode=disable` } }, log: [{ emit: 'event', level: 'query' }] });
  const previousAdmins = process.env.ADMIN_EMAILS;
  const previousEnabled = process.env.CATALOGUE_ADMIN_ENABLED;
  process.env.ADMIN_EMAILS = 'admin@example.invalid';
  process.env.CATALOGUE_ADMIN_ENABLED = 'true';
  t.after(async () => {
    await prisma.$disconnect(); await server.stop(); await db.close();
    if (previousAdmins === undefined) delete process.env.ADMIN_EMAILS; else process.env.ADMIN_EMAILS = previousAdmins;
    if (previousEnabled === undefined) delete process.env.CATALOGUE_ADMIN_ENABLED; else process.env.CATALOGUE_ADMIN_ENABLED = previousEnabled;
  });
  let user = null;
  let queries = 0;
  prisma.$on('query', () => { queries++; });
  const load = typescriptLoader({
    '@/app/lib/db': { prisma },
    'next/cache': { revalidatePath() {} },
    '@kinde-oss/kinde-auth-nextjs/server': { getKindeServerSession: () => ({ getUser: async () => user }) },
  });
  const actions = load('app/dashboard/items/actions.ts');
  const reads = load('app/lib/catalogue/queries.ts');
  await t.test('every exported mutation and read rejects unauthenticated access before database queries', async () => {
    for (const action of Object.values(actions)) {
      const result = await action(new FormData());
      assert.equal(result.ok, false); assert.match(result.message, /permission/);
    }
    await assert.rejects(() => reads.getLookups(), /permission/);
    await assert.rejects(() => reads.listItems({}), /permission/);
    await assert.rejects(() => reads.getItem('anything'), /permission/);
    assert.equal(queries, 0);
  });
  user = { id: 'admin-fixture', email: 'admin@example.invalid' };
  await t.test('an authenticated non-admin cannot read or mutate the catalogue', async () => {
    user = { id: 'client-fixture', email: 'client@example.invalid' };
    for (const action of Object.values(actions)) assert.equal((await action(new FormData())).ok, false);
    await assert.rejects(() => reads.listItems({}), /permission/);
    assert.equal(queries, 0);
    user = { id: 'admin-fixture', email: 'admin@example.invalid' };
  });
  await t.test('disabled catalogue blocks reads and writes without a database call', async () => {
    process.env.CATALOGUE_ADMIN_ENABLED = 'false';
    assert.equal((await actions.saveItem(new FormData())).ok, false);
    await assert.rejects(() => reads.getLookups(), /not enabled/);
    assert.equal(queries, 0);
    process.env.CATALOGUE_ADMIN_ENABLED = 'true';
  });
  async function saved(action, values) { const result = await action(form(values)); assert.equal(result.ok, true, result.message); return result.id; }
  const category = await saved(actions.saveLookup, { kind: 'category', code: 'doors', name: 'Doors' });
  const unit = await saved(actions.saveLookup, { kind: 'unit', code: 'each', name: 'Each', dimensionKind: 'COUNT', canonicalFactor: '1', quantityScale: '0' });
  const role = await saved(actions.saveLookup, { kind: 'labour', code: 'carpenter', name: 'Carpenter' });
  const tax = await saved(actions.saveLookup, { kind: 'tax', code: 'test-vat', name: 'Test VAT' });
  const supplier = await saved(actions.saveLookup, { kind: 'supplier', code: 'test-supplier', name: 'Test Supplier', website: 'https://example.invalid' });
  await saved(actions.addRate, { kind: 'tax', id: tax, revision: '1', effectiveFrom: '2020-01-01T00:00:00Z', source: 'Synthetic rate', rate: '20' });
  await saved(actions.addRate, { kind: 'labour', id: role, revision: '1', effectiveFrom: '2020-01-01T00:00:00Z', source: 'Synthetic rate', hourlyCost: '25', dailyCost: '200', productiveHoursPerDay: '8', defaultTeamSize: '1' });
  const base = { code: 'door', name: 'Internal door', description: 'Synthetic item', categoryId: category, unitId: unit, itemType: 'ASSEMBLY', itemRole: 'MAIN', fixStage: 'SECOND_FIX', defaultQuantity: '1', defaultDurationHours: '4', active: 'true', width: '0.762', actorUserId: 'forged-actor' };
  const door = await saved(actions.saveItem, base);
  const hinge = await saved(actions.saveItem, { ...base, code: 'hinge', name: 'Hinge', itemType: 'MATERIAL', itemRole: 'SUPPORTING' });
  const ref = async id => ({ itemId: id, revision: (await prisma.constructionItem.findUniqueOrThrow({ where: { id } })).revision });
  const price = { materialUnitCost: '280.1234', labourUnitCost: '', plantUnitCost: '0', wasteUnitCost: '0', otherUnitCost: '0', taxCodeId: tax, effectiveFrom: '2020-01-01T00:00:00Z', source: 'Synthetic price', sourceDate: '', confidence: 'VERIFIED', notes: '' };

  await t.test('creation and new price versions preserve decimals, null labour and trusted audit actors', async () => {
    await saved(actions.addPrice, { ...await ref(door), ...price });
    await saved(actions.addPrice, { ...await ref(door), ...price, materialUnitCost: '290', effectiveFrom: '2020-02-01T00:00:00Z' });
    const prices = await prisma.itemPriceVersion.findMany({ where: { itemId: door }, orderBy: { versionNumber: 'asc' } });
    assert.deepEqual(prices.map(p => p.materialUnitCost.toString()), ['280.1234', '290']);
    assert.equal(prices[0].labourUnitCost, null);
    const audit = await prisma.auditEvent.findMany();
    assert.ok(audit.every(a => a.actorUserId === user.id));
    assert.equal((await prisma.constructionItem.findUniqueOrThrow({ where: { id: door } })).defaultDimensions.width, '0.762');
  });
  await t.test('stale revision and duplicate effective date do not partially save or create audit events', async () => {
    const before = await prisma.constructionItem.findUniqueOrThrow({ where: { id: door } });
    const count = await prisma.auditEvent.count();
    const stale = await actions.saveItem(form({ ...base, id: door, revision: 1, name: 'Should not save' }));
    assert.equal(stale.ok, false); assert.match(stale.message, /changed/);
    const duplicate = await actions.addPrice(form({ ...await ref(door), ...price }));
    assert.equal(duplicate.ok, false);
    assert.deepEqual(await prisma.constructionItem.findUniqueOrThrow({ where: { id: door } }), before);
    assert.equal(await prisma.auditEvent.count(), count);
  });
  await t.test('recipes publish children atomically and cycles roll back without losing old versions', async () => {
    await saved(actions.publishRecipe, { ...await ref(door), condition: 'NEW_INSTALLATION', assumptions: 'Standard hinges\nSite survey required',
      supporting: JSON.stringify([{ itemId: hinge, quantity: '3', mandatory: true, defaultSelected: true }]), labour: JSON.stringify([{ roleId: role, hours: '4', teamSize: 1, rateBasis: 'DAILY' }]) });
    const recipe = await prisma.itemRecipeVersion.findFirstOrThrow({ where: { itemId: door }, include: { supportingItems: true, labour: true } });
    assert.ok(recipe.publishedAt); assert.equal(recipe.supportingItems.length, 1); assert.equal(recipe.labour.length, 1);
    const before = await ref(hinge);
    const bad = await actions.publishRecipe(form({ ...before, condition: 'NEW_INSTALLATION', assumptions: '', supporting: JSON.stringify([{ itemId: door, quantity: '1', mandatory: false, defaultSelected: true }]), labour: '[]' }));
    assert.equal(bad.ok, false);
    assert.deepEqual(await ref(hinge), before);
    assert.equal(await prisma.itemRecipeVersion.count({ where: { itemId: hinge } }), 0);
  });
  let optionId;
  await t.test('option edits append versions and cannot target another item', async () => {
    const option = { groupCode: 'finish', code: 'premium', label: 'Premium finish', materialDelta: '20', labourDelta: '5', specification: 'Synthetic premium specification' };
    await saved(actions.saveOption, { ...await ref(door), ...option });
    optionId = (await prisma.itemOption.findFirstOrThrow({ where: { itemId: door } })).id;
    await saved(actions.saveOption, { ...await ref(door), ...option, optionId, materialDelta: '30' });
    assert.equal(await prisma.itemOptionVersion.count({ where: { optionId } }), 2);
    const foreign = await actions.saveOption(form({ ...await ref(hinge), ...option, optionId }));
    assert.equal(foreign.ok, false);
    assert.equal(await prisma.itemOptionVersion.count({ where: { optionId } }), 2);
  });
  await t.test('supplier references do not overwrite item prices', async () => {
    const count = await prisma.itemPriceVersion.count();
    await saved(actions.addSupplierReference, { ...await ref(door), supplierId: supplier, unitId: unit, supplierCode: 'SKU1', sourceUrl: 'https://example.invalid/door', referencePrice: '150', packQuantity: '', taxInclusive: 'true', checkedAt: '2020-01-01T00:00:00Z', notes: 'Synthetic observation' });
    assert.equal(await prisma.itemPriceVersion.count(), count);
    assert.equal(await prisma.supplierPriceReference.count({ where: { itemId: door } }), 1);
  });
  await t.test('duplication copies current catalogue configuration without changing original history', async () => {
    const copy = await saved(actions.duplicateItem, { ...await ref(door), code: 'door-copy', name: 'Door copy' });
    const duplicate = await prisma.constructionItem.findUniqueOrThrow({ where: { id: copy }, include: { prices: true, recipes: true, options: true } });
    assert.equal(duplicate.active, false);
    assert.equal(duplicate.prices.length, 1); assert.equal(duplicate.prices[0].materialUnitCost.toString(), '290');
    assert.equal(duplicate.recipes.length, 1); assert.ok(duplicate.recipes[0].publishedAt);
    assert.equal(duplicate.options.length, 1);
    assert.equal(await prisma.itemPriceVersion.count({ where: { itemId: door } }), 2);
    assert.equal(await prisma.itemOptionVersion.count({ where: { optionId } }), 2);
  });
  await t.test('archive retains all records and restore leaves item inactive for review', async () => {
    const count = await prisma.constructionItem.count();
    await saved(actions.changeItemStatus, { ...await ref(door), state: 'archive' });
    const edit = await actions.addPrice(form({ ...await ref(door), ...price, effectiveFrom: '2020-03-01T00:00:00Z' }));
    assert.equal(edit.ok, false);
    assert.equal(await prisma.constructionItem.count(), count);
    await saved(actions.changeItemStatus, { ...await ref(door), state: 'restore' });
    const restored = await prisma.constructionItem.findUniqueOrThrow({ where: { id: door } });
    assert.equal(restored.archivedAt, null); assert.equal(restored.active, false);
  });
  await t.test('reads filter inactive/archived items and expose only serializable values to the admin UI', async () => {
    const active = await reads.listItems({ q: 'door', status: 'active' });
    assert.equal(active.total, 0);
    const all = await reads.listItems({ q: 'door', status: 'all', sort: 'name' });
    assert.equal(all.total, 2);
    const item = await reads.getItem(door);
    assert.equal(typeof item.prices[0].materialUnitCost, 'string');
    assert.equal(typeof item.createdAt, 'string');
    assert.equal((await reads.getLookups()).categories.length, 1);
  });
  await t.test('legacy records survive every admin operation', async () => {
    const rows = await prisma.$queryRawUnsafe('SELECT * FROM "User"');
    assert.deepEqual(rows, [{ id: 'legacy', note: 'Original data' }]);
    assert.equal(await prisma.constructionItem.count(), 3);
  });
  await t.test('current prices and each current condition survive a full history window', async () => {
    for (let i = 0; i < 51; i++) {
      await prisma.itemPriceVersion.create({ data: { itemId: door, versionNumber: 100 + i, materialUnitCost: '999', effectiveFrom: new Date(Date.UTC(2090, 0, i + 1)), source: 'Scheduled synthetic rate' } });
    }
    for (let i = 0; i < 61; i++) {
      await prisma.itemRecipeVersion.create({ data: { itemId: door, versionNumber: 100 + i, condition: 'REPAIR', effectiveFrom: new Date(Date.UTC(2021, 0, i + 1)), publishedAt: new Date(), quantityRule: { kind: 'per_unit', value: '1' }, assumptions: [] } });
    }
    const item = await reads.getItem(door);
    assert.equal(item.prices.length, 50);
    assert.equal(item.currentPrice.materialUnitCost, '290');
    assert.equal(item.recipes.length, 60);
    assert.ok(item.currentRecipes.some(r => r.condition === 'NEW_INSTALLATION'));
    assert.ok(item.currentRecipes.some(r => r.condition === 'REPAIR'));
  });
});
