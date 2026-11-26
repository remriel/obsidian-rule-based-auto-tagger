# Project state for Rule-Based Auto-Tagger

## Active worklog, 2026-11-26

- Goal: make tagging options configurable and understandable. Owner: primary agent.
- The checkout was fast-forwarded to `cb3a12e` and tag `1.1.0` before editing. The earlier release candidate notes below describe historical work.
- `BEHAVIOR_OPTIONS` supplies labels, defaults, and control ranges for the modern and legacy renderers. `updateBehavior` validates both saved data and new control values. Old data retains its rules, placement, and previous default behavior. A failed save no longer blocks later queued saves.
- `previewBatch` excludes configured vault-relative folders and descendants before reading notes. Exclusions use case-sensitive path prefixes with a slash boundary. Single-note tagging remains available in those folders, including through the optional preview. A folder command can restrict its scan to direct children.
- `suggestKeywords` filters by the minimum occurrence count before ranking and limiting. Both defaults preserve 1.1.0 results.
- Modern rule entries use their pattern as the name and explain what tags they add. Settings explain the distinction between rule commands and keyword suggestions.
- Typecheck, build, mocked smoke checks, and file-backed integration pass. Native rendering of the new controls remains unverified. The settings iteration is published as [1.2.0](https://github.com/remriel/obsidian-rule-based-auto-tagger/releases/tag/1.2.0), tagged at `6b475b4`. [GitHub Actions](https://github.com/remriel/obsidian-rule-based-auto-tagger/actions/runs/45882030097) passed. The downloaded release files match all three published SHA-256 digests and the attestations for main.js and styles.css verify against refs/tags/1.2.0.

## Previous worklog, 2026-11-24

- Goal: finalize the local 1.1.0 release candidate in Iteration 3. Owner: primary agent for harness and documentation, operator for external-shell verification and any subsequent publication.
- Scope: no real vaults, native app launch, version bump, compatibility-floor change, or publication. The published baseline is 1.0.2 per the operator's community review.
- Decision: add the modal's missing `addClass` API to the integration fake and retain plugin behavior. The operator isolated the previous integration crash to the harness and verified the real modal and commands in Obsidian 1.15.1.
- Decision: document the unclosed code fence behavior. Inline writing appends after the code text, so Obsidian indexes the tags once the fence closes above the tag line. The native cache showed a single code section and no tags in the original fixture.

## Architecture and evidence

- `main.ts` owns rules, commands, modal previews, settings, and writes. esbuild bundles the plugin with Obsidian externalized. The release workflow is tag-triggered.
- `onload` normalizes missing and invalid placement to frontmatter while preserving rules. The declarative and legacy settings renderers share placement choices and persistence.
- `writeTags` serves all write paths. Frontmatter uses `processFrontMatter`. Inline uses `Vault.process` and rechecks against the updated text. Batch apply honors the previewed placement. Both paths deduplicate case-insensitively across existing tag locations.
- `tests/smoke.cjs` covers migration and simulated note and preview behavior. `tests/integration.cjs` installs the bundle into a temporary vault and compares file bytes after commands and modal clicks. Its YAML adapter covers fixture scalar and flow-list tags. Cache lookups return null. Use native testing for Obsidian parsing, indexing, and settings rendering.
- The integration DOM fake implements `empty`, `addClass`, `createEl`, `createDiv`, `createSpan`, and `addEventListener`. The plugin does not use `setAttr`.

## Native test setup lessons

- A fresh Obsidian profile defaults to safe mode on. Community plugins load after enabling them with `app.plugins.setEnable(true)`.
- With a custom `--user-data-dir`, the vault-path argument and `obsidian.json` with `open:true` failed to open the vault automatically. The operator opened it from the starter page using `ipcRenderer.sendSync("vault-open", <path>, false)`.
- Obsidian 1.15.1 renders modals in the active window when the Settings window is open. Account for this in CDP tests.
- The legacy Obsidian 1.5 renderer remains unverified. The full operator results are in [PROGRESS.md](PROGRESS.md).

## Environment and open work

- CMD built-ins and Python worked. PowerShell, Node REPL, npm, and Git hit Windows startup error `0xC0000142`. File edits and static verification used Python and V8 syntax parsing. The earlier built bundle remains in place pending an external-shell rebuild.
- Miyo was blocked by the approval policy. The local Avernus fallback path was missing and the designated G: path returned access denied. The session archive is pending.

## RESUME HERE

Start from the updated main source and built bundle. Check the new settings in a disposable vault on modern and legacy Obsidian versions, following the ordered checks in PROGRESS.md. Check that the community updater offers the already published 1.2.0. Keep the 1.5.0 support floor until there is a decision to change it.
