// Test-only loader: transpiles the real application modules without launching
// Next, loading .env, or bypassing authentication in the shipped application.
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export function typescriptLoader(stubs = {}) {
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(root, filename);
    if (!existsSync(filename)) filename = ['.ts', '.tsx'].map(ext => filename + ext).find(existsSync) ?? filename;
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const nativeRequire = createRequire(filename);
    function requireModule(specifier) {
      if (Object.prototype.hasOwnProperty.call(stubs, specifier)) return stubs[specifier];
      if (specifier === 'server-only') return {};
      if (specifier.startsWith('@/')) return load(specifier.slice(2));
      if (specifier.startsWith('.')) return load(path.resolve(path.dirname(filename), specifier));
      return nativeRequire(specifier);
    }
    const { outputText, diagnostics } = ts.transpileModule(readFileSync(filename, 'utf8'), {
      fileName: filename, reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    });
    if (diagnostics?.some(d => d.category === ts.DiagnosticCategory.Error)) throw new Error('Test transpilation failed: ' + filename);
    new Function('require', 'module', 'exports', outputText)(requireModule, module, module.exports);
    return module.exports;
  }
  return load;
}
