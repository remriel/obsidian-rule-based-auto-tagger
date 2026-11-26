const assert = require('node:assert/strict');
const Module = require('node:module');

class FakeElement {
  constructor(tag, options = {}) {
    this.tag = tag;
    this.text = options.text || '';
    this.children = [];
    this.handlers = {};
  }
  empty() { this.children = []; }
  addClass() {}
  createEl(tag, options = {}) {
    const element = new FakeElement(tag, options);
    this.children.push(element);
    return element;
  }
  createDiv(options) { return this.createEl('div', options); }
  createSpan(options) { return this.createEl('span', options); }
  addEventListener(event, callback) { this.handlers[event] = callback; }
}

let lastModal;
class Modal {
  constructor(app) { this.app = app; this.contentEl = new FakeElement('root'); lastModal = this; }
  open() { this.onOpen(); }
  close() { this.onClose(); }
}
class Plugin {
  constructor(app) { this.app = app; this.commands = []; }
  async loadData() { return this.stored ?? null; }
  async saveData(data) { this.saved = data; }
  addCommand(command) { this.commands.push(command); }
  addSettingTab(tab) { this.settingTab = tab; }
}
class Notice { constructor(message) { this.message = message; } }

const obsidian = {
  Plugin,
  Modal,
  Notice,
  PluginSettingTab: class {},
  Setting: class {
    constructor(container) { this.row = container.createDiv(); }
    setName(text) { this.row.createSpan({ text }); return this; }
    setDesc(text) { this.row.createSpan({ text }); return this; }
    addToggle(configure) {
      const toggle = { setValue: () => toggle, onChange: () => toggle };
      configure(toggle);
      return this;
    }
  },
  getAllTags: (cache) => cache.allTags || [],
  parseYaml: (yaml) => {
    if (!yaml.trim()) return null;
    const list = /tags:\s*\[([^\]]*)\]/.exec(yaml);
    if (list) return { tags: list[1].split(',').map((item) => item.trim()) };
    const scalar = /tags:\s*(.+)/.exec(yaml);
    return scalar ? { tags: scalar[1] } : {};
  },
};
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  return request === 'obsidian' ? obsidian : originalLoad.call(this, request, parent, isMain);
};
const AutoTagger = require('../main.js');
Module._load = originalLoad;
const core = AutoTagger.__test;

function flatten(element) {
  return [element.text, ...element.children.flatMap(flatten)];
}
function find(element, text) {
  return element.text === text
    ? element
    : element.children.map((child) => find(child, text)).find(Boolean);
}

async function run() {
  const rules = core.compileRules([
    { pattern: 'machine learning', mode: 'keyword', ignoreCase: true, tags: 'ai, ml' },
    { pattern: 'ai', mode: 'keyword', ignoreCase: true, tags: 'AI' },
  ]);
  assert.equal(rules.errors.length, 0);
  assert.deepEqual(core.proposedTags('MACHINE LEARNING', null, rules.compiled), ['ai', 'ml']);
  assert.deepEqual(core.proposedTags('MACHINE LEARNING and #AI', null, rules.compiled), ['ml']);
  assert.deepEqual(core.proposedTags('---\ntags: [AI, ML]\n---\nMachine Learning', null, rules.compiled), []);
  assert.deepEqual(core.proposedTags('---\n---\nMachine Learning', null, rules.compiled), ['ai', 'ml']);
  assert.deepEqual(core.proposedTags('Machine Learning', { allTags: ['#AI'] }, rules.compiled), ['ml']);
  assert.deepEqual(core.matchRules('said nothing', rules.compiled), []);
  assert.equal(core.compileRules([{ pattern: '[', mode: 'regex', ignoreCase: true, tags: 'bad' }]).errors.length, 1);
  const sensitive = core.compileRules([{ pattern: 'TeSt', mode: 'keyword', ignoreCase: false, tags: 'test' }]).compiled;
  assert.deepEqual(core.matchRules('test', sensitive), []);
  const regex = core.compileRules([{ pattern: 'orchid\\s+garden', mode: 'regex', ignoreCase: true, tags: 'plants' }]).compiled;
  assert.deepEqual(core.matchRules('ORCHID garden', regex), ['plants']);
  assert.equal(core.suggestKeywords('orchid orchid forest', null)[0].tag, 'orchid');
  assert.throws(() => core.splitFrontmatter('---\ntags: broken'), /Unclosed/);

  let writes = 0;
  let inlineWrites = 0;
  let text = 'MACHINE LEARNING #AI';
  const frontmatter = { tags: ['old'] };
  const file = { path: 'Notes/Test.md', parent: { path: 'Notes' } };
  const app = {
    vault: {
      read: async () => text,
      getMarkdownFiles: () => [file],
      process: async (target, update) => {
        assert.equal(target, file);
        const updated = update(text);
        if (updated !== text) inlineWrites++;
        text = updated;
        return text;
      },
    },
    metadataCache: { getFileCache: () => null },
    fileManager: { processFrontMatter: async (target, callback) => { writes++; callback(frontmatter); } },
    workspace: { getActiveFile: () => file },
  };
  const savedRules = [{ pattern: 'machine learning', mode: 'keyword', ignoreCase: true, tags: 'ai, ml' }];
  for (const [stored, expected] of [
    [{ rules: savedRules }, 'frontmatter'],
    [{ rules: savedRules, tagPlacement: 'invalid' }, 'frontmatter'],
    [{ rules: savedRules, tagPlacement: 'inline' }, 'inline'],
  ]) {
    const migrated = new AutoTagger(app);
    migrated.stored = stored;
    await migrated.onload();
    assert.equal(migrated.settings.tagPlacement, expected);
    assert.deepEqual(migrated.settings.rules, savedRules);
    await migrated.saveSettings();
    assert.equal(migrated.saved.tagPlacement, expected);
  }

  const plugin = new AutoTagger(app);
  await plugin.onload();
  assert.deepEqual(plugin.commands.map((command) => command.name), [
    'Tag current note', 'Tag vault', 'Tag current folder', 'Suggest tags for current note',
  ]);
  assert.ok(plugin.saved.rules.length > 0);
  plugin.settings.rules = [{ pattern: 'machine learning', mode: 'keyword', ignoreCase: true, tags: 'ai, ml' }];

  await plugin.previewBatch([file], 'Notes');
  assert.equal(writes, 0, 'Preview must not write');
  const displayed = flatten(lastModal.contentEl).join('|');
  assert.match(displayed, /Notes\/Test\.md/);
  assert.match(displayed, /#ml/);
  assert.match(displayed, /added to frontmatter/);
  assert.doesNotMatch(displayed, /#ai/);
  find(lastModal.contentEl, 'Cancel').handlers.click();
  assert.equal(writes, 0, 'Cancel must not write');

  const apply = plugin.applyPreview.bind(plugin);
  let applying;
  plugin.applyPreview = (...args) => { applying = apply(...args); return applying; };
  await plugin.previewBatch([file], 'Notes');
  find(lastModal.contentEl, 'Apply tags').handlers.click();
  await applying;
  assert.equal(writes, 1);
  assert.deepEqual(frontmatter.tags, ['old', 'ml']);

  text = 'The matching phrase is gone.';
  assert.equal(await plugin.writeTags(file, ['ai', 'ml'], rules.compiled), 0);
  assert.equal(writes, 1, 'A stale preview must not add tags');

  await plugin.settingTab.setControlValue('tagPlacement', 'inline');
  assert.equal(plugin.settingTab.getControlValue('tagPlacement'), 'inline');
  assert.equal(plugin.saved.tagPlacement, 'inline');

  for (const [original, expected, count] of [
    ['MACHINE LEARNING\n', 'MACHINE LEARNING\n#ai #ml\n', 2],
    ['MACHINE LEARNING #AI\n', 'MACHINE LEARNING #AI\n#ml\n', 1],
    ['---\ntags: [ai]\n---\nMACHINE LEARNING\n', '---\ntags: [ai]\n---\nMACHINE LEARNING\n#ml\n', 1],
    ['MACHINE LEARNING', 'MACHINE LEARNING\n#ai #ml\n', 2],
    ['MACHINE LEARNING\r\n', 'MACHINE LEARNING\r\n#ai #ml\r\n', 2],
  ]) {
    text = original;
    assert.equal(await plugin.writeTags(file, ['ai', 'ml'], rules.compiled), count);
    assert.equal(text, expected);
    assert.equal(await plugin.writeTags(file, ['ai', 'ml'], rules.compiled), 0, 'Repeated tagging must be a no-op');
  }
  assert.equal(inlineWrites, 5);
  assert.equal(writes, 1, 'Inline tagging must not call processFrontMatter');
  assert.deepEqual(frontmatter.tags, ['old', 'ml']);

  text = 'MACHINE LEARNING';
  await plugin.previewBatch([file], 'Notes');
  assert.match(flatten(lastModal.contentEl).join('|'), /inline tags at the end/);
  assert.equal(text, 'MACHINE LEARNING');
  text = 'The matching phrase is gone.';
  find(lastModal.contentEl, 'Apply tags').handlers.click();
  await applying;
  assert.equal(text, 'The matching phrase is gone.');
  assert.equal(inlineWrites, 5, 'A stale inline preview must not add tags');

  text = 'MACHINE LEARNING';
  await plugin.previewBatch([file], 'Notes');
  await plugin.settingTab.setControlValue('tagPlacement', 'frontmatter');
  find(lastModal.contentEl, 'Apply tags').handlers.click();
  await applying;
  assert.equal(text, 'MACHINE LEARNING\n#ai #ml\n', 'Apply must honor the previewed placement');
  assert.equal(writes, 1);

  const nested = { path: 'Notes/Archive/Nested.md' };
  const similarlyNamed = { path: 'Notes/Archived/Related.md' };
  app.vault.getMarkdownFiles = () => [file, nested, similarlyNamed];
  text = 'MACHINE LEARNING';
  await plugin.settingTab.setControlValue('excludedFolders', ' /Notes/Archive/ ');
  await plugin.previewBatch(app.vault.getMarkdownFiles(), 'Vault');
  const excludedPreview = flatten(lastModal.contentEl);
  assert.ok(excludedPreview.includes(file.path));
  assert.ok(excludedPreview.includes(similarlyNamed.path));
  assert.ok(!excludedPreview.includes(nested.path));

  await plugin.settingTab.setControlValue('includeSubfolders', false);
  const previewBatch = plugin.previewBatch.bind(plugin);
  let previewing;
  plugin.previewBatch = (...args) => { previewing = previewBatch(...args); return previewing; };
  plugin.commands.find(({ id }) => id === 'tag-current-folder').checkCallback(false);
  await previewing;
  assert.ok(flatten(lastModal.contentEl).includes(file.path));
  assert.ok(!flatten(lastModal.contentEl).includes(similarlyNamed.path));

  await plugin.settingTab.setControlValue('excludedFolders', 'Notes');
  await plugin.settingTab.setControlValue('previewCurrentNote', true);
  await plugin.tagCurrent(file);
  assert.ok(flatten(lastModal.contentEl).includes(file.path));
  assert.equal(writes, 1, 'Current-note preview must not write');

  await plugin.settingTab.setControlValue('suggestionLimit', 1);
  await plugin.settingTab.setControlValue('minimumOccurrences', 2);
  const reloaded = new AutoTagger(app);
  reloaded.stored = plugin.saved;
  await reloaded.onload();
  assert.equal(reloaded.settings.previewCurrentNote, true);
  assert.equal(reloaded.settings.includeSubfolders, false);
  assert.equal(reloaded.settings.excludedFolders, 'Notes');
  assert.equal(reloaded.settings.suggestionLimit, 1);
  assert.equal(reloaded.settings.minimumOccurrences, 2);
  await reloaded.settingTab.setControlValue('minimumOccurrences', 0);
  assert.equal(reloaded.settings.minimumOccurrences, 2);
  text = 'orchid orchid orchid daffodil daffodil forest';
  await reloaded.suggestCurrent(file);
  const suggested = flatten(lastModal.contentEl).join('|');
  assert.match(suggested, /#orchid/);
  assert.doesNotMatch(suggested, /#daffodil|#forest/);
  assert.deepEqual(core.suggestKeywords(text, null, 10, 2).map(({ tag }) => tag), ['orchid', 'daffodil']);

  console.log('Smoke checks passed.');
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
