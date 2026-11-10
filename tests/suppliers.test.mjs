// Merchant registry, price / name / link parsing, matching, pack sizes and robots.txt – no network.
import assert from 'node:assert/strict';
import { typescriptLoader } from './helpers/load-typescript.mjs';

const load = typescriptLoader();
const p = load('app/lib/takeoff/supplier-parse.ts');
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('ok -', name); };

test('only https pages on the merchant’s own site', () => {
  assert.ok(p.validSupplierUrl('SCREWFIX', 'https://www.screwfix.com/p/x/12345'));
  assert.ok(p.validSupplierUrl('TOOLSTATION', 'https://www.toolstation.com/x/p12345'));
  assert.ok(!p.validSupplierUrl('SCREWFIX', 'http://www.screwfix.com/p/x/1'));
  assert.ok(!p.validSupplierUrl('SCREWFIX', 'https://www.screwfix.com.evil.com/p/x/1'));
  assert.ok(!p.validSupplierUrl('NOPE', 'https://www.screwfix.com/'));
  assert.ok(p.SUPPLIER_IDS.length >= 12);
});

const page = (name, price, extra = '') => `<html><head><script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name, offers: { '@type': 'Offer', price, priceCurrency: 'GBP' } })}</script>${extra}</head></html>`;
test('price, name and image from the product page', () => {
  const h = page('Gyproc WallBoard 12.5mm 2400 x 1200mm', '11.98', '<meta property="og:image" content="https://img.example/x.jpg">');
  assert.equal(p.extractPrice(h), 11.98);
  assert.equal(p.extractName(h), 'Gyproc WallBoard 12.5mm 2400 x 1200mm');
  assert.equal(p.extractImage(h), 'https://img.example/x.jpg');
  assert.throws(() => p.extractPrice('<html></html>'), /No price/);
  const two = `<script type="application/ld+json">${JSON.stringify([{ '@type': 'Product', offers: [{ price: 5, priceCurrency: 'GBP' }, { price: 7, priceCurrency: 'GBP' }] }])}</script>`;
  assert.throws(() => p.extractPrice(two), /Several prices/);
});

test('product links from a search page (JSON-LD list and plain links), own site only', () => {
  const ld = `<script type="application/ld+json">${JSON.stringify({ '@type': 'ItemList', itemListElement: [{ '@type': 'ListItem', url: 'https://www.screwfix.com/p/board/123456' }] })}</script>`;
  const html = ld + '<a href="/p/other-board/654321?ref=x">b</a><a href="/c/boards">cat</a><a href="https://evil.com/p/x/1">x</a>';
  assert.deepEqual(p.productLinks(html, 'SCREWFIX', 'https://www.screwfix.com/search?search=board'), ['https://www.screwfix.com/p/board/123456', 'https://www.screwfix.com/p/other-board/654321']);
});

test('name matching prefers the same product and size', () => {
  const ours = 'Plasterboard 12.5 mm 2.4 × 1.2 m';
  const good = p.matchScore(ours, 'British Gypsum Gyproc Plasterboard Tapered Edge 2400 x 1200 x 12.5mm');
  const wrongSize = p.matchScore(ours, 'Plasterboard 9.5mm 1800 x 900mm');
  const other = p.matchScore(ours, 'Dulux Trade Vinyl Matt White 10L');
  assert.ok(good > wrongSize && good > other, `${good} ${wrongSize} ${other}`);
  assert.ok(good >= 0.6 && other < 0.3);
  assert.equal(p.searchTerms('Carpet & underlay – budget (supplied & fitted)'), 'Carpet & underlay budget');
});

test('pack sizes from the product name', () => {
  assert.deepEqual(p.guessPack('Laminate flooring 8mm 2.13m² pack', 'm2'), { quantity: 2.13, sure: true });
  assert.deepEqual(p.guessPack('Drywall screws 3.5 x 38mm pack of 1000', 'each'), { quantity: 1000, sure: true });
  assert.deepEqual(p.guessPack('Gripfill 350ml', 'each'), { quantity: 1, sure: true });
  assert.equal(p.guessPack('Wall ties box', 'each').sure, false);
  assert.deepEqual(p.guessPack('MDF torus skirting 4.2m', 'm'), { quantity: 4.2, sure: true });
});

test('robots.txt is respected', () => {
  const r = 'User-agent: *\nDisallow: /search\nAllow: /search/help\nDisallow: /*?sort=\n\nUser-agent: BadBot\nDisallow: /';
  assert.equal(p.robotsAllows(r, '/search?search=osb'), false);
  assert.equal(p.robotsAllows(r, '/search/help'), true);
  assert.equal(p.robotsAllows(r, '/p/board/1'), true);
  assert.equal(p.robotsAllows(r, '/c/boards?sort=price'), false);
  assert.equal(p.robotsAllows('', '/anything'), true);
});

console.log(`\n${passed} supplier tests passed`);
