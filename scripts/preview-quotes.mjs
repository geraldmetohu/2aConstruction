// Isolated, synthetic quote editor preview. Checkout, auth and database are absent.
import http from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import { typescriptLoader } from '../tests/helpers/load-typescript.mjs';
import { quoteDoc, quoteCatalogue, asOf } from '../tests/fixtures/quote.mjs';
const require=createRequire(import.meta.url), runtime=require('next/dist/compiled/webpack/webpack');runtime.init();const webpack=runtime.webpack;
const root=fileURLToPath(new URL('../',import.meta.url)), out=path.join(root,'.next/quote-preview');await mkdir(out,{recursive:true});
const load=typescriptLoader(), normalized=load('app/lib/quotes/schema.ts').quoteDocumentSchema.parse(quoteDoc);
await writeFile(path.join(out,'entry.tsx'),`import React from 'react';import {createRoot} from 'react-dom/client';import {QuoteEditor} from '@/app/dashboard/quotes/QuoteEditor';createRoot(document.getElementById('root')!).render(<div className="mx-auto max-w-6xl p-6"><h1 className="mb-6 text-3xl font-black">Quote builder - synthetic preview</h1><QuoteEditor id="preview" version={1} initial={${JSON.stringify(normalized)}} catalogue={${JSON.stringify(quoteCatalogue)}} policy={{discount:true,markup:true,tax:true}} released={false}/></div>);`);
await writeFile(path.join(out,'link.tsx'),`import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>;}`);
await writeFile(path.join(out,'navigation.ts'),`export const useRouter=()=>({refresh(){},push(){}});`);
await writeFile(path.join(out,'actions.ts'),`export async function previewQuote(_id,raw){return fetch('/calculate',{method:'POST',body:raw}).then(r=>r.json());}export async function saveQuote(){return {ok:false,message:'Preview only: no database operation was performed.'};}export const releaseQuote=saveQuote;export const convertEstimate=saveQuote;`);
await new Promise((resolve,reject)=>webpack({mode:'development',target:'web',entry:path.join(out,'entry.tsx'),devtool:false,output:{path:out,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':root,'next/link$':path.join(out,'link.tsx'),'next/navigation$':path.join(out,'navigation.ts')}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(root,'scripts/preview-typescript-loader.cjs')}]},plugins:[new webpack.NormalModuleReplacementPlugin(/^\.\/actions$/,r=>{if(r.context.endsWith('quotes'))r.request=path.join(out,'actions.ts');})]},(err,stats)=>err||stats.hasErrors()?reject(err??new Error(stats.toString({all:false,errors:true}))):resolve()));
const css=(await postcss([tailwind({content:[path.join(root,'app/dashboard/quotes/**/*.tsx')],theme:{extend:{}}})]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined})).css;
http.createServer(async(req,res)=>{
  if(req.url==='/calculate'&&req.method==='POST'){let body='';for await(const chunk of req){body+=chunk;if(body.length>1500000){res.writeHead(413);res.end();return;}}res.setHeader('Content-Type','application/json');try{const result=load('app/lib/quotes/calculate.ts').calculateQuote(JSON.parse(body),quoteCatalogue,asOf);res.end(JSON.stringify({ok:true,totals:result.customer.totals,optionalTotals:result.customer.optionalTotals,warnings:result.warnings}));}catch(e){res.end(JSON.stringify({ok:false,message:e.message}));}return;}
  if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(await readFile(path.join(out,'bundle.js')));return;}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Quote builder preview</title><style>${css}</style></head><body style="font-family:Arial,sans-serif"><div id="root"></div><script src="/bundle.js"></script></body></html>`);
}).listen(4320,'127.0.0.1',()=>console.log('Synthetic quote preview: http://127.0.0.1:4320'));
