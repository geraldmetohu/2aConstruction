// Portfolio write-ups (ProjectDetail): the migration only adds a table, live Project rows are untouched,
// and pages keep working before the migration is applied.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { typescriptLoader } from './helpers/load-typescript.mjs';

const require = createRequire(import.meta.url);
const { PGlite } = require('@electric-sql/pglite');
const load = typescriptLoader();
const s = load('app/lib/portfolio/details-store.ts');

const pg = new PGlite();
const db = { query: async (text, params = []) => (await pg.query(text, params)).rows };
let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log('ok -', name); };

// Stand-in for the live Project table, with a live row.
await pg.exec(`CREATE TABLE "Project" (id uuid primary key default gen_random_uuid(), name text not null, description text not null, images text[]);
  INSERT INTO "Project" (id, name, description, images) VALUES ('11111111-1111-4111-8111-111111111111', 'Live project', 'Live text', ARRAY['https://a/1.jpg','https://a/2.jpg']);`);
const before = await db.query(`SELECT * FROM "Project"`);

await test('works (returns nothing) before the migration', async () => {
  assert.equal(await s.detailsReady(db), false);
  assert.equal(await s.getDetail(db, '11111111-1111-4111-8111-111111111111'), null);
  assert.equal((await s.getDetails(db, ['11111111-1111-4111-8111-111111111111'])).size, 0);
});

const sql = readFileSync(new URL('../prisma/migrations/20261103120000_add_project_details/migration.sql', import.meta.url), 'utf8');
await pg.exec(sql);
await pg.exec(sql); // safe to run twice

await test('migration is additive', async () => {
  assert.deepEqual(await db.query(`SELECT * FROM "Project"`), before);
  assert.equal(await s.detailsReady(db), true);
  assert.equal(/\b(DROP|DELETE FROM|TRUNCATE|UPDATE "Project"|ALTER TABLE "Project")\b/i.test(sql), false);
});

await test('save and read a write-up, then update it', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const d = { ...s.emptyDetail(), location: 'Enfield, EN2', scope: ['Steel beams', 'Bi-folds'], captions: { 'https://a/1.jpg': 'Kitchen' }, testimonialRating: 5, coverImage: 'https://a/2.jpg' };
  delete d.projectId;
  await s.saveDetail(db, id, d);
  let got = await s.getDetail(db, id);
  assert.equal(got.location, 'Enfield, EN2');
  assert.deepEqual(got.scope, ['Steel beams', 'Bi-folds']);
  assert.equal(got.captions['https://a/1.jpg'], 'Kitchen');
  await s.saveDetail(db, id, { ...d, location: 'Barnet' });
  got = await s.getDetail(db, id);
  assert.equal(got.location, 'Barnet');
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM "ProjectDetail"`))[0].n, 1);
  assert.deepEqual(s.orderedImages(['https://a/1.jpg', 'https://a/2.jpg'], got), ['https://a/2.jpg', 'https://a/1.jpg']);
});

await test('rating is limited to 1-5', async () => {
  const d = { ...s.emptyDetail(), testimonialRating: 9 }; delete d.projectId;
  await assert.rejects(s.saveDetail(db, '11111111-1111-4111-8111-111111111111', d));
});

await test('story falls back to the description', async () => {
  const st = s.story('Brief here.\n\nWe did this.\n\nAnd this.\n\nResult was great.', null);
  assert.deepEqual(st.brief, ['Brief here.']);
  assert.deepEqual(st.approach, ['We did this.', 'And this.']);
  assert.deepEqual(st.outcome, ['Result was great.']);
  assert.equal(s.paragraphs('One. Two. Three. Four.').length, 2);
  assert.equal(s.completedLabel('2025-06', null), 'June 2025');
});

console.log(`\n${passed} portfolio detail tests passed`);
