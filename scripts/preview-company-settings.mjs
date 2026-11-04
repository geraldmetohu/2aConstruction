// Synthetic read-only preview, without database access.
import http from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import {typescriptLoader} from '../tests/helpers/load-typescript.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'.next/settings-preview');await mkdir(out,{recursive:true});
const initial={...typescriptLoader()('app/lib/company-settings/schema.ts').suggestedSettings,defaultMarkupPercent:'20',defaultWastePercent:'5',contingencyPercent:'5',estimatorFeeTaxCodeId:'10000000-0000-4000-8000-000000000001'};
await writeFile(path.join(out,'entry.tsx'),`import React from 'react';import {createRoot} from 'react-dom/client';import {SettingsEditor} from '@/app/dashboard/settings/SettingsEditor';createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-5xl space-y-6 p-6"><header><p className="text-sm text-neutral-500">Synthetic preview · no live data</p><h1 className="mt-2 text-3xl font-black">Company settings</h1><p className="mt-3">Review defaults and save a new version. Earlier versions stay unchanged.</p></header><SettingsEditor preview initial={${JSON.stringify(initial)}} version={1} taxes={[{id:'10000000-0000-4000-8000-000000000001',label:'Synthetic VAT · 20%'}]}/></main>);`);
await writeFile(path.join(out,'navigation.ts'),'export const useRouter=()=>({refresh(){}});');await writeFile(path.join(out,'actions.ts'),'export async function saveCompanySettings(){return {ok:false,message:"Preview only"}}');
const require=createRequire(import.meta.url),runtime=require('next/dist/compiled/webpack/webpack');runtime.init();const webpack=runtime.webpack;
await new Promise((resolve,reject)=>webpack({mode:'development',target:'web',entry:path.join(out,'entry.tsx'),devtool:false,output:{path:out,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':root,'next/navigation$':path.join(out,'navigation.ts')}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(root,'scripts/preview-typescript-loader.cjs')}]},plugins:[new webpack.NormalModuleReplacementPlugin(/^\.\/actions$/,r=>{if(r.context.endsWith('settings'))r.request=path.join(out,'actions.ts');})]},(err,stats)=>err||stats.hasErrors()?reject(err??Error(stats.toString({all:false,errors:true}))):resolve()));
const css=(await postcss([tailwind({content:[path.join(root,'app/dashboard/settings/**/*.tsx')],theme:{extend:{}}})]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined})).css;
http.createServer(async(req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(await readFile(path.join(out,'bundle.js')));return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Company settings preview</title><style>${css}</style></head><body style="font-family:Arial,sans-serif"><div id="root"></div><script src="/bundle.js"></script></body></html>`);}).listen(4324,'127.0.0.1',()=>console.log('Synthetic settings preview: http://127.0.0.1:4324'));
