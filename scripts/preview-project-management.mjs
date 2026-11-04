// Actual project workspace with synthetic in-memory state. No DB, payments or external files.
import http from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import { typescriptLoader } from '../tests/helpers/load-typescript.mjs';
import { managementBase as base } from '../tests/fixtures/project-workspace.mjs';
const require=createRequire(import.meta.url),runtime=require('next/dist/compiled/webpack/webpack');runtime.init();const webpack=runtime.webpack;
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'.next/management-preview');await mkdir(out,{recursive:true});
const load=typescriptLoader(),{replay,validateChange,finances,progress}=load('app/lib/project-management/state.ts'),{commandSchema,parseEntry}=load('app/lib/project-management/schema.ts');const history=[];
const workspace=()=>{const state=replay(base,history);return {base,state,sequence:history.length,financials:finances(base,state),progress:progress(state),history:[...history].reverse()};};
await writeFile(path.join(out,'entry.tsx'),`import React,{useEffect,useState} from 'react';import {createRoot} from 'react-dom/client';import {ProjectWorkspace} from '@/app/dashboard/delivery-projects/[id]/manage/ProjectWorkspace';function Preview(){const [data,setData]=useState(${JSON.stringify(workspace())});useEffect(()=>{const refresh=()=>fetch('/workspace').then(r=>r.json()).then(setData);window.addEventListener('project-refresh',refresh);refresh();return()=>window.removeEventListener('project-refresh',refresh)},[]);return <main className="mx-auto max-w-7xl p-6"><p className="rounded-xl bg-amber-50 p-4">Synthetic preview: changes stay in memory. No real database, payment, email or file upload.</p><ProjectWorkspace workspace={data} defaults={{versionId:"10000000-0000-4000-8000-000000000099",quoteValidityDays:30,invoiceTermsDays:14,workdayHours:8,defaultTeamSize:2,workingDays:[1,2,3,4,5]}}/></main>}createRoot(document.getElementById('root')!).render(<Preview/>);`);
await writeFile(path.join(out,'navigation.ts'),`export const useRouter=()=>({refresh(){window.dispatchEvent(new Event('project-refresh'))}});`);
await writeFile(path.join(out,'actions.ts'),`export async function recordProjectActivity(command){return fetch('/record',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)}).then(r=>r.json());}`);
await new Promise((resolve,reject)=>webpack({mode:'development',target:'web',entry:path.join(out,'entry.tsx'),devtool:false,output:{path:out,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':root,'next/navigation$':path.join(out,'navigation.ts')}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(root,'scripts/preview-typescript-loader.cjs')}]},plugins:[new webpack.NormalModuleReplacementPlugin(/^\.\/actions$/,r=>{if(r.context.endsWith('manage'))r.request=path.join(out,'actions.ts');})]},(err,stats)=>err||stats.hasErrors()?reject(err??new Error(stats.toString({all:false,errors:true}))):resolve()));
const css=(await postcss([tailwind({content:[path.join(root,'app/dashboard/delivery-projects/**/*.tsx')],theme:{extend:{}}})]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined})).css;
http.createServer(async(req,res)=>{
  if(req.url==='/workspace'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(workspace()));return;}
  if(req.url==='/record'&&req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>100000){res.writeHead(413);res.end();return;}}res.setHeader('Content-Type','application/json');try{const c=commandSchema.parse(JSON.parse(raw));if(c.expectedSequence!==history.length)throw Error('Reload to see the latest changes.');const e=parseEntry(c.kind,c.entityId,c.body);validateChange(base,workspace().state,e);history.push({id:crypto.randomUUID(),entityId:e.id,kind:e.kind,body:e.body,sequence:history.length+1,actorId:'preview-admin',reason:c.reason,createdAt:new Date().toISOString()});res.end(JSON.stringify({ok:true,sequence:history.length}));}catch(e){res.end(JSON.stringify({ok:false,message:e.message}));}return;}
  if(req.url?.startsWith('/api/')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:false,message:'File storage is disabled in this synthetic preview.'}));return;}
  if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(await readFile(path.join(out,'bundle.js')));return;}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Project management preview</title><style>${css}</style></head><body style="font-family:Arial,sans-serif"><div id="root"></div><script src="/bundle.js"></script></body></html>`);
}).listen(Number(process.env.MANAGEMENT_PREVIEW_PORT ?? 4322),'127.0.0.1',()=>console.log('Synthetic project management preview: http://127.0.0.1:4322'));
