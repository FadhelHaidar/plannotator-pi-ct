// Fail when packing omits an eagerly/lazily imported runtime file or a built asset.
// Analyze the unpacked tarball, not the source tree (which can hide omissions).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { isBuiltin } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export function checkPackage(root) {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(manifest.name, '@plannotator/pi-extension');
  assert.deepEqual(manifest.pi.extensions, ['./index.ts']);
  const required = ['index.ts', 'server.ts', 'server/serverAnnotate.ts', 'server/serverReview.ts',
    'progress-widget.ts', 'auto-keymap.ts', 'skills/plannotator/SKILL.md',
    'generated/call-flow-runtime/package.json', 'generated/call-flow-runtime/package-lock.json',
    'generated/call-flow-runtime/packs', 'LICENSE-MIT', 'LICENSE-APACHE', 'NOTICE'];
  for (const file of required) assert(existsSync(join(root, file)), `Missing runtime input: ${file}`);
  for (const file of ['plannotator.html', 'review-editor.html']) {
    const html = readFileSync(join(root, file), 'utf8');
    assert(html.length > 1_000_000, `Unbuilt browser asset: ${file}`);
    assert(!/<(?:script|link)\b[^>]*(?:src|href)=["']\.?\/?(?:assets\/|[^"']+\.css)/i.test(html), `Non-inline browser asset in ${file}`);
  }
  const declared = new Set(Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies }));
  let count = 0;
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const file = join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        count++;
        const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
        function visit(node) {
          let specifier;
          if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
            if (node.isTypeOnly || node.importClause?.isTypeOnly) return;
            specifier = node.moduleSpecifier;
          } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
            specifier = node.arguments[0];
          }
          if (specifier && ts.isStringLiteral(specifier)) {
            const name = specifier.text;
            if (name.startsWith('.')) {
              const base = resolve(dirname(file), name);
              assert([base, base + '.ts', base + '.js', join(base, 'index.ts')].some(existsSync), `Missing import ${name} from ${file}`);
            } else if (!isBuiltin(name) && name !== 'bun') {
              const packageName = name.startsWith('@') ? name.split('/').slice(0, 2).join('/') : name.split('/')[0];
              assert(declared.has(packageName), `Undeclared runtime import ${name} from ${file}`);
            }
          }
          ts.forEachChild(node, visit);
        }
        visit(ast);
      }
    }
  }
  walk(root);
  console.log(`Package smoke passed: ${count} runtime TS files, both inline HTML assets, skill, managed CallDiff inputs and licenses.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert(process.argv[2], 'Usage: node scripts/smoke-pi-package.mjs <packed.tgz>');
  const temp = mkdtempSync(join(tmpdir(), 'plannotator-ct-pack-'));
  try {
    execFileSync('tar', ['-xzf', resolve(process.argv[2]), '-C', temp]);
    checkPackage(join(temp, 'package'));
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
