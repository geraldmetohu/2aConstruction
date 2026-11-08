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
  assert.ok(key(ceilingOnly, 'labour:paint_ceilings') && !key(ceilingOnly, 'labour:paint_walls') && !key(ceilingOnly, 'labour:paint_door_old'));
  const two = rooms([room('BEDROOM', { walls: 'SKIM' })]);
  assert.ok(key(two, 'labour:mist_coat'), 'mist coat on new plaster by default');
  const three = rooms([room('BEDROOM', { walls: 'SKIM', coats: '3' })]);
  near(key(three, 'labour:paint_walls').total, key(two, 'labour:paint_walls').total * 1.5);
  const all = rooms([room('BEDROOM', { paintWindows: true, paintRadiators: true })]);
  // Existing door repaint, part by part: leaf 85 + frame 35 + architraves 30 = the old £150 per door.
  assert.equal(key(all, 'labour:paint_door_old').unitPrice + key(all, 'labour:paint_frame_old').unitPrice + key(all, 'labour:paint_architrave_old').unitPrice, 150);
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
  const extra = r({ valleys: 4, valleyType: 'LEAD', rafterRepair: 10, chimneyRepoint: 1 });
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
  const ranges = { loft: [45000, 140000], extension: [40000, 130000], roofing: [8000, 40000], external: [6000, 25000], garden: [5000, 30000], cleaning: [200, 2000], demolition: [3000, 30000] };
  const sample = { garden: { patio: 25, fencing: 12, turf: 40 }, cleaning: { windows: 12, jetWash: 40, gutters: 20 }, demolition: { kitchens: 1, bathrooms: 1, partitions: 15, chimneyBreasts: 1 } };
  for (const p of workPackages) {
    const r = only(p.id, sample[p.id]);
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
  // The old all-in door price scales the door / frame / architrave parts.
  near(key(r, 'labour:paint_door_old').unitPrice + key(r, 'labour:paint_frame_old').unitPrice + key(r, 'labour:paint_architrave_old').unitPrice, 180);
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

// ---------------- Painting by condition, trades, custom jobs, formats ----------------
test('door painting depends on condition: new doors cost more than a repaint; mixed counts', () => {
  const old = rooms([room('BEDROOM', { paintDoors: true }, { doors: 2 })]);
  const fitted = rooms([room('BEDROOM', { paintDoors: true, newDoors: 1 }, { doors: 2 })]);
  assert.equal(key(fitted, 'labour:paint_door_new').quantity, 1, 'the new door is painted as new');
  assert.equal(key(fitted, 'labour:paint_door_old').quantity, 1, 'the other door is a repaint');
  assert.ok(key(fitted, 'labour:paint_frame_new') && key(fitted, 'labour:paint_architrave_new'));
  const allNew = rooms([room('BEDROOM', { paintDoors: true, doorLeaves: 'NEW', doorFrames: 'NEW', architraves: 'NEW' }, { doors: 2 })]);
  assert.ok(sum(lines(allNew, l => /paint_(door|frame|architrave)_new/.test(l.rateKey)), l => l.total) > sum(lines(old, l => /paint_(door|frame|architrave)_old/.test(l.rateKey)), l => l.total));
  assert.ok(key(allNew, 'knotting_primer'), 'bare joinery gets knotting & primer');
  const mixed = rooms([room('BEDROOM', { paintDoors: true, doorLeaves: 'MIXED', doorLeavesNew: 2, doorFrames: 'EXISTING' }, { doors: 3 })]);
  assert.equal(key(mixed, 'labour:paint_door_new').quantity, 2);
  assert.equal(key(mixed, 'labour:paint_door_old').quantity, 1);
  assert.equal(key(mixed, 'labour:paint_frame_old').quantity, 3);
  const win = rooms([room('BEDROOM', { paintWindows: true, windowCondition: 'STRIP' }, { windows: 2 })]);
  assert.equal(key(win, 'labour:paint_window_strip').quantity, 2);
});

test('external walls: render with or without insulation; EWI costs more and adds boards, fixings and sills', () => {
  const plain = only('external', { area: 80, system: 'SILICONE' });
  const ewi = only('external', { area: 80, system: 'SILICONE', insulation: true, board: 'ewi_eps_100', sills: 5 });
  assert.ok(!key(plain, 'ewi_eps_100') && key(ewi, 'ewi_eps_100') && key(ewi, 'ewi_fixings') && key(ewi, 'ewi_sill'));
  assert.ok(ewi.totals.net > plain.totals.net);
  assert.ok(key(plain, 'scaffold_erect'), 'two storeys needs scaffold');
  const paintOnly = only('external', { area: 50, system: 'PAINT_ONLY', storeys: 'ONE' });
  assert.ok(key(paintOnly, 'labour:masonry_paint_apply') && !key(paintOnly, 'scaffold_erect'));
  const hack = only('external', { area: 50, system: 'SAND_CEMENT', hackOff: true });
  assert.ok(key(hack, 'labour:render_hack_off') && hack.assumptions.some(a => /Approved Document L/.test(a)));
});

test('garden and cleaning packages price only what is measured', () => {
  const g = only('garden', { patio: 20, fencing: 15, artificial: 30, driveway: 25, driveType: 'RESIN', treesSmall: 2, maintenance: 4 });
  for (const k of ['labour:patio_lay', 'paving_porcelain', 'labour:fence_closeboard', 'artificial_turf_30', 'labour:resin_drive', 'labour:tree_fell_small', 'labour:garden_maintenance', 'muck_away']) assert.ok(key(g, k), `garden missing ${k}`);
  assert.ok(!key(g, 'scaffold_erect') && !key(g, 'final_clean'), 'no scaffold or builders clean for a garden');
  assert.ok(g.lines.filter(l => l.kind === 'LABOUR').every(l => l.trade), 'every labour line has a trade');
  const c = only('cleaning', { windows: 12, visits: 4, jetWash: 40, gutters: 20 });
  near(key(c, 'labour:window_clean').quantity, 12 * (1 + 3 * 0.9), 'repeat visits at the contract rate');
  assert.ok(key(c, 'labour:jet_wash') && key(c, 'labour:gutter_clean'));
  assert.equal(key(c, 'labour:window_clean').trade, 'CLEANER');
});

test('trade filter keeps only the chosen trades (site set-up stays)', () => {
  const list = [room('BEDROOM', { walls: 'SKIM', electrics: 'ADD', flooring: 'LAMINATE' })];
  const full = rooms(list);
  const elec = rooms(list, { trades: ['ELECTRICIAN'] });
  assert.ok(elec.lines.filter(l => l.phase !== 'SITE').every(l => l.trade === 'ELECTRICIAN'));
  assert.ok(key(elec, 'socket_double') && !key(elec, 'labour:skim') && !key(elec, 'multifinish'));
  assert.ok(elec.totals.net < full.totals.net);
  assert.ok(full.lines.every(l => l.phase === 'SITE' || l.trade), 'every non-site line has a trade');
});

test('custom jobs: client price lands back on the client total; cost price gets margins', () => {
  const item = { id: 'c1', title: 'Bespoke alcove shelving', description: 'Two oak shelves', trade: 'CARPENTER', price: 1200, priceMode: 'CLIENT', days: 2 };
  const base0 = rooms([room('BEDROOM')]);
  const withItem = rooms([room('BEDROOM')], { customItems: [item] });
  const c = customerTakeoff(withItem, takeoffInputSchema.parse({ ...defaultTakeoffInput(), packages: {}, rooms: [room('BEDROOM')], customItems: [item] }));
  const row = c.layout.groups.flatMap(g => g.rows).find(r => r.title === 'Bespoke alcove shelving');
  near(row.net, 1200, 'client price', 0.05);
  assert.ok(withItem.scope.some(s => s.includes('Two oak shelves')));
  assert.equal(key(withItem, 'custom:c1').trade, 'CARPENTER');
  const cost = rooms([room('BEDROOM')], { customItems: [{ ...item, priceMode: 'COST' }] });
  assert.ok(cost.totals.net - base0.totals.net > 1200, 'cost price is marked up');
});

test('quote formats: rows add up to the net; simple has no items, normal no prices, itemised prices', () => {
  const mk = (format, extra = {}) => {
    const input = takeoffInputSchema.parse({ ...defaultTakeoffInput(), packages: { garden: { enabled: true, values: { patio: 20 } } }, rooms: [room('BEDROOM', { walls: 'SKIM' })], terms: { format, ...extra } });
    return customerTakeoff(calculateTakeoff(input, {}), input);
  };
  for (const f of ['SIMPLE', 'NORMAL', 'ITEMISED']) {
    const c = mk(f);
    const rows = c.layout.groups.flatMap(g => g.rows);
    near(sum(rows, r => r.net), c.net, f);
    assert.equal(c.layout.groups[0].key, 'site', 'site set-up first');
    assert.ok(rows.every(r => r.text), `${f}: every row is described`);
    if (f === 'SIMPLE') assert.ok(rows.every(r => !r.items));
    if (f === 'NORMAL') assert.ok(rows.some(r => r.items?.length) && rows.every(r => (r.items ?? []).every(i => i.net === undefined)));
    if (f === 'ITEMISED') { assert.ok(rows.every(r => (r.items ?? []).every(i => i.byClient || typeof i.net === 'number'))); near(sum(rows.flatMap(r => r.items), i => i.net ?? 0), c.net, 'items'); }
  }
  const byTrade = mk('SIMPLE', { groupBy: 'TRADE' });
  assert.ok(byTrade.layout.groups.some(g => g.title === 'Plasterer') && byTrade.layout.groups.some(g => /Landscaper/.test(g.title)));
  near(sum(byTrade.layout.groups, g => g.net), byTrade.net, 'by trade');
});

test('wording edits: new titles and text, hidden rows fold into the group, options and notes', () => {
  const input0 = takeoffInputSchema.parse({ ...defaultTakeoffInput(), packages: {}, rooms: [room('BEDROOM', { walls: 'SKIM', flooring: 'LAMINATE' }, { name: 'Bed 1' })] });
  const c0 = customerTakeoff(calculateTakeoff(input0, {}), input0);
  const g = c0.layout.groups.find(x => x.title === 'Bed 1');
  const [first, second] = g.rows;
  const input = takeoffInputSchema.parse({ ...input0, wording: { intro: 'Hello', notes: 'PC sum £500', options: [{ title: 'Oak floor upgrade', price: 900 }],
    rows: { [first.key]: { title: 'Walls', text: 'Skim all walls.' }, [second.key]: { hidden: true } } } });
  const c = customerTakeoff(calculateTakeoff(input, {}), input);
  const g2 = c.layout.groups.find(x => x.title === 'Bed 1');
  assert.equal(g2.rows.length, g.rows.length - 1);
  assert.equal(g2.rows[0].title, 'Walls'); assert.equal(g2.rows[0].text, 'Skim all walls.');
  near(g2.net, g.net, 'hidden row price stays in');
  assert.equal(c.layout.intro, 'Hello'); assert.equal(c.layout.options[0].price, 900); assert.equal(c.layout.notes, 'PC sum £500');
});

// ---------------- VAT, discounts, labour only, extras, conditions ----------------
test('EWI is zero-rated for VAT; other work and scaffold stay at 20%', () => {
  const r = only('external', { area: 60, system: 'SILICONE', insulation: true });
  assert.ok(r.lines.filter(l => l.area === 'External walls & render').every(l => l.vatPercent === 0));
  assert.ok(key(r, 'scaffold_erect').vatPercent === undefined);
  assert.equal(r.totals.vatBreakdown.length, 2);
  near(sum(r.totals.vatBreakdown, v => v.net), r.totals.net, 'breakdown nets');
  assert.ok(r.totals.vat < r.totals.net * 0.2);
  const off = only('external', { area: 60, system: 'SILICONE', insulation: true }, { commercial: { esmZeroRate: false } });
  near(off.totals.vat, off.totals.net * 0.2, 'relief off', 0.05);
  const plain = only('external', { area: 60, system: 'SILICONE' });
  assert.equal(plain.totals.vatBreakdown.length, 1);
});

test('discount comes off before VAT; the scope table still adds up', () => {
  const list = [room('BEDROOM', { walls: 'SKIM' })];
  const full = rooms(list), disc = rooms(list, { commercial: { discountPercent: 5, discountAmount: 100, discountLabel: 'Goodwill' } });
  near(disc.totals.discount, full.totals.net * 0.05 + 100);
  near(disc.totals.net, full.totals.net - disc.totals.discount);
  near(disc.totals.vat, disc.totals.net * 0.2, 'vat on discounted net', 0.05);
  const input = takeoffInputSchema.parse({ ...defaultTakeoffInput(), packages: {}, rooms: list, commercial: { ...defaultTakeoffInput().commercial, discountPercent: 5 } });
  const c = customerTakeoff(calculateTakeoff(input, {}), input);
  near(sum(c.layout.groups, g => g.net), c.discount.netBeforeDiscount, 'rows before discount');
  near(c.discount.netBeforeDiscount - c.discount.amount, c.net);
});

test('labour only: every material is listed for the client and left out of the price', () => {
  const list = [room('BEDROOM', { walls: 'SKIM', flooring: 'LAMINATE' })];
  const r = rooms(list, { labourOnly: true });
  assert.ok(r.lines.filter(l => l.kind === 'MATERIAL' || l.kind === 'SUPPORTING').every(l => l.clientSupplied && l.total === 0));
  assert.ok(r.clientOrders.length > 3);
  assert.ok(r.totals.net < rooms(list).totals.net);
});

test('custom jobs: materials part, own VAT rate and provisional sums', () => {
  const item = { id: 'p1', title: 'Making good after rewire', trade: 'PLASTERER', price: 400, materialPrice: 100, priceMode: 'CLIENT', provisional: true, vatPercent: 0 };
  const input = takeoffInputSchema.parse({ ...defaultTakeoffInput(), packages: {}, rooms: [room('BEDROOM')], customItems: [item] });
  const r = calculateTakeoff(input, {});
  assert.ok(key(r, 'custom:p1') && key(r, 'custom:p1:materials'));
  assert.ok(r.assumptions.some(a => /provisional sum/.test(a)));
  const c = customerTakeoff(r, input);
  const row = c.layout.groups.flatMap(g => g.rows).find(x => x.title === 'Making good after rewire');
  near(row.net, 500, 'client price incl materials', 0.05);
  assert.equal(row.provisional, true); assert.equal(row.vatPercent, 0);
});

test('optional extras chosen by the client are priced in', () => {
  const base0 = takeoffInputSchema.parse({ ...defaultTakeoffInput(), packages: {}, rooms: [room('BEDROOM')], wording: { options: [{ title: 'Oak floor', price: 900 }] } });
  const chosen = takeoffInputSchema.parse({ ...base0, wording: { ...base0.wording, options: [{ title: 'Oak floor', price: 900, chosen: true }] } });
  const a = calculateTakeoff(base0, {}), b = calculateTakeoff(chosen, {});
  near(b.totals.net - a.totals.net, 900, 'extra at its price', 0.05);
  assert.ok(customerTakeoff(b, chosen).layout.groups.some(g => g.title === 'Optional extras'));
});

test('trade filter drops sentences that describe other trades', () => {
  const r = rooms([room('BEDROOM', { walls: 'SKIM', electrics: 'ADD' }, { name: 'Bed 1' })], { trades: ['ELECTRICIAN'] });
  assert.ok(!r.scope.some(s => /skim/.test(s)));
});

test('render on extensions and dormers uses the chosen render system', () => {
  const e = only('extension', { walls: 'BLOCK_RENDER', renderSystem: 'MONOCOUCHE' });
  assert.ok(key(e, 'labour:render_mono') && key(e, 'render_bead') && !key(e, 'clad_render'));
  const l = loft({ cladding: 'RENDER' });
  assert.ok(key(l, 'labour:render_thincoat') && !key(l, 'clad_render'));
  const newDoor = loft({});
  assert.ok(key(newDoor, 'labour:paint_door_new') && !key(newDoor, 'labour:paint_door'), 'loft fire doors painted as new');
});

test('condition of the floor, old tiles, lath walls and refitted joinery are priced', () => {
  const r = rooms([room('LIVING', { flooring: 'LAMINATE', subfloor: 'PLY', oldTiles: 6, walls: 'LATH', refitSkirting: true, refitArchitraves: true })]);
  for (const k of ['labour:ply_overlay', 'ply_6', 'labour:tile_remove', 'labour:lath_strip', 'labour:plasterboard', 'labour:skirting_refit', 'labour:architrave_refit']) assert.ok(key(r, k), `missing ${k}`);
  const lev = rooms([room('LIVING', { flooring: 'LVT', subfloor: 'LEVEL' })]);
  assert.ok(key(lev, 'latex_leveller'));
});

test('garden extras: fence heights, retaining walls, lights; cleaning contract rate', () => {
  const low = only('garden', { fencing: 10, fenceHeight: '1.2' }), high = only('garden', { fencing: 10 });
  assert.ok(key(low, 'fence_closeboard_kit_12') && low.totals.net < high.totals.net);
  const g = only('garden', { retaining: 5, retainingType: 'BLOCK', steps: 3, lights: 4, lightCable: 20, irrigation: 2, shedBase: 9, pergolas: 1 });
  for (const k of ['labour:retaining_block', 'labour:garden_steps', 'garden_light', 'labour:swa_trench', 'labour:irrigation_zone', 'labour:shed_base', 'labour:pergola_build', 'labour:elec_certificate']) assert.ok(key(g, k), `missing ${k}`);
  const c = only('cleaning', { windows: 10, visits: 12, solar: 8 });
  near(key(c, 'labour:window_clean').quantity, 10 * (1 + 11 * 0.9));
  assert.ok(key(c, 'labour:solar_clean'));
});

test('variations: price written and read back; only approved ones count', () => {
  const { variationDetail, variationPrice, approvedVariations } = load('app/lib/takeoff/variations.ts');
  const detail = variationDetail(1250, 20, 'Extra double socket in the loft');
  assert.deepEqual(variationPrice(detail), { net: 1250, vatPercent: 20, gross: 1500 });
  const v = approvedVariations([
    { kind: 'VARIATION', title: 'A', detail, response: 'APPROVED', status: 'ANSWERED' },
    { kind: 'VARIATION', title: 'B', detail, response: 'DECLINED', status: 'ANSWERED' },
    { kind: 'VARIATION', title: 'C', detail, response: '', status: 'OPEN' },
  ]);
  assert.equal(v.list.length, 1); assert.equal(v.gross, 1500);
});

// ---------------- Loft cladding & fit-out, extension options, roofs, demolition ----------------
test('dormer cladding: composite, timber, brick and render on carrier board', () => {
  assert.ok(key(loft({ cladding: 'COMPOSITE' }), 'clad_composite'));
  assert.ok(key(loft({ cladding: 'TIMBER' }), 'clad_timber'));
  const brick = loft({ cladding: 'BRICK', dormerBrick: 'facing_brick_stock' });
  assert.ok(key(brick, 'facing_brick_stock') && key(brick, 'labour:facing_brickwork'));
  const rend = loft({ cladding: 'RENDER', renderSystem: 'ACRYLIC' });
  assert.ok(key(rend, 'render_carrier') && key(rend, 'labour:render_board_fit') && key(rend, 'render_acrylic'));
});

test('loft fitted out room by room: shell in the loft, finishes from the loft rooms; hatch & ladder option', () => {
  const lr = [room('BEDROOM', { flooring: 'CARPET', electrics: 'ADD' }, { floor: 'LOFT', name: 'Loft bed', doors: 0 }), room('ENSUITE', { bathroomRefit: true, layout: 'SHOWER' }, { floor: 'LOFT', name: 'Loft en-suite', doors: 0 })];
  const input = takeoffInputSchema.parse({ ...defaultTakeoffInput(), packages: { loft: { enabled: true, values: { fitOutBy: 'ROOMS' } } }, rooms: lr });
  const r = calculateTakeoff(input, {});
  assert.ok(!r.lines.some(l => l.area === 'Loft conversion' && /floor_carpet|suite_/.test(l.rateKey)), 'no whole-loft flooring or en-suite');
  assert.ok(key(r, 'labour:staircase_fit') && r.lines.some(l => l.area === 'Loft bed' && l.rateKey === 'floor_carpet'));
  assert.ok(r.lines.some(l => l.area === 'Loft en-suite' && /suite_/.test(l.rateKey)));
  const hatch = loft({ staircase: false, hatch: true });
  assert.ok(key(hatch, 'loft_ladder') && !key(hatch, 'staircase'));
  assert.ok(key(loft({ stairType: 'SPACE_SAVER' }), 'staircase_spacesaver'));
});

test('one consumer unit and one certificate when loft and extension both ask for a board', () => {
  const input = takeoffInputSchema.parse({ ...defaultTakeoffInput(), packages: { loft: { enabled: true, values: { consumerUnit: true } }, extension: { enabled: true, values: { consumerUnit: true } } } });
  const r = calculateTakeoff(input, {});
  assert.equal(key(r, 'consumer_unit').quantity, 1);
  assert.equal(lines(r, l => l.rateKey === 'labour:elec_certificate').length, 1);
});

test('extension: types, foundations, walls & DPC, floors, UFH, manholes, columns, rooflight sizes', () => {
  for (const t of ['SIDE', 'DOUBLE_SIDE', 'WRAP_DOUBLE_REAR', 'WRAP_DOUBLE_SIDE']) {
    const r = only('extension', { extType: t });
    assert.ok(r.totals.net > 20000, t);
    if (t !== 'SIDE') assert.ok(key(r, 'scaffold_erect') && lines(r, l => l.stage.includes('First floor')).length, `${t} has a first floor`);
  }
  const wrapRear = only('extension', { extType: 'WRAP_DOUBLE_REAR' }), dbl = only('extension', { extType: 'DOUBLE' });
  assert.ok(wrapRear.totals.net > dbl.totals.net * 0.9);
  assert.ok(key(only('extension', { foundation: 'RAFT' }), 'labour:raft_slab'));
  const piled = only('extension', { foundation: 'PILED' });
  assert.ok(key(piled, 'labour:pile_mini') && key(piled, 'pile_rig') && key(piled, 'labour:ground_beam'));
  const misc = only('extension', { underpin: 4, columns: 2, moveManhole: 1, buildOver: true, breakOut: 10, houseFloor: 12, cavityTrays: 4, brick: 'facing_brick_stock' });
  for (const k of ['labour:underpin', 'labour:pad_foundation', 'labour:manhole_move', 'build_over', 'labour:break_out_concrete', 'cavity_tray', 'facing_brick_stock', 'engineering_brick']) assert.ok(key(misc, k), `missing ${k}`);
  assert.ok(key(only('extension', { floorType: 'BEAM_BLOCK' }), 'beam_block'));
  assert.ok(key(only('extension', { floorType: 'TIMBER' }), 'labour:sleeper_wall'));
  const wet = only('extension', { ufh: true, ufhType: 'WET', screedType: 'LIQUID' });
  assert.ok(key(wet, 'ufh_wet_kit') && key(wet, 'ufh_manifold') && key(wet, 'screed_liquid'));
  const rl = only('extension', { rooflightCount: 2, rooflight1: 'CUSTOM_LANTERN', rooflight1W: 1.5, rooflight1L: 3, rooflight2: 'TBC' });
  near(key(rl, 'lantern_custom').quantity, 4.5);
  assert.ok(rl.assumptions.some(a => /size to be confirmed|until you confirm/.test(a)));
  assert.ok(key(only('extension', { walls: 'CLAD_COMPOSITE' }), 'clad_composite'));
  assert.ok(key(only('extension', { roof: 'FLAT_EPDM' }), 'epdm_system'));
});

test('kitchen in an extension: hob circuit, sockets, spurs, extract and boiler move; who fits it', () => {
  const k = only('extension', { kitchen: true, kFitBy: 'US', kBoilerMove: true, kBoilerRun: 5, kHoodType: 'CEILING' });
  for (const x of ['cooker_switch', 'labour:boiler_move', 'labour:boiler_move_extra', 'base_unit_mid', 'hood_duct_kit']) assert.ok(key(k, x), `missing ${x}`);
  near(key(k, 'labour:boiler_move_extra').quantity, 2);
  const client = only('extension', { kitchen: true, kFitBy: 'CLIENT' });
  assert.ok(!key(client, 'base_unit_mid') && !key(client, 'labour:kitchen_units') && key(client, 'cooker_switch'));
  const weFit = only('extension', { kitchen: true, kFitBy: 'WE_FIT' });
  assert.ok(!key(weFit, 'base_unit_mid') && key(weFit, 'labour:kitchen_units'));
});

test('re-roof shapes, valleys, ventilation, structure and stacks', () => {
  const mono = only('roofing', { shape: 'MONO', length: 6, depth: 3 });
  assert.ok(key(mono, 'labour:mono_abutment') && !key(mono, 'ridge_tile'));
  const cx = only('roofing', { shape: 'COMPLEX', roofArea: 150, valleys: 8 });
  near(key(cx, 'breather_membrane').quantity, Math.ceil(150 * 1.1));
  assert.ok(key(cx, 'grp_valley'));
  assert.ok(key(only('roofing', { structure: 'RENEW' }), 'labour:roof_restructure'));
  assert.ok(key(only('roofing', { chimneyRemove: 1, ventTiles: 3, loftInsulation: true }), 'labour:chimney_stack_remove'));
});

test('demolition package: structural items, asbestos, waste route', () => {
  const d = only('demolition', { kitchens: 1, partitions: 20, loadBearing: 1, chimneyBreasts: 2, breastSupport: 'STEEL', concrete: 20, asbestosSum: 2000, waste: 'GRAB' });
  for (const k of ['asbestos_survey', 'labour:services_isolate', 'labour:strip_kitchen', 'labour:remove_partition', 'labour:knock_through', 'labour:chimney_breast_remove', 'labour:break_out_concrete', 'asbestos_licensed', 'muck_away', 'building_control', 'structural_engineer']) assert.ok(key(d, k), `missing ${k}`);
  assert.equal(key(d, 'asbestos_licensed').total, 2000);
  const bld = only('demolition', { building: 60 });
  assert.ok(key(bld, 'demolition_notice') && key(bld, 'utility_disconnect'));
});

test('acrylic and polymer renders in the external walls project', () => {
  assert.ok(key(only('external', { system: 'ACRYLIC' }), 'render_acrylic'));
  assert.ok(key(only('external', { system: 'POLYMER' }), 'render_polymer'));
  const ewi = only('external', { system: 'ACRYLIC', insulation: true });
  assert.ok(key(ewi, 'ewi_eps_90') && ewi.totals.vatBreakdown.length === 2);
});

console.log(`\n${passed} takeoff tests passed`);
