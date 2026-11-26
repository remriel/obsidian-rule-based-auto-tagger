"use strict";

// main.ts
var import_obsidian = require("obsidian");
var BEHAVIOR_DEFAULTS = {
  previewCurrentNote: false,
  includeSubfolders: true,
  excludedFolders: "",
  suggestionLimit: 10,
  minimumOccurrences: 1
};
var BEHAVIOR_OPTIONS = [
  {
    name: "Preview current note before tagging",
    desc: "Review the proposed tags before Tag current note writes them. Batch commands always show a preview.",
    control: { type: "toggle", key: "previewCurrentNote", defaultValue: BEHAVIOR_DEFAULTS.previewCurrentNote }
  },
  {
    name: "Include subfolders",
    desc: "Scan nested folders when running Tag current folder. Turn off to scan only the active note\u2019s folder.",
    control: { type: "toggle", key: "includeSubfolders", defaultValue: BEHAVIOR_DEFAULTS.includeSubfolders }
  },
  {
    name: "Exclude folders from batch tagging",
    desc: "Enter one vault-relative folder path per line, such as Templates or Work/Archive. The folder and its descendants are skipped by both batch commands.",
    control: { type: "textarea", key: "excludedFolders", defaultValue: BEHAVIOR_DEFAULTS.excludedFolders, placeholder: "Templates" }
  },
  {
    name: "Maximum suggestions",
    desc: "Limit how many keywords Suggest tags for current note shows.",
    control: { type: "slider", key: "suggestionLimit", defaultValue: BEHAVIOR_DEFAULTS.suggestionLimit, min: 1, max: 50, step: 1 }
  },
  {
    name: "Minimum keyword occurrences",
    desc: "Require each suggested keyword to appear this many times in the note body.",
    control: { type: "slider", key: "minimumOccurrences", defaultValue: BEHAVIOR_DEFAULTS.minimumOccurrences, min: 1, max: 10, step: 1 }
  }
];
function updateBehavior(settings, key, value) {
  const control = BEHAVIOR_OPTIONS.find((option) => option.control.key === key)?.control;
  if (!control) return false;
  switch (control.type) {
    case "toggle":
      if (typeof value !== "boolean") return false;
      settings[control.key] = value;
      return true;
    case "textarea":
      if (typeof value !== "string") return false;
      settings[control.key] = value;
      return true;
    case "slider":
      if (typeof value !== "number" || !Number.isInteger(value) || value < control.min || value > control.max) return false;
      settings[control.key] = value;
      return true;
  }
}
var TAG_PLACEMENT_NAME = "Where to put new tags";
var TAG_PLACEMENT_DESCRIPTION = "Existing frontmatter and inline tags both count as duplicates in either mode.";
var TAG_PLACEMENT_OPTIONS = {
  frontmatter: "Frontmatter",
  inline: "Inline, at end of note"
};
var STARTER_RULES = [
  { pattern: "machine learning", mode: "keyword", ignoreCase: true, tags: "ai, ml" },
  { pattern: "artificial intelligence", mode: "keyword", ignoreCase: true, tags: "ai" },
  { pattern: "ai", mode: "keyword", ignoreCase: true, tags: "ai" },
  { pattern: "meeting", mode: "keyword", ignoreCase: true, tags: "meeting" },
  { pattern: "project", mode: "keyword", ignoreCase: true, tags: "project" }
];
var VALID_TAG = /^(?=.*[\p{L}_-])[\p{L}\p{N}_-]+(?:\/[\p{L}\p{N}_-]+)*$/u;
var STOP_WORDS = new Set("about above after again against all also among and any are around because been before being below between both but can could did does doing down during each even every few for from further get had has have having her here hers herself him himself his how into its itself just may more most much must nor not now off once only other our ours ourselves out over own same she should some such than that the their theirs them themselves then there these they this those through too under until very was were what when where which while who whom why will with would you your yours yourself yourselves".split(" "));
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizeRule(value) {
  if (!isRecord(value)) return null;
  return {
    pattern: typeof value.pattern === "string" ? value.pattern : "",
    mode: value.mode === "regex" ? "regex" : "keyword",
    ignoreCase: value.ignoreCase !== false,
    tags: typeof value.tags === "string" ? value.tags : ""
  };
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function getRuleSetting(settings, key) {
  const match = /^rules\.(\d+)\.(pattern|mode|ignoreCase|tags)$/.exec(key);
  if (!match) return null;
  const rule = settings.rules[Number(match[1])];
  if (!rule) return null;
  return { rule, property: match[2] };
}
function cleanTag(value) {
  return String(value).trim().replace(/^#+/, "");
}
function tagKey(value) {
  return cleanTag(value).toLowerCase();
}
function parseTagInput(value) {
  const tags = [];
  const invalid = [];
  const seen = /* @__PURE__ */ new Set();
  for (const part of String(value || "").split(/[,\s]+/).filter(Boolean)) {
    const tag = cleanTag(part);
    if (!VALID_TAG.test(tag)) {
      invalid.push(part);
    } else if (!seen.has(tagKey(tag))) {
      seen.add(tagKey(tag));
      tags.push(tag);
    }
  }
  return { tags, invalid };
}
function escapeRegex(value) {
  const special = "\\^$.*+?()[]{}|/";
  return Array.from(
    value,
    (character) => special.includes(character) ? "\\" + character : character
  ).join("");
}
function compileRules(rules) {
  const compiled = [];
  const errors = [];
  for (const [index, rule] of rules.entries()) {
    const pattern = String(rule.pattern || "").trim();
    const parsed = parseTagInput(rule.tags);
    if (!pattern && !String(rule.tags || "").trim()) continue;
    if (!pattern || !parsed.tags.length || parsed.invalid.length) {
      errors.push("Rule " + (index + 1) + " needs a pattern and valid tags.");
      continue;
    }
    try {
      const source = rule.mode === "regex" ? pattern : "(^|[^\\p{L}\\p{N}_])" + escapeRegex(pattern) + "(?=$|[^\\p{L}\\p{N}_])";
      const regex = new RegExp(source, rule.ignoreCase ? "iu" : "u");
      compiled.push({ regex, tags: parsed.tags });
    } catch {
      errors.push("Rule " + (index + 1) + " has an invalid regular expression.");
    }
  }
  return { compiled, errors };
}
function splitFrontmatter(content) {
  const opening = /^\uFEFF?---[ \t]*(?:\r?\n|$)/.test(content);
  const found = /^\uFEFF?---[ \t]*\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m.exec(content);
  const match = found && found.index === 0 ? found : null;
  if (opening && !match) throw new Error("Unclosed frontmatter");
  return match ? { yaml: match[1], body: content.slice(match[0].length) } : { yaml: null, body: content };
}
function readTagField(value) {
  if (value === void 0 || value === null || value === "") return [];
  if (typeof value === "string") return value.split(/[,\s]+/).filter(Boolean);
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
    return value.slice();
  }
  throw new Error("The frontmatter tags property must be text or a list of text");
}
function collectExistingTags(content, cache) {
  const existing = /* @__PURE__ */ new Set();
  const parts = splitFrontmatter(content);
  if (parts.yaml !== null) {
    const frontmatter = (0, import_obsidian.parseYaml)(parts.yaml);
    if (frontmatter !== null && frontmatter !== void 0 && !isRecord(frontmatter)) {
      throw new Error("Frontmatter must be a YAML mapping");
    }
    const values = isRecord(frontmatter) ? frontmatter.tags : void 0;
    for (const tag of readTagField(values)) {
      existing.add(tagKey(tag));
    }
  }
  const inline = /(?:^|[^\p{L}\p{N}_/#])#([\p{L}\p{N}_-]+(?:\/[\p{L}\p{N}_-]+)*)/gu;
  let match;
  while ((match = inline.exec(parts.body)) !== null) existing.add(tagKey(match[1]));
  if (cache) {
    for (const tag of (0, import_obsidian.getAllTags)(cache) || []) existing.add(tagKey(tag));
  }
  return existing;
}
function matchRules(content, compiled) {
  const body = splitFrontmatter(content).body;
  const matched = [];
  const seen = /* @__PURE__ */ new Set();
  for (const rule of compiled) {
    if (!rule.regex.test(body)) continue;
    for (const tag of rule.tags) {
      const key = tagKey(tag);
      if (!seen.has(key)) {
        seen.add(key);
        matched.push(tag);
      }
    }
  }
  return matched;
}
function proposedTags(content, cache, compiled) {
  const existing = collectExistingTags(content, cache);
  return matchRules(content, compiled).filter((tag) => !existing.has(tagKey(tag)));
}
function suggestKeywords(content, cache, limit = BEHAVIOR_DEFAULTS.suggestionLimit, minimumOccurrences = BEHAVIOR_DEFAULTS.minimumOccurrences) {
  const existing = collectExistingTags(content, cache);
  const fences = String.fromCharCode(96).repeat(3);
  const body = splitFrontmatter(content).body.replace(new RegExp(fences + "[\\s\\S]*?" + fences, "g"), " ").replace(/(?:^|[^\p{L}\p{N}_/#])#[\p{L}\p{N}_/-]+/gu, " ");
  const counts = /* @__PURE__ */ new Map();
  const words = body.match(/[\p{L}\p{N}_-]+/gu) || [];
  for (const raw of words) {
    const word = raw.toLowerCase();
    if (word.length < 3 || STOP_WORDS.has(word) || !VALID_TAG.test(word) || existing.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return Array.from(counts, ([tag, count]) => ({ tag, count })).filter(({ count }) => count >= minimumOccurrences).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)).slice(0, limit);
}
var BatchPreviewModal = class extends import_obsidian.Modal {
  constructor(plugin, changes, compiled, label, skipped) {
    super(plugin.app);
    this.plugin = plugin;
    this.changes = changes;
    this.compiled = compiled;
    this.label = label;
    this.skipped = skipped;
    this.placement = plugin.settings.tagPlacement;
  }
  onOpen() {
    const content = this.contentEl;
    content.empty();
    content.addClass("auto-tagger-preview");
    content.createEl("h2", { text: "Preview tags: " + this.label });
    content.createEl("p", {
      text: this.changes.length + " note(s) would receive these tags. Nothing has been changed yet."
    });
    content.createEl("p", {
      text: this.placement === "inline" ? "These tags will be added as inline tags at the end of each note." : "These tags will be added to frontmatter."
    });
    if (this.skipped.length) {
      content.createEl("p", { text: this.skipped.length + " note(s) could not be read or had unsupported frontmatter." });
    }
    const list = content.createEl("ul", { cls: "auto-tagger-preview-list" });
    for (const change of this.changes) {
      const row = list.createEl("li");
      row.createEl("strong", { text: change.file.path });
      row.createSpan({ text: "  " + change.tags.map((tag) => "#" + tag).join(" ") });
    }
    const actions = content.createDiv({ cls: "auto-tagger-actions" });
    const cancel = actions.createEl("button", { text: "Cancel" });
    cancel.addEventListener("click", () => this.close());
    const apply = actions.createEl("button", { text: "Apply tags", cls: "mod-cta" });
    apply.addEventListener("click", () => {
      apply.disabled = true;
      this.close();
      void this.plugin.applyPreview(this.changes, this.compiled, this.skipped.length, this.placement);
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
var SuggestionModal = class extends import_obsidian.Modal {
  // @type-only
  constructor(plugin, file, suggestions) {
    super(plugin.app);
    this.plugin = plugin;
    this.file = file;
    this.suggestions = suggestions;
    this.selected = new Set(suggestions.map((item) => item.tag));
  }
  onOpen() {
    const content = this.contentEl;
    content.empty();
    content.createEl("h2", { text: "Suggested tags" });
    content.createEl("p", { text: "Choose local keyword suggestions for " + this.file.path + "." });
    for (const item of this.suggestions) {
      new import_obsidian.Setting(content).setName("#" + item.tag).setDesc(item.count + " occurrence(s)").addToggle((toggle) => toggle.setValue(true).onChange((value) => {
        if (value) this.selected.add(item.tag);
        else this.selected.delete(item.tag);
      }));
    }
    const actions = content.createDiv({ cls: "auto-tagger-actions" });
    actions.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.close());
    actions.createEl("button", { text: "Add selected tags", cls: "mod-cta" }).addEventListener("click", () => {
      const tags = Array.from(this.selected);
      this.close();
      void this.plugin.addSuggestions(this.file, tags);
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
var AutoTaggerSettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  getControlValue(key) {
    const behavior = BEHAVIOR_OPTIONS.find((option) => option.control.key === key);
    if (behavior) return this.plugin.settings[behavior.control.key];
    if (key === "tagPlacement") return this.plugin.settings.tagPlacement;
    const setting = getRuleSetting(this.plugin.settings, key);
    if (!setting) return void 0;
    return setting.rule[setting.property];
  }
  async setControlValue(key, value) {
    if (updateBehavior(this.plugin.settings, key, value)) {
      await this.plugin.saveSettings();
      return;
    }
    if (key === "tagPlacement") {
      if (value === "frontmatter" || value === "inline") {
        this.plugin.settings.tagPlacement = value;
        await this.plugin.saveSettings();
      }
      return;
    }
    const setting = getRuleSetting(this.plugin.settings, key);
    if (!setting) return;
    switch (setting.property) {
      case "pattern":
      case "tags":
        if (typeof value !== "string") return;
        setting.rule[setting.property] = value;
        break;
      case "mode":
        if (value !== "keyword" && value !== "regex") return;
        setting.rule.mode = value;
        break;
      case "ignoreCase":
        if (typeof value !== "boolean") return;
        setting.rule.ignoreCase = value;
        break;
    }
    await this.plugin.saveSettings();
  }
  // Obsidian 1.13+ uses these definitions for rendering and global settings search.
  getSettingDefinitions() {
    const rules = this.plugin.settings.rules;
    return [
      {
        name: "How tagging works",
        desc: "Run tagging commands from the command palette. Rules look for words, phrases, or patterns in the note body. Keyword suggestions are a separate command based on word frequency."
      },
      {
        name: TAG_PLACEMENT_NAME,
        desc: TAG_PLACEMENT_DESCRIPTION,
        control: {
          type: "dropdown",
          key: "tagPlacement",
          defaultValue: "frontmatter",
          options: TAG_PLACEMENT_OPTIONS
        }
      },
      ...BEHAVIOR_OPTIONS,
      {
        type: "list",
        heading: "Rules",
        emptyState: "No rules yet. Add a rule to get started.",
        items: rules.map((rule, index) => ({
          type: "page",
          name: rule.pattern.trim() || "Rule " + (index + 1),
          desc: rule.tags.trim() ? "Adds " + rule.tags + " when the " + (rule.mode === "regex" ? "regular expression" : "keyword or phrase") + " matches." : "Set a pattern and the tags this rule should add.",
          aliases: [rule.pattern, ...parseTagInput(rule.tags).tags],
          items: [
            {
              name: "Pattern",
              desc: "Enter a whole word or phrase, or a JavaScript regular expression without slash delimiters.",
              control: {
                type: "text",
                key: "rules." + index + ".pattern",
                placeholder: "machine learning"
              }
            },
            {
              name: "Match type",
              control: {
                type: "dropdown",
                key: "rules." + index + ".mode",
                defaultValue: "keyword",
                options: {
                  keyword: "Keyword or phrase",
                  regex: "Regular expression"
                }
              }
            },
            {
              name: "Case-insensitive",
              control: {
                type: "toggle",
                key: "rules." + index + ".ignoreCase",
                defaultValue: true
              }
            },
            {
              name: "Tags to add",
              desc: "Separate tags with commas or spaces. Use slashes for nested tags such as work/meeting.",
              control: {
                type: "text",
                key: "rules." + index + ".tags",
                placeholder: "ai, ml"
              }
            }
          ]
        })),
        onDelete: (index) => {
          this.plugin.settings.rules.splice(index, 1);
          this.saveRuleList();
        },
        onReorder: (oldIndex, newIndex) => {
          if (oldIndex === newIndex) return;
          const moved = this.plugin.settings.rules.splice(oldIndex, 1)[0];
          if (!moved) return;
          this.plugin.settings.rules.splice(newIndex, 0, moved);
          this.saveRuleList();
        },
        addItem: {
          name: "Add rule",
          action: () => {
            this.plugin.settings.rules.push({
              pattern: "",
              mode: "keyword",
              ignoreCase: true,
              tags: ""
            });
            this.saveRuleList();
          }
        }
      }
    ];
  }
  saveRuleList() {
    this.plugin.saveSettings().then(() => {
      if ((0, import_obsidian.requireApiVersion)("1.13.0")) this.update();
    }).catch((error) => {
      new import_obsidian.Notice("Could not save rules: " + errorMessage(error));
      console.error(error);
    });
  }
  // Older supported Obsidian versions use the legacy renderer below.
  display() {
    this.renderLegacySettings();
  }
  renderLegacySettings() {
    const container = this.containerEl;
    container.empty();
    container.createEl("p", {
      text: "Rules scan note bodies. Keywords match whole words or phrases. Regex patterns use JavaScript syntax without slash delimiters."
    });
    container.createEl("p", {
      text: "Separate tags with commas or spaces. Tags may use letters, numbers, underscores, hyphens and nested slashes. Invalid rules are skipped."
    });
    new import_obsidian.Setting(container).setName(TAG_PLACEMENT_NAME).setDesc(TAG_PLACEMENT_DESCRIPTION).addDropdown((dropdown) => dropdown.addOptions(TAG_PLACEMENT_OPTIONS).setValue(this.plugin.settings.tagPlacement).onChange((value) => this.setControlValue("tagPlacement", value)));
    for (const { name, desc, control } of BEHAVIOR_OPTIONS) {
      const row = new import_obsidian.Setting(container).setName(name).setDesc(desc);
      const save = (value) => this.setControlValue(control.key, value);
      const settings = this.plugin.settings;
      switch (control.type) {
        case "toggle":
          row.addToggle((toggle) => toggle.setValue(settings[control.key]).onChange(save));
          break;
        case "textarea":
          row.addTextArea((field) => field.setPlaceholder(control.placeholder).setValue(settings[control.key]).onChange(save));
          break;
        case "slider":
          row.addSlider((slider) => slider.setLimits(control.min, control.max, control.step).setValue(settings[control.key]).setDynamicTooltip().onChange(save));
          break;
      }
    }
    this.plugin.settings.rules.forEach((rule, index) => {
      const row = container.createDiv({ cls: "auto-tagger-rule" });
      new import_obsidian.Setting(row).setName("Rule " + (index + 1)).addButton((button) => button.setButtonText("Remove").onClick(async () => {
        this.plugin.settings.rules.splice(index, 1);
        await this.plugin.saveSettings();
        this.renderLegacySettings();
      }));
      new import_obsidian.Setting(row).setName("Pattern").addText((text) => text.setPlaceholder("machine learning").setValue(rule.pattern).onChange(async (value) => {
        rule.pattern = value;
        await this.plugin.saveSettings();
      }));
      new import_obsidian.Setting(row).setName("Match type").addDropdown((dropdown) => dropdown.addOption("keyword", "Keyword or phrase").addOption("regex", "Regular expression").setValue(rule.mode).onChange(async (value) => {
        if (value === "keyword" || value === "regex") {
          rule.mode = value;
          await this.plugin.saveSettings();
        }
      }));
      new import_obsidian.Setting(row).setName("Case-insensitive").addToggle((toggle) => toggle.setValue(rule.ignoreCase).onChange(async (value) => {
        rule.ignoreCase = value;
        await this.plugin.saveSettings();
      }));
      new import_obsidian.Setting(row).setName("Tags to add").addText((text) => text.setPlaceholder("ai, ml").setValue(rule.tags).onChange(async (value) => {
        rule.tags = value;
        await this.plugin.saveSettings();
      }));
    });
    new import_obsidian.Setting(container).addButton((button) => button.setButtonText("Add rule").onClick(async () => {
      this.plugin.settings.rules.push({ pattern: "", mode: "keyword", ignoreCase: true, tags: "" });
      await this.plugin.saveSettings();
      this.renderLegacySettings();
    }));
  }
};
var RuleBasedAutoTagger = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.saveQueue = Promise.resolve();
  }
  async onload() {
    const stored = await this.loadData();
    const rawRules = isRecord(stored) && Array.isArray(stored.rules) ? stored.rules : null;
    const source = rawRules ? rawRules.map(normalizeRule).filter((rule) => rule !== null) : STARTER_RULES;
    const storedPlacement = isRecord(stored) ? stored.tagPlacement : void 0;
    this.settings = {
      ...BEHAVIOR_DEFAULTS,
      rules: source.map((rule) => ({ ...rule })),
      tagPlacement: storedPlacement === "inline" ? "inline" : "frontmatter"
    };
    if (isRecord(stored)) {
      for (const { control } of BEHAVIOR_OPTIONS) {
        updateBehavior(this.settings, control.key, stored[control.key]);
      }
    }
    if (!rawRules || source.length !== rawRules.length || storedPlacement !== this.settings.tagPlacement) {
      await this.saveSettings();
    }
    this.addSettingTab(new AutoTaggerSettingsTab(this.app, this));
    this.addCommand({
      id: "tag-current-note",
      name: "Tag current note",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) void this.tagCurrent(file);
        return true;
      }
    });
    this.addCommand({
      id: "tag-vault",
      name: "Tag vault",
      callback: () => {
        void this.previewBatch(this.app.vault.getMarkdownFiles(), "Vault");
      }
    });
    this.addCommand({
      id: "tag-current-folder",
      name: "Tag current folder",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || !file.parent) return false;
        if (!checking) {
          const path = file.parent.path;
          const prefix = path === "/" ? "" : path + "/";
          const files = this.app.vault.getMarkdownFiles().filter(
            (item) => item.path.startsWith(prefix) && (this.settings.includeSubfolders || !item.path.slice(prefix.length).includes("/"))
          );
          void this.previewBatch(files, path === "/" ? "Vault root" : path);
        }
        return true;
      }
    });
    this.addCommand({
      id: "suggest-tags-current-note",
      name: "Suggest tags for current note",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) void this.suggestCurrent(file);
        return true;
      }
    });
  }
  async saveSettings() {
    const snapshot = {
      ...this.settings,
      rules: this.settings.rules.map((rule) => ({ ...rule }))
    };
    const saving = this.saveQueue.then(() => this.saveData(snapshot));
    this.saveQueue = saving.catch(() => void 0);
    return saving;
  }
  rulesForRun() {
    const result = compileRules(this.settings.rules);
    if (result.errors.length) {
      new import_obsidian.Notice("Auto-Tagger skipped " + result.errors.length + " invalid rule(s). Check settings.");
      console.warn("Rule-Based Auto-Tagger:", result.errors);
    }
    return result.compiled;
  }
  async getProposal(file, compiled) {
    const text = await this.app.vault.read(file);
    return proposedTags(text, this.app.metadataCache.getFileCache(file), compiled);
  }
  async tagCurrent(file) {
    if (this.settings.previewCurrentNote) {
      await this.previewBatch([file], file.path, false);
      return;
    }
    const compiled = this.rulesForRun();
    try {
      const tags = await this.getProposal(file, compiled);
      const added = await this.writeTags(file, tags, compiled);
      new import_obsidian.Notice(added ? "Added " + added + " tag(s) to " + file.path : "No new tags for " + file.path);
    } catch (error) {
      new import_obsidian.Notice("Could not tag " + file.path + ": " + errorMessage(error));
      console.error(error);
    }
  }
  async previewBatch(files, label, applyFolderExclusions = true) {
    const excluded = applyFolderExclusions ? this.settings.excludedFolders.split(/\r?\n/).map((path) => path.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")).filter(Boolean) : [];
    const compiled = this.rulesForRun();
    const changes = [];
    const skipped = [];
    for (const file of files) {
      if (excluded.some((folder) => file.path.startsWith(folder + "/"))) continue;
      try {
        const tags = await this.getProposal(file, compiled);
        if (tags.length) changes.push({ file, tags });
      } catch (error) {
        skipped.push(file.path);
        console.error("Auto-Tagger skipped " + file.path, error);
      }
    }
    if (!changes.length) {
      new import_obsidian.Notice("No new tags found." + (skipped.length ? " Skipped " + skipped.length + " note(s)." : ""));
      return;
    }
    new BatchPreviewModal(this, changes, compiled, label, skipped).open();
  }
  async applyPreview(changes, compiled, previouslySkipped, placement = this.settings.tagPlacement) {
    let notes = 0;
    let tags = 0;
    let failed = previouslySkipped;
    for (const change of changes) {
      try {
        const added = await this.writeTags(change.file, change.tags, compiled, placement);
        if (added) notes++;
        tags += added;
      } catch (error) {
        failed++;
        console.error("Auto-Tagger could not update " + change.file.path, error);
      }
    }
    new import_obsidian.Notice("Added " + tags + " tag(s) to " + notes + " note(s)." + (failed ? " Skipped or failed: " + failed + "." : ""));
  }
  async writeTags(file, approvedTags, compiled, placement = this.settings.tagPlacement) {
    if (!approvedTags.length) return 0;
    const getTagsToAdd = (text) => {
      const seen = collectExistingTags(text, this.app.metadataCache.getFileCache(file));
      const stillMatched = compiled ? new Set(matchRules(text, compiled).map(tagKey)) : null;
      const toAdd2 = [];
      for (const tag of approvedTags) {
        const key = tagKey(tag);
        if (!seen.has(key) && (!stillMatched || stillMatched.has(key))) {
          seen.add(key);
          toAdd2.push(tag);
        }
      }
      return toAdd2;
    };
    if (placement === "inline") {
      let added2 = 0;
      await this.app.vault.process(file, (text) => {
        const toAdd2 = getTagsToAdd(text);
        if (!toAdd2.length) return text;
        const newline = text.includes("\r\n") ? "\r\n" : "\n";
        const separator = text && !text.endsWith("\n") ? newline : "";
        added2 = toAdd2.length;
        return text + separator + toAdd2.map((tag) => "#" + tag).join(" ") + newline;
      });
      return added2;
    }
    const toAdd = getTagsToAdd(await this.app.vault.read(file));
    if (!toAdd.length) return 0;
    let added = 0;
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      if (!isRecord(frontmatter)) throw new Error("Frontmatter must be a YAML mapping");
      const values = readTagField(frontmatter.tags);
      const present = new Set(values.map(tagKey));
      for (const tag of toAdd) {
        if (!present.has(tagKey(tag))) {
          values.push(tag);
          present.add(tagKey(tag));
          added++;
        }
      }
      if (added) frontmatter.tags = values;
    });
    return added;
  }
  async suggestCurrent(file) {
    try {
      const text = await this.app.vault.read(file);
      const suggestions = suggestKeywords(
        text,
        this.app.metadataCache.getFileCache(file),
        this.settings.suggestionLimit,
        this.settings.minimumOccurrences
      );
      if (!suggestions.length) {
        new import_obsidian.Notice("No new keyword suggestions for " + file.path);
        return;
      }
      new SuggestionModal(this, file, suggestions).open();
    } catch (error) {
      new import_obsidian.Notice("Could not suggest tags for " + file.path + ": " + errorMessage(error));
      console.error(error);
    }
  }
  async addSuggestions(file, tags) {
    try {
      const added = await this.writeTags(file, tags, null);
      new import_obsidian.Notice(added ? "Added " + added + " suggested tag(s)." : "No new tags added.");
    } catch (error) {
      new import_obsidian.Notice("Could not add suggested tags: " + errorMessage(error));
      console.error(error);
    }
  }
};
module.exports = Object.assign(RuleBasedAutoTagger, {
  __test: {
    parseTagInput,
    compileRules,
    splitFrontmatter,
    collectExistingTags,
    matchRules,
    proposedTags,
    suggestKeywords,
    BatchPreviewModal
  }
});
