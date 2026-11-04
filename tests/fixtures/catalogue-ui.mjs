// Synthetic display data only. This module never loads application configuration.
const stamp = '2020-01-01T00:00:00.000Z';
const common = { revision: 1, archivedAt: null, createdAt: stamp, updatedAt: stamp };
export const category = { ...common, id: '11111111-1111-4111-8111-111111111111', code: 'doors', name: 'Windows & doors', parentId: null, sortOrder: 0 };
export const unit = { ...common, id: '22222222-2222-4222-8222-222222222222', code: 'each', label: 'Each', dimensionKind: 'COUNT', canonicalFactor: '1', quantityScale: 0 };
export const role = { ...common, id: '33333333-3333-4333-8333-333333333333', code: 'carpenter', name: 'Carpenter', rates: [{ id: 'labour-rate', effectiveFrom: stamp, hourlyCost: '25', dailyCost: '200', productiveHoursPerDay: '8', defaultTeamSize: 1, source: 'Synthetic display rate' }] };
export const tax = { ...common, id: '44444444-4444-4444-8444-444444444444', code: 'test', label: 'Example VAT', active: true, rates: [{ id: 'tax-rate', effectiveFrom: stamp, rate: '20', reason: 'Synthetic display rate' }] };
export const supplier = { ...common, id: '55555555-5555-4555-8555-555555555555', code: 'supplier', name: 'Example Building Supplies', email: '', phone: '', website: '' };
export const hinge = { ...common, id: '66666666-6666-4666-8666-666666666666', code: 'hinge', name: 'Door hinge', active: true };
export const item = { ...common, id: '77777777-7777-4777-8777-777777777777', code: 'DOOR-INT-01', name: 'Internal door installation', description: 'Standard internal door with frame, hinges and handles. Final specification subject to survey.',
  categoryId: category.id, unitId: unit.id, category, unit, itemType: 'ASSEMBLY', itemRole: 'MAIN', fixStage: 'SECOND_FIX', defaultQuantity: '1', defaultDurationHours: '4', defaultDimensions: { width: '0.762', height: '1.981' }, active: true,
  prices: [{ id: 'price-1', itemId: '77777777-7777-4777-8777-777777777777', versionNumber: 1, effectiveFrom: stamp, materialUnitCost: '280', labourUnitCost: null, plantUnitCost: '0', wasteUnitCost: '0', otherUnitCost: '10', taxCodeId: tax.id, taxCode: tax, source: 'Reviewed supplier price', confidence: 'INDICATIVE', notes: 'Synthetic preview only.' }],
  recipes: [{ id: 'recipe-1', condition: 'NEW_INSTALLATION', versionNumber: 1, effectiveFrom: stamp, publishedAt: stamp, assumptions: ['Standard opening assumed.'], supportingItems: [{ id: 'support-1', supportingItemId: hinge.id, supportingItem: hinge, quantityRule: { kind: 'per_unit', value: '3' }, mandatory: true, defaultSelected: true }], labour: [{ id: 'labour-1', labourRoleId: role.id, labourRole: role, hoursPerUnit: '4', teamSize: 1, rateBasis: 'HOURLY' }] }],
  options: [{ id: 'option-1', code: 'premium', groupCode: 'finish', label: 'Premium painted finish', active: true, archivedAt: null, versions: [{ id: 'option-v1', versionNumber: 1, effectiveFrom: stamp, rule: { materialDelta: '20', labourDelta: '15' }, specification: { description: 'Synthetic premium finish.' } }] }],
  supplierPrices: [{ id: 'reference-1', supplier, unit, referencePrice: '280', taxInclusive: false, checkedAt: stamp, supplierCode: 'EXAMPLE-01', packQuantity: null, sourceUrl: 'https://example.invalid/door', notes: 'Synthetic preview reference.' }],
};
item.currentPrice = item.prices[0];
item.currentRecipes = item.recipes;
export const lookups = { categories: [category], units: [unit], labour: [role], tax: [tax], suppliers: [supplier], items: [item, hinge] };
