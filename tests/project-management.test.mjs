import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import sharp from 'sharp';
import { typescriptLoader, root } from './helpers/load-typescript.mjs';
import { quoteCatalogue, quoteDoc, asOf } from './fixtures/quote.mjs';
import { ids, managementBase as base, workerBody } from './fixtures/project-workspace.mjs';
const load=typescriptLoader(),{parseEntry}=load('app/lib/project-management/schema.ts'),{initialState,validateChange,finances,progress,invoiceTotals,labourTotals}=load('app/lib/project-management/state.ts');
const entry=(kind,body,id=randomUUID())=>parseEntry(kind,id,body);
const change=(s,e)=>validateChange(base,s,e,'2026-09-28');
const invoice=(status='ISSUED')=>({title:'Installation invoice',stageId:ids.stage,status,issueDate:'2026-01-02',dueDate:'2026-01-30',lines:[{description:'First instalment',quantity:'1',unitNet:'100',vatRate:'20'}],reviewNote:'Reviewed scope and prices'});
test('task and weighted stage progress cannot fabricate completion or change the baseline',()=>{
  const before=JSON.stringify(base),s=initialState(base),task=s.find(e=>e.id===ids.task);
  const next=change(s,entry('TASK',{...task.body,status:'COMPLETED',progress:100,weight:3},task.id));assert.equal(progress(next).percent,75);assert.equal(progress(next).completed,1);assert.equal(JSON.stringify(base),before);
  assert.throws(()=>change(s,entry('TASK',{...task.body,status:'COMPLETED',progress:20},task.id)),/100/);
  assert.throws(()=>change(s,entry('TASK',{...task.body,roomId:randomUUID()},task.id)),/belonging/);
  assert.throws(()=>change(s,entry('TASK',task.body)),/approved variation/);
  assert.throws(()=>change(s,entry('PROJECT',{status:'COMPLETED'},base.id)),/Complete all tasks/);
});
test('scheduling rejects cycles, late predecessors, duplicate schedules and invalid task references',()=>{
  let s=initialState(base);const a=entry('SCHEDULE',{taskId:ids.task,start:'2026-02-01',end:'2026-02-02',predecessors:[]});s=change(s,a);
  const b=entry('SCHEDULE',{taskId:ids.task2,start:'2026-02-03',end:'2026-02-05',predecessors:[ids.task]});s=change(s,b);
  assert.throws(()=>change(s,entry('SCHEDULE',{...a.body,predecessors:[ids.task2]},a.id)),/predecessor|cycle/);
  assert.throws(()=>change(s,entry('SCHEDULE',{...b.body,start:'2026-02-01'},b.id)),/predecessor/);
  assert.throws(()=>change(s,entry('SCHEDULE',a.body)),/existing schedule/);
  assert.throws(()=>change(s,entry('TASK',{...s.find(e=>e.id===ids.task2).body,status:'COMPLETED',progress:100},ids.task2)),/predecessor/);
});
test('time logs reject overlapping shifts and retain captured rates; material receipts respect source ownership',()=>{
  let s=change(initialState(base),entry('WORKER',workerBody,ids.worker));const log=entry('LABOUR',{taskId:ids.task,workerId:ids.worker,date:'2026-01-02',start:'08:00',end:'16:00',breakMinutes:30,hourlyRate:'25'});s=change(s,log);
  assert.equal(labourTotals(log.body).hours,'7.500000');assert.equal(finances(base,s).labourCostNet,'187.50');
  assert.throws(()=>change(s,entry('LABOUR',{...log.body,start:'15:00',end:'17:00'})),/overlaps/);
  s=change(s,entry('WORKER',{...workerBody,hourlyRate:'99'},ids.worker));assert.equal(finances(base,s).labourCostNet,'187.50');
  const corrected=change(s,entry('LABOUR',{...log.body,status:'VOID'},log.id));assert.equal(finances(base,corrected).labourCostNet,'0.00');
  const material=entry('MATERIAL',{requirementId:ids.material,taskId:ids.task,description:'Doors',unit:'each',planned:'2',ordered:'2',received:'3',supplier:'Fixture'});assert.throws(()=>change(s,material),/Received/);
  const clientBase=structuredClone(base);clientBase.requirements[0].supplyBy='CLIENT';assert.throws(()=>validateChange(clientBase,s,entry('MATERIAL',{...material.body,received:'1'})),/Customer-supplied/);
});
test('approved variations adjust the contract once, preserve prices and require evidence',()=>{
  const s=initialState(base),draft=entry('VARIATION',{title:'Extra preparation',description:'Agreed additional scope',requestedBy:'Customer',status:'PROPOSED',net:'50',vatRate:'20',approvedBy:'',approvalDate:'',evidence:''});
  const proposed=change(s,draft);assert.equal(finances(base,proposed).contractGross,'336.00');
  assert.throws(()=>change(proposed,entry('VARIATION',{...draft.body,status:'APPROVED'},draft.id)),/evidence/);
  const approved=change(proposed,entry('VARIATION',{...draft.body,status:'APPROVED',approvedBy:'Customer',approvalDate:'2026-01-02',evidence:'Written approval reference'},draft.id));assert.equal(finances(base,approved).contractGross,'396.00');
  assert.throws(()=>change(approved,draft),/frozen/);assert.throws(()=>change(s,entry('VARIATION',{...draft.body,vatRate:'5'})),/VAT rate/);
});
test('invoice money, partial receipts and reversals reconcile without overbilling or rewriting issued invoices',()=>{
  let s=initialState(base);const inv=entry('INVOICE',invoice());s=change(s,inv);assert.deepEqual(invoiceTotals(inv.body),{net:'100.00',vat:'20.00',gross:'120.00'});
  const paid=entry('PAYMENT',{invoiceId:inv.id,amount:'40',date:'2026-01-03',method:'BANK',reference:'BANK-001'});s=change(s,paid);assert.equal(finances(base,s).outstanding,'80.00');assert.equal(finances(base,s).invoices[0].status,'PART_PAID');
  assert.throws(()=>change(s,entry('PAYMENT',{...paid.body,amount:'81',reference:'BANK-002'})),/outstanding/);
  assert.throws(()=>change(s,entry('INVOICE',{...inv.body,status:'VOID'},inv.id)),/Reverse/);
  assert.throws(()=>change(s,entry('INVOICE',{...inv.body,title:'Changed'},inv.id)),/frozen/);
  assert.throws(()=>change(s,entry('INVOICE',{...invoice(),lines:[{description:'Excess',quantity:'1',unitNet:'200',vatRate:'20'}]})),/exceed/);
  s=change(s,entry('PAYMENT_REVERSAL',{paymentId:paid.id,reason:'Incorrect receipt reference'}));assert.equal(finances(base,s).received,'0.00');assert.equal(finances(base,s).outstanding,'120.00');
  assert.throws(()=>change(s,entry('PAYMENT_REVERSAL',{paymentId:paid.id,reason:'Second correction attempt'})),/already/);
  s=change(s,entry('INVOICE',{...inv.body,status:'VOID',reviewNote:'Voided incorrect invoice'},inv.id));assert.equal(finances(base,s).invoiceGross,'0.00');
});
test('snag verification requires completion and evidence, and completed projects cannot gain open work',()=>{
  let s=initialState(base);const snag=entry('SNAG',{title:'Door catch',roomId:ids.room,priority:'MEDIUM',status:'OPEN',photoIds:[],resolution:''});s=change(s,snag);
  assert.throws(()=>change(s,entry('SNAG',{...snag.body,status:'VERIFIED',resolution:'Verified repaired catch'},snag.id)),/Complete the snag/);
  s=change(s,entry('SNAG',{...snag.body,status:'COMPLETED',resolution:'Adjusted and checked catch'},snag.id));s=change(s,entry('SNAG',{...snag.body,status:'VERIFIED',resolution:'Supervisor verified operation'},snag.id));
  for(const task of s.filter(e=>e.kind==='TASK'))s=change(s,entry('TASK',{...task.body,status:'COMPLETED',progress:100},task.id));s=change(s,entry('PROJECT',{status:'COMPLETED'},base.id));assert.throws(()=>change(s,entry('SNAG',snag.body)),/Reopen/);
});
test('file processing rejects disguised documents and optimizes photos without keeping originals',async()=>{
  const {prepareAsset}=load('app/lib/project-management/files.ts');const bytes=await sharp({create:{width:2400,height:100,channels:3,background:'#ff0000'}}).png().toBuffer();const file=await prepareAsset(randomUUID(),'PHOTO','example.png','image/png',bytes);assert.equal(file.mimeType,'image/webp');assert.equal((await sharp(file.content).metadata()).width,1920);assert.equal((await sharp(file.content).metadata()).exif,undefined);
  await assert.rejects(()=>prepareAsset(randomUUID(),'DOCUMENT','fake.pdf','application/pdf',Buffer.from('<html>bad</html>')),/not a PDF/);
  await assert.rejects(()=>prepareAsset(randomUUID(),'DOCUMENT','script.html','text/html',Buffer.from('test')),/PDF or plain text/);
});
test('actions and file routes authorize before accessing storage',async()=>{
  let calls=0;const stubs={'@/app/lib/db':{prisma:new Proxy({}, {get(){calls++;throw new Error('Unexpected DB access');}})},'@/app/lib/project-management/access':{requireManagementAdmin:async()=>{throw new Error('Denied');}},'next/cache':{revalidatePath(){}}};
  const l=typescriptLoader(stubs);assert.equal((await l('app/dashboard/delivery-projects/[id]/manage/actions.ts').recordProjectActivity({})).ok,false);assert.equal((await l('app/api/project-management/files/[id]/route.ts').GET(new Request('http://localhost'),{params:Promise.resolve({id:randomUUID()})})).status,404);assert.equal((await l('app/api/project-management/upload/route.ts').POST(new Request('http://localhost',{method:'POST'}))).status,400);assert.equal(calls,0);
});
test('real database history is atomic, stale-safe, idempotent and preserves every pre-existing record and definition', {timeout:120000}, async t=>{
  const db=new PGlite(),migrations=path.join(root,'prisma/migrations'),name='20260929120000_add_project_management';
  for(const dir of (await readdir(migrations,{withFileTypes:true})).filter(d=>d.isDirectory()&&d.name<name).sort((a,b)=>a.name.localeCompare(b.name)))await db.exec(await readFile(path.join(migrations,dir.name,'migration.sql'),'utf8'));
  await db.exec(await readFile(path.join(root,'tests/fixtures/legacy-records.sql'),'utf8'));
  const server=new PGLiteSocketServer({db,port:0,host:'127.0.0.1',maxConnections:1});await server.start();const connection=server.getServerConn(),url=connection.startsWith('postgres')?connection:`postgresql://postgres:postgres@${connection}/postgres`;const prisma=new PrismaClient({datasources:{db:{url:`${url}${url.includes('?')?'&':'?'}connection_limit=1&sslmode=disable`}}});t.after(async()=>{await prisma.$disconnect();await server.stop();await db.close();});
  const quote=load('app/lib/quotes/calculate.ts').calculateQuote(quoteDoc,quoteCatalogue,asOf);
  const client=await prisma.deliveryClient.create({data:{ownerId:'fixture-owner',normalizedEmail:'fixture@example.invalid',name:'Fixture',contactSnapshot:{}}});const acceptance=await prisma.acceptedQuote.create({data:{quoteId:randomUUID(),revisionId:randomUUID(),snapshotHash:quote.snapshotHash,acceptedBy:'Fixture',acceptedAt:new Date('2026-01-01'),evidence:'Synthetic approval',approvedOptionalKeys:[],recordedBy:'admin'}});
  await prisma.deliveryProject.create({data:{id:base.id,acceptanceId:acceptance.id,clientId:client.id,name:base.name,scope:base.scope,quoteSnapshot:JSON.parse(JSON.stringify(quote)),planHash:'fixture',createdBy:'admin',baseline:{create:{snapshot:base.baseline}},stages:{create:base.stages.map(s=>({...s,position:0}))},rooms:{create:base.rooms.map(r=>({...r,position:0}))},tasks:{create:base.tasks.map((t,i)=>({...t,quoteLineKey:`line-${i}`,section:'Scope',position:i,snapshot:{}}))}}});
  await prisma.deliveryRequirement.create({data:{...base.requirements[0],snapshot:{}}});
  const names=(await db.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`)).rows.map(r=>r.tablename);
  async function snapshot(){const records={};for(const n of names)records[n]=(await db.query(`SELECT to_jsonb(t) AS row FROM "${n}" t ORDER BY id`)).rows;return {records,columns:(await db.query(`SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default,ordinal_position FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[]) ORDER BY table_name,ordinal_position`,[names])).rows,constraints:(await db.query(`SELECT c.relname,x.conname,pg_get_constraintdef(x.oid) AS definition FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid WHERE c.relname=ANY($1::text[]) ORDER BY c.relname,x.conname`,[names])).rows,indexes:(await db.query(`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename=ANY($1::text[]) ORDER BY tablename,indexname`,[names])).rows};}
  const before=await snapshot(),migration=await readFile(path.join(migrations,name,'migration.sql'),'utf8');for(const n of names)assert.ok(!migration.includes(`"${n}"`));await db.exec(migration);assert.deepEqual(await snapshot(),before);
  const {managementService,loadProject}=load('app/lib/project-management/service.ts'),service=managementService(prisma);let sequence=0;
  const command=(e)=>({projectId:base.id,entityId:e.id,requestId:randomUUID(),expectedSequence:sequence,kind:e.kind,body:e.body,reason:'Synthetic verified change'});
  const first=command(entry('PROJECT',{status:'ACTIVE'},base.id));assert.deepEqual(await Promise.all([service.record(first,'admin'),service.record(first,'admin')]),[1,1]);sequence=1;
  await assert.rejects(()=>service.record({...first,reason:'Changed request'},'admin'),/different changes/);
  await assert.rejects(()=>service.record({...command(entry('WORKER',workerBody,ids.worker)),expectedSequence:0},'admin'),/Another change/);
  for(const e of [entry('WORKER',workerBody,ids.worker),entry('LABOUR',{taskId:ids.task,workerId:ids.worker,date:'2026-01-02',start:'08:00',end:'12:00',breakMinutes:0,hourlyRate:'25'}),entry('COST',{category:'MATERIAL',supplier:'Fixture supplier',reference:'SUP-001',date:'2026-01-02',net:'50',vatRate:'20',status:'RECORDED'})]) sequence=await service.record(command(e),'admin');
  const inv=entry('INVOICE',invoice());sequence=await service.record(command(inv),'admin');const payment=entry('PAYMENT',{invoiceId:inv.id,amount:'60',date:'2026-01-03',method:'BANK',reference:'BANK-001'});sequence=await service.record(command(payment),'admin');
  await assert.rejects(()=>service.record(command(entry('PAYMENT',{...payment.body,reference:'BANK-002',amount:'61'})),'admin'),/outstanding/);
  sequence=await service.record(command(entry('PAYMENT_REVERSAL',{paymentId:payment.id,reason:'Receipt assigned incorrectly'})),'admin');
  const assetId=randomUUID(),{prepareAsset}=load('app/lib/project-management/files.ts'),upload=await prepareAsset(assetId,'DOCUMENT','notes.txt','text/plain',Buffer.from('Synthetic project notes'));
  const photo=entry('DOCUMENT',{assetId,title:'Site notes',category:'GENERAL'},assetId),attachment=command(photo);sequence=await service.record(attachment,'admin',upload);assert.equal(await service.record(attachment,'admin',upload),sequence);assert.equal(await prisma.projectAsset.count(),1);
  const view=await loadProject(prisma,base.id);assert.equal(view.sequence,sequence);assert.equal(view.financials.actualCostNet,'150.00');assert.equal(view.financials.received,'0.00');assert.equal(view.financials.outstanding,'120.00');
  // An event-write failure after asset insertion must roll back the new asset too.
  await db.exec(`CREATE FUNCTION fail_project_activity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic history failure'; END; $$; CREATE TRIGGER fail_activity BEFORE INSERT ON "ProjectActivity" FOR EACH ROW EXECUTE FUNCTION fail_project_activity();`);
  const badId=randomUUID(),bad=await prepareAsset(badId,'DOCUMENT','rollback.txt','text/plain',Buffer.from('Rollback test'));await assert.rejects(()=>service.record(command(entry('DOCUMENT',{assetId:badId,title:'Rollback document',category:'GENERAL'},badId)),'admin',bad),/Synthetic history failure/);assert.equal(await prisma.projectAsset.count(),1);assert.equal(await prisma.projectActivity.count(),sequence);
  assert.deepEqual(await snapshot(),before);
  for(const table of ['ProjectActivity','ProjectAsset']){await assert.rejects(()=>db.exec(`UPDATE "${table}" SET id=id`),e=>e.code==='23514');await assert.rejects(()=>db.exec(`DELETE FROM "${table}"`),e=>e.code==='23514');await assert.rejects(()=>db.exec(`TRUNCATE "${table}" CASCADE`),e=>e.code==='23514');}
});
