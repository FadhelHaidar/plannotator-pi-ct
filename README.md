# Pi Plannotator Compact

A standalone [Pi coding agent](https://github.com/earendil-works/pi) extension with Plannotator's browser plan review, annotations, code/PR review, and the compact execution tracker. This fork publishes as **`@fadhelhaidar/pi-plannotator-compact`**, separately from upstream, and ships both an npm package and a prebuilt GitHub Release tarball.

The inherited UI and runtime are retained, including plan revisions/diffs, markdown/HTML/live-app/folder/bundle annotations, drafts, diagram/question comments, review highlighting workers, AI/session bridges, guide sharing, themes/settings and external review engines. This extraction changes packaging, build scope and releases, not those features.

## Install the prebuilt release

Requires **Pi 0.79.1 or newer** and its supported Node runtime. No Bun, source checkout or browser build is needed:

```bash
pi install npm:@fadhelhaidar/pi-plannotator-compact
# Or install the prebuilt GitHub Release tarball:
pi install 'npm:@fadhelhaidar/pi-plannotator-compact@https://github.com/FadhelHaidar/pi-plannotator-compact/releases/latest/download/plannotator-pi-extension.tgz'
```

The npm package and GitHub tarball both use the fork identity `@fadhelhaidar/pi-plannotator-compact`; the unscoped upstream package is not replaced.

Update configured extensions after a release:

```bash
pi update --extensions
# Or update only this source:
pi update npm:@fadhelhaidar/pi-plannotator-compact
# Or update the tarball source:
pi update 'npm:@fadhelhaidar/pi-plannotator-compact@https://github.com/FadhelHaidar/pi-plannotator-compact/releases/latest/download/plannotator-pi-extension.tgz'
```

Restart Pi or run `/reload`. Pi does not poll this repository for releases; a plain `pi update` updates Pi itself, not extensions. To remove this distribution, use the same source string:

```bash
pi remove npm:@fadhelhaidar/pi-plannotator-compact
# For the tarball source, use its exact configured URL instead.
```

### Migrate from the old fork or upstream

Do not load two copies with the same commands. Stop Pi, remove the old source, then install the new source above and restart. If you previously installed this project under its old npm name, remove that configured source with:

```bash
pi remove npm:@fadhelhaidar/plannotator-pi-ct
```

For example, remove an older fork release URL with:

```bash
# Old compact-plan-tracker release URL:
pi remove 'npm:@plannotator/pi-extension@https://github.com/FadhelHaidar/plannotator/releases/latest/download/plannotator-pi-extension.tgz'
# If you installed upstream from npm instead:
pi remove npm:@plannotator/pi-extension
# If you used a local checkout or git source, remove that exact configured source.
pi list
```

Also remove any manually configured old extension paths (global or project-local) before loading this one. Your Plannotator data/config in `~/.plannotator` and Pi keybindings do not need migration or deletion. This repository does not edit your Pi settings/keybindings automatically during extraction.

## Compact tracker and shortcuts

- `/plannotator-tracker [off|compact|full|toggle|status]` controls a three-mode execution tracker. Default **compact** shows `Plan: X/Y complete`, at most three pending steps, and a hidden-step count (at most five rows, no completed rows). **Full** lists every step, completed steps struck through. **Off** hides the widget but preserves the footer and enforces mirroring to a detected todo provider, even if `todoProvider` is `"off"`. Legacy `on` means compact. `Alt+T` cycles off → compact → full.
- `piProgressWidgetMode` persists in `~/.plannotator/config.json`; the previous boolean visibility key remains readable.
- `/plannotator-plan-mode` or **Alt+P** toggles plan mode; `pi --plan` starts in plan mode. Review/annotation commands remain `/plannotator-review`, `/plannotator-annotate`, `/plannotator-last`.
- On WSL/Windows Pi reserves `alt+p` for model-cycle-backward and can skip the extension shortcut. To free it, merge `"app.model.cycleBackward": "alt+m"` into your `~/.pi/agent/keybindings.json`. Extension shortcuts themselves are registered raw keys, not remapped by that file.

See [the complete extension usage/configuration reference](apps/pi-extension/README.md). The bundled `/skill:plannotator` knowledge skill is retained and only discovered if no other copy is loaded; its CLI examples refer to the external Plannotator CLI, which this Pi-only repository does **not** ship.

## Build from a clean checkout

Use Node **22+**, npm, **Bun 1.3.14** (the release/test version), bash, git, and network access. Bun 1.4.2 can build but changes Node HTTP listener behavior in the inherited network tests; use the pinned version for reproducible tests. Vite builds large inlined browser assets and need sufficient memory.

```bash
git clone https://github.com/FadhelHaidar/pi-plannotator-compact.git
cd pi-plannotator-compact
npm run install:dev
bun run build:pi
```

`install:dev` temporarily supplies only the retained Bun workspaces, installs from `bun.lock` with `--frozen-lockfile --no-save`, then restores the npm-safe root manifest. The root has no permanent `workspaces`: Pi's npm Git-source installation must not parse `workspace:*` dependencies. Do not run another installer concurrently. Avoid plain `bun install`, which can rewrite the workspace lock before the lifecycle bootstrap; use `npm run install:dev`.

`build:pi` builds `apps/review` first (including its inlined worker), then `apps/hook` (the plan/annotation browser shell), copies both HTML files to the extension, and runs `vendor.sh` to generate raw-TS backend modules, managed CallDiff inputs and the bundled skill. The names `hook`/`review` preserve upstream's internal layout; no non-Pi server or agent entrypoint is included. Generated outputs and dependencies are ignored, not committed. Dev-only UI previews are `bun run dev:hook` and `bun run dev:review`.

For a local installation **after building**:

```bash
pi install ./apps/pi-extension
# or, from outside the checkout, use its absolute path
```

Git-source installation is also available; it runs the full source bootstrap/build in postinstall and therefore needs Node, Bun, bash, network and lifecycle scripts:

```bash
pi install git:github.com/FadhelHaidar/pi-plannotator-compact
```

If interrupted, first ensure no bootstrap is still running, restore `package.json` from Git if it still contains the temporary workspace list, and remove `.pi-source-install.lock`. Rerun `npm run install:dev` and `bun run build:pi`. Do not delete a lock held by a live install.

### Tests and packaging

After the bootstrap/build:

```bash
bun run test:pi
bun run typecheck:pi
bun test packages/core packages/shared packages/ai
bun test packages/ui packages/editor packages/review-editor packages/guide-viewer
bun run test:ui                    # opt-in Happy DOM component tests
bun test scripts/install-pi-source.test.ts
node --test .github/scripts/bump-pi-version.test.mjs scripts/smoke-pi-package.test.mjs
bun run pack:pi                    # rebuild + pack + packed import/assets closure check
bun run smoke:discovery            # isolated Pi install/load/remove smoke, no model session
```

`pack:pi` produces `artifacts/plannotator-pi-extension.tgz`. `node scripts/pack-pi.mjs` packs already-built outputs without rebuilding. `smoke:package` requires the archive argument, for example `bun run smoke:package artifacts/plannotator-pi-extension.tgz`. The closure smoke parses the **unpacked tarball**, checks runtime imports/declarations, inlined HTML, the skill, managed CallDiff inputs and licenses. The discovery smoke uses Pi's real package installer/loader in a disposable HOME/agent directory, checks all five commands, both shortcuts, plan tools and flag, then removes the installation. It does not touch your settings or call a model/browser. It requires the host Pi dev dependency installed by the bootstrap.

Native dependencies may require allowed npm lifecycle scripts (notably WebTUI's `node-pty`); npm versions that block scripts need explicit approval under their own policy. SDK/CLI availability, credentials, git/jj/GitButler, platform browser/native tools and network-hosted services still govern optional capabilities. Automated tests skip JJ cases when `jj` is absent and DOM cases unless enabled. Timing-sensitive server suites can require `bun test --timeout 15000 apps/pi-extension` on busy machines. See [tests/UI-TESTING.md](tests/UI-TESTING.md) for manual UI parity coverage. Passing package/discovery tests does not attest full interactive browser or external-provider parity.

## Releases and publication bootstrap

This is an independent **`vX.Y.Z`** release series. The old fork's last CT version was `0.1.0`; this standalone tree starts at **`0.1.1`**. Upstream version numbers are not used. Root/Pi manifest versions are set in the build workspace so both browser assets carry the release version.

`.github/workflows/test.yml` builds and validates pushes to branches and pull requests using Node 22 and Bun 1.3.14. `.github/workflows/pi-extension-release.yml` runs on pushes to `main` and repeats the release-critical checks before publishing. With **no release tags**, the first push bootstraps a release at the checked-in Pi version (`0.1.1`). After that it inspects non-merge commit messages since the highest stable release tag and uses the highest Conventional Commit bump:

| Commit | Bump |
| --- | --- |
| `feat:` / `feat(scope):` | minor |
| `fix:`, `perf:`, `revert:` | patch |
| conventional header with `!` or `BREAKING CHANGE:` / `BREAKING-CHANGE:` footer | major (including `0.x`) |
| `chore`, `docs`, `test`, `ci`, `build`, `style`, `refactor`, other maintenance | no release |

The release workflow builds from source, tests Pi/typecheck/extraction seams, packs the extension, checks the archive and isolated discovery, then publishes the same versioned package to npm as `@fadhelhaidar/pi-plannotator-compact` and uploads **`plannotator-pi-extension.tgz`** to a stable GitHub Release tagged `v<version>`. It does not commit version churn back to main. Keep release tags on main history; checked-in versions are the first-release baseline, not the authoritative latest released version.

To bootstrap the renamed npm package:

1. Build and check the package from a clean checkout, then publish once by hand (`npm publish --access public` from `apps/pi-extension`). npm cannot create a brand-new package through OIDC. The previous package name is a separate npm package; it is not renamed automatically.
2. Register the trusted publisher on npmjs.com for `@fadhelhaidar/pi-plannotator-compact`: GitHub Actions, repository `FadhelHaidar/pi-plannotator-compact`, workflow `pi-extension-release.yml`. Subsequent publishing uses GitHub OIDC without an npm token.
3. Keep the existing release tags. Renaming the repository does not reset the version series; maintenance-only commits do not trigger a release. Subsequent release-worthy main commits advance the version and publish under the new name.
4. Check the published npm package and test installation before retiring the old package. Existing GitHub Release tarballs still contain their original package name until replaced by a new release.

## Origin, licenses and upstream porting

Original project: [backnotprop/plannotator](https://github.com/backnotprop/plannotator), by backnotprop and contributors. Extraction source: [FadhelHaidar/plannotator](https://github.com/FadhelHaidar/plannotator), branch **`compact-plan-tracker`**, commit **`cd97439a0b578c070f098813ff1c973c914cbfbd`**. Compact tracker and Alt+P changes originate in that fork.

The inherited project/Pi extension uses **MIT OR Apache-2.0**; `packages/ui` and `packages/core` explicitly use **Apache-2.0**. See [LICENSE-MIT](LICENSE-MIT), [LICENSE-APACHE](LICENSE-APACHE), [NOTICE](NOTICE), and preserved package/asset notices. This extraction does not relicense inherited code. Dependency licenses remain their own; this is not a legal audit.

[EXTRACTION-FILES.txt](EXTRACTION-FILES.txt) inventories the checked-in extraction files. This repository retains the Pi extension and its shared browser/runtime code, while removing other agent backends; Pi-only manifests, release/bootstrap adaptations, and compact-tracker behavior are intentional. Port upstream fixes into the corresponding source files under the preserved layout, not `apps/pi-extension/generated`. Run the source build, Pi/shared/UI tests, package closure and isolated discovery again; use the UI parity checklist before claiming browser equivalence. Non-Pi host integrations/workflows should not be reintroduced just to cherry-pick a shared fix.
