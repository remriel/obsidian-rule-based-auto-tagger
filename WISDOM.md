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

## 2026-11-23 — Rule-Based Auto-Tagger 1.0.2 release

1. **Least confident:** Native Obsidian settings behavior on 1.5 and 1.13+ is still untested. I would check add, remove, reorder, persistence, and reopening in a disposable vault on both API generations.
2. **Biggest gap:** Passing CI and artifact attestations do not confirm that the settings feel correct inside Obsidian or that the external scanner accepted the release. I would do those checks before calling runtime behavior verified.
3. **Most consequential assumption:** “Publish a new release” meant a GitHub release with attested assets. If the intended deliverable also includes a Community Plugins listing or installation into the Remy vault, I would handle that as a separate authorized step.
