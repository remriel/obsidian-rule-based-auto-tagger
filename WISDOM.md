# Wisdom

## 1. What are you least confident about right now? What would you do differently?

I am least confident about behavior in a real Obsidian vault because the passing smoke tests mock the Obsidian API. I would exercise settings, tag placement, cancellation, and batch application against a disposable vault before relying on the plugin.

## 2. What is the biggest thing I am missing about the situation right now? What do I not realize? What would you do differently?

An individual private repository is a good source home but is not by itself a public Obsidian community listing. A future listing needs a public release repository, release assets, and an authorized submission. I would keep this repository private now and handle publication separately when requested.

## 3. What assumption did you make that, if wrong, would change your answer the most? What would you do differently?

I assumed MIT licensing is appropriate because the user's other Obsidian plugin repositories use MIT. If a different license is desired, I would replace the license before any public release.

## 2026-11-23 review follow-up

1. Least confident: native settings add, remove, and reorder behavior. I would exercise those actions on both Obsidian 1.5 and 1.13+ and reopen the tab to confirm persistence.
2. Biggest gap: the published plugin still points at 1.0.1. I would verify the hosted review against a fresh attested release when publishing.
3. Key assumption: the 1.5.0 support floor still matters. If that changes, I would remove the legacy renderer and set the floor to 1.13.0.

## Iteration 1, 2026-11-24

1. **What are you least confident about right now? What would you do differently?** Native behavior across Obsidian 1.5 and 1.13+ is the least certain. I would reopen each settings renderer after changing placement and check that Obsidian indexes the appended tags.
2. **What's the biggest thing I'm missing about the situation right now? What don't I realize? What would you do differently?** The green 1.0.2 review and baseline checks cover the published version. I would require a fresh 1.1.0 build and smoke run before interpreting the version bump as a verified milestone.
3. **What assumption did you make that, if wrong, would change your answer the most? What would you do differently?** I assumed the end of each test note accepts a Markdown tag line. I would include a note with an unclosed code fence in the disposable-vault test. If Obsidian treats the line as code, I'd document the outcome and discuss how to handle that case before changing placement behavior.

## Iteration 2, 2026-11-24

1. **What are you least confident about right now? What would you do differently?** Native tag indexing after an unclosed fence. I would inspect the written note and query Obsidian's metadata cache in the isolated test instance.
2. **What's the biggest thing I'm missing about the situation right now? What don't I realize? What would you do differently?** The file-backed adapter supplies its own YAML handling and has no metadata cache. A passing integration run would establish the plugin's disk changes through that adapter. I would verify YAML rewriting, tag indexing, and persisted settings independently in Obsidian.
3. **What assumption did you make that, if wrong, would change your answer the most? What would you do differently?** I assumed the operator can run Node and start an isolated Obsidian profile outside the sandbox. If Obsidian still refuses to start independently, I would use a separate test machine or OS account.

## Iteration 3, 2026-11-24

1. **What are you least confident about right now? What would you do differently?** The repaired integration suite has not run, and the legacy Obsidian 1.5 settings renderer remains unverified. I would run the full npm sequence in the operator shell and verify the dropdown's rendering and persistence in an isolated 1.5 profile.
2. **What's the biggest thing I'm missing about the situation right now? What don't I realize? What would you do differently?** Inline tags can be present in the file and absent from Obsidian's index. The operator saw this with an unclosed code fence. I would keep metadata-cache assertions alongside byte assertions in native testing.
3. **What assumption did you make that, if wrong, would change your answer the most? What would you do differently?** I assumed the missing `addClass` explains the prior integration crash and the remaining fake APIs cover the tested paths. If the next run exposes another mismatch, I would compare it with the native results before deciding whether to fix the fake or the plugin.

## 2026-11-26 settings iteration

1. **Least confident:** Native rendering and persistence of the new controls. I’d verify both settings renderers in disposable Obsidian vaults.
2. **Biggest gap:** Users still have to leave settings to find out why a rule matched. I’d put a rule test against the active note beside the editor.
3. **Key assumption:** Tagging should continue to start from the command palette. If you want tagging on save, I’d make that opt-in and give it a separate folder scope.
