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
  async loadData() { return null; }
  async saveData(data) { this.saved = data; }
  addCommand(command) { this.commands.push(command); }
  addSettingTab() {}
}
class Notice { constructor(message) { this.message = message; } }

const obsidian = {
  Plugin,
  Modal,
  Notice,
  PluginSettingTab: class {},
  Setting: class {},
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
  let text = 'MACHINE LEARNING #AI';
  const frontmatter = { tags: ['old'] };
  const file = { path: 'Notes/Test.md', parent: { path: 'Notes' } };
  const app = {
    vault: { read: async () => text, getMarkdownFiles: () => [file] },
    metadataCache: { getFileCache: () => null },
    fileManager: { processFrontMatter: async (target, callback) => { writes++; callback(frontmatter); } },
    workspace: { getActiveFile: () => file },
  };
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

  console.log('Smoke checks passed.');
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
