# Rule-Based Auto-Tagger

A free, local Obsidian plugin for a controlled tag taxonomy. It uses keyword and regular expression rules, and suggests tags using simple word frequency. No LLM, account, network request, or API key is used.

## Install

Install the current published release from the [Obsidian community directory](https://obsidian.md/plugins?id=rule-based-auto-tagger), or install a local build manually.

1. Obtain manifest.json, main.js, and styles.css from this folder.
2. Create a folder named rule-based-auto-tagger inside your vault at .obsidian/plugins/.
3. Copy those three files into that folder.
4. In Obsidian, reload the app, open Settings > Community plugins, and enable Rule-Based Auto-Tagger.

For a source build, install Node.js and run npm ci, npm run typecheck, and npm run build in this folder. The build writes main.js. Run npm test for the mocked smoke checks.

## Releases

Releases are published from version tags such as 1.0.2. Keep the versions in package.json, manifest.json, and versions.json aligned, then push the tag. The GitHub Actions release workflow builds the plugin, creates the release with main.js, manifest.json, and styles.css, and generates GitHub artifact attestations for main.js and styles.css.

## Settings

Open **Settings → Rule-Based Auto-Tagger**.

| Setting | What it controls | Default |
| --- | --- | --- |
| Where to put new tags | Write to the frontmatter `tags` property or append an inline tag line. | Frontmatter |
| Preview current note before tagging | Ask for confirmation when you run **Tag current note**. Both batch commands always require confirmation. | Off |
| Include subfolders | Include descendants when you run **Tag current folder**. At the vault root, turning this off scans root notes only. | On |
| Exclude folders from batch tagging | Enter one case-sensitive, vault-relative path per line, such as `Templates` or `Work/Archive`. Both batch commands skip these folders and their descendants. | Empty |
| Maximum suggestions | Limit the number of keyword suggestions shown. | 10 |
| Minimum keyword occurrences | Require each suggested word to occur at least this many times. | 1 |

For example, add `Templates` to the exclusions to leave templates out of vault-wide tagging. Turn on the current-note preview to try out a rule on one note before using it across the vault.

## Rules

Open Settings > Rule-Based Auto-Tagger. Add or remove rules, choose a keyword or phrase or a JavaScript regular expression, toggle case-insensitive matching, and enter tags separated by commas or spaces. Omit regex slash delimiters and flags; use the toggle for case handling. Keywords match complete words or phrases, not fragments inside a larger word. Matching examines the note body, not its frontmatter.

Tags may contain letters, numbers, underscores, hyphens, and nested slashes; a tag must include a letter, underscore, or hyphen. A leading hash is optional. Empty or invalid rules are skipped, with a notice when a command runs. Regular expressions run locally and should be kept simple enough to finish promptly.

Starter rules cover machine learning, artificial intelligence, AI, meeting, and project. For example, the phrase Machine Learning adds #ai and #ml. Edit or remove these defaults to match your taxonomy. Rule edits are saved with the plugin settings.

## Commands

Open the command palette and choose:

- Tag current note: apply matching rules to the active Markdown note.
- Tag vault: preview the proposed changes throughout the vault, then apply or cancel.
- Tag current folder: preview changes in the active note’s folder, using the subfolder and exclusion settings, then apply or cancel.
- Suggest tags for current note: review locally counted keywords, choose suggestions, and add the selected tags.

In **Where to put new tags**, choose **Frontmatter** (the default) to add tags to the frontmatter `tags` property, or **Inline, at end of note** to append a single line such as `#ai #ml`. Inline placement preserves the frontmatter and existing body text. Both placements check frontmatter, inline, and cached tags for duplicates case-insensitively. Batch previews show the placement before you apply. During a batch, each note is checked again before writing, and only tags shown in its preview can be added. Notes with malformed or unsupported frontmatter are skipped. Reports show skipped or failed counts; details appear in the developer console.

If a note ends inside an unclosed code fence, appended inline tags are treated as code. Obsidian indexes them once the fence is closed above the tag line.

Suggestions are ranked by word count, exclude common English stop words and existing tags, and ignore fenced code blocks. They are suggestions, not a controlled taxonomy: inspect them before adding them.

## Privacy and scope

All matching happens locally inside Obsidian. The plugin makes no network calls. Tag vault and Tag current folder enumerate Markdown paths in the chosen scope and read those notes to build a preview; no changes happen until you apply it. It does not automatically modify notes on save; commands run only when invoked.

## Background

The requested workflow is inspired by the Obsidian Forum discussion [Automatic Tag Generation](https://forum.obsidian.md/t/automatic-tag-generation/14574).

## License

MIT. See [LICENSE](LICENSE).
