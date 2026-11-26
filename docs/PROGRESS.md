# Progress for Rule-Based Auto-Tagger

**Objective** Make tagging behavior configurable and explain what each command does.

**Progress** [##########] 100% of requested publication. Native UI verification remains a follow-up.

- [x] Reconcile the local checkout with the upstream 1.1.0 baseline.
- [x] Add current-note preview, subfolder scope, folder exclusions, and two suggestion controls to both settings renderers.
- [x] Preserve existing settings and defaults. Explain rule inputs, scope, and placement in Obsidian and the README.
- [x] Verify typecheck, build, smoke tests, and file-backed integration.
- [x] Publish [1.2.0](https://github.com/remriel/obsidian-rule-based-auto-tagger/releases/tag/1.2.0) through [GitHub Actions](https://github.com/remriel/obsidian-rule-based-auto-tagger/actions/runs/45882030097). Verify all three SHA-256 digests, the manifest version, and both asset attestations.
- [ ] Verify the new controls in native Obsidian. No personal vault changes were made.

## Ordered next steps

1. Load the build in a disposable vault on Obsidian 1.13+ and 1.5. Edit each setting, reopen the settings tab, and verify persistence after restart.
2. Run the current note, current folder, vault, and suggestion commands against fixtures. Confirm that previews match the configured scope and placement.
3. Confirm the community plugin updater offers 1.2.0.
