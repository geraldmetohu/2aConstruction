import assert from 'node:assert/strict';
import test from 'node:test';
import { renderCatalogue } from './helpers/render-catalogue.mjs';

for (const [screen, query, text] of [
  ['list', {}, 'Items &amp; prices'], ['new', {}, 'New construction item'],
  ['item', { tab: 'details' }, 'Item details'], ['item', { tab: 'prices' }, 'Price history'],
  ['item', { tab: 'work' }, 'Publish new specification'], ['item', { tab: 'options' }, 'Saved options'],
  ['item', { tab: 'suppliers' }, 'Supplier reference history'], ['item', { tab: 'availability' }, 'Duplicate item'],
  ...['category', 'unit', 'labour', 'supplier', 'tax'].map(kind => ['setup', { kind }, 'Add an entry']),
]) {
  test(`renders catalogue ${screen} ${JSON.stringify(query)} from the actual components`, async () => {
    const html = await renderCatalogue(screen, query);
    assert.ok(html.includes(text), text);
    assert.doesNotMatch(html, /\[object Object\]|NaN|undefined/);
    assert.ok(html.includes('Catalogue navigation'));
    assert.ok(html.includes('/dashboard/items'));
  });
}
