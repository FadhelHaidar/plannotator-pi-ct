import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

mkdirSync('artifacts', { recursive: true });
const archive = resolve('artifacts/plannotator-pi-extension.tgz');
for (const [program, args, cwd] of [
  ['bun', ['pm', 'pack', '--filename', archive], 'apps/pi-extension'],
  ['node', ['scripts/smoke-pi-package.mjs', archive], '.'],
]) {
  const result = spawnSync(program, args, { cwd, stdio: 'inherit' });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
