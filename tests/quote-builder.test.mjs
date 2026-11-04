import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { typescriptLoader, root } from './helpers/load-typescript.mjs';
import { quoteCatalogue, quoteDoc, quoteInput, asOf } from './fixtures/quote.mjs';
const load = typescriptLoader();
const { calculateQuote } = load('app/lib/quotes/calculate.ts');
const { quoteDocumentSchema } = load('app/lib/quotes/schema.ts');
const { calculateEstimate } = load('app/lib/pricing/engine.ts');
test('quote-only overrides are per-line and leave catalogue and source input untouched', () => {
  const before = JSON.stringify(quoteCatalogue); const doc = structuredClone(quoteDoc);
  doc.lines.push({...structuredClone(doc.lines[0]),input:{...structuredClone(doc.lines[0].input),key:'b'}});
  doc.lines[0].overrides = {price:{labourUnitCost:'60'}}; doc.lines[0].overrideReason='Two-person fitting requirement';
  const r = calculateQuote(doc, quoteCatalogue, asOf);
  assert.equal(r.internalLines[0].result.totals.costs.labour,'120.00'); assert.equal(r.internalLines[1].result.totals.costs.labour,'80.00');
  assert.equal(r.customer.totals.gross,'720.00'); assert.equal(JSON.stringify(quoteCatalogue),before);
  assert.equal(calculateQuote(JSON.parse(JSON.stringify(r.document)),r.catalogueSnapshot,asOf).snapshotHash,r.snapshotHash);
  for(const internal of ['unitCosts','materialUnitCost','markupPercent','catalogueSnapshot']) assert.ok(!JSON.stringify(r.customer).includes(internal));
});
test('labour recipe overrides derive effort without changing catalogue prices', () => {
  const doc=structuredClone(quoteDoc); doc.lines[0].overrides={price:{labourUnitCost:null},labour:[{roleId:'carpenter',hoursPerUnit:'2',teamSize:2,rateBasis:'HOURLY'}]}; doc.lines[0].overrideReason='Revised installation method';
  const r=calculateQuote(doc,quoteCatalogue,asOf); assert.equal(r.internalLines[0].result.totals.costs.labour,'100.00'); assert.equal(r.internalLines[0].result.totals.personHours,'4.000000');
});
test('sections, rooms and stages sort deterministically, with optional and excluded totals separate', () => {
  const doc=structuredClone(quoteDoc); doc.sectionOrder=['Extra','Second fix'];
  doc.lines.push({...structuredClone(doc.lines[0]),section:'Extra',input:{...structuredClone(doc.lines[0].input),key:'b',inclusion:'OPTIONAL'}});
  doc.lines.push({...structuredClone(doc.lines[0]),input:{...structuredClone(doc.lines[0].input),key:'c',inclusion:'EXCLUDED'}});
  const r=calculateQuote(doc,quoteCatalogue,asOf); assert.equal(r.customer.lines[0].key,'b'); assert.equal(r.customer.totals.gross,'336.00'); assert.equal(r.customer.optionalTotals.gross,'336.00');
});
test('override reasons, invalid dates and duplicate keys are validated', () => {
  let doc=structuredClone(quoteDoc); doc.lines[0].overrides={price:{materialUnitCost:'1'}}; assert.equal(quoteDocumentSchema.safeParse(doc).success,false);
  doc=structuredClone(quoteDoc); doc.validUntil='2026-02-31'; assert.equal(quoteDocumentSchema.safeParse(doc).success,false);
  doc.validUntil='2026-99-99'; assert.equal(quoteDocumentSchema.safeParse(doc).success,false);
  doc=structuredClone(quoteDoc); doc.lines.push(doc.lines[0]); assert.equal(quoteDocumentSchema.safeParse(doc).success,false);
});
test('customer web view renders only selling prices and the quoted scope', () => {
  const view=typescriptLoader({'next/link':({children,...props})=>React.createElement('a',props,children),'@/app/lib/quotes/access':{}})('app/(storefront)/quotes/CustomerQuoteView.tsx').CustomerQuoteView;
  const html=renderToStaticMarkup(React.createElement(view,{quote:calculateQuote(quoteDoc,quoteCatalogue,asOf).customer,reference:'SYNTHETIC',version:1,draft:true}));
  assert.match(html,/£336.00/); assert.match(html,/Supply and fit internal doors/); assert.match(html,/Draft/); assert.doesNotMatch(html,/Synthetic fixture|materialUnitCost/);
});
test('all quote actions reject access before database use', async () => {
  let calls=0;
  const actions=typescriptLoader({'@/app/lib/db':{prisma:new Proxy({}, {get(){calls++;throw new Error('Unexpected DB');}})},'@/app/lib/quotes/access':{requireQuoteAdmin:async()=>{throw new Error('Denied');},quotePolicy:()=>({})},'next/cache':{revalidatePath(){}}})('app/dashboard/quotes/actions.ts');
  for(const action of Object.values(actions)) assert.equal((await action()).ok,false); assert.equal(calls,0);
});
test('customer reads require owner and released revision in the query predicate', async () => {
  let user=null, args=null; const previousReady=process.env.QUOTE_STORAGE_READY; process.env.QUOTE_STORAGE_READY='true';
  try {
    const access=typescriptLoader({'@kinde-oss/kinde-auth-nextjs/server':{getKindeServerSession:()=>({getUser:async()=>user})},'@/app/lib/db':{prisma:{quoteRevision:{findFirst:async input=>{args=input;return null;}}}}})('app/lib/quotes/access.ts');
    const id=randomUUID(); assert.equal(await access.viewQuote(id,1),null); assert.equal(args,null);
    user={id:'owner',email:'client@example.invalid'}; await access.viewQuote(id,1); assert.deepEqual(args.where.quote,{ownerId:'owner'}); assert.deepEqual(args.where.release,{isNot:null}); assert.ok(!('result' in args.select));
  } finally {if(previousReady===undefined)delete process.env.QUOTE_STORAGE_READY;else process.env.QUOTE_STORAGE_READY=previousReady;}
});
test('quote migration and real Prisma revisions preserve every existing table and record', {timeout:120000}, async t=>{
  const db=new PGlite(); const migrations=path.join(root,'prisma/migrations'), name='20260928120000_add_quote_builder';
  for(const dir of (await readdir(migrations,{withFileTypes:true})).filter(d=>d.isDirectory()&&d.name<name).sort((a,b)=>a.name.localeCompare(b.name))) await db.exec(await readFile(path.join(migrations,dir.name,'migration.sql'),'utf8'));
  await db.exec(await readFile(path.join(root,'tests/fixtures/legacy-records.sql'),'utf8'));
  const server=new PGLiteSocketServer({db,port:0,host:'127.0.0.1',maxConnections:1});await server.start(); const connection=server.getServerConn(); const url=connection.startsWith('postgres')?connection:`postgresql://postgres:postgres@${connection}/postgres`;
  const prisma=new PrismaClient({datasources:{db:{url:`${url}${url.includes('?')?'&':'?'}connection_limit=1&sslmode=disable`}}});
  t.after(async()=>{await prisma.$disconnect();await server.stop();await db.close();});
  const estimate=calculateEstimate(quoteInput,quoteCatalogue);
  const request=await prisma.premiumRequest.create({data:{ownerId:'owner',requestKey:randomUUID(),requirementsHash:'fixture',requirements:{project:'refurbishment',postcode:'SW1A 1AA',rooms:[{key:randomUUID(),name:'Bedroom',length:'',width:'',height:'',openings:'',works:[{code:'doors',specification:'standard',supply:'contractor',condition:'new',inclusion:'included',quantity:'2'}]}],contact:{name:'Preview Customer',email:'preview@example.invalid',phone:''},specialRequests:'',consent:true},pricingInput:quoteInput,catalogueSnapshot:quoteCatalogue,feeSnapshot:{},mappingVersion:'fixture',engineVersion:estimate.engineVersion,expiresAt:new Date(Date.now()+3600000)}});
  const checkout=await prisma.premiumCheckout.create({data:{requestId:request.id,sessionId:'cs_fixture',url:'https://example.invalid'}});
  const payment=await prisma.premiumPayment.create({data:{checkoutId:checkout.id,eventId:'evt_fixture',paymentIntentId:'pi_fixture',amountPence:5000,currency:'gbp',paidAt:new Date()}});
  const source=await prisma.premiumSubmission.create({data:{paymentId:payment.id,result:JSON.parse(JSON.stringify(estimate)),customerResult:{},snapshotHash:estimate.snapshotHash,requiresReview:true,reviewReasons:[]}});
  const names=(await db.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`)).rows.map(r=>r.tablename);
  async function snapshot(){const records={};for(const n of names)records[n]=(await db.query(`SELECT to_jsonb(t) AS row FROM "${n}" t ORDER BY id`)).rows;return {records,columns:(await db.query(`SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default,ordinal_position FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[]) ORDER BY table_name,ordinal_position`,[names])).rows,constraints:(await db.query(`SELECT c.relname,x.conname,pg_get_constraintdef(x.oid) AS definition FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid WHERE c.relname=ANY($1::text[]) ORDER BY c.relname,x.conname`,[names])).rows,indexes:(await db.query(`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename=ANY($1::text[]) ORDER BY tablename,indexname`,[names])).rows};}
  const before=await snapshot(); const migration=await readFile(path.join(migrations,name,'migration.sql'),'utf8');for(const n of names)assert.ok(!migration.includes(`"${n}"`));await db.exec(migration);assert.deepEqual(await snapshot(),before);
  const service=load('app/lib/quotes/service.ts').quoteService(prisma);const id=await service.convert(source.id,'admin');assert.equal(await service.convert(source.id,'admin'),id);
  const first=await prisma.quoteRevision.findFirstOrThrow({where:{quoteId:id}});const original=JSON.stringify(first);
  const doc=quoteDocumentSchema.parse(first.document);doc.validUntil='2099-12-31';doc.lines[0].input.discountPercent='10';
  await assert.rejects(()=>service.save(id,1,doc,'Restricted discount','admin',{discount:false,markup:false,tax:false}),/Discount/);
  doc.lines[0].input.discountPercent='0';doc.lines[0].input.markupPercent='10';
  await assert.rejects(()=>service.save(id,1,doc,'Restricted markup','admin',{discount:false,markup:false,tax:false}),/Markup/);
  delete doc.lines[0].input.markupPercent;doc.lines[0].input.taxCodeId='zero';
  await assert.rejects(()=>service.save(id,1,doc,'Restricted VAT','admin',{discount:false,markup:false,tax:false}),/VAT/);
  delete doc.lines[0].input.taxCodeId;doc.lines[0].overrides={price:{labourUnitCost:'60'}};doc.lines[0].overrideReason='Extra preparation labour';
  const next=await service.save(id,1,doc,'Updated labour scope','admin',{discount:false,markup:false,tax:false});assert.equal(next,2);
  assert.equal(JSON.stringify(await prisma.quoteRevision.findUniqueOrThrow({where:{id:first.id}})),original);
  await assert.rejects(()=>service.save(id,1,doc,'Stale overwrite','admin',{discount:true,markup:true,tax:true}),/Another revision/);
  doc.lines.push({input:{type:'UNPRICED',key:'unknown',description:'Hidden work',reason:'Survey'},description:'Hidden work',section:'Scope',room:'',stage:'',overrides:{},overrideReason:''});
  await service.save(id,2,doc,'Add survey requirement','admin',{discount:true,markup:true,tax:true});await assert.rejects(()=>service.release(id,3,'admin','Reviewed scope and prices'),/unpriced/);
  doc.lines.pop();doc.exclusions.push('Hidden work excluded pending survey.');await service.save(id,3,doc,'Exclude unresolved scope','admin',{discount:true,markup:true,tax:true});
  await assert.rejects(()=>service.release(id,2,'admin','Reviewed scope and prices'),/latest/);
  const release=await service.release(id,4,'admin','Reviewed scope, VAT and assumptions');assert.equal(await service.release(id,4,'admin','Reviewed scope, VAT and assumptions'),release);
  assert.deepEqual(await snapshot(),before);
  for(const table of ['DraftQuote','QuoteRevision','QuoteRelease']) {await assert.rejects(()=>db.exec(`UPDATE "${table}" SET id=id`),e=>e.code==='23514');await assert.rejects(()=>db.exec(`DELETE FROM "${table}"`),e=>e.code==='23514');await assert.rejects(()=>db.exec(`TRUNCATE "${table}" CASCADE`),e=>e.code==='23514');}
});
