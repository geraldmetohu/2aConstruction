import assert from 'node:assert/strict';
import { typescriptLoader } from './helpers/load-typescript.mjs';

const load = typescriptLoader();
const { buildIms, IMS_GROUPS } = load('app/lib/compliance/ims.ts');
const { defaultCompany } = load('app/lib/takeoff/company.ts');
let n = 0;
const test = (name, fn) => { fn(); n++; };

test('builds the full system, every group present, refs unique, no blanks or "undefined"', () => {
  const c = { ...defaultCompany, director: 'Jane Smith', employees: '8', wasteCarrier: 'CBDU123456', address: '1 High St\nLondon', imsStart: '2026-11-16' };
  const { docs, issued, review, missing } = buildIms(c, '2026-12-01');
  assert.equal(issued, '2026-11-16'); assert.equal(review, '2027-11-16');
  assert.ok(docs.length >= 30);
  for (const g of IMS_GROUPS) assert.ok(docs.some(d => d.group === g), g);
  assert.equal(new Set(docs.map(d => d.ref)).size, docs.length, 'unique refs');
  const text = JSON.stringify(docs);
  assert.ok(!/undefined|null|NaN|\[object/.test(text));
  assert.ok(text.includes('Jane Smith') && text.includes('CBDU123456') && text.includes('15102296'));
  assert.ok(docs.filter(d => d.group === 'Policies').every(d => d.sign), 'policies are signed');
  for (const d of docs) for (const b of d.blocks) if (b.table) for (const r of b.table.rows) assert.equal(r.length, b.table.cols.length, `${d.ref} ${b.heading}`);
  assert.ok(!missing.includes('managing director'));
});

test('missing details are listed and sensible fallbacks used; never claims certification', () => {
  const { docs, missing, issued } = buildIms({ ...defaultCompany }, '2026-12-01');
  assert.equal(issued, '2026-12-01');
  assert.ok(missing.includes('managing director') && missing.includes('waste carrier registration'));
  const text = JSON.stringify(docs);
  assert.ok(!/we are (iso )?certified|ISO certified company/i.test(text));
  assert.ok(/UKAS-accredited/.test(text));
});

console.log(`${n} compliance tests passed`);
