// Takeoff calculator: formulas per project and room, labour price list, painting,
// tiles, roofline, material choices, client supplies, phases, pricing priority and
// the customer projection. Pure modules only – no database or network.
import assert from 'node:assert/strict';
import { typescriptLoader } from './helpers/load-typescript.mjs';

const load = typescriptLoader();
const { calculateTakeoff, customerTakeoff } = load('app/lib/takeoff/engine.ts');
const { defaultTakeoffInput, newRoom, takeoffInputSchema } = load('app/lib/takeoff/schema.ts');
const { loftGeometry } = load('app/lib/takeoff/modules/loft.ts');
const { workPackages } = load('app/lib/takeoff/modules/index.ts');
const { roomFields, roomGeometry } = load('app/lib/takeoff/modules/rooms.ts');
const { readValues, toSpec } = load('app/lib/takeoff/package.ts');
const { defaultRateBook, mergeRateBook, materialVariants, variantGroupOf } = load('app/lib/takeoff/ratebook.ts');
const { takeoffToQuoteLines } = load('app/lib/takeoff/quote-lines.ts');
const { quoteLineSchema } = load('app/lib/quotes/schema.ts');
const { buildDocuments, workingDate } = load('app/lib/takeoff/documents.ts');
const { defaultCompany } = load('app/lib/takeoff/company.ts');

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('ok -', name); };
const base = () => defaultTakeoffInput();
const calc = (patch = {}, prices = {}, rates) => {
  const i = base();
  const input = takeoffInputSchema.parse({ ...i, ...patch, property: { ...i.property, ...patch.property }, prelims: { ...i.prelims, ...patch.prelims }, commercial: { ...i.commercial, ...patch.commercial } });
  return calculateTakeoff(input, prices, rates);
};
const run = (packages, patch = {}, prices = {}) => calc({ ...patch, packages }, prices);
const loft = (values = {}, patch = {}) => run({ loft: { enabled: true, values } }, patch);
const only = (id, values = {}, patch = {}) => run({ [id]: { enabled: true, values } }, patch);
const room = (type, works = {}, extra = {}) => ({ ...newRoom(type), works, ...extra });
const rooms = (list, patch = {}, prices = {}) => calc({ ...patch, packages: {}, rooms: list }, prices);
const lines = (r, pred) => r.lines.filter(pred);
const key = (r, k, stage) => r.lines.find(l => l.rateKey === k && (!stage || l.stage.endsWith(stage)));
const byDesc = (r, text) => r.lines.find(l => l.description.includes(text));
const sum = (xs, f) => xs.reduce((s, x) => s + f(x), 0);
const near = (a, b, msg, eps = 0.02) => assert.ok(Math.abs(a - b) <= eps, `${msg ?? ''} ${a} ≠ ${b}`);

// ---------------- Loft (company rules) ----------------
test('loft geometry follows the company formulas', () => {
  const g = loftGeometry(5, 7, 2.4);
  assert.equal(g.floorJoists, 23);
  near(g.rafterLength, 2.4 / Math.sin(Math.PI / 4), '', 1e-6);
  near(g.flatRoofLength, 4.6, '', 1e-6);
  assert.equal(loftGeometry(5.1, 7, 2.4).floorJoists, 24);
});

test('demolition price and days depend on house type', () => {
  for (const [type, price, days] of [['TERRACED', 2700, 3], ['SEMI_OR_END', 3300, 4], ['DETACHED', 4200, 5]]) {
    const d = key(loft({}, { property: { houseType: type } }), `labour:demolition_${type}`);
    assert.equal(d.total, price); assert.equal(d.days, days);
  }
});

test('loft beams: each beam has its own size and length (0 = width + 20 cm)', () => {
  const r = loft({ beamCount: 2, beam1Size: '203x203', beam2Size: '152x152', beam2Length: 4 });
  assert.equal(key(r, 'beam_203x203').quantity, 5.2);
  assert.equal(key(r, 'beam_152x152').quantity, 4);
  assert.equal(key(r, 'padstone', 'Beam preparation').quantity, 4);
  assert.equal(key(r, 'beam_transport').total, 200);
  assert.equal(key(r, 'beam_bolts').quantity, Math.ceil(5.2 / 0.6) + Math.ceil(4 / 0.6));
  assert.equal(key(r, 'intumescent').quantity, 9.2);
  assert.equal(key(r, 'labour:beam_prep_small').total, 600);
  assert.equal(key(r, 'labour:beam_install').total, 1450);
  assert.equal(key(loft({ beamCount: 5 }), 'labour:beam_prep_large').total, 1200);
});

test('floor joists, boarding sheets +2 and labour', () => {
  const r = loft({ joistSize: '47x150', boarding: 'PLYWOOD' });
  assert.equal(byDesc(r, 'Floor joists –').quantity, 161);
  assert.equal(key(r, 'plywood_18').quantity, Math.ceil(35 / 2.88) + 2);
  assert.equal(key(loft(), 'floorboard_18').quantity, Math.ceil(35 / 0.72) + 2);
  assert.equal(key(r, 'labour:floor_joists').total, 4300);
  assert.equal(key(r, 'labour:floor_boarding').total, 800);
});

test('roof structure: rafters, flat roof joists, firrings, sheets ÷ 2.8', () => {
  const r = loft({ frontWindows: 2, flatWindows: 1 });
  assert.ok(byDesc(r, 'Front roof rafters').formula.includes('25 rafters'));
  assert.equal(byDesc(r, 'Flat roof joists').quantity, 124.2);
  for (const k of ['osb_12', 'pir_150', 'osb_18']) assert.equal(key(r, k, 'Roof structure').quantity, 9);
});

test('loft fit-out adds stairs, fire safety, plaster and paint; shell only does not', () => {
  const r = loft(), shell = loft({ fitOut: false });
  for (const k of ['staircase', 'door_fire', 'smoke_alarm', 'multifinish']) assert.ok(key(r, k), `missing ${k}`);
  assert.ok(!key(shell, 'staircase'));
  assert.ok(shell.totals.gross < r.totals.gross);
});

// ---------------- Extension ----------------
test('extension 5 × 6: foundations take well over 5 labour days, spoil is loaded and removed', () => {
  const r = only('extension', { width: 5, depth: 6 });
  const found = r.stages.find(s => s.stage === 'Extension · Foundations');
  assert.ok(found.days >= 5, `foundations ${found.days} days`);
  assert.ok(key(r, 'labour:load_spoil'), 'barrowing / loading spoil is labour');
  assert.ok(key(r, 'mini_digger'), 'digger hire when there is access');
});

test('extension without digger access: hand dig, slower and dearer', () => {
  const dig = only('extension', { width: 5, depth: 6, diggerAccess: true });
  const hand = only('extension', { width: 5, depth: 6, diggerAccess: false });
  assert.ok(!key(hand, 'mini_digger') && lines(hand, l => l.rateKey === 'labour:excavate_hand').length === 2);
  const days = r => r.stages.find(s => s.stage === 'Extension · Foundations').days;
  assert.ok(days(hand) > days(dig));
  assert.ok(hand.totals.net > dig.totals.net);
});

test('extension spoil: skips at 4.5 m³ each or grab loads at 8 m³', () => {
  const skips = only('extension', { width: 5, depth: 6, spoilRemoval: 'SKIPS' });
  const loose = key(skips, 'labour:load_spoil').quantity;
  assert.equal(byDesc(skips, 'Skips for spoil').quantity, Math.ceil(loose / 4.5));
  const grab = only('extension', { width: 5, depth: 6, spoilRemoval: 'GRAB' });
  assert.equal(key(grab, 'muck_away').quantity, Math.ceil(key(grab, 'labour:load_spoil').quantity / 8));
});

test('extension rooflights: each with its own size, trimmers, kerb and fitting', () => {
  const r = only('extension', { rooflightCount: 2, rooflight1: 'rooflight_1000x2000', rooflight2: 'lantern_3000x1000' });
  assert.ok(key(r, 'rooflight_1000x2000') && key(r, 'lantern_3000x1000'));
  assert.equal(key(r, 'labour:rooflight_fit').quantity, 2);
  assert.equal(lines(r, l => l.rateKey === 'upstand_kerb').length, 2);
});

test('extension custom steels: each steel has its own size and length', () => {
  const r = only('extension', { customSteels: true, steelCount: 2, steel1Size: '203x133', steel1Length: 4.3, steel2Size: '152x152', steel2Length: 3 });
  assert.equal(key(r, 'beam_203x133').quantity, 4.3);
  assert.equal(key(r, 'beam_152x152').quantity, 3);
});

// ---------------- Rooms ----------------
test('room geometry: walls net of doors & windows, skirting net of doors', () => {
  const g = roomGeometry({ length: 4, width: 3.5, height: 2.5, doors: 1, windows: 1 });
  assert.equal(g.floor, 14); assert.equal(g.perimeter, 15);
  assert.equal(g.walls, 15 * 2.5 - 1.9 - 1.5);
  assert.equal(g.skirting, 14.1);
});

test('each room is its own area with its own data; duplicate names stay separate', () => {
  const r = rooms([room('BEDROOM', { walls: 'SKIM' }, { name: 'Bedroom' }), room('BEDROOM', {}, { name: 'Bedroom', length: 5 })]);
  const names = r.areas.map(a => a.area);
  assert.ok(names.includes('Bedroom') && names.includes('Bedroom (2)'));
  assert.ok(lines(r, l => l.area === 'Bedroom' && l.rateKey === 'multifinish').length === 1);
  assert.ok(!lines(r, l => l.area === 'Bedroom (2)' && l.rateKey === 'multifinish').length);
});

test('skim includes PVA, multi-finish and beads; bond & skim adds grit primer and bonding', () => {
  const s = rooms([room('BEDROOM', { walls: 'SKIM', paintWalls: false, paintCeiling: false })]);
  for (const k of ['pva_bond', 'multifinish', 'angle_bead']) assert.ok(key(s, k), `skim missing ${k}`);
  const b = rooms([room('BEDROOM', { walls: 'BOND_SKIM' })]);
  for (const k of ['grit_primer', 'bonding_plaster', 'multifinish', 'labour:bonding_coat', 'labour:skim']) assert.ok(key(b, k), `bond missing ${k}`);
});

test('painting: choose elements; mist coat + 2 coats by default; 3 coats costs more', () => {
  const ceilingOnly = rooms([room('BEDROOM', { paintWalls: false, paintSkirting: false, paintDoors: false })]);
  assert.ok(key(ceilingOnly, 'labour:paint_ceilings') && !key(ceilingOnly, 'labour:paint_walls') && !key(ceilingOnly, 'labour:paint_door'));
  const two = rooms([room('BEDROOM', { walls: 'SKIM' })]);
  assert.ok(key(two, 'labour:mist_coat'), 'mist coat on new plaster by default');
  const three = rooms([room('BEDROOM', { walls: 'SKIM', coats: '3' })]);
  near(key(three, 'labour:paint_walls').total, key(two, 'labour:paint_walls').total * 1.5);
  const all = rooms([room('BEDROOM', { paintWindows: true, paintRadiators: true })]);
  assert.equal(key(all, 'labour:paint_door').unitPrice, 150);
  assert.ok(key(all, 'labour:paint_window') && key(all, 'labour:paint_radiator'));
});

test('tiles: count, boxes and consumables; tile size changes the price', () => {
  const r = rooms([room('BATHROOM', { bathroomRefit: true, wallTileSize: 'PORCELAIN_600x1200' })]);
  const wall = key(r, 'tile_porcelain_600x1200');
  const m2 = Number(wall.formula.match(/= ([\d.]+) m²/)[1]);
  assert.equal(wall.quantity, Math.ceil(m2 / 1.44));
  for (const k of ['tile_adhesive', 'grout', 'tile_primer', 'tile_spacers', 'tile_levelling', 'tile_trim_length']) assert.ok(key(r, k), `missing ${k}`);
  const small = rooms([room('BATHROOM', { bathroomRefit: true, wallTileSize: 'METRO_75x150' })]);
  assert.notEqual(small.totals.net, r.totals.net);
});

test('kitchen and bathroom refits live inside their room', () => {
  const r = rooms([room('KITCHEN', { kitchenRefit: true }, { name: 'Kitchen' }), room('BATHROOM', { bathroomRefit: true }, { name: 'Bathroom' })]);
  assert.ok(lines(r, l => l.area === 'Kitchen' && /^base_unit|^worktop/.test(l.rateKey)).length > 0);
  assert.ok(lines(r, l => l.area === 'Bathroom' && /^suite_/.test(l.rateKey)).length === 1);
});

// ---------------- Roofline ----------------
test('fascia, soffit and rainwater: every component counted', () => {
  const r = only('roofing');
  for (const k of ['fascia_joint', 'over_fascia_vent', 'gutter_bracket', 'gutter_union', 'gutter_stop_end', 'gutter_outlet', 'pipe_clip', 'pipe_socket', 'pipe_shoe', 'labour:fascia_soffit_fit', 'labour:gutter_fit'])
    assert.ok(key(r, k), `missing ${k}`);
  const g = lines(r, l => /^gutter_(halfround|square|deepflow|ogee)$/.test(l.rateKey))[0];
  assert.equal(key(r, 'gutter_union').quantity, g.quantity - 1);
  const angles = only('roofing', { angles90: 2, angles135: 1 });
  assert.equal(key(angles, 'gutter_angle_90').quantity, 2);
  assert.equal(key(angles, 'gutter_angle_135').quantity, 1);
  assert.equal(key(angles, 'gutter_bracket').quantity, key(r, 'gutter_bracket').quantity + 3);
  const wide = only('roofing', { fasciaWidth: '250' });
  assert.ok(key(wide, 'fascia_250'));
});

// ---------------- Material choices & client supplies ----------------
test('every variant group has same-unit members and maps back', () => {
  for (const g of materialVariants) {
    const units = new Set(g.keys.map(k => defaultRateBook.materials[k]?.unit));
    assert.equal(units.size, 1, `${g.id} units`);
    for (const k of g.keys) assert.equal(variantGroupOf(k).id, g.id);
  }
});

test('choosing another type/width for one line swaps that material only in that area', () => {
  const plain = rooms([room('BEDROOM', { newSkirting: true }, { name: 'Bed 1' }), room('BEDROOM', { newSkirting: true }, { name: 'Bed 2' })]);
  const sk = lines(plain, l => l.variantGroup === 'skirting' && l.area === 'Bed 1')[0];
  const other = materialVariants.find(g => g.id === 'skirting').keys.find(k => k !== sk.rateKey);
  const r = rooms([room('BEDROOM', { newSkirting: true }, { name: 'Bed 1' }), room('BEDROOM', { newSkirting: true }, { name: 'Bed 2' })], { materialChoices: { [sk.materialKey]: other } });
  assert.equal(lines(r, l => l.variantGroup === 'skirting' && l.area === 'Bed 1')[0].rateKey, other);
  assert.equal(lines(r, l => l.variantGroup === 'skirting' && l.area === 'Bed 2')[0].rateKey, sk.rateKey);
});

test('finishes are client-supplied by default: £0 in our price, listed to order; a line can be switched back', () => {
  const r = rooms([room('BATHROOM', { bathroomRefit: true })]);
  const tile = lines(r, l => /^tile_(ceramic|porcelain|metro|mosaic|stone)/.test(l.rateKey))[0];
  const suite = lines(r, l => /^suite_/.test(l.rateKey))[0];
  assert.equal(tile.total, 0); assert.ok(tile.clientSupplied && suite.clientSupplied);
  assert.ok(r.clientOrders.some(o => o.materialKey === tile.materialKey && o.quantity === tile.quantity));
  assert.ok(!lines(r, l => l.rateKey === 'tile_adhesive')[0].clientSupplied, 'adhesive is ours');
  const ours = rooms([room('BATHROOM', { bathroomRefit: true })], { clientSupply: { [tile.materialKey]: false } });
  assert.ok(ours.lines.find(l => l.materialKey === tile.materialKey).total > 0);
  assert.ok(ours.totals.net > r.totals.net);
  const off = rooms([room('BATHROOM', { bathroomRefit: true })], { finishesByClient: false });
  assert.equal(off.clientOrders.length, 0);
  assert.ok(customerTakeoff(r).clientOrders.length >= 2);
});

test('a line marked "not needed" stays visible at £0 and drops out of price, days and client list', () => {
  const r = rooms([room('BEDROOM', { walls: 'SKIM' })]);
  const pva = key(r, 'pva_bond'), skimL = key(r, 'labour:skim');
  const x = rooms([room('BEDROOM', { walls: 'SKIM' })], { excluded: { [pva.lineId]: true, [skimL.lineId]: true } });
  const pva2 = x.lines.find(l => l.lineId === pva.lineId), skim2 = x.lines.find(l => l.lineId === skimL.lineId);
  assert.ok(pva2.excluded && pva2.total === 0 && skim2.excluded && skim2.days === 0);
  near(x.totals.net, r.totals.net - (pva.total + skimL.total) * (r.totals.net / sum(r.lines, l => l.total)), 'net', 2);
  assert.ok(lines(x, l => l.lineId === pva.lineId).length === 1, 'still listed');
});

test('line ids are stable when the quote changes elsewhere', () => {
  const a = rooms([room('BEDROOM', { walls: 'SKIM' }, { name: 'Bed 1' })]);
  const b = rooms([room('BEDROOM', { walls: 'SKIM' }, { name: 'Bed 1' }), room('KITCHEN', { kitchenRefit: true }, { name: 'Kitchen' })]);
  const id = key(a, 'multifinish').lineId;
  assert.ok(b.lines.some(l => l.lineId === id && l.rateKey === 'multifinish'));
});

// ---------------- Electrics ----------------
test('electrics are itemised: spotlights, pendants, switches, double sockets, spurs, isolators, cooker; typical per room type', () => {
  const k = rooms([room('KITCHEN', { kitchenRefit: true })]);
  assert.equal(key(k, 'socket_double').quantity, 6);
  assert.equal(key(k, 'fused_spur').quantity, 4);
  assert.equal(key(k, 'cooker_switch').quantity, 1);
  assert.equal(key(k, 'downlight').quantity, 6);
  assert.ok(key(k, 'cable_6') && key(k, 'cable_25') && key(k, 'back_box'));
  assert.equal(key(k, 'rcbo').quantity, 1, 'new cooker circuit in the existing board');
  const b = rooms([room('BATHROOM', { bathroomRefit: true })]);
  assert.equal(key(b, 'fan_isolator').quantity, 1); assert.equal(key(b, 'shaver_socket').quantity, 1);
  const custom = rooms([room('BEDROOM', { electrics: 'ADD', sockets: 2, pendants: 0, downlights: 5, switches: 1, data: 0, tv: 0 })]);
  assert.equal(key(custom, 'socket_double').quantity, 2); assert.equal(key(custom, 'downlight').quantity, 5);
  assert.ok(!key(custom, 'pendant_fitting'));
  assert.ok(!key(rooms([room('BEDROOM', {})]), 'socket_double'), 'no electrics unless chosen');
});

test('electrical certificate once per job; consumer unit with RCBOs when chosen', () => {
  const r = rooms([room('BEDROOM', { electrics: 'REWIRE' }), room('LIVING', { electrics: 'REWIRE' }), room('KITCHEN', { kitchenRefit: true })], { prelims: { consumerUnit: true } });
  assert.equal(lines(r, l => l.rateKey === 'labour:elec_certificate').length, 1);
  assert.equal(lines(r, l => l.rateKey === 'consumer_unit').length, 1);
  const sockets = sum(lines(r, l => l.rateKey === 'socket_double'), l => l.quantity);
  assert.equal(key(r, 'rcbo', 'Electrical testing').quantity, 6 + Math.ceil(sockets / 12) + 1);
  assert.ok(key(r, 'labour:elec_strip_old') && key(r, 'labour:make_good_chases'), 'rewire strips old wiring and fills chases');
});

// ---------------- Loft types & lowered ceilings ----------------
test('loft types: rear dormer, L-shape, hip to gable, mansard, roof-light conversion', () => {
  const t = (loftType, extra = {}, patch = {}) => loft({ loftType, ...extra }, patch);
  const rear = t('REAR_DORMER');
  const ls = t('L_SHAPE', { outriggerWidth: 2.5, outriggerLength: 3.5 });
  assert.ok(key(ls, 'labour:demolition_outrigger') && byDesc(ls, 'Floor joists over outrigger') && byDesc(ls, 'Outrigger flat roof joists'));
  assert.ok(ls.totals.net > rear.totals.net);
  const hg = t('HIP_TO_GABLE', { gables: 1 }, { property: { houseType: 'SEMI_OR_END' } });
  assert.ok(key(hg, 'labour:hip_to_gable') && byDesc(hg, 'gable'));
  assert.deepEqual(hg.warnings, []);
  assert.ok(t('HIP_TO_GABLE').warnings.some(w => /terraced/.test(w)), 'warns on a terraced house');
  const mz = t('MANSARD');
  assert.ok(key(mz, 'labour:mansard_frame') && key(mz, 'labour:party_wall_raise'));
  const vx = t('VELUX', { frontWindows: 2, rearRoofWindows: 2 });
  assert.ok(!key(vx, 'labour:demolition_TERRACED') && !byDesc(vx, 'Flat roof joists') && !key(vx, 'clad_tile_hanging'));
  assert.equal(key(vx, 'roof_window').quantity, 4);
  assert.ok(vx.totals.net < rear.totals.net);
  for (const r of [rear, ls, mz, vx]) assert.deepEqual(r.warnings, []);
});

test('lowered first floor ceilings: priced once – listed first floor rooms in the room, the rest in the loft', () => {
  const W = 5, L = 7, total = W * L * 0.85;
  const pulled = r => sum(lines(r, l => l.rateKey === 'labour:ceiling_pull_down'), l => l.quantity);
  const alone = loft({ lowerCeiling: true });
  near(pulled(alone), total, 'whole first floor', 0.01);
  const ff = (type, name, works = {}) => room(type, works, { name, floor: 'FIRST', length: 3, width: 3 });
  const withRooms = calc({ packages: { loft: { enabled: true, values: { lowerCeiling: true } } }, rooms: [ff('BEDROOM', 'Bed 2', { ceiling: 'SKIM' }), ff('BATHROOM', 'Bath', { bathroomRefit: true })] });
  near(pulled(withRooms), total, 'same area, no double count', 0.01);
  assert.ok(lines(withRooms, l => l.area === 'Bed 2' && l.rateKey === 'labour:ceiling_pull_down').length === 1);
  assert.ok(!lines(withRooms, l => l.area === 'Bed 2' && l.rateKey === 'pva_bond').length, 'ceiling is renewed, not skimmed');
  assert.ok(key(withRooms, 'labour:elec_reposition'));
  const ground = calc({ packages: { loft: { enabled: true, values: { lowerCeiling: true } } }, rooms: [room('LIVING', {}, { floor: 'GROUND' })] });
  assert.ok(!lines(ground, l => l.area === 'Living room' && l.rateKey === 'labour:ceiling_pull_down').length, 'ground floor untouched');
});

// ---------------- Extension types ----------------
test('extension types: rear, side return, wraparound, double storey', () => {
  const e = (extType, extra = {}) => only('extension', { extType, width: 4, depth: 3, ...extra });
  const rear = e('REAR'), side = e('SIDE_RETURN', { width: 2, depth: 5 }), wrap = e('WRAPAROUND', { sideWidth: 2, sideLength: 4 }), dbl = e('DOUBLE');
  assert.ok(key(side, 'labour:excavate_foundations').formula.includes('= 7 m'), 'side return: boundary wall + end wall');
  assert.ok(key(wrap, 'labour:excavate_foundations').formula.includes(`= ${2 * 3 + 4 + 4 + 2} m`));
  assert.equal(lines(wrap, l => /Flat roof joists/.test(l.description)).length, 2, 'rear and side roofs');
  assert.ok(key(dbl, 'labour:floor_joists_new') && dbl.scaffolding.included);
  assert.ok(dbl.totals.net > rear.totals.net && wrap.totals.net > rear.totals.net);
  for (const r of [rear, side, wrap, dbl]) assert.deepEqual(r.warnings, []);
});

// ---------------- Roof types ----------------
test('re-roof types: coverings, re-lay existing, one slope', () => {
  const r = (v = {}) => only('roofing', v);
  const full = r({ covering: 'SLATE' });
  const reuse = r({ covering: 'SLATE', work: 'REUSE' });
  assert.ok(key(reuse, 'labour:roof_strip_reuse') && !key(reuse, 'labour:roof_strip'));
  assert.ok(key(reuse, 'slate_natural').quantity < key(full, 'slate_natural').quantity * 0.3);
  const front = r({ covering: 'FIBRE_SLATE', slopes: 'FRONT' });
  near(key(front, 'labour:roof_tiling_fibre_slate').quantity, key(full, 'labour:roof_tiling_slate').quantity / 2, 'half area', 0.02);
  for (const c of ['CONCRETE', 'CONCRETE_PLAIN', 'CLAY', 'PANTILE']) assert.deepEqual(r({ covering: c }).warnings, [], c);
  const extra = r({ valleys: 4, rafterRepair: 10, chimneyRepoint: 1 });
  assert.ok(key(extra, 'lead_valley') && key(extra, 'labour:rafter_repair') && key(extra, 'labour:chimney_repoint'));
});

// ---------------- Plumbing ----------------
test('plumbing: every fixture lists its pipe, 90° / 45° fittings, valves, wastes, traps and soil', () => {
  const r = rooms([room('BATHROOM', { bathroomRefit: true, layout: 'BATH_SHOWER', supplyRun: 5, soilRun: 3 })]);
  for (const k of ['pipe_cu_15', 'elbow90_15_cu', 'elbow45_15_cu', 'tee_15_cu', 'isolating_valve_15', 'flexi_connector', 'tap_connector_bath', 'trap_bottle_32', 'basin_waste',
    'trap_bath_40', 'bath_waste_overflow', 'shower_waste_90', 'waste_32', 'waste_40', 'bend90_40', 'bend45_40', 'soil_110', 'bend90_110', 'bend45_110', 'pan_connector', 'wc_fixing_kit', 'pipe_clip_15', 'solvent_cement', 'extract_duct_kit'])
    assert.ok(key(r, k), `missing ${k}`);
  // basin 2 + WC 1 + bath 2 + shower 2 + towel rail 2 connections × 5 m
  assert.equal(key(r, 'pipe_cu_15').quantity, Math.ceil(9 * 5 * 1.1));
  assert.ok(!key(r, 'plumbing_sundries'), 'no lump-sum sundries');
  const pex = rooms([room('BATHROOM', { bathroomRefit: true, pipe: 'PEX' })]);
  assert.ok(key(pex, 'pipe_pex_15') && key(pex, 'elbow90_15_pf') && key(pex, 'pipe_insert_15') && !key(pex, 'elbow90_15_cu'));
  const k = rooms([room('KITCHEN', { kitchenRefit: true })]);
  for (const x of ['trap_sink_40', 'sink_waste_kit', 'washer_valve', 'standpipe_40', 'hood_duct_kit', 'worktop_joint_kit']) assert.ok(key(k, x), `kitchen missing ${x}`);
  assert.equal(key(k, 'washer_valve').quantity, 2, 'dishwasher + washing machine');
  const u = rooms([room('UTILITY', {})]);
  assert.ok(key(u, 'labour:utility_plumbing') && key(u, 'standpipe_40'));
  const rad = rooms([room('BEDROOM', { newRadiators: 2 })]);
  assert.equal(key(rad, 'rad_valves').quantity, 2); assert.ok(key(rad, 'inhibitor'));
  const main = calc({ packages: {}, rooms: [room('BEDROOM', {})], prelims: { waterMainRun: 12, outsideTaps: 1 } });
  assert.ok(key(main, 'mdpe_25') && key(main, 'stopcock_22') && key(main, 'outside_tap_kit'));
});

test('supporting items: window fixings, door fixings & fire door kit, skirting fixings, thresholds & beading', () => {
  const r = rooms([room('BEDROOM', { newWindows: 1, newDoors: 1, doorType: 'door_fire', newSkirting: true, flooring: 'LAMINATE' })]);
  for (const k of ['window_fixings', 'door_fixings', 'fire_door_kit', 'door_closer', 'skirting_fixings', 'threshold_strip', 'floor_beading']) assert.ok(key(r, k), `missing ${k}`);
});

// ---------------- Documents ----------------
const docsFor = (patch = {}) => {
  const input = takeoffInputSchema.parse({ ...base(), rooms: [room('BATHROOM', { bathroomRefit: true, tileColour: 'Warm grey' }, { name: 'Bathroom', floor: 'FIRST' })], ...patch });
  const r = calculateTakeoff(input, {});
  const c = customerTakeoff(r, input);
  return { r, c, d: buildDocuments({ customer: c, input, company: defaultCompany, client: { name: 'Jo Bloggs', email: 'jo@example.com', siteAddress: '12 Test Road, London' }, reference: 'Q-1', version: 1, issueDate: '2026-11-02' }) };
};

test('documents: payment schedule adds up to the total, deposit and final as set, dates on working days', () => {
  const { d, c } = docsFor({ terms: { startDate: '2027-01-11', depositPercent: 15, finalPercent: 5, stagePayments: 4 } });
  near(d.payments.reduce((s, p) => s + p.amount, 0), c.gross, 'sum', 0.01);
  assert.equal(d.payments[0].label, 'Deposit'); near(d.payments[0].amount, c.gross * 0.15, 'deposit', 0.01);
  assert.equal(d.payments.at(-1).label, 'Final payment'); near(d.payments.at(-1).amount, c.gross * 0.05, 'final', 0.02);
  assert.equal(d.payments.filter(p => /Stage payment/.test(p.label)).length, 4);
  for (const p of d.payments.slice(1)) { const day = new Date(p.date + 'T00:00:00Z').getUTCDay(); assert.ok(day !== 0 && day !== 6, `${p.date} is a weekday`); }
  const dates = d.payments.map(p => p.date); assert.deepEqual([...dates].sort(), dates, 'in date order');
  assert.equal(workingDate('2026-12-24', 1), '2026-12-29', 'skips Christmas and Boxing Day substitute');
});

test('documents: scope in programme order, client supplies specified, H&S pack from the activities', () => {
  const { d } = docsFor({ terms: { startDate: '2027-01-11' } });
  assert.equal(d.scope[0].heading, '1. Before work starts');
  assert.ok(/Completion|Electrical testing/.test(d.scope.at(-1).heading));
  const tile = d.supplies.find(s => /Bathroom wall/.test(s.item));
  assert.ok(tile && /Warm grey/.test(tile.spec) && /^by /.test(tile.neededBy));
  for (const id of ['DEMOLITION', 'STRUCTURAL_STEEL', 'ROOFING', 'ELECTRICAL', 'PLUMBING', 'TILING']) assert.ok(d.methods.some(m => m.id === id), `method ${id}`);
  assert.ok(d.risks.some(r => r.id === 'HEIGHT') && d.risks.some(r => r.id === 'ASBESTOS'));
  assert.ok(d.contract.some(s => /cancel/i.test(s.heading)) && d.contract.some(s => s.items?.some(x => /5 years/.test(x))));
  assert.equal(d.guarantee.years, 5);
  assert.ok(d.cpp.length >= 6);
});

test('documents carry no costs, rates or margins', () => {
  const { d } = docsFor();
  const json = JSON.stringify(d);
  for (const leak of ['unitPrice', 'rateKey', 'markup', 'contingency', 'formula', 'dayRate']) assert.ok(!json.includes(leak), `leak ${leak}`);
});

// ---------------- Summaries ----------------
test('phases (first fix, second fix, site) add up to the direct cost', () => {
  const r = calc({ packages: { extension: { enabled: true, values: {} } }, rooms: [room('BATHROOM', { bathroomRefit: true })] });
  near(sum(r.phases, p => p.total), sum(r.lines, l => l.total), 'phases');
  assert.ok(r.phases.some(p => p.phase === 'FIRST_FIX') && r.phases.some(p => p.phase === 'SECOND_FIX'));
});

test('scaffolding included flag and cost', () => {
  const roof = only('roofing');
  assert.equal(roof.scaffolding.included, true); assert.ok(roof.scaffolding.cost > 0);
  const none = rooms([room('BEDROOM', { walls: 'SKIM' })]);
  assert.equal(none.scaffolding.included, false);
  assert.equal(only('roofing', {}, { prelims: { scaffold: false } }).scaffolding.included, false);
});

test('labour: days = qty ÷ output; trade days reconcile with labour lines', () => {
  const r = only('extension');
  const ex = key(r, 'labour:excavate_foundations');
  near(ex.days, Math.max(1, ex.quantity / defaultRateBook.labour.excavate_foundations.perDay), 'days');
  near(sum(r.trades, t => t.cost ?? 0), sum(lines(r, l => l.kind === 'LABOUR'), l => l.total), 'trade cost', 1);
});

test('totals: waste, contingency, markup and VAT in order', () => {
  const r = only('roofing', {}, { commercial: { wastePercent: 10, contingencyPercent: 5, markupPercent: 15, vatPercent: 20 } });
  const t = r.totals;
  near(t.net * 0.2, t.vat, 'vat'); near(t.net + t.vat, t.gross, 'gross');
  assert.ok(t.net > sum(r.lines, l => l.total));
});

test('every project builds without warnings and within sane ranges (inc VAT)', () => {
  const ranges = { loft: [45000, 140000], extension: [40000, 130000], roofing: [8000, 40000] };
  for (const p of workPackages) {
    const r = only(p.id);
    assert.deepEqual(r.warnings, [], `${p.id} warnings`);
    const [lo, hi] = ranges[p.id];
    assert.ok(r.totals.gross > lo && r.totals.gross < hi, `${p.id} £${r.totals.gross}`);
  }
  for (const t of ['BEDROOM', 'KITCHEN', 'BATHROOM', 'HALL']) assert.deepEqual(rooms([room(t, { walls: 'SKIM', bathroomRefit: true, kitchenRefit: true })]).warnings, [], t);
});

// ---------------- Prices ----------------
test('price priority: per-quote edit > live/catalogue price > rate book', () => {
  const k = 'multifinish';
  const def = key(rooms([room('BEDROOM', { walls: 'SKIM' })]), k);
  assert.equal(def.unitPrice, defaultRateBook.materials[k].price);
  const live = key(rooms([room('BEDROOM', { walls: 'SKIM' })], {}, { [k]: { price: 9.99, source: 'LIVE_SUPPLIER', label: 'Selco', imageUrl: 'https://www.selcobw.com/x.jpg' } }), k);
  assert.equal(live.unitPrice, 9.99); assert.equal(live.imageUrl, 'https://www.selcobw.com/x.jpg');
  const edit = key(calc({ packages: {}, rooms: [room('BEDROOM', { walls: 'SKIM' })], priceEdits: { [k]: 7 } }, { [k]: { price: 9.99, source: 'LIVE_SUPPLIER' } }), k);
  assert.equal(edit.unitPrice, 7);
});

test('company labour price list overrides price and output', () => {
  const rates = mergeRateBook(defaultRateBook, { labour: { paint_door: { price: 180 }, skim: { perDay: 20 } } });
  const r = calc({ packages: {}, rooms: [room('BEDROOM', { walls: 'SKIM' })] }, {}, rates);
  assert.equal(key(r, 'labour:paint_door').unitPrice, 180);
  const skim = key(r, 'labour:skim');
  near(skim.days, skim.quantity / 20, 'skim days');
});

// ---------------- Public & customer views ----------------
test('public values: only public fields accepted, others defaulted', () => {
  const v = readValues({ fields: roomFields }, { walls: 'SKIM', coats: '3', electrics: 'REWIRE' }, true);
  assert.equal(v.walls, 'SKIM'); assert.equal(v.electrics, 'REWIRE');
  assert.equal(v.coats, '2', 'coats is not public');
});

test('public form specs carry no prices or formulas', () => {
  const json = JSON.stringify([...workPackages.map(p => toSpec(p, true)), toSpec({ id: 'room', label: 'Room', description: '', usesProperty: false, fields: roomFields }, true)]);
  assert.ok(!/"price"|perDay|dayRate|formula/.test(json));
});

test('customer projection hides costs, sums to the net price and lists choices', () => {
  const input = takeoffInputSchema.parse({ ...base(), packages: { loft: { enabled: true, values: {} } }, rooms: [room('BATHROOM', { bathroomRefit: true })] });
  const r = calculateTakeoff(input, {});
  const c = customerTakeoff(r, input);
  near(sum(c.areas, a => a.net), r.totals.net, 'areas');
  near(sum(c.sections, a => a.net), r.totals.net, 'sections');
  const json = JSON.stringify(c);
  for (const leak of ['unitPrice', 'formula', 'dayRate', '"waste":', 'markup', 'rateKey']) assert.ok(!json.includes(leak), `leak ${leak}`);
  assert.ok(c.clientChoices.some(x => x.key === 'tileColour'));
  assert.ok(c.rooms.length === 1);
});

test('takeoff lines are valid quote-builder lines', () => {
  const r = calc({ packages: { extension: { enabled: true, values: {} } }, rooms: [room('KITCHEN', { kitchenRefit: true })] });
  for (const l of takeoffToQuoteLines(r, '00000000-0000-4000-8000-000000000001')) quoteLineSchema.parse(l);
});

console.log(`\n${passed} takeoff tests passed`);
