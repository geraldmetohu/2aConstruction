import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { typescriptLoader } from './helpers/load-typescript.mjs';

const { storefrontQuery } = typescriptLoader()('app/lib/storefront-query.ts');

test('storefront preserves database content, falls back on outages, and exposes query bugs', async () => {
  const rows = [{ id: 'project-1' }];
  assert.equal(await storefrontQuery('Projects', async () => rows), rows);

  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args);
  try {
    const outages = [
      new Prisma.PrismaClientInitializationError('private connection details', '6.3.0'),
      ...['P1001', 'P1002', 'P1011', 'P1017'].map(code =>
        new Prisma.PrismaClientKnownRequestError('private connection details', { code, clientVersion: '6.3.0' })),
    ];
    for (const error of outages) {
      assert.deepEqual(await storefrontQuery('Projects', async () => { throw error; }), []);
    }
    assert.equal(warnings.length, outages.length);
    assert.ok(warnings.every(args => args.length === 1 && !args[0].includes('private connection details')));
    for (const error of [
      new Error('query bug'),
      new Prisma.PrismaClientKnownRequestError('missing table', { code: 'P2021', clientVersion: '6.3.0' }),
    ]) {
      await assert.rejects(storefrontQuery('Projects', async () => { throw error; }), e => e === error);
    }
  } finally {
    console.warn = originalWarn;
  }
});
