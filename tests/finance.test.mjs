// Finance: UK rules (VAT periods & boxes, reverse charge, CIS, Corporation Tax, deadlines), bank statement reading,
// and the finance store + reports against in-memory PostgreSQL (PGlite). No application database is used.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { typescriptLoader } from './helpers/load-typescript.mjs';

const require = createRequire(import.meta.url);
const { PGlite } = require('@electric-sql/pglite');
const load = typescriptLoader();
const R = load('app/lib/finance/rules.ts');
const B = load('app/lib/finance/bank-parse.ts');
const F = load('app/lib/finance/store.ts');
const { buildReport } = load('app/lib/finance/report.ts');
const store = load('app/lib/takeoff/store.ts');
const jobs = load('app/lib/takeoff/jobs-store.ts');

let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log('ok -', name); };
const rejects = async (p, re) => { await assert.rejects(p, e => re.test(String(e.message ?? e))); };

// ---------------------------------------------------------------- Rules

await test('VAT quarters follow the stagger; due one month and seven days after', () => {
  const s = { ...R.DEFAULT_SETTINGS, vatRegistrationDate: '2025-02-01', vatFirstPeriodEnd: '2025-04-30' };
  const p = R.vatPeriods(s, '2026-01-15');
  assert.deepEqual(p.map(x => [x.start, x.end, x.due]), [
    ['2025-02-01', '2025-04-30', '2025-06-07'], ['2025-05-01', '2025-07-31', '2025-09-07'], ['2025-08-01', '2025-10-31', '2025-12-07'], ['2025-11-01', '2026-01-31', '2026-03-07'],
  ]);
  assert.equal(R.vatDue('2026-03-31'), '2026-05-07');
  assert.deepEqual(R.vatPeriods({ ...s, vatRegistered: false }, '2026-01-01'), []);
});

await test('VAT return boxes: standard sales, reverse charge both ways, exempt insurance, no wages or HMRC payments', () => {
  const v = R.vatReturn([
    { date: 'x', dir: 'IN', amount: 12000, vat: 2000, treatment: 'STANDARD', categoryKey: 'SALES' },
    { date: 'x', dir: 'IN', amount: 5000, vat: 0, treatment: 'REVERSE_CHARGE', categoryKey: 'SALES_DRC' },
    { date: 'x', dir: 'OUT', amount: 600, vat: 100, treatment: 'STANDARD', categoryKey: 'MATERIALS' },
    { date: 'x', dir: 'OUT', amount: 1000, vat: 200, treatment: 'REVERSE_CHARGE', categoryKey: 'SUBCONTRACTOR' },
    { date: 'x', dir: 'OUT', amount: 900, vat: 0, treatment: 'EXEMPT', categoryKey: 'INSURANCE' },
    { date: 'x', dir: 'OUT', amount: 120, vat: 20, treatment: 'STANDARD', categoryKey: 'ENTERTAINING' },
    { date: 'x', dir: 'OUT', amount: 2000, vat: 0, treatment: 'OUTSIDE', categoryKey: 'LABOUR' },
    { date: 'x', dir: 'OUT', amount: 3000, vat: 0, treatment: 'OUTSIDE', categoryKey: 'HMRC_VAT' },
  ]);
  assert.equal(v.box1, 2200); // 2000 sales + 200 reverse charge
  assert.equal(v.box4, 300);  // 100 materials + 200 reverse charge (entertaining VAT not reclaimable)
  assert.equal(v.box5, 1900);
  assert.equal(v.box6, 15000);
  assert.equal(v.box7, 2520);
  assert.equal(v.drcOutput, 200);
});

await test('Corporation Tax: 19% to £50k, marginal relief, 25% over £250k, short periods and associates', () => {
  assert.equal(R.corporationTax(40000, '2025-04-01', '2026-03-31').tax, 7600);
  assert.equal(R.corporationTax(100000, '2025-04-01', '2026-03-31').tax, 22750);
  assert.equal(R.corporationTax(300000, '2025-07-01', '2026-06-30').tax, 75000);
  // 6-month period: limits halve, so £40k is in marginal relief
  const half = R.corporationTax(40000, '2026-04-01', '2026-09-30');
  assert.ok(half.tax > 7600 && half.tax < 10000, String(half.tax));
  // one associated company: limits halve
  assert.ok(R.corporationTax(40000, '2025-04-01', '2026-03-31', 1).tax > 7600);
  assert.equal(R.corporationTax(-500, '2025-04-01', '2026-03-31').tax, 0);
});

await test('Accounting periods: first period to the year end, split for tax when over 12 months; filing deadlines', () => {
  const p = R.accountsPeriods({ ...R.DEFAULT_SETTINGS, incorporationDate: '2024-06-12', yearEnd: '06-30' }, '2026-11-12');
  assert.equal(p[0].end, '2025-06-30');
  assert.deepEqual(p[0].taxPeriods, [{ start: '2024-06-12', end: '2025-06-11' }, { start: '2025-06-12', end: '2025-06-30' }]);
  assert.equal(p[0].accountsDue, '2026-03-12'); // 21 months after incorporation
  assert.equal(p[1].start, '2025-07-01'); assert.equal(p[1].end, '2026-06-30');
  assert.equal(p[1].accountsDue, '2027-03-31'); assert.equal(p[1].ctPaymentDue, '2027-04-01'); assert.equal(p[1].ct600Due, '2027-06-30');
});

await test('CIS: tax months 6th–5th, return 19th, payment 22nd; 20% / 30% of labour only, rounded down', () => {
  const m = R.cisMonth('2026-11-05');
  assert.deepEqual([m.start, m.end, m.returnDue, m.paymentDue], ['2026-10-06', '2026-11-05', '2026-11-19', '2026-11-22']);
  assert.equal(R.cisMonth('2026-11-06').start, '2026-11-06');
  assert.equal(R.cisDeduction(1234.56, 'NET20'), 246.91);
  assert.equal(R.cisDeduction(1000, 'NET30'), 300);
  assert.equal(R.cisDeduction(1000, 'GROSS'), 0);
  const p = F.workerPayment({ labour: 1000, materials: 250, vatTreatment: 'REVERSE_CHARGE', cisStatus: 'NET20' });
  assert.deepEqual(p, { amount: 1250, vat: 250, cisLabour: 1000, cisMaterials: 250, cisDeducted: 200, toPay: 1050 });
  const cash = F.workerPayment({ labour: 600, materials: 0, vatTreatment: 'OUTSIDE', cisStatus: 'NONE' });
  assert.equal(cash.toPay, 600); assert.equal(cash.cisDeducted, 0);
});

await test('Repeating costs: month-ends kept, weekly, yearly, one-off, end dates', () => {
  assert.deepEqual(R.occurrences({ frequency: 'MONTHLY', startDate: '2026-01-31', endDate: null }, '2026-01-01', '2026-04-30'), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  assert.equal(R.occurrences({ frequency: 'WEEKLY', startDate: '2026-01-05', endDate: '2026-01-31' }, '2026-01-01', '2026-12-31').length, 4);
  assert.deepEqual(R.occurrences({ frequency: 'ANNUAL', startDate: '2025-03-01', endDate: null }, '2026-01-01', '2026-12-31'), ['2026-03-01']);
  assert.deepEqual(R.occurrences({ frequency: 'ONE_OFF', startDate: '2026-02-01', endDate: null }, '2026-03-01', '2026-12-31'), []);
  assert.equal(R.monthlyEquivalent(1200, 'ANNUAL'), 100);
});

// ---------------------------------------------------------------- Bank statements

const page = rows => rows.flatMap((r, i) => r.map(([str, x, w]) => ({ str, x, y: 800 - i * 12, w: w ?? str.length * 5 })));
const Rt = (s, right) => [s, right - s.length * 5, s.length * 5];

await test('Bank PDF (Barclays layout): columns, continuation lines, balances checked', () => {
  const st = B.parsePdfText([page([
    [['Barclays Bank UK PLC', 40]],
    [['Date', 40], ['Description', 90], Rt('Money out £', 400), Rt('Money in £', 470), Rt('Balance £', 540)],
    [['1 Mar 2026', 40], ['Start balance', 90], Rt('5,000.00', 540)],
    [['2 Mar', 40], ['Card Payment to Screwfix Direct', 90], Rt('123.45', 400), Rt('4,876.55', 540)],
    [['On 01 Mar', 90]],
    [['Direct Debit to Checkatrade', 90], Rt('70.00', 400), Rt('4,806.55', 540)],
    [['5 Mar', 40], ['Received From J Smith 2A-0042', 90], Rt('2,400.00', 470), Rt('7,206.55', 540)],
    [['31 Mar', 40], ['End balance', 90], Rt('7,206.55', 540)],
  ])]);
  assert.equal(st.bank, 'Barclays');
  assert.deepEqual(st.txns.map(t => [t.date, t.amount]), [['2026-03-02', -123.45], ['2026-03-02', -70], ['2026-03-05', 2400]]);
  assert.match(st.txns[0].description, /Screwfix Direct On 01 Mar/);
  assert.equal(st.openingBalance, 5000); assert.equal(st.closingBalance, 7206.55);
  assert.deepEqual(st.warnings, []);
});

await test('Bank PDF (HSBC layout): "BALANCE BROUGHT FORWARD", details over two lines, money in', () => {
  const st = B.parsePdfText([page([
    [['HSBC UK', 40]],
    [['Date', 40], ['Payment type and details', 90], Rt('Paid out', 400), Rt('Paid in', 470), Rt('Balance', 540)],
    [['28 Feb 26', 40], ['BALANCE BROUGHT FORWARD', 90], Rt('1,000.00', 540)],
    [['02 Mar 26', 40], ['DD', 90], ['HISCOX INSURANCE', 110]],
    [['POLICY 123', 110], Rt('45.10', 400)],
    [['VIS', 90], ['TOOLSTATION', 110], Rt('20.00', 400), Rt('934.90', 540)],
    [['03 Mar 26', 40], ['CR', 90], ['A BROWN', 110], Rt('500.00', 470), Rt('1,434.90', 540)],
  ])]);
  assert.deepEqual(st.txns.map(t => [t.description, t.amount]), [['DD HISCOX INSURANCE POLICY 123', -45.1], ['VIS TOOLSTATION', -20], ['CR A BROWN', 500]]);
});

await test('Bank CSV: Lloyds, NatWest, Barclays and HSBC (no header) exports', () => {
  const l = B.parseCsv(`Transaction Date,Transaction Type,Sort Code,Account Number,Transaction Description,Debit Amount,Credit Amount,Balance
05/03/2026,FPI,'30-00-00,12345678,J SMITH 2A-0042,,2400.00,7206.55
02/03/2026,DEB,'30-00-00,12345678,SCREWFIX DIRECT,123.45,,4876.55`);
  assert.deepEqual(l.txns.map(t => [t.date, t.amount, t.balance]), [['2026-03-02', -123.45, 4876.55], ['2026-03-05', 2400, 7206.55]]);
  const n = B.parseCsv(`Date, Type, Description, Value, Balance, Account Name, Account Number\n"10 Mar 2026",D/D,"HISCOX UK",-45.10,934.90,"2A","x"`);
  assert.deepEqual(n.txns.map(t => [t.date, t.amount]), [['2026-03-10', -45.1]]);
  const b = B.parseCsv(`Number,Date,Account,Amount,Subcategory,Memo\n,12/03/2026,20-00-00 1234567,-70.00,Direct Debit,CHECKATRADE.COM`);
  assert.equal(b.txns[0].description, 'Direct Debit CHECKATRADE.COM');
  assert.equal(B.parseCsv(`14/03/2026,SHELL WATFORD,-60.00`).txns[0].amount, -60);
});

await test('Suggestions: client payment, regular cost, worker, supplier, already recorded; "remember" patterns', () => {
  const ctx = { rules: [{ pattern: 'MAREK NOWAK', dir: 'OUT', categoryKey: 'SUBCONTRACTOR', quoteId: null, workerId: 'w1', counterparty: 'Marek' }],
    reportedPayments: [{ id: 'p1', quoteId: 'q1', amount: 2400, paidOn: '2026-03-04', reference: '', label: '2A-0042' }], invoices: [],
    jobs: [{ quoteId: 'q1', reference: '2A-0042', clientName: 'John Smith', label: '2A-0042 Smith' }],
    recurring: [{ id: 'r1', name: 'Checkatrade', supplier: 'Checkatrade', amount: 70, categoryKey: 'MEMBERSHIPS' }],
    workers: [{ id: 'w1', name: 'Marek Nowak', categoryKey: 'SUBCONTRACTOR' }],
    recorded: [{ kind: 'EXPENSE', id: 'x1', date: '2026-03-01', amount: -123.45, label: 'Screwfix', categoryKey: 'MATERIALS', quoteId: 'q1' }] };
  assert.equal(B.suggest({ date: '2026-03-05', description: 'Received From J Smith 2A-0042', amount: 2400 }, ctx)[0].kind, 'CLIENT_PAYMENT');
  assert.equal(B.suggest({ date: '2026-03-02', description: 'Direct Debit to Checkatrade', amount: -70 }, ctx)[0].kind, 'RECURRING');
  assert.equal(B.suggest({ date: '2026-03-05', description: 'Bill Payment to Marek Nowak Ref wk9', amount: -900 }, ctx)[0].kind, 'RULE');
  const s = B.suggest({ date: '2026-03-02', description: 'Card Payment to Screwfix Direct', amount: -123.45 }, ctx);
  assert.equal(s[0].kind, 'MATCH'); assert.equal(s[0].expenseId, 'x1');
  assert.equal(B.suggest({ date: '2026-03-02', description: 'CARD PAYMENT TO SHELL WATFORD', amount: -60 }, ctx)[0].categoryKey, 'VEHICLE_RUNNING');
  assert.equal(B.suggest({ date: '2026-03-02', description: 'CASH WITHDRAWAL LINK ATM', amount: -200 }, ctx)[0].categoryKey, 'CASH_WITHDRAWAL');
  assert.equal(F.patternOf('Card Payment to Screwfix Direct On 01 Mar'), 'SCREWFIX');
  assert.equal(F.patternOf('DD HISCOX INSURANCE POLICY 123'), 'HISCOX INSURANCE POLICY');
  const fp = B.fingerprints([{ date: '2026-03-01', description: 'A', amount: -5, balance: null }, { date: '2026-03-01', description: 'A', amount: -5, balance: null }]);
  assert.notEqual(fp[0], fp[1]);
});

// ---------------------------------------------------------------- Store + report on PGlite

const pg = new PGlite();
const wrap = c => ({ query: async (text, params = []) => (await c.query(text, params)).rows });
const db = { ...wrap(pg), transaction: fn => pg.transaction(tx => fn(wrap(tx))) };
const sql = name => readFileSync(new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url), 'utf8');
await pg.exec(sql('20261101120000_add_takeoff_quotes'));
await pg.exec(sql('20261102120000_add_takeoff_jobs'));
await pg.exec(sql('20261112120000_client_portal'));
const q = await store.createQuote(db, { clientName: 'Jane Client', clientEmail: 'jane@example.com', siteAddress: '1 High St' },
  { input: { commercial: { vatPercent: 20 } }, result: { totals: { costSubtotal: 8000 } }, customer: { net: 10000, gross: 12000 }, rates: {}, prices: {} }, 'admin');
await store.sendQuote(db, q.id, 'admin');
await store.acceptQuote(db, q.id, 'jane@example.com', 1, 'Jane Client');
const Q = q.id;
await jobs.getJob(db, Q);
const worker = await jobs.saveWorker(db, { name: 'Marek Nowak', kind: 'SUBCONTRACTOR', trade: 'Carpenter', phone: '', email: '', payBasis: 'DAY', dayRate: 200, notes: '', active: true });
const W = typeof worker === 'string' ? worker : worker.id;
await jobs.addExpense(db, { quoteId: Q, workerId: null, category: 'MATERIALS', description: 'Timber', supplier: 'Travis Perkins', amount: 600, spentOn: '2026-11-02' }, 'admin');

await test('Finance migration is additive, runs twice, keeps existing jobs and expenses', async () => {
  assert.equal(await F.financeReady(db), false);
  await pg.exec(sql('20261113120000_finance'));
  await pg.exec(sql('20261113120000_finance'));
  assert.equal(await F.financeReady(db), true);
  const x = await F.listJobExpenses(db);
  assert.equal(x.length, 1); assert.equal(x[0].vat, 0); assert.equal(x[0].vatTreatment, 'OUTSIDE'); assert.equal(x[0].method, 'BANK');
  assert.equal((await jobs.listJobs(db)).length, 1);
});

await test('Settings saved once and read back; bad VAT dates refused', async () => {
  await F.saveSettings(db, { incorporationDate: '2024-04-01', yearEnd: '03-31', vatRegistered: true, vatRegistrationDate: '2025-04-01', vatFirstPeriodEnd: '2025-06-30', cisContractor: true }, 'admin');
  const s = await F.getSettings(db);
  assert.equal(s.yearEnd, '03-31'); assert.equal(s.vatFirstPeriodEnd, '2025-06-30');
  await rejects(F.saveSettings(db, { vatRegistered: true, vatRegistrationDate: '2025-04-01', vatFirstPeriodEnd: '2025-01-31' }, 'a'), /first VAT period/);
});

await test('Entries: checked, CIS kept, voided not deleted; existing expense VAT can be set', async () => {
  await rejects(F.addEntry(db, { date: '2026-11-03', direction: 'IN', method: 'BANK', category: 'MATERIALS', amount: 10 }, 'a'), /money out/);
  await rejects(F.addEntry(db, { date: '2026-11-03', direction: 'OUT', method: 'BANK', category: 'MATERIALS', amount: 10, vat: 20 }, 'a'), /VAT/);
  const id = await F.addEntry(db, { date: '2026-11-04', direction: 'OUT', method: 'CASH', category: 'INSURANCE', amount: 90, counterparty: 'Hiscox' }, 'a');
  const [e] = await F.listEntries(db);
  assert.equal(e.id, id); assert.equal(e.vat, 0); assert.equal(e.vatTreatment, 'EXEMPT');
  await F.voidEntry(db, id);
  assert.equal((await F.listEntries(db)).length, 0);
  assert.equal((await F.listEntries(db, { includeVoid: true })).length, 1);
  const [x] = await F.listJobExpenses(db);
  await F.setExpenseVat(db, x.id, { vat: 100, vatTreatment: 'STANDARD', method: 'CARD' });
  assert.equal((await F.listJobExpenses(db))[0].vat, 100);
  await rejects(F.setExpenseVat(db, x.id, { vat: 700, vatTreatment: 'STANDARD', method: 'CARD' }), /VAT/);
});

let lineIds;
await test('Bank import: duplicates skipped on re-import; CIS payment from a bank line; ignore and undo', async () => {
  const txns = [
    { date: '2026-11-05', description: 'BILL PAYMENT TO MAREK NOWAK', amount: -800, balance: 4200 },
    { date: '2026-11-06', description: 'DD CHECKATRADE', amount: -70, balance: 4130 },
    { date: '2026-11-07', description: 'TFR TO SAVINGS', amount: -1000, balance: 3130 },
  ];
  const r1 = await F.importStatement(db, { fileName: 'nov.pdf', bank: 'Barclays', periodFrom: '2026-11-01', periodTo: '2026-11-30', openingBalance: 5000, closingBalance: 3130 }, txns, B.fingerprints(txns), 'a');
  assert.equal(r1.added, 3);
  const r2 = await F.importStatement(db, { fileName: 'nov again.csv', bank: 'Barclays', periodFrom: null, periodTo: null, openingBalance: null, closingBalance: null }, txns, B.fingerprints(txns), 'a');
  assert.equal(r2.added, 0); assert.equal(r2.duplicates, 3);
  const lines = await F.listBankLines(db, { status: 'NEW' });
  lineIds = lines.map(l => l.id);
  // £800 left the bank for £1,000 of labour with 20% CIS held back
  await rejects(F.lineToEntry(db, lines[0].id, { category: 'SUBCONTRACTOR', workerId: W, quoteId: Q, vatTreatment: 'OUTSIDE', cisLabour: 1000, cisDeducted: 100 }, 'a'), /can't be more than the amount/);
  await F.lineToEntry(db, lines[0].id, { category: 'SUBCONTRACTOR', workerId: W, quoteId: Q, vatTreatment: 'OUTSIDE', cisLabour: 1000, cisDeducted: 200, days: 5 }, 'a');
  await F.saveRule(db, { pattern: F.patternOf(lines[0].description), dir: 'OUT', categoryKey: 'SUBCONTRACTOR', quoteId: null, workerId: W, counterparty: 'Marek', vatTreatment: 'OUTSIDE' }, 'a');
  assert.equal((await F.listRules(db))[0].pattern, 'MAREK NOWAK');
  await F.ignoreLine(db, lines[2].id, 'own transfer', 'a');
  await rejects(F.ignoreLine(db, lines[2].id, '', 'a'), /already done/);
  assert.equal((await F.listBankLines(db, { status: 'NEW' })).length, 1);
  const e = (await F.listEntries(db)).find(x => x.workerId === W);
  assert.equal(e.amount, 1000); assert.equal(e.cisDeducted, 200); assert.ok(e.bankLineId);
  // undo: the entry made from the line is cancelled, the line is back to do
  await F.reopenLine(db, lines[0].id);
  assert.equal((await F.listEntries(db)).filter(x => x.workerId === W).length, 0);
  await F.lineToEntry(db, lines[0].id, { category: 'SUBCONTRACTOR', workerId: W, quoteId: Q, vatTreatment: 'OUTSIDE', cisLabour: 1000, cisDeducted: 200, days: 5 }, 'a');
});

await test('Repeating costs and agreed job prices', async () => {
  const r = await F.saveRecurring(db, { name: 'Checkatrade', category: 'MEMBERSHIPS', supplier: 'Checkatrade', amount: 70, vatTreatment: 'STANDARD', frequency: 'MONTHLY', startDate: '2026-01-06', endDate: null, method: 'BANK', notes: '' }, 'a');
  await F.lineToEntry(db, lineIds[1], { category: 'MEMBERSHIPS', recurringId: r, counterparty: 'Checkatrade', vatTreatment: 'STANDARD' }, 'a');
  const c = await F.saveJobCost(db, { quoteId: Q, workerId: W, supplier: 'Marek', title: 'First fix carpentry', category: 'SUBCONTRACTOR', amount: 3000, labour: 3000, vatTreatment: 'OUTSIDE', dueDate: null, notes: '' }, 'a');
  await F.addEntry(db, { date: '2026-11-10', direction: 'OUT', method: 'CASH', category: 'SUBCONTRACTOR', amount: 500, workerId: W, quoteId: Q, jobCostId: c, vatTreatment: 'OUTSIDE' }, 'a');
  const [jc] = await F.listJobCosts(db, Q);
  assert.equal(jc.paid, 500);
  await rejects(F.saveJobCost(db, { quoteId: Q, workerId: null, supplier: '', title: 'x', category: 'INSURANCE', amount: 1, labour: 0, vatTreatment: 'OUTSIDE', dueDate: null, notes: '' }, 'a'), /job cost/);
});

await test('Report: job profit, VAT period, CIS month, cash box, owed to workers, alerts', async () => {
  await jobs.recordPayment(db, Q, { scheduleNo: 1, amount: 1200, method: 'BANK_TRANSFER', reference: '', paidOn: '2026-11-03', note: '' }, 'admin', 'ADMIN');
  await jobs.checkIn(db, W, Q, 'IN', {}, 'ADMIN', '', '2026-11-02T08:00:00Z').catch(() => null);
  const settings = await F.getSettings(db);
  const entries = await F.listEntries(db);
  const input = {
    today: '2026-11-12', settings, entries, expenses: await F.listJobExpenses(db),
    payments: (await jobs.listPayments(db)).map(p => ({ ...p, linked: false })), invoices: [],
    jobs: [{ quoteId: Q, reference: q.reference, clientName: 'Jane Client', siteAddress: '1 High St', jobStatus: 'IN_PROGRESS', contractNet: 10000, contractGross: 12000, plannedCost: 8000, vatPercent: 20, acceptedAt: '2026-11-01' }],
    jobCosts: await F.listJobCosts(db), recurring: await F.listRecurring(db), workers: (await F.listWorkerTax(db)).map(w => ({ ...w, cisStatus: 'NET20' })),
    assignments: [], workDays: [{ workerId: W, quoteId: Q, day: '2026-11-02' }, { workerId: W, quoteId: Q, day: '2026-11-03' }],
    bank: { toDo: 0, lastClosing: 3130, lastDate: '2026-11-30', statements: 1 },
  };
  const rep = buildReport(input);
  const j = rep.jobs[0];
  assert.equal(j.received, 1200);
  assert.equal(j.materials, 500);                 // £600 incl. £100 VAT → £500 cost
  assert.equal(j.labour, 1500);                   // £1,000 (CIS) + £500 cash
  assert.equal(j.plannedProfit, 2000);
  assert.equal(j.stillToPay, 2500);               // agreed £3,000 less £500 paid
  // VAT: quarter Aug–Oct is past; Nov–Jan is open
  const open = rep.vat.find(v => v.status === 'OPEN');
  assert.equal(open.start, '2026-10-01'); assert.equal(open.end, '2026-12-31');
  assert.equal(open.box1, 200);                   // VAT inside the £1,200 job payment (no invoices yet)
  assert.equal(open.box4, r2(100 + 70 / 6));      // timber + Checkatrade
  // CIS: Marek paid in the month 6 Oct – 5 Nov; £200 deducted
  const cm = rep.cisMonths.find(m => m.end === '2026-11-05');
  assert.equal(cm.deducted, 200); assert.equal(cm.subs[0].gross, 1000);
  assert.ok(rep.alerts.some(a => /CIS return/.test(a.text)));
  // Cash box: £500 cash paid out
  assert.equal(rep.cashBook.balance, -500);
  // Year end 1 Apr 2026 – 31 Mar 2027 is the current period
  assert.equal(rep.headline.year.end, '2027-03-31');
  assert.equal(rep.company.recurring[0].paidYear, 70);
  // Worker: 2 days × £200 owed, £1,500 paid (incl. CIS) → nothing owed by day rate
  const w = rep.workers.find(x => x.id === W);
  assert.equal(w.days, 2); assert.equal(w.cisDeductedYear, 200);
});
function r2(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }

await test('VAT cash accounting: an invoice counts when it is paid; standard accounting counts it when issued', () => {
  const base = { today: '2026-11-12', entries: [], expenses: [], jobCosts: [], recurring: [], workers: [], assignments: [], workDays: [], bank: { toDo: 0, lastClosing: null, lastDate: null, statements: 0 },
    jobs: [{ quoteId: 'q', reference: '2A-1', clientName: 'A', siteAddress: '', jobStatus: 'IN_PROGRESS', contractNet: 10000, contractGross: 12000, plannedCost: 0, vatPercent: 20, acceptedAt: '2026-10-01' }],
    invoices: [{ quoteId: 'q', number: '2A-1-INV01', label: 'Deposit', issuedOn: '2026-10-05', dueOn: '2026-10-12', net: 5000, vat: 1000, gross: 6000 }],
    payments: [{ id: 'p', quoteId: 'q', amount: 2400, paidOn: '2026-11-03', method: 'BANK_TRANSFER', status: 'CONFIRMED', reference: '', linked: false }] };
  const settings = { ...R.DEFAULT_SETTINGS, incorporationDate: '2024-04-01', vatRegistrationDate: '2025-04-01', vatFirstPeriodEnd: '2025-06-30' };
  assert.equal(R.DEFAULT_SETTINGS.vatScheme, 'CASH');
  const cash = buildReport({ ...base, settings }).vat.find(v => v.status === 'OPEN');
  assert.equal(cash.box1, 400);   // only the £2,400 actually received
  const std = buildReport({ ...base, settings: { ...settings, vatScheme: 'STANDARD' } }).vat.find(v => v.status === 'OPEN');
  assert.equal(std.box1, 1000);   // the whole invoice, paid or not
});

console.log(`\n${passed} finance tests passed`);
