import { readFileSync, writeFileSync } from 'node:fs';
import { bumpVersion } from '../.github/scripts/bump-pi-version.mjs';

const version = process.argv[2];
bumpVersion(version, 'patch'); // validate, without incrementing
for (const file of ['package.json', 'apps/pi-extension/package.json']) {
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  manifest.version = version;
  writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
}
