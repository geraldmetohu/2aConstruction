// Reads configured environment only. Does not migrate, seed, or discover credentials.
const origin=process.env.MATERIAL_PRICE_API_ORIGIN, token=process.env.MATERIAL_PRICE_IMPORT_TOKEN;
if (!origin || !token || token.length<32) { console.error('Not configured: set MATERIAL_PRICE_API_ORIGIN and MATERIAL_PRICE_IMPORT_TOKEN. No prices fetched or written.'); process.exitCode=2; }
else {
  const url=new URL(origin);
  if ((url.protocol!=='https:' && !(url.protocol==='http:' && ['127.0.0.1','localhost'].includes(url.hostname))) || url.username || url.password || url.pathname!=='/' || url.search || url.hash) throw Error('Use a trusted HTTPS API origin, or local HTTP loopback.');
  try {
    const response=await fetch(new URL('/api/material-prices/refresh',url),{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(280000)});
    const result=await response.json();
    if (!response.ok || response.status===207) { console.error('Price refresh incomplete. HTTP status:',response.status); process.exitCode=1; }
    if (Array.isArray(result.results)) console.log(JSON.stringify(result.results.map(r=>({supplier:r.supplier,sku:r.sku,status:r.status}))));
    else console.log('No observations reported. Check deployment, feature flag and mappings.');
  } catch { console.error('Price refresh could not reach the configured API. No success is assumed.'); process.exitCode=1; }
}
