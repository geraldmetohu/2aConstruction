import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {PrismaClient} from '@prisma/client';
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {typescriptLoader,root} from './helpers/load-typescript.mjs';
const load=typescriptLoader(),{observationSchema}=load('app/lib/material-prices/schema.ts'),{extractPublicPrice,collectPublicPrice}=load('app/lib/material-prices/collector.ts');
const mapping={itemId:randomUUID(),supplier:'SELCO',sku:'TEST-001',sourceUrl:'https://www.selcobw.com/test-product',location:'PUBLIC_ONLINE',priceBasis:'PUBLIC',packQuantity:'25',unitCode:'kg',currency:'GBP',taxInclusive:true,minimumPacks:1};
const offer={ '@type':'Offer',price:'12.50',priceCurrency:'GBP',availability:'https://schema.org/InStock' };
const html=(offers=offer)=>`<script type="application/ld+json">${JSON.stringify({'@type':'Product',sku:mapping.sku,offers})}</script>`;
test('strict extraction rejects ranges, mismatched products, stale offers and unavailable stock',()=>{
  assert.equal(extractPublicPrice(html(),mapping),'12.50');
  for(const changed of [{...offer,'@type':'AggregateOffer'},{...offer,priceCurrency:'USD'},{...offer,availability:'https://schema.org/OutOfStock'},{...offer,priceValidUntil:'2001-01-01'},[offer,offer]])assert.throws(()=>extractPublicPrice(html(changed),mapping));
  assert.throws(()=>extractPublicPrice(html(),{...mapping,sku:'wrong'}));
  for(const sourceUrl of ['http://www.selcobw.com/test','https://selcobw.com.evil.invalid/test','https://www.selcobw.com/test?token=private'])assert.equal(observationSchema.safeParse({...mapping,sourceUrl,packPrice:'12.50',observedAt:new Date().toISOString(),sourceReference:'fixture'}).success,false);
});
test('collector uses bounded public requests and does not follow redirects or bypass failures',async()=>{
  let options;assert.equal(await collectPublicPrice(mapping,async(_,o)=>{options=o;return new Response(html(),{headers:{'content-type':'text/html'}})}),'12.50');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');await assert.rejects(()=>collectPublicPrice(mapping,async()=>new Response('blocked',{status:403})),/unavailable/);
});
test('routes deny unauthenticated requests before accessing storage',async()=>{
  let calls=0;const l=typescriptLoader({'@/app/lib/db':{prisma:new Proxy({},{get(){calls++;throw Error('Unexpected storage');}})},'@/app/lib/material-prices/access':{authorizeMaterialPrices:async()=>{throw Error('Denied')}}});
  const route=l('app/api/material-prices/route.ts');assert.equal((await route.GET(new Request('http://localhost/api/material-prices'))).status,403);assert.equal((await route.POST(new Request('http://localhost/api/material-prices',{method:'POST'}))).status,403);assert.equal((await l('app/api/material-prices/refresh/route.ts').POST(new Request('http://localhost',{method:'POST'}))).status,403);assert.equal(calls,0);
});
test('new price observations retain every old record and schema definition; retries and invalid batches are atomic',{timeout:120000},async t=>{
  const db=new PGlite(),dir=path.join(root,'prisma/migrations'),migration='20261029120000_add_actual_material_values';for(const d of (await readdir(dir,{withFileTypes:true})).filter(x=>x.isDirectory()&&x.name<migration).sort((a,b)=>a.name.localeCompare(b.name)))await db.exec(await readFile(path.join(dir,d.name,'migration.sql'),'utf8'));await db.exec(await readFile(path.join(root,'tests/fixtures/legacy-records.sql'),'utf8'));
  const server=new PGLiteSocketServer({db,port:0,host:'127.0.0.1',maxConnections:1});await server.start();const conn=server.getServerConn(),url=conn.startsWith('postgres')?conn:`postgresql://postgres:postgres@${conn}/postgres`;const prisma=new PrismaClient({datasources:{db:{url:`${url}${url.includes('?')?'&':'?'}connection_limit=1&sslmode=disable`}}});t.after(async()=>{await prisma.$disconnect();await server.stop();await db.close();});
  const category=await prisma.itemCategory.create({data:{code:'TEST',name:'Synthetic'}}),unit=await prisma.itemUnit.create({data:{code:'kg',label:'Kilogram',dimensionKind:'MASS'}}),item=await prisma.constructionItem.create({data:{code:'TEST-MATERIAL',name:'Synthetic material',categoryId:category.id,unitId:unit.id,itemType:'MATERIAL'}});
  const names=(await db.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`)).rows.map(r=>r.tablename);
  async function snapshot(){const rows={};for(const n of names)rows[n]=(await db.query(`SELECT to_jsonb(t) AS row FROM "${n}" t ORDER BY id`)).rows;return {rows,columns:(await db.query(`SELECT table_name,column_name,data_type,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[]) ORDER BY table_name,ordinal_position`,[names])).rows,indexes:(await db.query(`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename=ANY($1::text[]) ORDER BY tablename,indexname`,[names])).rows};}
  const before=await snapshot(),sql=await readFile(path.join(dir,migration,'migration.sql'),'utf8');for(const n of names)assert.ok(!sql.includes(`"${n}"`));await db.exec(sql);
  const {importMaterialPrices}=load('app/lib/material-prices/service.ts'),now=new Date('2026-10-29T10:00:00Z'),row={...mapping,itemId:item.id,observedAt:now.toISOString(),sourceReference:'fixture-week-1',packPrice:'12.50'};
  assert.deepEqual(await importMaterialPrices(prisma,{observations:[row]},'test',now),{inserted:1,duplicates:0});assert.deepEqual(await importMaterialPrices(prisma,{observations:[row]},'test',now),{inserted:0,duplicates:1});
  await assert.rejects(()=>importMaterialPrices(prisma,{observations:[{...row,packPrice:'13'}]},'test',now),/different values/);
  await assert.rejects(()=>importMaterialPrices(prisma,{observations:[{...row,sourceReference:'rollback'},{...row,itemId:randomUUID()}]},'test',now),/active material/);assert.equal(await prisma.actualMaterialValue.count(),1);
  await importMaterialPrices(prisma,{observations:[{...row,sourceReference:'fixture-week-2',packPrice:'15'}]},'test',now);const records=await prisma.actualMaterialValue.findMany({orderBy:{packPrice:'asc'}});assert.equal(records[0].unitPrice.toString(),'0.5');assert.equal(records[1].unitPrice.toString(),'0.6');assert.deepEqual(await snapshot(),before);
  for(const statement of ['UPDATE "actual_values" SET sku=sku','DELETE FROM "actual_values"','TRUNCATE "actual_values"'])await assert.rejects(()=>db.exec(statement),e=>e.code==='23514');
});
