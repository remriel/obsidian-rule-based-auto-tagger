# Verification addendum — 2026-11-23 ~11:09 PT (independent, plain SSH)

Codex's own SUMMARY.md says the build was BLOCKED. That was true inside
Codex's sandboxed shell only. Independent verification outside the sandbox
passed:

- `npm install`: exit 0. Added 16 packages, audited 17, 0 vulnerabilities.
  (One warning: esbuild postinstall script not yet covered by allowScripts.)
- `npm run build`: exit 0. `main.js` 17.3kb, rebuilt 11:08 AM (17,756 bytes),
  replacing Codex's hand-written 18,281-byte main.js.
- `npm test` (`node tests/smoke.cjs`): exit 0. "Smoke checks passed."

Root cause of Codex's failure: `npm`/`node` child processes under Codex's
sandbox failed at process startup with Windows error 0xC0000142
(= -1073741502, the known Terra Max failure mode on Remy). Plain SSH runs
the same commands fine. The project itself is sound.

Repo status (unchanged): NOT created. `gh` 2.105.0 is installed on Remy
but not logged into any GitHub hosts (`gh auth status`: "You are not
logged into any GitHub hosts. To log in, run: gh auth login"). The workdir
is not a git repo. Blocked step: `gh auth login` on Remy with an account
that can create private repos, then `gh repo create obsidian-daily-plugins
--private` and push.

Model used: Codex Terra Max (gpt-6.1-terra, reasoning effort max).
Run time: ~18 minutes. Codex wrote all project files successfully; only
child-process execution under its sandbox failed.
