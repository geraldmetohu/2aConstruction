// Isolated interactive preview. No .env, database, authentication or real payment.
import http from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
const require = createRequire(import.meta.url);
const webpackRuntime = require('next/dist/compiled/webpack/webpack'); webpackRuntime.init();
const webpack = webpackRuntime.webpack;
const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, '.next/premium-preview'); await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'entry.tsx'), `import React from 'react'; import {createRoot} from 'react-dom/client'; import {PremiumWizard} from '@/app/(storefront)/premium-estimator/PremiumWizard'; createRoot(document.getElementById('root')!).render(<PremiumWizard enabled={true}/>);`);
await writeFile(path.join(out, 'link.tsx'), `import React from 'react'; export default function Link({children,...props}) {return <a {...props}>{children}</a>;}`);
await writeFile(path.join(out, 'actions.ts'), `export async function startPremiumCheckout(){return {ok:false,message:'Preview complete: no payment or database operation was performed.'};}`);
const config = {
  mode: 'development', target: 'web', entry: path.join(out, 'entry.tsx'), devtool: false,
  output: { path: out, filename: 'bundle.js' },
  resolve: { extensions: ['.tsx','.ts','.js'], alias: { '@': root, 'next/link$': path.join(out, 'link.tsx') } },
  module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(root, 'scripts/preview-typescript-loader.cjs') }] },
  plugins: [new webpack.NormalModuleReplacementPlugin(/^\.\/actions$/, resource => { if (resource.context.endsWith('premium-estimator')) resource.request = path.join(out, 'actions.ts'); })],
};
await new Promise((resolve, reject) => webpack(config, (err, stats) => err || stats.hasErrors() ? reject(err ?? new Error(stats.toString({ all:false, errors:true }))) : resolve()));
const css = (await postcss([tailwind({ content: [path.join(root, 'app/(storefront)/premium-estimator/**/*.tsx')], theme: { extend: {} } })]).process('@tailwind base; @tailwind components; @tailwind utilities;', { from: undefined })).css;
http.createServer(async (req, res) => {
  if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(await readFile(path.join(out, 'bundle.js'))); return; }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Premium estimator · isolated preview</title><style>${css}</style></head><body style="font-family:Arial,sans-serif"><div id="root"></div><script src="/bundle.js"></script></body></html>`);
}).listen(4319, '127.0.0.1', () => console.log('Interactive synthetic premium preview: http://127.0.0.1:4319'));
