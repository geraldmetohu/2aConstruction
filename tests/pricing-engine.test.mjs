import test from 'node:test';
import assert from 'node:assert/strict';
import { typescriptLoader } from './helpers/load-typescript.mjs';
const { calculateEstimate, customerEstimate } = typescriptLoader()('app/lib/pricing/engine.ts');
const at = '2026-01-01T00:00:00.000Z';
const future = '2027-01-01T00:00:00.000Z';
function fixture() {
  const catalogue = {
    settings: { id: 'settings', effectiveFrom: at, currency: 'GBP', markupPercent: '20', wastePercent: '10', contingencyPercent: '5', roundingPolicyVersion: 'GBP_LINE_HALF_UP_V1' },
    units: [{ id: 'each', code: 'ea', label: 'each', dimensionKind: 'COUNT', canonicalFactor: null, quantityScale: 0, archived: false }],
    items: [{ id: 'door', code: 'DOOR', name: 'Door', description: '', unitId: 'each', itemType: 'ASSEMBLY', fixStage: 'SECOND_FIX', active: true, archived: false, categoryArchived: false, defaultQuantity: '1', defaultDurationHours: null }],
    prices: [{ id: 'price', itemId: 'door', effectiveFrom: at, currency: 'GBP', versionNumber: 1, materialUnitCost: '100', labourUnitCost: '40', plantUnitCost: '0', wasteUnitCost: '0', otherUnitCost: '0', taxCodeId: 'standard', source: 'Company approved test price', confidence: 'VERIFIED' }],
    recipes: [], labourRoles: [], labourRates: [], options: [], optionVersions: [],
    taxCodes: [{ id: 'standard', label: 'Standard', active: true, archived: false }],
    taxRates: [{ id: 'tax', taxCodeId: 'standard', effectiveFrom: at, rate: '20' }],
  };
  const request = { asOf: at, currency: 'GBP', lines: [{ key: 'a', type: 'ITEM', itemId: 'door', condition: 'NEW_INSTALLATION', quantity: { kind: 'EXPLICIT', value: '2' } }] };
  return { catalogue, request };
}
function recipe(c) {
  const r = { id: 'recipe', itemId: 'door', effectiveFrom: at, publishedAt: at, condition: 'NEW_INSTALLATION', ruleSchemaVersion: 1, quantityRule: { kind: 'per_unit', value: '1' }, assumptions: ['Sound existing opening'], supporting: [], labour: [] };
  c.recipes.push(r); return r;
}
function support(c, r, id = 'hinge') {
  c.items.push({ ...c.items[0], id, code: id, name: id, itemType: 'MATERIAL' });
  c.prices.push({ ...c.prices[0], id: `${id}-price`, itemId: id, materialUnitCost: '5', labourUnitCost: '0' });
  r.supporting.push({ itemId: id, ruleSchemaVersion: 1, quantityRule: { kind: 'per_unit', value: '3' }, mandatory: true, defaultSelected: true, costBucket: 'SUPPORTING_MATERIAL' });
}
function labour(c, r, basis = 'HOURLY') {
  c.prices[0].labourUnitCost = null;
  c.labourRoles.push({ id: 'carpenter', name: 'Carpenter', archived: false });
  c.labourRates.push({ id: 'rate', roleId: 'carpenter', effectiveFrom: at, currency: 'GBP', hourlyCost: '25', dailyCost: '200', productiveHoursPerDay: '8' });
  r.labour.push({ roleId: 'carpenter', hoursPerUnit: '4', teamSize: 2, rateBasis: basis });
}
function error(f, code) { assert.throws(() => calculateEstimate(f.request, f.catalogue), e => e.code === code); }
test('exact waste, contingency, markup and VAT arithmetic', () => {
  const f = fixture(); const result = calculateEstimate(f.request, f.catalogue);
  assert.equal(result.totals.costSubtotal, '300.00');
  assert.equal(result.totals.contingency, '15.00');
  assert.equal(result.totals.markup, '63.00');
  assert.equal(result.totals.net, '378.00');
  assert.equal(result.totals.vat, '75.60');
  assert.equal(result.totals.gross, '453.60');
});
test('dependencies counted once; root supplied by client retains labour and fixings', () => {
  const f = fixture(); support(f.catalogue, recipe(f.catalogue)); f.request.lines[0].supplyBy = 'CLIENT';
  const result = calculateEstimate(f.request, f.catalogue);
  assert.equal(result.totals.costs.material, '0.00');
  assert.equal(result.totals.costs.supportingMaterial, '30.00');
  assert.equal(result.totals.costs.labour, '80.00');
  assert.equal(result.totals.costs.waste, '3.00');
  f.request.lines[0].supportingOverrides = [{ itemId: 'hinge', supplyBy: 'EXISTING' }];
  assert.equal(calculateEstimate(f.request, f.catalogue).totals.costs.supportingMaterial, '0.00');
});
for (const basis of ['HOURLY', 'DAILY']) test(`${basis} effort is person-hours, not multiplied by team size twice`, () => {
  const f = fixture(); labour(f.catalogue, recipe(f.catalogue), basis);
  const result = calculateEstimate(f.request, f.catalogue);
  assert.equal(result.totals.costs.labour, '200.00');
  assert.equal(result.totals.personHours, '8.000000');
  assert.equal(result.totals.sequentialDurationHours, '4.000000');
  f.catalogue.prices[0].labourUnitCost = '10'; f.catalogue.labourRates = [];
  assert.equal(calculateEstimate(f.request, f.catalogue).totals.costs.labour, '20.00');
});
test('effective versions, future prices and unpublished recipes', () => {
  const f = fixture(); f.catalogue.prices.push({ ...f.catalogue.prices[0], id: 'future', versionNumber: 2, effectiveFrom: future, materialUnitCost: '900' });
  const r = recipe(f.catalogue); r.publishedAt = future; r.quantityRule.value = '5';
  assert.equal(calculateEstimate(f.request, f.catalogue).totals.costs.material, '200.00');
  f.request.asOf = future;
  assert.equal(calculateEstimate(f.request, f.catalogue).totals.costs.material, '9000.00');
});
test('condition-specific recipes do not fall back to new installation', () => {
  const f = fixture(); labour(f.catalogue, recipe(f.catalogue)); f.request.lines[0].condition = 'REPAIR';
  error(f, 'MISSING_LABOUR_SPECIFICATION');
});
for (const [kind, q, expected] of [
  ['LENGTH', { length: '1250', lengthUnit: 'mm' }, '1.250'],
  ['AREA', { length: '250', width: '400', lengthUnit: 'cm' }, '10.000'],
  ['WALL', { length: '5', height: '2.4', openingsAreaM2: '2' }, '10.000'],
  ['VOLUME', { length: '5', width: '2', depth: '0.1' }, '1.000'],
]) test(`${kind} dimensions convert correctly`, () => {
  const f = fixture(); Object.assign(f.catalogue.units[0], { dimensionKind: kind === 'WALL' ? 'AREA' : kind, canonicalFactor: '1', quantityScale: 3 });
  f.request.lines[0].quantity = { kind, ...q };
  assert.equal(calculateEstimate(f.request, f.catalogue).lines[0].quantity, expected);
});
test('explicit compatible units convert, count/custom units cannot be guessed', () => {
  const f = fixture(); Object.assign(f.catalogue.units[0], { dimensionKind: 'TIME', canonicalFactor: '3600', quantityScale: 3 });
  f.catalogue.units.push({ ...f.catalogue.units[0], id: 'day', canonicalFactor: '28800' });
  f.request.lines[0].quantity = { kind: 'EXPLICIT', value: '2', unitId: 'day' };
  assert.equal(calculateEstimate(f.request, f.catalogue).lines[0].quantity, '16.000');
  f.catalogue.units[0].dimensionKind = 'CUSTOM'; error(f, 'INCOMPATIBLE_UNITS');
});
test('default and count rounding are disclosed', () => {
  const f = fixture(); f.request.lines[0].quantity = { kind: 'DEFAULT' };
  assert.match(calculateEstimate(f.request, f.catalogue).assumptions.join(), /Standard quantity/);
  f.request.lines[0].quantity = { kind: 'EXPLICIT', value: '1.1' };
  assert.equal(calculateEstimate(f.request, f.catalogue).lines[0].quantity, '2');
});
test('invalid openings, negative quantities, future settings and missing prices fail clearly', () => {
  let f = fixture(); f.request.lines[0].quantity.value = '-1'; error(f, 'INVALID_REQUEST');
  f = fixture(); f.catalogue.settings.effectiveFrom = future; error(f, 'FUTURE_SETTINGS');
  f = fixture(); f.catalogue.prices = []; error(f, 'MISSING_PRICE');
  f = fixture(); Object.assign(f.catalogue.units[0], { dimensionKind: 'AREA', canonicalFactor: '1' });
  f.request.lines[0].quantity = { kind: 'WALL', length: '1', height: '1', openingsAreaM2: '2' }; error(f, 'INVALID_QUANTITY');
});
test('missing labour and VAT fail instead of silently assuming zero', () => {
  let f = fixture(); f.catalogue.prices[0].labourUnitCost = null; error(f, 'MISSING_LABOUR_SPECIFICATION');
  f = fixture(); labour(f.catalogue, recipe(f.catalogue)); f.catalogue.labourRates = []; error(f, 'MISSING_LABOUR_RATE');
  f = fixture(); f.catalogue.taxRates = []; error(f, 'MISSING_TAX');
  f = fixture(); f.catalogue.taxRates[0].rate = '0'; assert.equal(calculateEstimate(f.request, f.catalogue).totals.vat, '0.00');
});
test('options add separate material and labour, with one option per group', () => {
  const f = fixture(); f.catalogue.options.push({ id: 'oak', itemId: 'door', groupCode: 'finish', label: 'Oak', active: true, archived: false });
  f.catalogue.optionVersions.push({ id: 'oak-v1', optionId: 'oak', effectiveFrom: at, ruleSchemaVersion: 1, rule: { kind: 'surcharge', materialDelta: '20', labourDelta: '5' }, specification: { finish: 'oak' } });
  f.request.lines[0].optionIds = ['oak'];
  assert.equal(calculateEstimate(f.request, f.catalogue).totals.costs.material, '240.00');
  assert.equal(calculateEstimate(f.request, f.catalogue).totals.costs.labour, '90.00');
  f.request.lines[0].supplyBy = 'CLIENT'; assert.equal(calculateEstimate(f.request, f.catalogue).totals.costs.material, '0.00');
  f.catalogue.options.push({ ...f.catalogue.options[0], id: 'pine' }); f.request.lines[0].optionIds.push('pine'); error(f, 'CONFLICTING_OPTIONS');
});
test('optional, excluded, allowance, provisional and unpriced requirements stay distinct', () => {
  const f = fixture(); f.request.lines[0].inclusion = 'OPTIONAL';
  f.request.lines.push({ ...f.request.lines[0], key: 'excluded', itemId: 'unknown', inclusion: 'EXCLUDED' });
  for (const type of ['ALLOWANCE', 'PROVISIONAL']) f.request.lines.push({ key: type, type, description: type, quantity: '1', unitLabel: 'job', unitCosts: { other: '10' }, taxCodeId: 'standard', reason: 'Survey needed' });
  f.request.lines.push({ key: 'unknown', type: 'UNPRICED', description: 'Special request', reason: 'Needs survey' });
  const r = calculateEstimate(f.request, f.catalogue);
  assert.equal(r.totals.costSubtotal, '20.00'); assert.equal(r.optionalTotals.costSubtotal, '300.00');
  assert.equal(r.hasUnpricedRequirements, true); assert.equal(r.requiresReview, true);
  f.request.lines[0].selected = true;
  assert.equal(calculateEstimate(f.request, f.catalogue).totals.costSubtotal, '320.00');
});
test('half-up line rounding, discounts and mixed VAT reconcile', () => {
  const f = fixture(); Object.assign(f.catalogue.settings, { markupPercent: '0', wastePercent: '0', contingencyPercent: '0' });
  f.catalogue.prices[0].materialUnitCost = '0.025'; f.catalogue.prices[0].labourUnitCost = '0'; f.request.lines[0].quantity.value = '1';
  assert.equal(calculateEstimate(f.request, f.catalogue).totals.net, '0.03');
  f.catalogue.prices[0].materialUnitCost = '100'; f.request.lines[0].discountPercent = '10';
  f.catalogue.taxCodes.push({ ...f.catalogue.taxCodes[0], id: 'zero' }); f.catalogue.taxRates.push({ ...f.catalogue.taxRates[0], id: 'zero-v1', taxCodeId: 'zero', rate: '0' });
  f.request.lines.push({ ...f.request.lines[0], key: 'b', taxCodeId: 'zero' });
  const r = calculateEstimate(f.request, f.catalogue); assert.equal(r.totals.net, '180.00'); assert.equal(r.totals.vat, '18.00'); assert.equal(r.totals.gross, '198.00');
});
test('mandatory supports, cycles, duplicates and unknown overrides are rejected', () => {
  let f = fixture(); let r = recipe(f.catalogue); support(f.catalogue, r);
  f.request.lines[0].supportingOverrides = [{ itemId: 'hinge', selected: false }]; error(f, 'MANDATORY_SUPPORT');
  f.request.lines[0].supportingOverrides = [{ itemId: 'unknown' }]; error(f, 'UNKNOWN_SUPPORT_OVERRIDE');
  f.request.lines[0].supportingOverrides = []; r.supporting[0].itemId = 'door'; error(f, 'DEPENDENCY_CYCLE');
  f = fixture(); f.catalogue.prices.push({ ...f.catalogue.prices[0], id: 'tie' }); error(f, 'AMBIGUOUS_VERSION');
  f = fixture(); f.catalogue.items.push({ ...f.catalogue.items[0] }); error(f, 'DUPLICATE_ID');
});
test('support buckets preserve labour without double counting', () => {
  const f = fixture(); const r = recipe(f.catalogue); support(f.catalogue, r); r.supporting[0].costBucket = 'PLANT'; f.catalogue.prices[1].labourUnitCost = '2';
  const result = calculateEstimate(f.request, f.catalogue);
  assert.equal(result.totals.costs.plant, '30.00'); assert.equal(result.totals.costs.labour, '92.00'); assert.equal(result.totals.costs.supportingMaterial, '0.00');
});
test('snapshot is deterministic, frozen, replayable and independent of mutable input', () => {
  const f = fixture(); const before = JSON.stringify(f); const r = calculateEstimate(f.request, f.catalogue);
  assert.equal(JSON.stringify(f), before); assert.ok(Object.isFrozen(r.catalogueSnapshot.prices[0]));
  assert.equal(calculateEstimate(r.inputSnapshot, r.catalogueSnapshot).snapshotHash, r.snapshotHash);
  const persisted = JSON.parse(JSON.stringify(r)); assert.equal(calculateEstimate(persisted.inputSnapshot, persisted.catalogueSnapshot).snapshotHash, r.snapshotHash);
  f.catalogue.prices[0].materialUnitCost = '999'; assert.equal(r.catalogueSnapshot.prices[0].materialUnitCost, '100');
  assert.notEqual(calculateEstimate(f.request, f.catalogue).snapshotHash, r.snapshotHash);
});
test('customer projection omits internal costs, catalogue and margins', () => {
  const f = fixture(); const r = calculateEstimate(f.request, f.catalogue); const customer = customerEstimate(r);
  for (const internal of ['materialUnitCost', 'hourlyCost', 'costSubtotal', 'catalogueSnapshot', 'markupPercent', 'source']) assert.ok(!JSON.stringify(customer).includes(internal));
  assert.deepEqual(customer.totals, { net: '378.00', vat: '75.60', gross: '453.60' });
  f.request.showContingency = false; assert.equal(calculateEstimate(f.request, f.catalogue).totals.gross, r.totals.gross);
  assert.equal(customerEstimate(calculateEstimate(f.request, f.catalogue)).contingencyIncluded, undefined);
});
test('nested option metadata is copied, JSON-compatible and never freezes caller data', () => {
  const f = fixture(); const specification = { finish: { colours: ['oak'] } };
  f.catalogue.optionVersions.push({ id: 'metadata', optionId: 'unused', effectiveFrom: at, ruleSchemaVersion: 1, rule: { kind: 'surcharge', materialDelta: '0', labourDelta: '0' }, specification });
  const r = calculateEstimate(f.request, f.catalogue);
  assert.equal(Object.isFrozen(specification.finish), false);
  specification.finish.colours.push('pine');
  assert.deepEqual(r.catalogueSnapshot.optionVersions[0].specification.finish.colours, ['oak']);
  specification.invalid = undefined; error(f, 'INVALID_CATALOGUE');
});
test('inactive or archived catalogue entries fail instead of retaining stale prices', () => {
  for (const update of [c => c.items[0].active = false, c => c.items[0].archived = true, c => c.items[0].categoryArchived = true]) {
    const f = fixture(); update(f.catalogue); error(f, 'UNAVAILABLE_ITEM');
  }
  const f = fixture(); f.catalogue.units[0].archived = true; error(f, 'UNAVAILABLE_UNIT');
});
test('optional supporting items and fixed rules work independently of parent quantity', () => {
  const f = fixture(); const r = recipe(f.catalogue); support(f.catalogue, r);
  Object.assign(r.supporting[0], { mandatory: false, defaultSelected: false, quantityRule: { kind: 'fixed', value: '3' } });
  assert.equal(calculateEstimate(f.request, f.catalogue).totals.costs.supportingMaterial, '0.00');
  f.request.lines[0].supportingOverrides = [{ itemId: 'hinge', selected: true }];
  assert.equal(calculateEstimate(f.request, f.catalogue).totals.costs.supportingMaterial, '15.00');
});
test('manual preliminaries, duration allowances and special requests are explicit', () => {
  const f = fixture(); f.catalogue.items[0].defaultDurationHours = '2';
  f.request.specialRequests = ['Inspect concealed structure'];
  f.request.lines.push({ key: 'setup', type: 'MANUAL', description: 'Site setup', quantity: '1', unitLabel: 'job', unitCosts: { preliminaries: '50' }, taxCodeId: 'standard', reason: 'Approved allowance' });
  const r = calculateEstimate(f.request, f.catalogue);
  assert.equal(r.totals.costs.preliminaries, '50.00');
  assert.equal(r.totals.sequentialDurationHours, '4.000000');
  assert.equal(r.totals.personHours, '0.000000');
  assert.equal(r.hasUnpricedRequirements, true);
});
test('excessive dependency depth terminates with a bounded error', () => {
  const f = fixture(); let r = recipe(f.catalogue);
  for (let i = 0; i < 21; i++) {
    const id = `child-${i}`; support(f.catalogue, r, id);
    const next = { ...r, id: `recipe-${i}`, itemId: id, supporting: [] }; f.catalogue.recipes.push(next); r = next;
  }
  error(f, 'EXPANSION_LIMIT');
});
