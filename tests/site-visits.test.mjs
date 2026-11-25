// Site visits against in-memory PostgreSQL (PGlite) with the migrations applied: create, save with version
// checks, the plan for each project type, turning a visit into a calculator input that prices, linking the
// quote, and a project delete that keeps the visit. No application database is used.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { typescriptLoader } from './helpers/load-typescript.mjs';

const require = createRequire(import.meta.url);
const { PGlite } = require('@electric-sql/pglite');
const load = typescriptLoader();
const store = load('app/lib/takeoff/store.ts');
const visits = load('app/lib/site-visit/store.ts');
const tpl = load('app/lib/site-visit/template.ts');
const conv = load('app/lib/site-visit/convert.ts');
const schema = load('app/lib/takeoff/schema.ts');
const engine = load('app/lib/takeoff/engine.ts');
const del = load('app/lib/takeoff/delete-store.ts');

const pg = new PGlite();
const wrap = c => ({ query: async (text, params = []) => (await c.query(text, params)).rows });
const db = { ...wrap(pg), transaction: fn => pg.transaction(tx => fn(wrap(tx))) };
let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log('ok -', name); };

const dir = new URL('../prisma/migrations/', import.meta.url);
assert.equal(await visits.visitsReady(db), false, 'not ready before the migration');
for (const m of readdirSync(dir).filter(n => /^\d{14}_/.test(n) && n >= '20261101' && !/project_details|more_suppliers/.test(n)).sort()) await pg.exec(readFileSync(new URL(`${m}/migration.sql`, dir), 'utf8'));

const details = { clientName: 'Maria Lopez', clientEmail: 'Maria@Example.com', clientPhone: '07700 900123', siteAddress: '12 Elm Road, Enfield', postcode: 'EN1 1AA', visitAt: '2026-12-01T09:30:00.000Z', projectTypes: ['LOFT', 'BATHROOM', 'NOPE'] };

await test('template: every project type has a plan, questions, photos and real calculator projects', async () => {
  const { workPackages } = load('app/lib/takeoff/modules/index.ts');
  for (const p of tpl.PROJECT_TYPES) {
    assert.ok(p.plan.length && p.questions.length && p.photos.length, p.id);
    for (const id of p.packages) assert.ok(workPackages.some(w => w.id === id), `${p.id} → ${id}`);
    const ids = p.questions.map(q => q.id); assert.equal(new Set(ids).size, ids.length, `duplicate question in ${p.id}`);
  }
  for (const s of Object.values(tpl.SECTIONS)) { const ids = s.questions.map(q => q.id); assert.equal(new Set(ids).size, ids.length, s.id); }
  const steps = tpl.visitSteps(['EXTENSION', 'KITCHEN']).map(s => s.id);
  assert.deepEqual(steps.slice(0, 5), ['before', 'team', 'arrival', 'client', 'property']);
  const ids = tpl.ROOM_FINISHES.map(q => q.id); assert.equal(new Set(ids).size, ids.length, 'duplicate room finish');
  assert.ok(tpl.CLIENT.questions.filter(q => q.type !== 'heading').every(q => q.say), 'every client question has natural wording');
  assert.ok(tpl.roomFinishesFor('BEDROOM', 'LOFT').some(q => q.id === 'rooflights') && !tpl.roomFinishesFor('BEDROOM', 'FIRST').some(q => q.id === 'rooflights'));
  assert.ok(tpl.roomFinishesFor('ENSUITE').some(q => q.id === 'tileLayout'));
  assert.ok(steps.includes('project:EXTENSION') && steps.includes('project:KITCHEN') && steps.at(-2) === 'closing');
  assert.ok(tpl.roomFinishesFor('BATHROOM').some(q => q.id === 'shower') && !tpl.roomFinishesFor('BEDROOM').some(q => q.id === 'shower'));
});

let id, version;
await test('create: reference, cleaned email, known types only, starting projects and rooms', async () => {
  const r = await visits.createVisit(db, details, {}, conv.startTakeoff(details.projectTypes, details.postcode), 'admin');
  id = r.id;
  assert.match(r.reference, /^SV-\d{4}-0001$/);
  const v = await visits.getVisit(db, id);
  assert.equal(v.clientEmail, 'maria@example.com');
  assert.deepEqual(v.projectTypes, ['LOFT', 'BATHROOM']);
  assert.equal(v.takeoff.packages.loft.enabled, true);
  assert.equal(v.takeoff.rooms[0].type, 'BATHROOM');
  assert.equal(v.status, 'PLANNED'); version = v.version;
  const r2 = await visits.createVisit(db, { ...details, projectTypes: [] }, {}, conv.startTakeoff([]), 'admin');
  assert.match(r2.reference, /-0002$/);
});

await test('save: answers and measurements kept, stale version refused', async () => {
  const v = await visits.getVisit(db, id);
  const room = { ...v.takeoff.rooms[0], length: 2.6, width: 2.1, works: { jobs: 'BATHROOM', bathroomRefit: true, layout: 'SHOWER' } };
  const bed = { ...schema.newRoom('BEDROOM', 'Loft bedroom'), floor: 'LOFT' };
  const answers = tpl.cleanAnswers({
    'client.goal': 'Extra bedroom with en-suite', 'client.budget': '£50–80k', 'client.livingIn': true, 'project.LOFT.loftType': 'Rear dormer',
    ['room.' + room.id + '.shower']: 'Thermostatic mixer', ['room.' + room.id + '.brassware']: 'Matt black', 'finishes.who': 'Client supplies the finishes',
    'bad key!': 'x', 'arrival.shoes': true,
  });
  assert.equal(answers['bad key!'], undefined);
  const takeoff = { property: { houseType: 'TERRACED', width: 5.2, length: 8.4, postcode: 'EN1 1AA' }, rooms: [room, bed], packages: { loft: { enabled: true, values: { lowerCeiling: false } } }, prelims: { scaffoldMode: 'YES', partyWallNeighbours: 2 } };
  const r = await visits.saveVisit(db, id, version, details, answers, conv.cleanTakeoff(takeoff));
  assert.equal(r.version, version + 1);
  await assert.rejects(visits.saveVisit(db, id, version, details, answers, conv.cleanTakeoff(takeoff)), /another device/);
  const got = await visits.getVisit(db, id);
  assert.equal(got.answers['project.LOFT.loftType'], 'Rear dormer');
  assert.equal(got.takeoff.rooms.length, 2);
  assert.equal(got.takeoff.property.width, 5.2);
  assert.equal(got.takeoff.prelims.partyWallNeighbours, 2);
  assert.equal(conv.cleanTakeoff({ rooms: [{ id: 'x', name: '', type: 'NOPE' }], property: { width: -4 } }).rooms.length, 0, 'invalid rooms dropped');
  version = r.version;
});

await test('convert: the visit becomes a calculator input that prices, with finishes and answers in the notes', async () => {
  const v = await visits.getVisit(db, id);
  const r = conv.visitToTakeoff({ reference: v.reference, clientName: v.clientName, clientEmail: v.clientEmail, clientPhone: v.clientPhone, siteAddress: v.siteAddress, postcode: v.postcode, types: v.projectTypes, answers: v.answers, takeoff: v.takeoff }, schema.defaultTakeoffInput());
  const i = r.input;
  assert.equal(i.mode, 'WHOLE_HOME');
  assert.equal(i.property.width, 5.2); assert.equal(i.property.postcode, 'EN1 1AA');
  assert.deepEqual(Object.keys(i.packages), ['loft']);
  assert.equal(i.rooms.length, 2);
  assert.match(i.rooms[0].notes, /Shower: Thermostatic mixer/);
  assert.match(i.rooms[0].notes, /Matt black/);
  // The client's answers stay internal (the quote input is visible to the client): they come back as the summary.
  assert.doesNotMatch(JSON.stringify(i), /Extra bedroom with en-suite|£50–80k/);
  assert.match(r.summary.join('\n'), /From site visit SV-/);
  assert.match(r.summary.join('\n'), /Extra bedroom with en-suite/);
  assert.match(r.summary.join('\n'), /Budget in mind: £50–80k/);
  assert.match(r.summary.join('\n'), /Rear dormer/);
  assert.equal(i.prelims.scaffoldMode, 'YES');
  assert.equal(i.terms.clientPhone, '07700 900123');
  assert.match(i.terms.title, /Loft conversion/);
  assert.equal(i.finishesByClient, true);
  assert.equal(r.client.email, 'maria@example.com');
  const priced = engine.calculateTakeoff(i, {});
  assert.ok(priced.totals.gross > 10000, `priced at ${priced.totals.gross}`);
  assert.ok(priced.lines.some(l => /beam/i.test(l.description)), 'structure worked out by the calculator');
  // A rooms-only visit is a room-by-room quote; a single project with no rooms is a project quote.
  assert.equal(conv.visitToTakeoff({ ...v, types: ['DECOR'], takeoff: { ...v.takeoff, packages: {} } }, schema.defaultTakeoffInput()).input.mode, 'ROOMS');
  assert.equal(conv.visitToTakeoff({ ...v, types: ['ROOF'], takeoff: { property: {}, rooms: [], packages: {}, prelims: {} } }, schema.defaultTakeoffInput()).input.mode, 'PROJECT');
});

await test('link the quote, list, and a project delete keeps the visit', async () => {
  const q = await store.createQuote(db, { clientName: 'Maria Lopez', clientEmail: 'maria@example.com', siteAddress: '12 Elm Road' }, { input: {}, result: {}, customer: {}, rates: {}, prices: {} }, 'admin');
  await visits.linkVisitQuote(db, id, q.id);
  let v = await visits.getVisit(db, id);
  assert.equal(v.status, 'QUOTED'); assert.equal(v.quoteId, q.id); assert.equal(v.quoteReference, q.reference);
  assert.equal((await visits.listVisits(db, { status: 'OPEN' })).some(x => x.id === id), false, 'quoted visits leave the open list');
  assert.equal((await visits.listVisits(db)).length, 2);
  await visits.setVisitStatus(db, id, 'QUOTED');
  const report = await del.deleteProject(db, q.id);
  assert.equal(report.siteVisitsUnlinked, 1);
  v = await visits.getVisit(db, id);
  assert.ok(v, 'visit kept'); assert.equal(v.quoteId, null); assert.equal(v.status, 'DONE');
  assert.equal(v.answers['client.goal'], 'Extra bedroom with en-suite');
});

await test('pdf: blank and filled forms render (when pdfkit is installed)', async () => {
  let ok = true; try { require.resolve('pdfkit'); } catch { ok = false; }
  if (!ok) { console.log('   (pdfkit not installed here – skipped)'); return; }
  const pdf = load('app/lib/site-visit/pdf.server.ts');
  const v = await visits.getVisit(db, id);
  const base = { companyName: '2A Construction', reference: v.reference, clientName: v.clientName, clientPhone: v.clientPhone, clientEmail: v.clientEmail, siteAddress: v.siteAddress, postcode: v.postcode, visitAt: v.visitAt, types: ['LOFT', 'EXTENSION', 'BATHROOM'] };
  const blank = await pdf.renderVisitPdf({ ...base, answers: {}, takeoff: { property: {}, rooms: [], packages: {}, prelims: {} }, blank: true });
  const filled = await pdf.renderVisitPdf({ ...base, types: v.projectTypes, answers: v.answers, takeoff: v.takeoff, blank: false });
  for (const b of [blank, filled]) assert.equal(b.subarray(0, 5).toString(), '%PDF-');
});

console.log(`\n${passed} site visit tests passed`);
