// Isolated takeoff calculator preview with default rate-book prices.
// No database, authentication, .env or network access.
//   node scripts/preview-takeoff.mjs  →  http://127.0.0.1:4325 (calculator), /public (instant quote), /rates (price list)
// Saving, sending and the client portal need the database and are disabled here.
import http from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import { typescriptLoader } from '../tests/helpers/load-typescript.mjs';

const require = createRequire(import.meta.url), runtime = require('next/dist/compiled/webpack/webpack'); runtime.init(); const webpack = runtime.webpack;
const root = fileURLToPath(new URL('../', import.meta.url)), out = path.join(root, '.next/takeoff-preview'); await mkdir(out, { recursive: true });
const base = typescriptLoader();
const { defaultRateBook } = base('app/lib/takeoff/ratebook.ts');
const load = typescriptLoader({ '@/app/lib/takeoff/prices.server': { resolveTakeoffPrices: async () => ({ rates: defaultRateBook, prices: {}, notes: [], rateVersion: 0 }), readCommercialDefaults: async () => null } });
const { workPackages } = load('app/lib/takeoff/modules/index.ts');
const { roomFields } = load('app/lib/takeoff/modules/rooms.ts');
const { toSpec } = load('app/lib/takeoff/package.ts');
process.env.INSTANT_QUOTE_ENABLED = 'true';
const { instantQuote } = load('app/(storefront)/instant-quote/actions.ts');
const specs = JSON.stringify(workPackages.map(p => toSpec(p, true)));
const roomSpec = JSON.stringify(toSpec({ id: 'room', label: 'Room', description: '', usesProperty: false, fields: roomFields }, true));

await writeFile(path.join(out, 'entry.tsx'), `import React from 'react';import {createRoot} from 'react-dom/client';
import {TakeoffCalculator} from '@/app/dashboard/calculator/TakeoffCalculator';
import {InstantQuote} from '@/app/(storefront)/instant-quote/InstantQuote';
import {RatesEditor} from '@/app/dashboard/rates/RatesEditor';
import {defaultRateBook} from '@/app/lib/takeoff/ratebook';
const el=document.getElementById('root')!;
const page=location.pathname;
createRoot(el).render(page==='/public'?<InstantQuote enabled={true} specs={${specs}} roomSpec={${roomSpec}}/>
  :page==='/rates'?<div className="mx-auto max-w-7xl p-6"><RatesEditor rates={defaultRateBook} defaults={defaultRateBook} version={0} overrides={{}} storage={false}/></div>
  :<div className="mx-auto max-w-7xl p-6"><TakeoffCalculator rates={defaultRateBook} prices={{}} notes={["Preview: default rate-book prices only. Saving is disabled."]} commercial={null} storage={false} saved={null}/></div>);`);
await writeFile(path.join(out, 'navigation.ts'), `export const useRouter=()=>({refresh(){},push(){},replace(){}});`);
await writeFile(path.join(out, 'admin-actions.ts'), `const off=async()=>({ok:false as const,message:'Saving is disabled in the preview.'});export const saveTakeoffQuote=off,sendTakeoffQuote=off,saveRates=off;`);
await writeFile(path.join(out, 'link.tsx'), `import React from 'react';export default function Link({children,...props}:any){return <a {...props}>{children}</a>;}`);
await writeFile(path.join(out, 'actions.ts'), `export async function instantQuote(raw:unknown){return fetch('/instant',{method:'POST',body:JSON.stringify(raw)}).then(r=>r.json());}`);
await new Promise((resolve, reject) => webpack({
  mode: 'development', target: 'web', entry: path.join(out, 'entry.tsx'), devtool: false, output: { path: out, filename: 'bundle.js' },
  resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { '@': root, 'next/link$': path.join(out, 'link.tsx'), 'next/navigation$': path.join(out, 'navigation.ts') } },
  module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(root, 'scripts/preview-typescript-loader.cjs') }] },
  plugins: [new webpack.NormalModuleReplacementPlugin(/^\.\/actions$/, r => { r.request = path.join(out, r.context.endsWith('instant-quote') ? 'actions.ts' : 'admin-actions.ts'); })],
}, (err, stats) => err || stats.hasErrors() ? reject(err ?? new Error(stats.toString({ all: false, errors: true }))) : resolve()));
const css = (await postcss([tailwind({ content: [path.join(root, 'app/dashboard/calculator/**/*.tsx'), path.join(root, 'app/dashboard/rates/**/*.tsx'), path.join(root, 'app/(storefront)/instant-quote/**/*.tsx'), path.join(root, 'app/componets/takeoff/**/*.tsx')], theme: { extend: {} } })]).process('@tailwind base;@tailwind components;@tailwind utilities;', { from: undefined })).css;

http.createServer(async (req, res) => {
  if (req.url === '/instant' && req.method === 'POST') {
    let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 20000) { res.writeHead(413); res.end(); return; } }
    try { res.end(JSON.stringify(await instantQuote(JSON.parse(body)))); } catch (e) { res.end(JSON.stringify({ ok: false, message: e.message })); }
    return;
  }
  if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(await readFile(path.join(out, 'bundle.js'))); return; }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Takeoff preview</title><style>${css}</style></head><body style="font-family:Arial,sans-serif"><div id="root"></div><script src="/bundle.js"></script></body></html>`);
}).listen(4325, '127.0.0.1', () => console.log('Takeoff preview: http://127.0.0.1:4325  (instant quote: /public, rates: /rates)'));
