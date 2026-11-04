// Test-only, static preview of actual components and synthetic data. No database,
// real auth session, .env loading, server actions or application server involved.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { renderCatalogue } from '../tests/helpers/render-catalogue.mjs';
const css = await readFile(process.env.CATALOGUE_PREVIEW_CSS, 'utf8');
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const screen = url.pathname === '/new' ? 'new' : url.pathname === '/setup' ? 'setup' : url.pathname === '/item' ? 'item' : 'list';
  try {
    const content = await renderCatalogue(screen, Object.fromEntries(url.searchParams));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Catalogue design preview</title><style>${css}</style></head><body style="font-family:Arial,sans-serif">${content}</body></html>`);
  } catch { res.writeHead(500); res.end('Preview failed'); }
}).listen(4318, '127.0.0.1', () => console.log('Static synthetic catalogue preview: http://127.0.0.1:4318'));
