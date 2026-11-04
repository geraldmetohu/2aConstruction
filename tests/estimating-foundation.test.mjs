import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

// No dotenv, Prisma client, connection URL or disk-backed database is used.
const root = fileURLToPath(new URL('../', import.meta.url));
const migrationName = '20260925120000_add_estimating_foundation';
const migrations = path.join(root, 'prisma/migrations');
const migration = await readFile(path.join(migrations, migrationName, 'migration.sql'), 'utf8');
const legacyTables = ['User', 'Client', 'ClientProject', 'ClientProjectPhase', 'Project', 'Banner', 'BeforeAfter', 'Contact', 'HeroVideo'];
const newTables = [...migration.matchAll(/CREATE TABLE "([^"]+)"/g)].map(m => m[1]);

test('migration never targets a legacy table and legacy Prisma definitions are unchanged', async () => {
  assert.equal(newTables.length, 18);
  for (const name of legacyTables) assert.ok(!migration.includes(`"${name}"`), `Migration targets legacy ${name}`);
  assert.doesNotMatch(migration, /\b(?:DROP\s+(?:TABLE|TYPE|COLUMN|SCHEMA)|TRUNCATE\s+TABLE|DELETE\s+FROM|INSERT\s+INTO)\b/i);
  assert.match(migration, /\bBEGIN;/);
  assert.match(migration, /COMMIT;\s*$/);
  const schema = await readFile(path.join(root, 'prisma/schema.prisma'), 'utf8');
  const original = schema.split('// Estimating foundation:')[0].trim().replace(/\r\n/g, '\n');
  assert.equal(createHash('sha256').update(original).digest('hex'), '2fe46204e287cde13fc761e57f5ee8f594cd64d945e578fdd064e712e28239f0');
});

async function snapshotLegacy(db) {
  const rows = {};
  for (const name of legacyTables) rows[name] = (await db.query(`SELECT to_jsonb(t) AS row FROM "${name}" t ORDER BY id`)).rows;
  const columns = (await db.query(`SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default, ordinal_position
    FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ANY($1::text[]) ORDER BY table_name, ordinal_position`, [legacyTables])).rows;
  const constraints = (await db.query(`SELECT c.relname, x.conname, pg_get_constraintdef(x.oid) AS definition
    FROM pg_constraint x JOIN pg_class c ON c.oid = x.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = ANY($1::text[]) ORDER BY c.relname, x.conname`, [legacyTables])).rows;
  const indexes = (await db.query(`SELECT tablename, indexname, indexdef FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = ANY($1::text[]) ORDER BY tablename, indexname`, [legacyTables])).rows;
  return { rows, columns, constraints, indexes };
}

async function rejected(db, sql, params = [], code = '23514') {
  await assert.rejects(() => db.query(sql, params), error => error.code === code);
}

test('foundation SQL works on PostgreSQL and preserves existing data', async t => {
  const db = new PGlite(); // Ephemeral WASM PostgreSQL, never the application's DB.
  t.after(() => db.close());
  const dirs = await readdir(migrations, { withFileTypes: true });
  for (const dir of dirs.filter(d => d.isDirectory() && d.name < migrationName).sort((a, b) => a.name.localeCompare(b.name))) {
    await db.exec(await readFile(path.join(migrations, dir.name, 'migration.sql'), 'utf8'));
  }
  await db.exec(await readFile(path.join(root, 'tests/fixtures/legacy-records.sql'), 'utf8'));
  const before = await snapshotLegacy(db);
  await db.exec(migration);

  await t.test('all nine legacy tables retain exact rows, columns, constraints and indexes', async () => {
    assert.deepEqual(await snapshotLegacy(db), before);
    for (const name of newTables) assert.equal((await db.query(`SELECT count(*)::int AS n FROM "${name}"`)).rows[0].n, 0);
  });

  const category = (await db.query(`INSERT INTO "ItemCategory" (code, name) VALUES ('doors', 'Doors') RETURNING id`)).rows[0].id;
  const childCategory = (await db.query(`INSERT INTO "ItemCategory" (code, name, "parentId") VALUES ('internal', 'Internal', $1) RETURNING id`, [category])).rows[0].id;
  const unit = (await db.query(`INSERT INTO "ItemUnit" (code, label, "dimensionKind", "canonicalFactor") VALUES ('each', 'Each', 'COUNT', 1) RETURNING id`)).rows[0].id;
  async function item(code) {
    return (await db.query(`INSERT INTO "ConstructionItem" (code, name, "categoryId", "unitId", "itemType") VALUES ($1, $1, $2, $3, 'MATERIAL') RETURNING id`, [code, category, unit])).rows[0].id;
  }
  const door = await item('door');
  const hinge = await item('hinge');
  const handle = await item('handle');
  const role = (await db.query(`INSERT INTO "LabourRole" (code, name) VALUES ('carpenter', 'Carpenter') RETURNING id`)).rows[0].id;
  const tax = (await db.query(`INSERT INTO "TaxCode" (code, label) VALUES ('test', 'Test configuration only') RETURNING id`)).rows[0].id;

  await t.test('invalid quantities, rates, currencies and missing foreign keys are rejected', async () => {
    await rejected(db, `INSERT INTO "ItemUnit" (code, label, "dimensionKind", "canonicalFactor") VALUES ('bad', 'Bad', 'LENGTH', 0)`);
    await rejected(db, `UPDATE "ConstructionItem" SET "defaultQuantity" = -1 WHERE id = $1`, [door]);
    await rejected(db, `INSERT INTO "TaxRateVersion" ("taxCodeId", rate, "effectiveFrom", reason) VALUES ($1, 101, now(), 'Invalid')`, [tax]);
    await rejected(db, `INSERT INTO "ItemPriceVersion" ("itemId", "versionNumber", "materialUnitCost", currency, "effectiveFrom", source) VALUES ($1, 1, -1, 'GBP', now(), 'Invalid')`, [door]);
    await rejected(db, `INSERT INTO "ItemPriceVersion" ("itemId", "versionNumber", "materialUnitCost", currency, "effectiveFrom", source) VALUES ($1, 1, 1, 'USD', now(), 'Invalid')`, [door]);
    await rejected(db, `UPDATE "ConstructionItem" SET "unitId" = '11111111-1111-4111-8111-111111111111' WHERE id = $1`, [door], '23503');
  });

  await t.test('prices are exact decimals, versioned, unique and immutable', async () => {
    await db.query(`INSERT INTO "ItemPriceVersion" ("itemId", "versionNumber", "materialUnitCost", "labourUnitCost", "effectiveFrom", source)
      VALUES ($1, 1, 280.1234, NULL, '2026-01-01', 'Synthetic test'), ($1, 2, 290, 0, '2026-02-01', 'Synthetic test')`, [door]);
    const prices = (await db.query(`SELECT "materialUnitCost"::text AS cost, "labourUnitCost"::text AS labour FROM "ItemPriceVersion" WHERE "itemId" = $1 ORDER BY "versionNumber"`, [door])).rows;
    assert.deepEqual(prices, [{ cost: '280.1234', labour: null }, { cost: '290.0000', labour: '0.0000' }]);
    await rejected(db, `UPDATE "ItemPriceVersion" SET "materialUnitCost" = 999 WHERE "itemId" = $1`, [door]);
    await rejected(db, `DELETE FROM "ItemPriceVersion" WHERE "itemId" = $1`, [door]);
    await rejected(db, `INSERT INTO "ItemPriceVersion" ("itemId", "versionNumber", "materialUnitCost", "effectiveFrom", source) VALUES ($1, 1, 1, '2026-03-01', 'Duplicate')`, [door], '23505');
    assert.deepEqual((await db.query(`SELECT "materialUnitCost"::text AS cost, "labourUnitCost"::text AS labour FROM "ItemPriceVersion" WHERE "itemId" = $1 ORDER BY "versionNumber"`, [door])).rows, prices);
  });

  await t.test('category cycles and master-data deletion fail, while archive works', async () => {
    await rejected(db, `UPDATE "ItemCategory" SET "parentId" = $1 WHERE id = $2`, [childCategory, category]);
    await rejected(db, `UPDATE "ItemCategory" SET "parentId" = id WHERE id = $1`, [category]);
    await rejected(db, `DELETE FROM "ConstructionItem" WHERE id = $1`, [door]);
    await db.query(`UPDATE "ConstructionItem" SET "archivedAt" = now(), active = false WHERE id = $1`, [handle]);
    assert.equal((await db.query(`SELECT active FROM "ConstructionItem" WHERE id = $1`, [handle])).rows[0].active, false);
  });

  async function recipe(itemId, version = 1) {
    return (await db.query(`INSERT INTO "ItemRecipeVersion" ("itemId", "versionNumber", condition, "effectiveFrom", "quantityRule", assumptions)
      VALUES ($1, $2::integer, 'NEW_INSTALLATION', '2026-01-01'::timestamptz + $2::integer * interval '1 day', '{"kind":"fixed","value":1}', '[]') RETURNING id`, [itemId, version])).rows[0].id;
  }
  const doorRecipe = await recipe(door);
  const hingeRecipe = await recipe(hinge);
  await db.query(`INSERT INTO "ItemSupportingItem" ("recipeVersionId", "supportingItemId", "quantityRule") VALUES ($1, $2, '{"kind":"per_unit","value":3}')`, [doorRecipe, hinge]);
  await db.query(`INSERT INTO "ItemLabour" ("recipeVersionId", "labourRoleId", "hoursPerUnit") VALUES ($1, $2, 4)`, [doorRecipe, role]);

  await t.test('supporting self-links, indirect cycles and malformed rules fail', async () => {
    await rejected(db, `INSERT INTO "ItemSupportingItem" ("recipeVersionId", "supportingItemId", "quantityRule") VALUES ($1, $2, '{}')`, [hingeRecipe, door]);
    await rejected(db, `INSERT INTO "ItemSupportingItem" ("recipeVersionId", "supportingItemId", "quantityRule") VALUES ($1, $2, '{}')`, [hingeRecipe, hinge]);
    await rejected(db, `INSERT INTO "ItemSupportingItem" ("recipeVersionId", "supportingItemId", "quantityRule") VALUES ($1, $2, '[]')`, [hingeRecipe, handle]);
  });

  await t.test('publishing freezes the entire recipe, including child inserts and moves', async () => {
    await db.query(`UPDATE "ItemRecipeVersion" SET "publishedAt" = now() WHERE id = $1`, [doorRecipe]);
    await rejected(db, `UPDATE "ItemRecipeVersion" SET "publishedAt" = NULL WHERE id = $1`, [doorRecipe]);
    await rejected(db, `UPDATE "ItemSupportingItem" SET "quantityRule" = '{}' WHERE "recipeVersionId" = $1`, [doorRecipe]);
    await rejected(db, `UPDATE "ItemLabour" SET "hoursPerUnit" = 100 WHERE "recipeVersionId" = $1`, [doorRecipe]);
    await rejected(db, `UPDATE "ItemLabour" SET "recipeVersionId" = $1 WHERE "recipeVersionId" = $2`, [hingeRecipe, doorRecipe]);
    await rejected(db, `INSERT INTO "ItemSupportingItem" ("recipeVersionId", "supportingItemId", "quantityRule") VALUES ($1, $2, '{}')`, [doorRecipe, handle]);
    await rejected(db, `INSERT INTO "ItemLabour" ("recipeVersionId", "labourRoleId", "hoursPerUnit") VALUES ($1, $2, 2)`, [doorRecipe, role]);
    await recipe(door, 2); // A new version remains possible.
  });

  await t.test('settings leave fee VAT undecided and retain previous versions', async () => {
    await db.query(`INSERT INTO "CompanySettings" DEFAULT VALUES`);
    await db.query(`INSERT INTO "CompanySettingsVersion" ("settingsId", "versionNumber", "effectiveFrom", "defaultMarkupPercent", "defaultWastePercent", "contingencyPercent", "workdayHours", "defaultTeamSize", "workingCalendar", "quoteValidityDays", "invoiceTermsDays", "roundingPolicyVersion")
      VALUES ('company', 1, '2026-01-01', 150, 5, 5, 8, 1, '{}', 30, 14, 'GBP_LINE_HALF_UP_V1')`);
    const settings = (await db.query(`SELECT "estimatorFeeAmount"::text AS fee, "estimatorFeeInclusive" AS inclusive, "autoSendInvoices" AS send FROM "CompanySettingsVersion"`)).rows[0];
    assert.deepEqual(settings, { fee: '50.00', inclusive: null, send: false });
    await rejected(db, `UPDATE "CompanySettingsVersion" SET "estimatorFeeAmount" = 60`);
    await rejected(db, `INSERT INTO "CompanySettings" (id) VALUES ('second-company')`);
  });

  await t.test('audit entries cannot be changed, deleted or truncated', async () => {
    await db.query(`INSERT INTO "AuditEvent" ("actorKind", action, "entityType", "entityId", "after") VALUES ('TEST', 'CREATED', 'ConstructionItem', $1, '{"test":true}')`, [door]);
    await rejected(db, `UPDATE "AuditEvent" SET action = 'REWRITTEN'`);
    await rejected(db, `DELETE FROM "AuditEvent"`);
    await rejected(db, `TRUNCATE TABLE "AuditEvent"`);
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM "AuditEvent"`)).rows[0].n, 1);
  });

  await t.test('all new tables have retention guards and immutable versions have update guards', async () => {
    for (const name of newTables) {
      const guards = (await db.query(`SELECT tgname FROM pg_trigger WHERE tgrelid = $1::regclass AND NOT tgisinternal`, [`"${name}"`])).rows.map(r => r.tgname);
      assert.ok(guards.includes(`${name}_retain_rows`), name);
      assert.ok(guards.includes(`${name}_retain_table`), name);
    }
    for (const name of ['TaxRateVersion', 'ItemPriceVersion', 'ItemOptionVersion', 'LabourRateVersion', 'SupplierPriceReference', 'CompanySettingsVersion', 'AuditEvent']) {
      assert.equal((await db.query(`SELECT count(*)::int AS n FROM pg_trigger WHERE tgrelid = $1::regclass AND tgname = $2`, [`"${name}"`, `${name}_immutable`])).rows[0].n, 1);
    }
    assert.deepEqual(await snapshotLegacy(db), before);
  });
});

test('a conflicting table name causes an atomic failure without partial migration or lost data', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`CREATE TABLE "ItemUnit" (id text PRIMARY KEY, note text); INSERT INTO "ItemUnit" VALUES ('keep', 'Keep existing data');`);
  await assert.rejects(() => db.exec(migration));
  await db.exec('ROLLBACK;');
  assert.deepEqual((await db.query(`SELECT * FROM "ItemUnit"`)).rows, [{ id: 'keep', note: 'Keep existing data' }]);
  assert.equal((await db.query(`SELECT to_regclass('"ItemCategory"') AS name`)).rows[0].name, null);
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM pg_type WHERE typname = 'EstimateItemType'`)).rows[0].n, 0);
});
