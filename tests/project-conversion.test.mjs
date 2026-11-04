import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { typescriptLoader, root } from './helpers/load-typescript.mjs';
import { quoteCatalogue, quoteDoc, asOf } from './fixtures/quote.mjs';
const load = typescriptLoader();
const { calculateQuote } = load('app/lib/quotes/calculate.ts');
const { projectPlan, conversionSchema } = load('app/lib/delivery/plan.ts');
function fixture() {
  const doc = structuredClone(quoteDoc);
  doc.lines.push({ ...structuredClone(doc.lines[0]), description:'Optional doors', input:{...structuredClone(doc.lines[0].input),key:'option',inclusion:'OPTIONAL',selected:true},room:'Kitchen',stage:'Finishing' });
  doc.lines.push({ ...structuredClone(doc.lines[0]), input:{...structuredClone(doc.lines[0].input),key:'excluded',inclusion:'EXCLUDED'} });
  return calculateQuote(doc,quoteCatalogue,asOf);
}
test('conversion selects only explicitly approved optional work and copies frozen prices', () => {
  const r=fixture(), before=JSON.stringify(r), p=projectPlan(r,r.snapshotHash,[]);
  assert.equal(p.tasks.length,1);assert.equal(p.baseline.gross,'336.00');assert.equal(p.baseline.costSubtotal,'280.00');
  assert.deepEqual([...p.scope.omittedLineKeys].sort(),['excluded','option']);assert.equal(p.tasks[0].requirements.filter(r=>r.kind==='LABOUR')[0].quantity,null);
  const selected=projectPlan(r,r.snapshotHash,['option']);assert.equal(selected.tasks.length,2);assert.equal(selected.baseline.gross,'672.00');assert.equal(JSON.stringify(r),before);
  assert.throws(()=>projectPlan(r,r.snapshotHash,['excluded']),/optional/);assert.throws(()=>projectPlan(r,r.snapshotHash,['option','option']),/optional/);
  const corrupt=JSON.parse(JSON.stringify(r));corrupt.customer.totals.gross='1.00';assert.throws(()=>projectPlan(corrupt,r.snapshotHash,[]),/verification/);
});
test('supporting material quantities and labour person-hours come from the accepted recipe', () => {
  const c=structuredClone(quoteCatalogue), doc=structuredClone(quoteDoc);
  c.items.push({...structuredClone(c.items[0]),id:'hinge',code:'HINGE',name:'Hinge',itemType:'MATERIAL'});
  c.prices.push({...structuredClone(c.prices[0]),id:'hinge-price',itemId:'hinge',materialUnitCost:'3',labourUnitCost:'0'});
  doc.lines[0].input.supplyBy='CLIENT';doc.lines[0].overrides={price:{labourUnitCost:null},supporting:[{itemId:'hinge',ruleSchemaVersion:1,quantityRule:{kind:'per_unit',value:'3'},mandatory:true,defaultSelected:true,costBucket:'SUPPORTING_MATERIAL'}],labour:[{roleId:'carpenter',hoursPerUnit:'2',teamSize:2,rateBasis:'HOURLY'}]};doc.lines[0].overrideReason='Customer doors with contractor hinges';
  const r=calculateQuote(doc,c,asOf),p=projectPlan(r,r.snapshotHash,[]),requirements=p.tasks[0].requirements;
  assert.equal(requirements.find(r=>r.description==='Hinge').quantity,'6');assert.equal(requirements.find(r=>r.description==='Internal door').supplyBy,'CLIENT');assert.equal(requirements.find(r=>r.description==='Carpenter').quantity,'4.000000');assert.equal(p.baseline.personHours,'4.000000');assert.equal(p.baseline.gross,r.customer.totals.gross);
});
test('option-only costs create planning requirements without fabricated effort', () => {
  const c=structuredClone(quoteCatalogue),doc=structuredClone(quoteDoc);c.prices[0].materialUnitCost='0';c.prices[0].labourUnitCost='0';c.options.push({id:'upgrade',itemId:'door',groupCode:'spec',label:'Upgrade',active:true,archived:false});c.optionVersions.push({id:'upgrade-v1',optionId:'upgrade',effectiveFrom:asOf,ruleSchemaVersion:1,rule:{kind:'surcharge',materialDelta:'10',labourDelta:'5'},specification:{}});doc.lines[0].input.optionIds=['upgrade'];const r=calculateQuote(doc,c,asOf),p=projectPlan(r,r.snapshotHash,[]);assert.equal(p.tasks[0].requirements.length,2);assert.equal(p.tasks[0].requirements.find(r=>r.kind==='LABOUR').quantity,null);assert.equal(p.baseline.gross,'36.00');
});
test('unpriced scope and absent acceptance confirmation cannot be converted', () => {
  const doc=structuredClone(quoteDoc);doc.lines.push({input:{type:'UNPRICED',key:'survey',description:'Survey',reason:'Unknown'},description:'Survey',section:'Survey',room:'',stage:'',overrides:{},overrideReason:''});
  const r=calculateQuote(doc,quoteCatalogue,asOf);assert.throws(()=>projectPlan(r,r.snapshotHash,[]),/unpriced/);
  assert.equal(conversionSchema.safeParse({quoteId:randomUUID(),revisionId:randomUUID(),projectName:'Test project',acceptedAt:new Date().toISOString(),acceptedBy:'Customer',evidence:'Written approval reference',approvedOptionalKeys:[]}).success,false);
});
test('conversion action checks admin access before touching storage', async () => {
  let calls=0;const actions=typescriptLoader({'@/app/lib/db':{prisma:new Proxy({}, {get(){calls++;throw new Error('Unexpected query');}})},'@/app/lib/delivery/access':{requireDeliveryAdmin:async()=>{throw new Error('Denied');}},'next/cache':{revalidatePath(){}}})('app/dashboard/delivery-projects/actions.ts');
  assert.equal((await actions.convertAcceptedQuote({})).ok,false);assert.equal(calls,0);
});
test('real PostgreSQL conversion is atomic, idempotent, links clients, and preserves all existing records and definitions', {timeout:120000}, async t => {
  const db=new PGlite(), migrations=path.join(root,'prisma/migrations'),name='20260928150000_add_project_conversion';
  for(const dir of (await readdir(migrations,{withFileTypes:true})).filter(d=>d.isDirectory()&&d.name<name).sort((a,b)=>a.name.localeCompare(b.name))) await db.exec(await readFile(path.join(migrations,dir.name,'migration.sql'),'utf8'));
  await db.exec(await readFile(path.join(root,'tests/fixtures/legacy-records.sql'),'utf8'));
  const server=new PGLiteSocketServer({db,port:0,host:'127.0.0.1',maxConnections:1});await server.start();const connection=server.getServerConn();const url=connection.startsWith('postgres')?connection:`postgresql://postgres:postgres@${connection}/postgres`;
  const prisma=new PrismaClient({datasources:{db:{url:`${url}${url.includes('?')?'&':'?'}connection_limit=1&sslmode=disable`}}});t.after(async()=>{await prisma.$disconnect();await server.stop();await db.close();});
  async function seed(owner,email,{released=true,expired=false}={}) {
    const r=fixture();const doc=structuredClone(r.document);doc.customerEmail=email;if(expired)doc.validUntil='2020-01-01';const result=calculateQuote(doc,quoteCatalogue,asOf);
    const quote=await prisma.draftQuote.create({data:{sourceSubmissionId:randomUUID(),ownerId:owner,catalogueSnapshot:quoteCatalogue,pricingAsOf:asOf,createdBy:'admin'}});
    const revision=await prisma.quoteRevision.create({data:{quoteId:quote.id,version:1,document:result.document,result:JSON.parse(JSON.stringify(result)),customerResult:result.customer,snapshotHash:result.snapshotHash,reason:'Fixture',createdBy:'admin'}});
    if(released)await prisma.quoteRelease.create({data:{revisionId:revision.id,reviewedBy:'admin',reviewNote:'Reviewed fixture',createdAt:new Date('2020-01-01T00:00:00Z')}});
    return {quoteId:quote.id,revisionId:revision.id,projectName:'Accepted refurbishment',acceptedAt:'2026-01-02T12:00:00Z',acceptedBy:'Fixture customer',evidence:'Customer email: approved exact revision and chosen options',confirmed:true,approvedOptionalKeys:[]};
  }
  const first=await seed('legacy-user','LEGACY@example.invalid'),second=await seed('legacy-user','legacy@example.invalid'),fresh=await seed('new-owner','new@example.invalid'),freshTwo=await seed('new-owner','new@example.invalid'),unreleased=await seed('unreleased','draft@example.invalid',{released:false}),expired=await seed('expired','expired@example.invalid',{expired:true}),rollback=await seed('rollback','rollback@example.invalid'),collision=await seed('other-owner','new@example.invalid');
  const names=(await db.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`)).rows.map(r=>r.tablename);
  async function snapshot(){const records={};for(const n of names)records[n]=(await db.query(`SELECT to_jsonb(t) AS row FROM "${n}" t ORDER BY id`)).rows;return {records,columns:(await db.query(`SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default,ordinal_position FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[]) ORDER BY table_name,ordinal_position`,[names])).rows,constraints:(await db.query(`SELECT c.relname,x.conname,pg_get_constraintdef(x.oid) AS definition FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid WHERE c.relname=ANY($1::text[]) ORDER BY c.relname,x.conname`,[names])).rows,indexes:(await db.query(`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename=ANY($1::text[]) ORDER BY tablename,indexname`,[names])).rows};}
  const before=await snapshot(),migration=await readFile(path.join(migrations,name,'migration.sql'),'utf8');for(const n of names)assert.ok(!migration.includes(`"${n}"`));await db.exec(migration);assert.deepEqual(await snapshot(),before);
  const service=load('app/lib/delivery/service.ts').deliveryService(prisma);
  await assert.rejects(()=>service.convert(unreleased,'admin'),/Release/);await assert.rejects(()=>service.convert(expired,'admin'),/validity/);await assert.rejects(()=>service.convert({...first,revisionId:randomUUID()},'admin'),/changed/);await assert.rejects(()=>service.convert({...first,acceptedAt:'2099-01-01T00:00:00Z'},'admin'),/future/);await assert.rejects(()=>service.convert({...first,acceptedAt:'2019-01-01T00:00:00Z'},'admin'),/after release/);
  const ids=await Promise.all([service.convert(first,'admin'),service.convert(first,'admin')]);assert.equal(ids[0],ids[1]);
  const project=await prisma.deliveryProject.findUniqueOrThrow({where:{id:ids[0]},include:{client:true,tasks:{include:{requirements:true}},baseline:true,stages:true,rooms:true}});
  assert.equal(project.client.legacyClientId,'00000000-0000-4000-8000-000000000001');assert.equal(project.tasks.length,1);assert.equal(project.baseline.snapshot.gross,'336.00');assert.equal(project.stages.length,1);assert.equal(project.rooms.length,1);assert.equal(project.tasks[0].requirements.length,2);
  await assert.rejects(()=>service.convert({...first,revisionId:randomUUID()},'admin'),/another revision/);
  await assert.rejects(()=>service.convert({...first,approvedOptionalKeys:['option']},'admin'),/different optional/);
  const secondId=await service.convert({...second,approvedOptionalKeys:['option']},'admin');assert.equal((await prisma.deliveryProject.findUniqueOrThrow({where:{id:secondId}})).clientId,project.clientId);assert.equal((await prisma.deliveryBaseline.findUniqueOrThrow({where:{projectId:secondId}})).snapshot.gross,'672.00');
  const newIds=await Promise.all([service.convert(fresh,'admin'),service.convert(freshTwo,'admin')]);assert.equal(new Set((await prisma.deliveryProject.findMany({where:{id:{in:newIds}}})).map(p=>p.clientId)).size,1);assert.equal(await prisma.deliveryClient.count(),2);
  await assert.rejects(()=>service.convert(collision,'admin'),/another account/);
  // Fail at the final write: none of this quote's identity, acceptance, project or children may survive.
  await db.exec(`CREATE FUNCTION fail_delivery_baseline() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic final-write failure'; END; $$; CREATE TRIGGER fail_baseline BEFORE INSERT ON "DeliveryBaseline" FOR EACH ROW EXECUTE FUNCTION fail_delivery_baseline();`);
  await assert.rejects(()=>service.convert(rollback,'admin'),/Synthetic final-write failure/);assert.equal(await prisma.acceptedQuote.count({where:{quoteId:rollback.quoteId}}),0);assert.equal(await prisma.deliveryClient.count({where:{ownerId:'rollback'}}),0);assert.equal(await prisma.deliveryProject.count(),4);
  assert.deepEqual(await snapshot(),before);
  for(const table of ['AcceptedQuote','DeliveryClient','DeliveryProject','DeliveryStage','DeliveryRoom','DeliveryTask','DeliveryRequirement','DeliveryBaseline']){await assert.rejects(()=>db.exec(`UPDATE "${table}" SET id=id`),e=>e.code==='23514');await assert.rejects(()=>db.exec(`DELETE FROM "${table}"`),e=>e.code==='23514');await assert.rejects(()=>db.exec(`TRUNCATE "${table}" CASCADE`),e=>e.code==='23514');}
});
