# Project state

## Goal, instructions, and ownership

Build and publish only the Day 1 Rule-Based Auto-Tagger Obsidian plugin. The primary agent owns implementation, verification, documentation, and publishing; no subagents. The user clarified on 2026-11-23 that each plugin needs its own repository, with plugin files at the repository root. The plugin repository must be private, and no submission to the Obsidian community directory is authorized.

## Architecture and decisions

- main.ts implements the plugin, settings, modal dialogs, rule engine, tag detection, and suggestions. manifest.json identifies version 1.0.0; styles.css is scoped to this plugin.
- Rules persist in the plugin settings. Keyword rules match whole words or phrases; regex rules use JavaScript syntax. Each has a case-insensitive toggle and one or more tags. Invalid rules are skipped with a notice.
- Starter rules cover machine learning, artificial intelligence, AI, meeting, and project.
- New tags are written to frontmatter. Existing frontmatter, inline, and cached tags are treated as duplicates without regard to case; inline text is not rewritten.
- Vault and folder scans preview exact additions and require confirmation. Folder scope includes descendants. Each note is read again at apply time, and only previously previewed tags that still match can be added.
- Suggested tags use local word frequency and user selection. Frontmatter is excluded from rule matching and suggestions.
- Malformed or unsupported frontmatter is skipped, with counts in notices and details in the console.
- LICENSE uses MIT, matching the user's existing obsidian-untitled-auto-title and morning-pages-analytics plugin repositories.

## Verified current state

- npm install, npm run build, and npm test all succeeded on 2026-11-23. The build generated main.js with esbuild and npm reported no vulnerabilities.
- The smoke suite uses mocked Obsidian APIs; actual behavior in Obsidian desktop or mobile has not been verified.
- gh auth status identifies remriel. https://github.com/remriel/obsidian-rule-based-auto-tagger was created and verified PRIVATE; initial synchronization is in progress.
- Before the user clarified the separate-repository requirement, https://github.com/remriel/obsidian-daily-plugins was created. It is PRIVATE and empty; no code was pushed there. It has been left untouched rather than deleted.
- Miyo listed Avernus, Remy, Codex, and an empty sessions folder; an unscoped task-specific search covered available indexed folders. Avernus was read at G:\Other computers\My Laptop\Drive\Avernus. C:\Drive\Avernus remains unavailable.
- The original sandbox could not start Node, npm, git, or gh and returned 0xC0000142. The resumed environment runs those tools successfully. VERIFICATION.md preserves an independent, time-stamped verification from between sessions; its earlier GitHub auth status is historical.
- A session archive is to be written under the designated Avernus vault before the response.

## Limitations and important context

- A private repository cannot by itself serve as the public release repository for an Obsidian community listing. Obsidian permits private source with a separate public release-assets repository and app access; publication or submission was not requested here. See https://docs.obsidian.md/community-directory/manage-entry and https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin.
- No GitHub release or Obsidian community submission has been created.
- Custom regular expressions run on the UI thread and have no timeout.
- A stale metadata cache may conservatively suppress a tag. A concurrent inline edit between the last read and frontmatter write is not locked by this plugin.
- Suggestions use English stop words and are not a substitute for a controlled taxonomy.

## RESUME HERE

Complete and verify the initial push to the private per-plugin repository. Refresh these notes to show the verified commit and keep the remote synchronized. Archive the visible conversation in Avernus. A future user-authorized community listing needs a public release repository, matching version tag and release assets, and submission; first run the plugin in a disposable real Obsidian vault.
