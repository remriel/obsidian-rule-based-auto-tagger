# Project state — Rule-Based Auto-Tagger 1.0.2

## Active worklog

**Goal:** Publish a patch release containing the latest settings fixes and verify its release assets and attestations.

**Owner:** Primary agent only. The user prohibits subagents.

**Status:** Complete. Public GitHub release [1.0.2](https://github.com/remriel/obsidian-rule-based-auto-tagger/releases/tag/1.0.2) was published on 2026-11-23 from tag commit `42d33598d1b5f61f24dc4eaf1b1692b309436f24`. Source fixes are in commit `29f2715decb839068ab02197ef07614ae9fce6f1`. GitHub Actions run [45263574433](https://github.com/remriel/obsidian-rule-based-auto-tagger/actions/runs/45263574433) passed. Release assets and attestations were verified.

## Architecture and important decisions

- `main.ts` owns Obsidian commands, settings, rule matching, suggestions, frontmatter reads, and writes; esbuild generates `main.js` and externalizes Obsidian.
- Rules persist a pattern, keyword/regex mode, case handling, and tags. Keyword rules match whole words or phrases. Batch changes are previewed and rechecked before writing. Added tags are deduplicated against frontmatter, inline, and cached tags.
- Keep the `minAppVersion` support floor at 1.5.0. Obsidian 1.13+ uses searchable declarative rule settings; older supported versions retain the legacy renderer.
- Commit `29f2715` handles rejected rule saves, guards the modern settings refresh with `requireApiVersion('1.13.0')`, and routes legacy refreshes through a private renderer. This preserves both settings APIs.
- Release workflow `.github/workflows/release.yml` runs on version tags, installs dependencies, typechecks/builds, validates version metadata, attests `main.js` and `styles.css`, then publishes `main.js`, `manifest.json`, and `styles.css`.
- Repository visibility is public. Do not change it.

## Release verification

- `package.json`, `package-lock.json`, `manifest.json`, and `versions.json` align at 1.0.2; the supported Obsidian floor remains 1.5.0.
- Actions run 45263574433 passed dependency install, typecheck, build, version validation, asset attestation, and GitHub release creation.
- Downloaded asset SHA-256 values matched GitHub release metadata:
  - `main.js`: `afe45e77e0bc22320d7f5334274076681662a72791bd6cb0877b17be1438526d`
  - `manifest.json`: `90086b5d331dfe56970bccea7b57fc3f7880527f562225934bbd1c706f948acf`
  - `styles.css`: `5ed2d5ba08cb9cf6a9fce8f7cc691a079c2eea54eff5a24180e7b1b95f699b67`
- `gh attestation verify` succeeded for `main.js` and `styles.css`. The 1.0.2 provenance identifies workflow `.github/workflows/release.yml`, tag `1.0.2`, and source commit `42d33598d1b5f61f24dc4eaf1b1692b309436f24`. The same `styles.css` is also covered by its unchanged 1.0.1 attestation.
- The source-fix commit's prior handoff reports smoke tests, typecheck, build, targeted lint, and diff checks passing. This release workflow itself runs typecheck/build but not the smoke suite.
- GitHub emitted a non-blocking Node.js 20 deprecation annotation for the pinned checkout/setup-node actions; the run succeeded under Node.js 24. Update the action pins before a future release.

## Limits and unresolved work

Native Obsidian settings interaction on 1.5 and 1.13+ remains unverified. The separate automatic review scanner was not available through connected GitHub tools, so its rescan result remains unknown. No personal vault was modified.

## RESUME HERE

No release work remains. The next useful checks are the settings flows in native Obsidian and the scanner result when accessible. If more changes are made, start a new patch from the current main branch and keep version metadata aligned.
