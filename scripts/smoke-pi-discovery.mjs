// Install only into a disposable HOME and ask Pi's real loader to discover the
// packed extension. Never start a model session, browser, or user installation.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const script = fileURLToPath(import.meta.url);
const root = dirname(dirname(script));
const piRoot = realpathSync(join(root, 'apps/pi-extension/node_modules/@earendil-works/pi-coding-agent'));
const piManifest = JSON.parse(readFileSync(join(piRoot, 'package.json'), 'utf8'));
const piEntry = join(piRoot, piManifest.main);

if (process.argv[2] === '--discover') {
  const { discoverAndLoadExtensions } = await import(pathToFileURL(piEntry).href);
  const result = await discoverAndLoadExtensions([process.argv[3]], process.cwd(), process.env.PI_CODING_AGENT_DIR);
  assert.deepEqual(result.errors, [], 'Pi loader errors');
  assert.equal(result.extensions.length, 1, 'Exactly one standalone extension');
  const extension = result.extensions[0];
  const commands = ['plannotator-tracker', 'plannotator-plan-mode', 'plannotator-review', 'plannotator-annotate', 'plannotator-last'];
  for (const name of commands) assert(extension.commands.has(name), `Missing command: ${name}`);
  for (const key of ['alt+p', 'alt+t']) assert(extension.shortcuts.has(key), `Missing shortcut: ${key}`);
  for (const name of ['plannotator_mark_done', 'plannotator_submit_plan']) assert(extension.tools.has(name), `Missing tool: ${name}`);
  assert(extension.flags.has('plan'), 'Missing --plan flag');
  console.log(`Pi discovery passed: ${commands.join(', ')}; Alt+P, Alt+T; plan tools and --plan.`);
} else {
  assert(process.argv[2], 'Usage: node scripts/smoke-pi-discovery.mjs <packed.tgz>');
  const archive = resolve(process.argv[2]);
  const sandbox = mkdtempSync(join(tmpdir(), 'plannotator-ct-pi-'));
  const agentDir = join(sandbox, '.pi/agent');
  const cwd = join(sandbox, 'project');
  mkdirSync(cwd);
  const env = {
    ...process.env, HOME: sandbox, USERPROFILE: sandbox,
    XDG_CONFIG_HOME: join(sandbox, '.config'), XDG_CACHE_HOME: join(sandbox, '.cache'),
    XDG_DATA_HOME: join(sandbox, '.local/share'), PLANNOTATOR_DATA_DIR: join(sandbox, '.plannotator'),
    PI_CODING_AGENT_DIR: agentDir, PI_CODING_AGENT_SESSION_DIR: join(sandbox, 'sessions'),
    PI_TELEMETRY: '0', PLANNOTATOR_AGENT_TOOL: '0',
    npm_config_cache: join(sandbox, '.npm'),
  };
  function run(args) {
    const result = spawnSync(process.execPath, args, { cwd, env, stdio: 'inherit', timeout: 180_000 });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `Smoke subprocess failed: ${args.join(' ')}`);
  }
  try {
    const piCli = join(piRoot, piManifest.bin.pi);
    const source = `npm:@plannotator/pi-extension@file:${archive}`;
    run([piCli, 'install', source]);
    const settings = JSON.parse(readFileSync(join(agentDir, 'settings.json'), 'utf8'));
    assert(settings.packages.includes(source), 'Pi did not save the named tarball source');
    run([script, '--discover', join(agentDir, 'npm/node_modules/@plannotator/pi-extension')]);
    run([piCli, 'remove', source]);
    const removed = JSON.parse(readFileSync(join(agentDir, 'settings.json'), 'utf8'));
    assert(!removed.packages?.includes(source), 'Pi did not remove the tarball source');
    console.log('Isolated Pi install/discovery/removal passed; temporary HOME removed.');
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}
