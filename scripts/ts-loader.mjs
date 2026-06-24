/**
 * Minimal ESM resolve hook so the verifier can import the app's TypeScript core
 * directly. Vite resolves extensionless relative imports during the real build;
 * Node does not, so here we append `.ts` when a bare relative specifier maps to
 * an existing TypeScript file. Node 22 then strips the types natively.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, next) {
  const relative = specifier.startsWith('./') || specifier.startsWith('../');
  const hasExt = /\.[mc]?[jt]s$/.test(specifier);
  if (relative && !hasExt && context.parentURL) {
    const candidate = new URL(specifier + '.ts', context.parentURL);
    if (existsSync(fileURLToPath(candidate))) {
      return next(candidate.href, context);
    }
  }
  return next(specifier, context);
}
