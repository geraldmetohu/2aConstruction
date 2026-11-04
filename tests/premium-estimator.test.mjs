import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import Stripe from 'stripe';
import React from 'react';
import * as icons from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { root, typescriptLoader } from './helpers/load-typescript.mjs';
const load = typescriptLoader();
const { requirementsSchema, newWork } = load('app/lib/premium/requirements.ts');
const { mapRequirements, publicSpecifications } = load('app/lib/premium/mapping.ts');
function requirements() { return { project: 'refurbishment', postcode: 'SW1A 1AA', rooms: [{ key: randomUUID(), name: 'Bedroom', length: '4', width: '3', height: '2.4', openings: '2', works: [{ code: 'doors', specification: 'standard', supply: 'contractor', condition: 'refurbishment', inclusion: 'included', quantity: '2' }] }], contact: { name: 'Test Client', email: 'client@example.invalid', phone: '' }, specialRequests: '', consent: true }; }
test('requirements reject cost injection, duplicate rooms and invalid measurements', () => {
  const r = requirements(); assert.equal(requirementsSchema.safeParse(r).success, true);
  assert.equal(requirementsSchema.safeParse({ ...r, amount: 1 }).success, false);
  assert.equal(requirementsSchema.safeParse({ ...r, rooms: [r.rooms[0], r.rooms[0]] }).success, false);
  r.rooms[0].length = '-2'; assert.equal(requirementsSchema.safeParse(r).success, false);
});
test('human answers map to server-owned IDs and unknown work stays unpriced', () => {
  const r = requirements(); const id = randomUUID(); const mapping = { version: 'test', work: { doors: { itemId: id }, painting: { itemId: randomUUID() } } };
  r.rooms[0].works[0].supply = 'client';
  r.rooms[0].works.push({ ...r.rooms[0].works[0], code: 'painting', quantity: '' });
  let mapped = mapRequirements(r, mapping, '2026-01-01T00:00:00Z');
  assert.equal(mapped.lines[0].itemId, id); assert.equal(mapped.lines[0].supplyBy, 'CLIENT'); assert.equal(mapped.lines[0].condition, 'REFURBISHMENT');
  assert.deepEqual(mapped.lines[1].quantity, { kind: 'WALL', length: '14', height: '2.4', openingsAreaM2: '2' });
  r.rooms[0].works[1].specification = 'unsure'; mapped = mapRequirements(r, mapping, '2026-01-01T00:00:00Z'); assert.equal(mapped.lines[1].type, 'UNPRICED');
  r.rooms[0].works[0].quantity = ''; assert.throws(() => mapRequirements(r, mapping, '2026-01-01T00:00:00Z'), /at least one included/);
});
test('review presents fee scope, optional work and unpriced requests without internal identifiers', () => {
  const r = requirements(); r.rooms[0].works[0].inclusion = 'optional'; r.rooms[0].works[0].quantity = ''; r.specialRequests = 'Inspect hidden structure';
  const ui = typescriptLoader({ 'lucide-react': icons, 'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }, './actions': { startPremiumCheckout() { throw new Error('Rendering cannot initiate checkout'); } } })('app/(storefront)/premium-estimator/PremiumWizard.tsx');
  const html = renderToStaticMarkup(React.createElement(ui.Review, { draft: r }));
  assert.match(html, /Optional/); assert.match(html, /Quantity to confirm/); assert.match(html, /excluded from the calculated total/); assert.match(html, /Inspect hidden structure/);
  const wizard = renderToStaticMarkup(React.createElement(ui.PremiumWizard, { enabled: false }));
  assert.match(wizard, /£50/); assert.match(wizard, /Premium payments are not open/); assert.match(wizard, /Rooms &amp; work/);
});
test('roof variants and cubic/metre quantities use declared measurement units', () => {
  const r = requirementsSchema.parse(requirements());
  const roof = { ...newWork('roof', 'roof'), measure: '45', roofType: 'pitched', roofCovering: 'slate', roofWindows: '2', roofInsulation: 'yes', guttering: 'no' };
  r.rooms[0].works.push(roof, { ...newWork('groundworks', 'extension'), measure: '12.5' });
  const mapping = { version: 'v2', work: { doors: { itemId: randomUUID() }, groundworks: { itemId: randomUUID() } }, roofVariants: { 'pitched:slate': { itemId: randomUUID(), standardDescription: 'Approved slate covering only' } } };
  const mapped = mapRequirements(r, mapping, '2026-01-01T00:00:00Z');
  assert.equal(mapped.lines[1].itemId, mapping.roofVariants['pitched:slate'].itemId);
  assert.deepEqual(mapped.lines[1].quantity, { kind: 'AREA', length: '45', width: '1' });
  assert.equal(mapped.lines.filter(l => l.type === 'UNPRICED').length, 2);
  assert.deepEqual(mapped.lines.at(-1).quantity, { kind: 'VOLUME', length: '12.5', width: '1', depth: '1' });
  assert.ok(!JSON.stringify(publicSpecifications(mapping)).includes('itemId'));
});
test('roof questions are conditional and plastering asks for wall measurements', () => {
  const ui = load('app/(storefront)/premium-estimator/Questions.tsx');
  const r = requirementsSchema.parse(requirements());
  let html = renderToStaticMarkup(React.createElement(ui.WorkQuestions, { draft: r, change() {}, specifications: {} }));
  assert.doesNotMatch(html, /Roof type/);
  r.rooms[0].works = [{ ...newWork('roof', 'roof'), roofType: 'flat' }];
  html = renderToStaticMarkup(React.createElement(ui.WorkQuestions, { draft: r, change() {}, specifications: {} }));
  assert.match(html, /Flat roof membrane/); assert.doesNotMatch(html, /Concrete tiles/);
  r.rooms[0].works = [newWork('plastering', 'refurbishment')];
  html = renderToStaticMarkup(React.createElement(ui.WorkQuestions, { draft: r, change() {}, specifications: {} }));
  assert.match(html, /Wall height/); assert.match(html, /Doors\/windows area/); assert.doesNotMatch(html, /Number of fixtures/);
});
test('result page filters by signed-in owner and redirects before reads when signed out', async () => {
  let owner = null; let queries = 0; const id = randomUUID();
  const resultLoad = typescriptLoader({
    'next/link': ({ children, ...props }) => React.createElement('a', props, children),
    'next/navigation': { notFound() { throw new Error('Not found'); }, redirect(url) { throw new Error(`Redirect:${url}`); } },
    '@/app/lib/premium/server': { premiumOwner: async () => owner },
    '@/app/lib/db': { prisma: { premiumRequest: { findFirst: async args => { queries++; assert.deepEqual(args.where, { id, ownerId: 'owner' }); assert.ok(!JSON.stringify(args.select).includes('catalogueSnapshot')); return null; } } } },
  });
  const Page = resultLoad('app/(storefront)/premium-estimator/result/[id]/page.tsx').default;
  await assert.rejects(() => Page({ params: Promise.resolve({ id }) }), /Redirect:/); assert.equal(queries, 0);
  owner = 'owner'; await assert.rejects(() => Page({ params: Promise.resolve({ id }) }), /Not found/); assert.equal(queries, 1);
});
test('checkout action requires enablement and login before service access', async () => {
  let enabled = false; let owner = null; let calls = 0;
  const { startPremiumCheckout } = typescriptLoader({ '@/app/lib/premium/server': { premiumEnabled: () => enabled, premiumOwner: async () => owner, premiumService: () => { calls++; throw new Error('Not expected'); } } })('app/(storefront)/premium-estimator/actions.ts');
  assert.equal((await startPremiumCheckout('{}', randomUUID())).ok, false); assert.equal(calls, 0);
  enabled = true; assert.equal((await startPremiumCheckout('{}', randomUUID())).needsLogin, true); assert.equal(calls, 0);
  owner = 'owner'; assert.equal((await startPremiumCheckout('x'.repeat(65000), randomUUID())).ok, false); assert.equal(calls, 0);
});
test('webhook verifies raw Stripe signatures and returns retryable errors', async t => {
  const old = process.env.STRIPE_PREMIUM_WEBHOOK_SECRET; const secret = 'whsec_synthetic_fixture_only'; process.env.STRIPE_PREMIUM_WEBHOOK_SECRET = secret;
  t.after(() => { if (old === undefined) delete process.env.STRIPE_PREMIUM_WEBHOOK_SECRET; else process.env.STRIPE_PREMIUM_WEBHOOK_SECRET = old; });
  const stripe = new Stripe('sk_test_synthetic_fixture_only'); let received = 0; let fail = false;
  const route = typescriptLoader({ '@/app/lib/premium/server': { stripeClient: () => stripe, premiumService: () => ({ fulfill: async () => { received++; if (fail) throw new Error('Temporary failure'); } }) } })('app/api/premium/webhook/route.ts');
  const payload = JSON.stringify({ id: 'evt_fixture', type: 'checkout.session.completed', data: { object: {} } });
  assert.equal((await route.POST(new Request('https://example.invalid', { method: 'POST', body: payload }))).status, 400); assert.equal(received, 0);
  const signed = () => new Request('https://example.invalid', { method: 'POST', body: payload, headers: { 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload, secret }) } });
  assert.equal((await route.POST(signed())).status, 200); assert.equal(received, 1);
  fail = true; assert.equal((await route.POST(signed())).status, 500);
});

test('real Prisma checkout and fulfillment preserve all pre-existing tables', { timeout: 120000 }, async t => {
  const db = new PGlite();
  const migrationDir = path.join(root, 'prisma/migrations'); const premiumName = '20260926120000_add_premium_estimator';
  for (const dir of (await readdir(migrationDir, { withFileTypes: true })).filter(d => d.isDirectory() && d.name < premiumName).sort((a, b) => a.name.localeCompare(b.name))) await db.exec(await readFile(path.join(migrationDir, dir.name, 'migration.sql'), 'utf8'));
  await db.exec(await readFile(path.join(root, 'tests/fixtures/legacy-records.sql'), 'utf8'));
  const existingNames = (await db.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`)).rows.map(r => r.tablename);
  async function snapshot() {
    const records = {}; for (const name of existingNames) records[name] = (await db.query(`SELECT to_jsonb(t) AS row FROM "${name}" t ORDER BY id`)).rows;
    const definitions = (await db.query(`SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default, ordinal_position FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[]) ORDER BY table_name,ordinal_position`, [existingNames])).rows;
    const constraints = (await db.query(`SELECT c.relname, x.conname, pg_get_constraintdef(x.oid) AS definition FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid WHERE c.relname=ANY($1::text[]) ORDER BY c.relname,x.conname`, [existingNames])).rows;
    const indexes = (await db.query(`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename=ANY($1::text[]) ORDER BY tablename,indexname`, [existingNames])).rows;
    return { records, definitions, constraints, indexes };
  }
  const before = await snapshot();
  const migration = await readFile(path.join(migrationDir, premiumName, 'migration.sql'), 'utf8');
  for (const name of existingNames) assert.ok(!migration.includes(`"${name}"`), `Migration must not target ${name}`);
  await db.exec(migration); assert.deepEqual(await snapshot(), before);
  const server = new PGLiteSocketServer({ db, port: 0, host: '127.0.0.1', maxConnections: 1 }); await server.start();
  const connection = server.getServerConn(); const url = connection.startsWith('postgres') ? connection : `postgresql://postgres:postgres@${connection}/postgres`;
  const prisma = new PrismaClient({ datasources: { db: { url: `${url}${url.includes('?') ? '&' : '?'}connection_limit=1&sslmode=disable` } } });
  t.after(async () => { await prisma.$disconnect(); await server.stop(); await db.close(); });
  const category = await prisma.itemCategory.create({ data: { code: 'test', name: 'Test' } });
  const unit = await prisma.itemUnit.create({ data: { code: 'ea', label: 'Each', dimensionKind: 'COUNT', quantityScale: 0 } });
  const tax = await prisma.taxCode.create({ data: { code: 'test-vat', label: 'Synthetic VAT', rates: { create: { rate: '20', effectiveFrom: new Date('2020-01-01'), reason: 'Fixture only' } } } });
  const item = await prisma.constructionItem.create({ data: { code: 'door', name: 'Internal door', categoryId: category.id, unitId: unit.id, itemType: 'ASSEMBLY', prices: { create: { versionNumber: 1, materialUnitCost: '100', labourUnitCost: '40', taxCodeId: tax.id, effectiveFrom: new Date('2020-01-01'), source: 'Fixture only', confidence: 'VERIFIED' } } } });
  await prisma.companySettings.create({ data: { id: 'company', versions: { create: { versionNumber: 1, effectiveFrom: new Date('2020-01-01'), estimatorFeeAmount: '50', estimatorFeeInclusive: true, estimatorFeeTaxCodeId: tax.id, defaultMarkupPercent: '20', defaultWastePercent: '10', contingencyPercent: '5', workdayHours: '8', defaultTeamSize: 1, workingCalendar: {}, quoteValidityDays: 30, invoiceTermsDays: 14, roundingPolicyVersion: 'GBP_LINE_HALF_UP_V1' } } } });
  const catalogBefore = await snapshot();
  const sessions = new Map(); const keys = new Map(); let creates = 0;
  const stripe = { checkout: { sessions: { create: async (params, options) => {
    assert.equal(params.line_items[0].price_data.unit_amount, 5000); assert.equal(params.line_items[0].price_data.currency, 'gbp');
    assert.equal(await prisma.premiumSubmission.count(), 0);
    if (keys.has(options.idempotencyKey)) return keys.get(options.idempotencyKey);
    creates++; const session = { ...params, id: `cs_test_${randomUUID()}`, url: `https://checkout.stripe.com/c/pay/fixture-${creates}`, livemode: false, status: 'open', payment_status: 'unpaid', amount_total: 5000, currency: 'gbp', payment_intent: `pi_${randomUUID()}` };
    sessions.set(session.id, session); keys.set(options.idempotencyKey, session); return session;
  }, retrieve: async id => sessions.get(id) } } };
  const engine = load('app/lib/pricing/engine.ts'); let failCalculation = false;
  const serviceLoad = typescriptLoader({ '@/app/lib/pricing/engine': { ...engine, calculateEstimate: (...args) => { if (failCalculation) throw new Error('Synthetic interruption'); return engine.calculateEstimate(...args); } } });
  const { createPremiumService } = serviceLoad('app/lib/premium/service.ts');
  const service = createPremiumService(prisma, stripe, 'https://example.invalid', { version: 'fixture-v1', work: { doors: { itemId: item.id } } }, false);
  const raw = requirements(); raw.specialRequests = 'Inspect the existing frame'; const key = randomUUID();
  const initial = await service.checkout('owner', raw, key);
  assert.match(initial.url, /^https:\/\/checkout.stripe.com/);
  assert.equal(await prisma.premiumPayment.count(), 0); assert.equal(await prisma.premiumSubmission.count(), 0);
  assert.deepEqual(await service.checkout('owner', raw, key), initial); assert.equal(creates, 1);
  const changedMapping = createPremiumService(prisma, stripe, 'https://example.invalid', { version: 'fixture-v2', work: { doors: { itemId: item.id } } }, false);
  await assert.rejects(() => changedMapping.checkout('owner', raw, key), /specifications have changed/);
  await assert.rejects(() => service.checkout('owner', { ...raw, postcode: 'OTHER' }, key), /answers changed/);
  const session = [...sessions.values()][0];
  const event = () => ({ id: 'evt_paid', type: 'checkout.session.completed', livemode: false, created: Math.floor(Date.now() / 1000), data: { object: { ...session, metadata: { ...session.metadata } } } });
  await t.test('unpaid and mismatched events cannot record a payment', async () => {
    await service.fulfill(event()); assert.equal(await prisma.premiumPayment.count(), 0);
    session.payment_status = 'paid'; session.status = 'complete';
    for (const patch of [{ amount_total: 1 }, { currency: 'usd' }, { livemode: true }, { client_reference_id: randomUUID() }, { payment_intent: null }]) {
      const e = event(); Object.assign(e.data.object, patch); await assert.rejects(() => service.fulfill(e));
    }
    assert.equal(await prisma.premiumPayment.count(), 0);
  });
  await t.test('payment commits before interrupted calculation; duplicate delivery resumes once', async () => {
    failCalculation = true; await assert.rejects(() => service.fulfill(event()), /Synthetic interruption/);
    assert.equal(await prisma.premiumPayment.count(), 1); assert.equal(await prisma.premiumSubmission.count(), 0);
    failCalculation = false; await service.fulfill(event()); await service.fulfill({ ...event(), id: 'evt_retry' });
    assert.equal(await prisma.premiumPayment.count(), 1); assert.equal(await prisma.premiumSubmission.count(), 1);
    const result = await prisma.premiumSubmission.findFirstOrThrow(); assert.equal(result.requiresReview, true);
    assert.equal(result.customerResult.totals.gross, '453.60'); assert.ok(!JSON.stringify(result.customerResult).includes('materialUnitCost'));
    const request = await prisma.premiumRequest.findFirstOrThrow(); assert.equal(request.mappingVersion, 'fixture-v1');
    assert.equal(engine.calculateEstimate(request.pricingInput, request.catalogueSnapshot).snapshotHash, result.snapshotHash);
    assert.equal((await service.checkout('owner', raw, key)).url, `https://example.invalid/premium-estimator/result/${request.id}`);
  });
  await t.test('all existing rows and schema are unchanged after checkout and fulfillment', async () => { assert.deepEqual(await snapshot(), catalogBefore); });
  await t.test('all four new record types reject updates, deletes and truncates', async () => {
    for (const name of ['PremiumRequest', 'PremiumCheckout', 'PremiumPayment', 'PremiumSubmission']) {
      await assert.rejects(() => db.exec(`UPDATE "${name}" SET id=id`), e => e.code === '23514');
      await assert.rejects(() => db.exec(`DELETE FROM "${name}"`), e => e.code === '23514');
      await assert.rejects(() => db.exec(`TRUNCATE "${name}" CASCADE`), e => e.code === '23514');
    }
  });
});
