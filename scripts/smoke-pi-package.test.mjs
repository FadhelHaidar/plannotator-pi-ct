import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { checkPackage } from './smoke-pi-package.mjs';

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'ct-closure-test-'));
  const put = (file, text = '') => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  };
  try {
    put('package.json', JSON.stringify({ name: '@fadhelhaidar/pi-plannotator-compact', pi: { extensions: ['./index.ts'] }, dependencies: {} }));
    for (const file of ['index.ts', 'server.ts', 'server/serverAnnotate.ts', 'server/serverReview.ts', 'progress-widget.ts', 'auto-keymap.ts', 'skills/plannotator/SKILL.md', 'generated/call-flow-runtime/package.json', 'generated/call-flow-runtime/package-lock.json', 'LICENSE-MIT', 'LICENSE-APACHE', 'NOTICE']) put(file);
    mkdirSync(join(root, 'generated/call-flow-runtime/packs'));
    for (const file of ['plannotator.html', 'review-editor.html']) put(file, '<html>' + ' '.repeat(1_000_001) + '</html>');
    run(root, put);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('rejects a packed extension missing a relative lazy import', () => fixture((root, put) => {
  put('index.ts', "export const load = () => import('./generated/missing.ts');");
  assert.throws(() => checkPackage(root), /Missing import/);
}));
test('rejects a missing browser asset and non-inline build output', () => fixture((root, put) => {
  rmSync(join(root, 'review-editor.html'));
  assert.throws(() => checkPackage(root), /ENOENT/);
  put('review-editor.html', '<script src="/assets/review.js"></script>' + ' '.repeat(1_000_001));
  assert.throws(() => checkPackage(root), /Non-inline browser asset/);
}));
test('requires runtime dependencies rather than accepting source-only dev dependencies', () => fixture((root, put) => {
  put('index.ts', "import { x } from 'source-only-package';");
  assert.throws(() => checkPackage(root), /Undeclared runtime import/);
}));
test('accepts a closed package and recognizes unprefixed Node builtins', () => fixture((root, put) => {
  put('index.ts', "import { readFileSync } from 'fs'; export { x } from './server.ts';");
  put('server.ts', 'export const x = 1;');
  assert.doesNotThrow(() => checkPackage(root));
}));
