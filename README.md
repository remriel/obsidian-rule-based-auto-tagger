# Rule-Based Auto-Tagger

A free, local Obsidian plugin for a controlled tag taxonomy. It uses keyword and regular expression rules, and suggests tags using simple word frequency. No LLM, account, network request, or API key is used.

## Install

1. Obtain manifest.json, main.js, and styles.css from this folder.
2. Create a folder named rule-based-auto-tagger inside your vault at .obsidian/plugins/.
3. Copy those three files into that folder.
4. In Obsidian, reload the app, open Settings > Community plugins, and enable Rule-Based Auto-Tagger.

For a source build, install Node.js and run npm install, then npm run build in this folder. The build writes main.js. Run npm test for the mocked smoke checks. Build verified 2026-11-23: npm install, npm run build, and npm test all pass, and main.js is the esbuild output.

## Rules

Open Settings > Rule-Based Auto-Tagger. Add or remove rules, choose a keyword or phrase or a JavaScript regular expression, toggle case-insensitive matching, and enter tags separated by commas or spaces. Omit regex slash delimiters and flags; use the toggle for case handling. Keywords match complete words or phrases, not fragments inside a larger word. Matching examines the note body, not its frontmatter.

Tags may contain letters, numbers, underscores, hyphens, and nested slashes; a tag must include a letter, underscore, or hyphen. A leading hash is optional. Empty or invalid rules are skipped, with a notice when a command runs. Regular expressions run locally and should be kept simple enough to finish promptly.

Starter rules cover machine learning, artificial intelligence, AI, meeting, and project. For example, the phrase Machine Learning adds #ai and #ml. Edit or remove these defaults to match your taxonomy. Rule edits are saved with the plugin settings.

## Commands

Open the command palette and choose:

- Tag current note: apply matching rules to the active Markdown note.
- Tag vault: preview the proposed changes throughout the vault, then apply or cancel.
- Tag current folder: preview the active note folder and all its subfolders, then apply or cancel. If the note is at the vault root, this covers the vault.
- Suggest tags for current note: review locally counted keywords, choose suggestions, and add the selected tags.

New tags are written to the frontmatter tags property. Existing tags in frontmatter or inline are checked case-insensitively, so a matching existing tag is not added again. Inline text is not rewritten. During a batch, each note is checked again before writing, and only tags shown in its preview can be added. Notes with malformed or unsupported frontmatter are skipped. Reports show skipped or failed counts; details appear in the developer console.

Suggestions are ranked by word count, exclude common English stop words and existing tags, and ignore fenced code blocks. They are suggestions, not a controlled taxonomy: inspect them before adding them.

## Privacy and scope

All matching happens locally inside Obsidian. The plugin makes no network calls. It does not automatically modify notes on save; commands run only when invoked. This is an independent plugin and has not been submitted to the Obsidian community plugin directory.

## Background

The requested workflow is inspired by the Obsidian Forum discussion [Automatic Tag Generation](https://forum.obsidian.md/t/automatic-tag-generation/14574).

## License

MIT. See [LICENSE](LICENSE).
