import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {PrismaClient} from '@prisma/client';
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {typescriptLoader,root} from './helpers/load-typescript.mjs';
const load=typescriptLoader(),{suggestedSettings,settingsSchema}=load('app/lib/company-settings/schema.ts');
const command=(tax,extra={})=>({...suggestedSettings,estimatorFeeTaxCodeId:tax,requestId:randomUUID(),expectedVersion:0,reason:'Reviewed defaults',...extra});
test('settings validation rejects invalid percentages, calendars and unsupported billing changes',()=>{
  const valid=command(randomUUID());assert.ok(settingsSchema.safeParse(valid).success);
  for(const patch of [{workdayHours:'0'},{defaultWastePercent:'101'},{workingDays:[1,1]},{workingDays:[]},{currency:'USD'},{estimatorFeeAmount:'49.00'},{autoSendInvoices:true},{invoiceTermsDays:-1}])assert.equal(settingsSchema.safeParse({...valid,...patch}).success,false);
});
test('settings action checks authorization before accessing storage',async()=>{
  let calls=0;const action=typescriptLoader({'@/app/lib/db':{prisma:new Proxy({},{get(){calls++;throw Error('Storage accessed');}})},'@/app/lib/company-settings/access':{requireSettingsAdmin:async()=>{throw Error('Unauthorized');}},'next/cache':{revalidatePath(){}}})('app/dashboard/settings/actions.ts');assert.equal((await action.saveCompanySettings({})).ok,false);assert.equal(calls,0);
});
test('version saves are append-only, audited, retry-safe and isolated from existing data', {timeout:120000},async t=>{
  const db=new PGlite(),dir=path.join(root,'prisma/migrations');for(const d of (await readdir(dir,{withFileTypes:true})).filter(x=>x.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await db.exec(await readFile(path.join(dir,d.name,'migration.sql'),'utf8'));await db.exec(await readFile(path.join(root,'tests/fixtures/legacy-records.sql'),'utf8'));
  const server=new PGLiteSocketServer({db,port:0,host:'127.0.0.1',maxConnections:1});await server.start();const conn=server.getServerConn(),url=conn.startsWith('postgres')?conn:`postgresql://postgres:postgres@${conn}/postgres`;const prisma=new PrismaClient({datasources:{db:{url:`${url}${url.includes('?')?'&':'?'}connection_limit=1&sslmode=disable`}}});t.after(async()=>{await prisma.$disconnect();await server.stop();await db.close();});
  const tax=await prisma.taxCode.create({data:{code:'SYNTHETIC',label:'Synthetic tax',rates:{create:{rate:'20',effectiveFrom:new Date('2026-01-01'),reason:'Synthetic only'}}}});
  const names=(await db.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`)).rows.map(r=>r.tablename).filter(n=>!['CompanySettings','CompanySettingsVersion','AuditEvent'].includes(n));
  const snapshot=async()=>{const rows={};for(const name of names)rows[name]=(await db.query(`SELECT to_jsonb(t) AS row FROM "${name}" t ORDER BY id`)).rows;return rows;};const before=await snapshot();
  const service=load('app/lib/company-settings/service.ts').companySettingsService(prisma),first=command(tax.id),now=new Date('2026-09-28T10:00:00Z');
  assert.deepEqual(await Promise.all([service.save(first,'admin',now),service.save(first,'admin',now)]),[1,1]);const original=await prisma.companySettingsVersion.findUnique({where:{id:first.requestId}});
  await assert.rejects(()=>service.save({...first,reason:'Different body'},'admin',now),/already been used/);await assert.rejects(()=>service.save(first,'another-admin',now),/already been used/);
  await assert.rejects(()=>service.save(command(tax.id),'admin',now),/changed/);
  await assert.rejects(()=>service.save(command(randomUUID(),{expectedVersion:1}),'admin',new Date('2026-09-28T11:00:00Z')),/active fee VAT/);
  assert.equal(await service.save(command(tax.id,{expectedVersion:1,defaultMarkupPercent:'25'}),'admin',new Date('2026-09-28T11:00:00Z')),2);
  assert.deepEqual(await prisma.companySettingsVersion.findUnique({where:{id:first.requestId}}),original);assert.equal(await prisma.auditEvent.count({where:{action:'COMPANY_SETTINGS_VERSION'}}),2);assert.deepEqual(await snapshot(),before);
  const {loadPricingCatalogue}=load('app/lib/pricing/catalogue.ts');const old=await prisma.$transaction(tx=>loadPricingCatalogue(tx,new Date('2026-09-28T10:30:00Z'))),current=await prisma.$transaction(tx=>loadPricingCatalogue(tx,new Date('2026-09-28T12:00:00Z')));assert.equal(old.catalogue.settings.markupPercent,'0');assert.equal(current.catalogue.settings.markupPercent,'25');assert.equal(current.fee.grossPence,5000);
  await assert.rejects(()=>db.exec('UPDATE "CompanySettingsVersion" SET "versionNumber"=99'),e=>e.code==='23514');await assert.rejects(()=>db.exec('DELETE FROM "CompanySettingsVersion"'),e=>e.code==='23514');
});
