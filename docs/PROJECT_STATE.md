# Project state

## Active worklog

**Goal:** Fix the findings from the 1.0.0 review and publish a new patch release whose release assets carry GitHub artifact attestations, allowing the scanner to inspect the fixes automatically.

**Owner:** Primary agent only. The user explicitly prohibited subagents.

**Current instructions:** Keep project state and progress here current; keep GitHub synchronized; update WISDOM.md and archive the visible conversation in Avernus. Miyo searches are required at session start, but Miyo is unavailable on this host; local Avernus and Remy searches are the fallback. The active Codex thread is 01a20a09-e09c-7be3-9c8d-66f1a063ac09.

**Current work:** Source fixes and release automation are implemented locally. Typecheck and build passed. No commit, push, tag, release, review scan, or archive update has happened yet.

## Verified repository and release state

- Repository: https://github.com/remriel/obsidian-rule-based-auto-tagger
- Live GitHub metadata reported the repository as PUBLIC on 2026-11-23. This overrides earlier notes that said PRIVATE; do not change visibility during this task.
- The clone started clean at commit 12df0bd, tag 1.0.0, on main.
- GitHub has one published release, 1.0.0, with main.js, manifest.json, and styles.css. Its main.js and styles.css lacked artifact attestations according to the supplied review.
- The report passes network analysis and vault reads. It recommends calling out vault enumeration because the explicit Tag vault and Tag current folder commands list Markdown paths. That behavior is required for their previews, is invoked by the user, and remains local; it is not an unexpected network flow.

## Architecture and important decisions

- main.ts owns the Obsidian plugin class, command handlers, settings, modal dialogs, matching, suggestions, frontmatter reads, and writes. main.js is generated with esbuild and externalizes Obsidian.
- Settings rules persist as pattern, keyword/regex mode, case sensitivity, and tags. Keyword matching is whole-word/phrase; regex patterns use JavaScript syntax.
- Batch changes are previewed before apply and rechecked at write time. Tags are written to frontmatter and deduplicated against frontmatter, inline, and cached tags.
- Use typed named imports from obsidian and explicit types throughout. parseYaml and loadData return any in the Obsidian declarations, so values enter as unknown and are narrowed before use. processFrontMatter also uses an any callback in the API; the callback is explicitly typed unknown and narrowed.
- Preserve minAppVersion 1.5.0. For Obsidian 1.13+, implement declarative searchable rule pages with getSettingDefinitions(); retain display() for older clients. This avoids dropping support for existing users.
- Version the code as 1.0.1. Keep package.json, manifest.json, and versions.json aligned.
- The tag-push workflow builds and typechecks, validates version files against the tag, attests the exact root main.js and styles.css, and creates the GitHub release with main.js, manifest.json, and styles.css. GitHub actions are pinned to immutable commit SHAs.
- The repository is public, so GitHub artifact attestations are available under the documented public-repository policy.

## Relevant files and components

- main.ts: typed plugin implementation, dual legacy/declarative settings APIs, frontmatter logic.
- main.js: built release artifact.
- styles.css: release asset, unchanged by this work.
- manifest.json, package.json, package-lock.json, versions.json: aligned 1.0.1 metadata.
- tsconfig.json and package.json: strict TypeScript typecheck script.
- .github/workflows/release.yml: tag-triggered build, attestation, release creation.
- tests/smoke.cjs: existing mocked smoke checks; unchanged and not run during this task.
- docs/PROGRESS.md: active checklist and next steps.
- WISDOM.md: required reflection for this task.

## Verification and limitations

- npm ci installed dependencies and reported 0 vulnerabilities.
- npx tsc --noEmit --strict passed after the source typing changes.
- npm run typecheck passed.
- npm run build passed and generated main.js at 20.7 kB.
- npm test was not run. Native Obsidian runtime behavior, the new settings search in Obsidian 1.13+, GitHub Actions execution, release attestations, and the scanner result remain unverified until the release workflow completes.
- The initial review's vault enumeration recommendation is expected from user-invoked vault/folder preview commands; no code change can remove that behavior while preserving those commands.

## Known bugs and unresolved questions

- User-authorized release publication is inferred from the supplied report text and the request to fix Reviews; this task is preparing 1.0.1.
- The CI release workflow must be observed after pushing the version tag. Verify release asset digests and run gh attestation verify for main.js and styles.css.
- The review scanner may continue to show the informational vault enumeration recommendation.
- Native Obsidian desktop/mobile UI and the older-version fallback settings tab still need runtime checks outside this release task.

## RESUME HERE

Review the local diff and release workflow, update package-lock.json to 1.0.1 if needed, and run git diff --check. Then commit and push main, push tag 1.0.1, monitor the tag-triggered Actions workflow, and verify that the published main.js/styles.css match the tag build and pass GitHub attestation verification. Check the automatic review scan. Finally update this worklog, docs/PROGRESS.md, WISDOM.md, the Avernus project pointer/session log, and the per-thread archive, and verify those writes.
## 2026-11-23 review follow-up

Owner: primary agent. The 1.0.1 review flagged modern settings refresh calls, callback return types, a duplicated heading, deprecated internal calls, and two TypeScript lint issues. The previous 1.0.1 release is published.

Keep the 1.5.0 floor and both settings renderers. In main.ts, saveRuleList handles rejected saves and guards the modern settings refresh with requireApiVersion('1.13.0'). The legacy lifecycle method delegates to a private renderer. The CommonJS export retains its existing shape with a typed module declaration.

## RESUME HERE

The follow-up changes passed targeted ESLint, typecheck, build, smoke tests, and diff checks. Native settings interaction and the hosted review remain unverified. If preparing a release, use a new version and numeric tag so the existing attestation workflow builds and publishes it.
