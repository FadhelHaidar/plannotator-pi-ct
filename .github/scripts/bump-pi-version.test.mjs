import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bumpVersion, classifyBump } from './bump-pi-version.mjs';

test('Conventional Commit types select the intended bump', () => {
  for (const type of ['feat', 'feat(ui)']) assert.equal(classifyBump(`${type}: add feature`), 'minor');
  for (const type of ['fix', 'perf', 'revert']) assert.equal(classifyBump(`${type}: correct behavior`), 'patch');
  for (const type of ['chore', 'docs', 'test', 'ci', 'build', 'style', 'refactor']) {
    assert.equal(classifyBump(`${type}: maintenance`), null);
  }
});

test('breaking markers take precedence over commit type', () => {
  assert.equal(classifyBump('fix!: change public contract'), 'major');
  assert.equal(classifyBump('refactor: change public contract\n\nBREAKING CHANGE: callers must update'), 'major');
});

test('stable SemVer increments, including zero-major breaking changes', () => {
  assert.equal(bumpVersion('0.28.4', 'patch'), '0.28.5');
  assert.equal(bumpVersion('0.28.4', 'minor'), '0.29.0');
  assert.equal(bumpVersion('0.28.4', 'major'), '1.0.0');
  assert.throws(() => bumpVersion('0.28.4-beta.1', 'patch'), /Expected a stable semantic version/);
});

function repository(run) {
  const cwd = mkdtempSync(join(tmpdir(), 'ct-version-test-'));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const output = join(cwd, 'github-output');
  const version = () => {
    writeFileSync(output, '');
    execFileSync(process.execPath, [fileURLToPath(new URL('./bump-pi-version.mjs', import.meta.url))], {
      cwd, env: { ...process.env, GITHUB_OUTPUT: output }, stdio: 'pipe',
    });
    return readFileSync(output, 'utf8').trim();
  };
  try {
    git('init', '-b', 'main');
    git('config', 'user.name', 'CT release fixture');
    git('config', 'user.email', 'fixture@example.invalid');
    mkdirSync(join(cwd, 'apps/pi-extension'), { recursive: true });
    writeFileSync(join(cwd, 'apps/pi-extension/package.json'), '{"version":"0.1.1"}\n');
    git('add', '.');
    git('commit', '-m', 'chore: initial standalone extraction');
    run(git, version);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

test('a tag-free main bootstraps the checked-in standalone 0.1.1 version', () => repository((_git, version) => {
  assert.equal(version(), 'version=0.1.1');
}));

test('maintenance and already-tagged main do not release', () => repository((git, version) => {
  git('tag', 'ct-v0.1.1');
  assert.equal(version(), 'version=');
  git('commit', '--allow-empty', '-m', 'docs: explain installation');
  assert.equal(version(), 'version=');
}));

test('the whole main range picks the highest Conventional Commit bump', () => repository((git, version) => {
  git('tag', 'ct-v0.1.1');
  git('commit', '--allow-empty', '-m', 'fix: correct packaging');
  assert.equal(version(), 'version=0.1.2');
  git('commit', '--allow-empty', '-m', 'feat(ui): add review behavior');
  assert.equal(version(), 'version=0.2.0');
  git('commit', '--allow-empty', '-m', 'refactor!: change public contract');
  assert.equal(version(), 'version=1.0.0');
}));

test('CT tags are numerically ordered and upstream tags do not select the baseline', () => repository((git, version) => {
  for (const tag of ['v99.0.0', 'ct-v0.1.9', 'ct-v0.1.10', 'ct-v0.1.11-beta.1']) git('tag', tag);
  git('commit', '--allow-empty', '-m', 'perf: reduce load overhead');
  assert.equal(version(), 'version=0.1.11');
}));
