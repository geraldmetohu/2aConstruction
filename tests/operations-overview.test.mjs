import test from 'node:test';
import assert from 'node:assert/strict';
import {typescriptLoader} from './helpers/load-typescript.mjs';
import {managementBase as base} from './fixtures/project-workspace.mjs';
const load=typescriptLoader(),{initialState,finances,progress}=load('app/lib/project-management/state.ts'),{summarizeProjects}=load('app/lib/project-management/overview.ts');
test('operations page rejects unauthorized access before reading project data',async()=>{
  let calls=0;const page=typescriptLoader({'@/app/lib/db':{prisma:new Proxy({},{get(){calls++;throw Error('Unexpected storage access');}})},'@/app/lib/catalogue/access':{requireCatalogueAdmin:async()=>{throw Error('Denied');}}})('app/dashboard/operations/page.tsx').default;
  await assert.rejects(()=>page({searchParams:Promise.resolve({})}),/Denied/);assert.equal(calls,0);
});
test('operations totals exclude paid and not-yet-overdue invoices and retain decimal precision',()=>{
  const state=initialState(base);state.push({id:'invoice',kind:'INVOICE',body:{status:'ISSUED',dueDate:'2026-09-28',lines:[{quantity:'1',unitNet:'100',vatRate:'20'}]}});
  const workspace={base,state,financials:finances(base,state),progress:progress(state),sequence:0,history:[]};
  assert.equal(summarizeProjects([workspace],'2026-09-28').overdueInvoices,0);const totals=summarizeProjects([workspace],'2026-09-29');assert.equal(totals.overdueInvoices,1);assert.equal(totals.outstanding,'120.00');
  state.push({id:'receipt',kind:'PAYMENT',body:{invoiceId:'invoice',amount:'120'}});workspace.financials=finances(base,state);assert.equal(summarizeProjects([workspace],'2026-09-29').overdueInvoices,0);assert.equal(summarizeProjects([workspace],'2026-09-29').received,'120.00');assert.equal(summarizeProjects([],'2026-09-29').contractGross,'0.00');
});
