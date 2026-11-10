// Our own sign-in: password hashing and rules, accounts, sessions (expiry, revoke, password change),
// one-time email links, attempt limits – on a real in-memory PostgreSQL (PGlite). No application database is used.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { typescriptLoader } from './helpers/load-typescript.mjs';

const require = createRequire(import.meta.url);
const { PGlite } = require('@electric-sql/pglite');
const load = typescriptLoader();
const pw = load('app/lib/auth/password.ts');
const store = load('app/lib/auth/store.ts');

const pg = new PGlite();
const db = { query: async (text, params = []) => (await pg.query(text, params)).rows };
let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log('ok -', name); };

await pg.exec(`CREATE TABLE "User" (id text primary key, email text); INSERT INTO "User" VALUES ('kp_123', 'old@client.com');`);
assert.equal(await store.authReady(db), false);
await pg.exec(readFileSync(new URL('../prisma/migrations/20261111120000_add_accounts/migration.sql', import.meta.url), 'utf8'));

await test('migration is additive', async () => {
  assert.equal(await store.authReady(db), true);
  assert.deepEqual(await db.query(`SELECT * FROM "User"`), [{ id: 'kp_123', email: 'old@client.com' }]);
});

await test('passwords: scrypt hash, constant-time verify, rules, safe redirects', async () => {
  const h = await pw.hashPassword('Correct-Horse-9');
  assert.match(h, /^scrypt\$15\$8\$1\$/);
  assert.equal((await pw.verifyPassword('Correct-Horse-9', h)).ok, true);
  assert.equal((await pw.verifyPassword('correct-horse-9', h)).ok, false);
  assert.equal((await pw.verifyPassword('anything', null)).ok, false);
  assert.notEqual(await pw.hashPassword('Correct-Horse-9'), h, 'salted');
  assert.deepEqual(pw.passwordProblems('Tall-Ladder-42', 'jo@x.com'), []);
  assert.ok(pw.passwordProblems('short').length);
  assert.ok(pw.passwordProblems('password123').some(p => /common/.test(p)));
  assert.ok(pw.passwordProblems('jsmith-builder-1', 'jsmith@x.com').some(p => /email/.test(p)));
  assert.equal(pw.safeNext('/my-quotes?x=1'), '/my-quotes?x=1');
  for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', 'javascript:alert(1)']) assert.equal(pw.safeNext(bad, '/'), '/');
  assert.equal(pw.normEmail('  Jo@Example.COM '), 'jo@example.com');
});

let acc;
await test('accounts: one per email (lower case), roles, Google id', async () => {
  acc = await store.createAccount(db, { email: 'jo@example.com', name: 'Jo Bloggs', role: 'CLIENT' });
  assert.equal(acc.emailVerifiedAt, null);
  const again = await store.createAccount(db, { email: 'jo@example.com', name: 'Other' });
  assert.equal(again.id, acc.id, 'no duplicate');
  await assert.rejects(db.query(`INSERT INTO "AuthAccount" ("email") VALUES ('Upper@Case.com')`));
  await assert.rejects(db.query(`INSERT INTO "AuthAccount" ("email", "role") VALUES ('x@y.com', 'GOD')`));
  await store.updateAccount(db, acc.id, { googleSub: 'g-1', verified: true, role: 'TRADE', trade: 'ELECTRICIAN' });
  const g = await store.accountByGoogle(db, 'g-1');
  assert.equal(g.id, acc.id); assert.ok(g.emailVerifiedAt); assert.equal(g.trade, 'ELECTRICIAN');
});

await test('sessions: token never stored, revoke, password change signs out older sessions, disabled accounts', async () => {
  const t1 = await store.createSession(db, acc.id, { userAgent: 'iPhone', ip: '1.2.3.4' });
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM "AuthSession" WHERE "id" = $1`, [t1]))[0].n, 0, 'only the hash is stored');
  assert.equal((await store.sessionAccount(db, t1)).id, acc.id);
  assert.equal(await store.sessionAccount(db, 'not-a-real-token-at-all-xxxxxxxx'), null);
  const t2 = await store.createSession(db, acc.id);
  await store.revokeSession(db, t2);
  assert.equal(await store.sessionAccount(db, t2), null);
  await db.query(`UPDATE "AuthAccount" SET "passwordChangedAt" = now() + interval '1 minute' WHERE "id" = $1`, [acc.id]);
  assert.equal(await store.sessionAccount(db, t1), null, 'password changed after the session started');
  await db.query(`UPDATE "AuthAccount" SET "passwordChangedAt" = NULL WHERE "id" = $1`, [acc.id]);
  const t3 = await store.createSession(db, acc.id), t4 = await store.createSession(db, acc.id);
  await store.revokeAllSessions(db, acc.id, t3);
  assert.ok(await store.sessionAccount(db, t3)); assert.equal(await store.sessionAccount(db, t4), null);
  await store.updateAccount(db, acc.id, { disabled: true });
  assert.equal(await store.sessionAccount(db, t3), null);
  await store.updateAccount(db, acc.id, { disabled: false });
  await db.query(`UPDATE "AuthSession" SET "expiresAt" = now() - interval '1 second' WHERE "id" = $1`, [pw.sha256(t3)]);
  assert.equal(await store.sessionAccount(db, t3), null, 'expired');
});

await test('email links: peek does not use them, used once only, purpose and expiry checked', async () => {
  const t = await store.createToken(db, 'RESET', 'jo@example.com', acc.id);
  assert.ok(await store.peekToken(db, t, ['RESET']));
  assert.ok(await store.peekToken(db, t, ['RESET']), 'opening the link twice is fine');
  assert.equal(await store.peekToken(db, t, ['MAGIC']), null, 'wrong purpose');
  assert.equal((await store.consumeToken(db, t, ['RESET'])).email, 'jo@example.com');
  assert.equal(await store.consumeToken(db, t, ['RESET']), null, 'only once');
  const m = await store.createToken(db, 'MAGIC', 'jo@example.com', acc.id);
  await db.query(`UPDATE "AuthToken" SET "expiresAt" = now() - interval '1 second' WHERE "purpose" = 'MAGIC'`);
  assert.equal(await store.consumeToken(db, m, ['MAGIC']), null, 'expired');
  assert.equal(await store.recentTokens(db, 'jo@example.com'), 2);
});

await test('attempt limits count failures since the last success', async () => {
  const keys = ['login:email:jo@example.com', 'login:ip:1.2.3.4'];
  for (let i = 0; i < 5; i++) await store.recordAttempt(db, keys, false);
  assert.equal(await store.failures(db, keys), 5);
  await store.recordAttempt(db, ['login:email:jo@example.com'], true);
  assert.equal(await store.failures(db, ['login:email:jo@example.com']), 0);
  assert.equal(await store.failures(db, keys), 5, 'the IP still counts');
});

await test('quote reference sign-in only reveals a masked email', async () => {
  assert.equal(store.maskEmail('jonathan@gmail.com'), 'j••••••@gmail.com');
  assert.equal(store.maskEmail('al@x.com'), 'a••@x.com');
});

console.log(`\n${passed} auth tests passed`);
