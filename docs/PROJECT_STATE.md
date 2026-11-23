# Project state — Rule-Based Auto-Tagger

## Active worklog (2026-11-23)

**Goal:** Publish version 1.0.2 with the settings review fixes already committed to `main`, and verify the release assets and attestations.

**Owner:** Primary agent only. The user's current instructions prohibit subagents.

**Current state:** Repository `remriel/obsidian-rule-based-auto-tagger` is public. The 1.0.1 release is published from the earlier source commit. Local `main` matches `origin/main` at `29f2715decb839068ab02197ef07614ae9fce6f1`; this later commit contains the 1.0.2 fixes. Version metadata is now being prepared for 1.0.2. No new release tag has been pushed yet.

**Release authorization:** The user asked to publish a new release with fixes. This authorizes publishing the new GitHub release; no live Obsidian vault install is requested.

## Architecture and decisions

- `main.ts` owns plugin commands, settings, rule matching, suggestions, frontmatter reads, and writes; `main.js` is generated with esbuild and externalizes Obsidian.
- Tag rules persist pattern, keyword/regex mode, case sensitivity, and tags. Keyword matches are whole words/phrases. Batch writes are previewed and rechecked before application. New tags are deduplicated against frontmatter, inline, and cached tags.
- Keep `minAppVersion: 1.5.0`. Obsidian 1.13+ uses searchable declarative rule settings; older supported versions retain the legacy renderer.
- Commit `29f2715` handles save failures in rule updates, guards modern settings refresh with `requireApiVersion('1.13.0')`, and keeps legacy settings refresh on its own renderer. The existing smoke, typecheck, build, targeted lint, and diff checks were reported passing for this commit.
- The release workflow in `.github/workflows/release.yml` runs on numeric version tags, installs dependencies, typechecks/builds, validates `package.json`, `manifest.json`, and `versions.json`, attests `main.js` and `styles.css`, and creates a GitHub release with those files plus `manifest.json`.
- GitHub repository visibility is public. Do not alter it.

## Verified prior release state

- Release 1.0.1 is published; GitHub reports its workflow succeeded.
- The latest source fixes were committed after the 1.0.1 tag. Version 1.0.2 is required to distribute them.
- README describes local-only matching. Vault and folder commands enumerate Markdown paths locally because previews require it.

## Verification limits

Native Obsidian behavior, including legacy settings on 1.5 and searchable settings on 1.13+, has not been tested in a real app. The separate automatic review scan was unavailable through connected GitHub tools in the prior handoff. No personal vault was changed.

## RESUME HERE

Finish aligning 1.0.2 metadata, inspect `git diff --check`, commit and push `main`, then push tag `1.0.2`. Wait for the release workflow; verify its success, three release assets, SHA-256 digests and attestations for `main.js`/`styles.css`. Update these docs, WISDOM.md, the Avernus project pointer/session log, and the current thread archive.
