const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const Module = require('node:module');
const os = require('node:os');
const path = require('node:path');

const fixtures = {
  'no-frontmatter.md': 'machine learning',
  'frontmatter-list.md': '---\ntags: [ai]\n---\nmachine learning\n',
  'frontmatter-scalar.md': '---\ntags: ai\n---\nmachine learning\n',
  'inline-only.md': 'machine learning #AI\n',
  'frontmatter-and-inline.md': '---\ntags: [project]\n---\nmachine learning project meeting #meeting\n',
  'list-note.md': '- machine learning\n',
  'unclosed-fence.md': '~~~\nmachine learning\n'.replace('~~~', String.fromCharCode(96).repeat(3)),
  'crlf-note.md': 'machine learning\r\n',
  'empty-note.md': '',
  'no-match.md': 'orchid orchid daffodil\n',
  'Notes/matching.md': 'machine learning\n',
  'Notes/unmatched.md': 'sunflower\n',
};

async function seedVault(root) {
  const pluginDir = path.join(root, '.obsidian', 'plugins', 'rule-based-auto-tagger');
  await fs.mkdir(pluginDir, { recursive: true });
  await fs.mkdir(path.join(root, 'Notes'));
  for (const [name, contents] of Object.entries(fixtures)) {
    await fs.writeFile(path.join(root, name), contents, { flag: 'wx' });
  }
  for (const name of ['main.js', 'manifest.json', 'styles.css']) {
    await fs.copyFile(path.join(__dirname, '..', name), path.join(pluginDir, name));
  }
  return pluginDir;
}

// This adapter supports the fixtures' tags-only YAML, including scalar and flow-list syntax.
function parseYaml(yaml) {
  if (!yaml.trim()) return null;
  const field = /^tags:[ \t]*([^\r\n]+)\s*$/.exec(yaml);
  assert.ok(field, 'Unexpected fixture YAML: ' + yaml);
  const value = field[1].trim();
  return { tags: value.startsWith('[') ? value.slice(1, -1).split(',').map(tag => tag.trim()) : value };
}

class Element {
  constructor(text = '') { this.text = text; this.empty(); }
  empty() { this.children = []; this.handlers = {}; }
  addClass() {}
  createEl(_tag, options) {
    const child = new Element(options?.text);
    this.children.push(child);
    return child;
  }
  createDiv(options) { return this.createEl('div', options); }
  createSpan(options) { return this.createEl('span', options); }
  addEventListener(event, handler) { this.handlers[event] = handler; }
  find(text) {
    return this.text === text ? this : this.children.map(child => child.find(text)).find(Boolean);
  }
}

function loadPlugin(app, artifact) {
  const obsidian = {
    parseYaml,
    Plugin: class {
      constructor() { this.app = app; this.commands = new Map(); }
      async loadData() { return this.saved ?? null; }
      async saveData(data) { this.saved = data; }
      addRibbonIcon() {}
      addCommand(command) { this.commands.set(command.id, command); }
      addSettingTab(tab) { this.settingsTab = tab; }
    },
    PluginSettingTab: class {},
    Modal: class {
      constructor() { this.contentEl = new Element(); }
      open() { app.modal = this; this.onOpen(); }
      close() { app.modal = null; this.onClose(); }
    },
    Notice: class { constructor(message) { app.notice = message; } },
    Setting: class {
      setName(name) { this.name = name; return this; }
      setDesc() { return this; }
      addToggle(configure) {
        const name = this.name;
        const toggle = { setValue: () => toggle, onChange: handler => app.toggles.set(name, handler) };
        configure(toggle);
        return this;
      }
    },
  };
  const originalLoad = Module._load;
  Module._load = function (request, ...args) {
    return request === 'obsidian' ? obsidian : originalLoad.call(this, request, ...args);
  };
  try {
    const Plugin = require(artifact);
    return new Plugin();
  } finally {
    Module._load = originalLoad;
  }
}

async function exercise(root, artifact) {
  const files = Object.keys(fixtures).map(name => ({
    path: name,
    extension: path.extname(name).slice(1),
    parent: { path: name.includes('/') ? path.posix.dirname(name) : '/' },
  }));
  const diskPath = file => path.join(root, file.path);
  const read = file => fs.readFile(diskPath(file), 'utf8');
  const snapshot = () => Promise.all(files.map(file => fs.readFile(diskPath(file))));
  const exact = async (name, expected) => assert.deepEqual(
    await fs.readFile(path.join(root, name)), Buffer.from(expected), name,
  );
  let active;
  const app = {
    toggles: new Map(),
    workspace: { getActiveFile: () => active },
    metadataCache: { getFileCache: () => null },
    vault: {
      read,
      getMarkdownFiles: () => files,
      process: async (file, update) => {
        const original = await read(file);
        const updated = update(original);
        if (original !== updated) await fs.writeFile(diskPath(file), updated);
        return updated;
      },
    },
    fileManager: {
      processFrontMatter: async (file, update) => {
        const original = await read(file);
        const block = /^---\r?\n([\s\S]*?)^---(?:\r?\n|$)/m.exec(original);
        assert.ok(!block || block.index === 0);
        const data = block ? parseYaml(block[1]) ?? {} : {};
        update(data);
        const body = block ? original.slice(block[0].length) : original;
        const newline = original.includes('\r\n') ? '\r\n' : '\n';
        const header = ['---', 'tags: [' + data.tags.join(', ') + ']', '---', ''].join(newline);
        await fs.writeFile(diskPath(file), header + body);
      },
    },
  };
  const plugin = loadPlugin(app, artifact);
  await plugin.onload();
  let pending;
  // Capture the promise behind each fire-and-forget command or modal button.
  for (const method of ['tagCurrent', 'previewBatch', 'applyPreview', 'suggestCurrent', 'addSuggestions']) {
    const original = plugin[method].bind(plugin);
    plugin[method] = (...args) => (pending = original(...args));
  }
  async function command(id, name) {
    active = files.find(file => file.path === name);
    pending = undefined;
    const registered = plugin.commands.get(id);
    assert.ok(registered, id);
    if (registered.checkCallback) {
      assert.equal(registered.checkCallback(true), true);
      assert.equal(pending, undefined);
      assert.equal(registered.checkCallback(false), true);
    } else {
      registered.callback();
    }
    assert.ok(pending, id);
    await pending;
  }
  async function click(label, writes) {
    pending = undefined;
    const button = app.modal?.contentEl.find(label);
    assert.ok(button, label);
    button.handlers.click();
    assert.equal(Boolean(pending), writes, label);
    await pending;
    assert.equal(app.modal, null);
  }

  await command('tag-current-note', 'no-frontmatter.md');
  await exact('no-frontmatter.md', '---\ntags: [ai, ml]\n---\nmachine learning');
  await command('tag-current-note', 'frontmatter-scalar.md');
  await exact('frontmatter-scalar.md', '---\ntags: [ai, ml]\n---\nmachine learning\n');

  await plugin.settingsTab.setControlValue('tagPlacement', 'inline');
  assert.equal(plugin.saved.tagPlacement, 'inline');
  await command('tag-current-note', 'inline-only.md');
  await exact('inline-only.md', fixtures['inline-only.md'] + '#ml\n');
  const beforeRepeat = await snapshot();
  await command('tag-current-note', 'inline-only.md');
  assert.deepEqual(await snapshot(), beforeRepeat);

  const beforeCancel = await snapshot();
  await command('tag-vault');
  assert.ok(app.modal.contentEl.find('These tags will be added as inline tags at the end of each note.'));
  assert.deepEqual(await snapshot(), beforeCancel);
  await click('Cancel', false);
  assert.deepEqual(await snapshot(), beforeCancel);

  await command('tag-current-folder', 'Notes/matching.md');
  assert.deepEqual(app.modal.changes.map(change => change.file.path), ['Notes/matching.md']);
  await click('Apply tags', true);
  const folderOnly = beforeCancel.slice();
  folderOnly[files.findIndex(file => file.path === 'Notes/matching.md')] = Buffer.from('machine learning\n#ai #ml\n');
  assert.deepEqual(await snapshot(), folderOnly);

  await command('tag-vault');
  assert.ok(app.modal.changes.some(change => change.file.path === 'list-note.md'));
  const edited = '- revised draft\n';
  await fs.writeFile(path.join(root, 'list-note.md'), edited);
  await plugin.settingsTab.setControlValue('tagPlacement', 'frontmatter');
  await click('Apply tags', true);
  const expectedVault = {
    ...fixtures,
    'no-frontmatter.md': '---\ntags: [ai, ml]\n---\nmachine learning',
    'frontmatter-scalar.md': '---\ntags: [ai, ml]\n---\nmachine learning\n',
    'inline-only.md': fixtures['inline-only.md'] + '#ml\n',
    'frontmatter-list.md': fixtures['frontmatter-list.md'] + '#ml\n',
    'frontmatter-and-inline.md': fixtures['frontmatter-and-inline.md'] + '#ai #ml\n',
    'list-note.md': edited,
    'unclosed-fence.md': fixtures['unclosed-fence.md'] + '#ai #ml\n',
    'crlf-note.md': fixtures['crlf-note.md'] + '#ai #ml\r\n',
    'Notes/matching.md': 'machine learning\n#ai #ml\n',
  };
  for (const [name, expected] of Object.entries(expectedVault)) await exact(name, expected);

  await fs.writeFile(path.join(root, 'list-note.md'), fixtures['list-note.md']);
  await plugin.settingsTab.setControlValue('tagPlacement', 'inline');
  await command('tag-current-note', 'list-note.md');
  await exact('list-note.md', fixtures['list-note.md'] + '#ai #ml\n');

  await command('suggest-tags-current-note', 'no-match.md');
  assert.equal(app.modal.suggestions[0].tag, 'orchid');
  for (const [tag, toggle] of app.toggles) {
    if (tag !== '#orchid') toggle(false);
  }
  await click('Add selected tags', true);
  await exact('no-match.md', fixtures['no-match.md'] + '#orchid\n');
}

async function run(args) {
  if (args.length) {
    assert.ok(args.length === 2 && args[0] === '--prepare-vault',
      'Usage: node tests/integration.cjs [--prepare-vault NEW_DISPOSABLE_PATH]');
    const root = path.resolve(args[1]);
    await fs.mkdir(path.dirname(root), { recursive: true });
    await fs.mkdir(root);
    await seedVault(root);
    console.log('Prepared disposable vault at ' + root);
    return;
  }

  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'auto-tagger-integration-'));
  try {
    const pluginDir = await seedVault(root);
    await exercise(root, path.join(pluginDir, 'main.js'));
    console.log('File-backed integration checks passed.');
    console.log('Unclosed fence: the appended tag line is physically after the code text, with no closing fence.');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

run(process.argv.slice(2)).catch(error => { console.error(error); process.exitCode = 1; });
