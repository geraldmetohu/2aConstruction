// Runs every "test:*" script in package.json one after another and fails if any fails (used by CI and `npm test`).
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const scripts = Object.keys(JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).scripts).filter(s => s.startsWith('test:') && s !== 'test:all');
const failed = [];
for (const s of scripts) {
  const t = Date.now();
  const r = spawnSync('npm', ['run', '-s', s], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', shell: process.platform === 'win32' });
  const ok = r.status === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${s} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
  if (!ok) { failed.push(s); console.log((r.stdout + r.stderr).split('\n').slice(-25).join('\n')); }
}
console.log(failed.length ? `\n${failed.length} of ${scripts.length} test groups failed: ${failed.join(', ')}` : `\nAll ${scripts.length} test groups passed.`);
process.exit(failed.length ? 1 : 0);
