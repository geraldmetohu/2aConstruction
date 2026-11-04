// Synthetic sample of the actual PDF renderer; no database or environment file.
import { mkdir, writeFile } from 'node:fs/promises';
import { typescriptLoader } from '../tests/helpers/load-typescript.mjs';
import { quoteDoc, quoteCatalogue, asOf } from '../tests/fixtures/quote.mjs';
const load = typescriptLoader();
const doc = structuredClone(quoteDoc);
doc.title = 'Sample refurbishment quote';
doc.lines = Array.from({length:18}, (_,i) => ({...structuredClone(doc.lines[0]), input:{...structuredClone(doc.lines[0].input),key:`sample-${i}`,inclusion:i===17?'OPTIONAL':'INCLUDED'},description:i===3?'Supply and fit internal doors with careful protection of adjoining finishes, removal of redundant fittings and final adjustment to ensure smooth operation.':`Supply and fit internal doors - area ${i+1}`,room:`Room ${Math.floor(i/3)+1}`}));
doc.roomOrder = Array.from({length:6},(_,i)=>`Room ${i+1}`);
doc.terms = 'This document uses synthetic data for layout verification only. It is not a live customer quote.\n\nWork is subject to survey, access arrangements and written agreement. The estimate service fee is separate from construction costs.';
const result = load('app/lib/quotes/calculate.ts').calculateQuote(doc,quoteCatalogue,asOf);
const pdf = await load('app/lib/quotes/pdf.ts').renderQuotePdf(result.customer,'SYNTHETIC-PREVIEW',1,true);
await mkdir('output/pdf',{recursive:true}); await writeFile('output/pdf/quote-preview.pdf',pdf);
console.log(`Synthetic PDF written (${pdf.length} bytes).`);
