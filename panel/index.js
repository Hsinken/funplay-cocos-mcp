'use strict';

const PKG = 'funplay-cocos-mcp';

function request(message, ...args) {
  return Editor.Message.request(PKG, message, ...args);
}

function stringify(value) {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value, null, 2);
}

module.exports = Editor.Panel.define({
  template: `
    <div class="mcp-root">
      <header class="hero">
        <div>
          <h1>Funplay Cocos MCP</h1>
          <p id="versionText">Version</p>
        </div>
        <div class="status-pill" id="statusPill">Unknown</div>
      </header>

      <section class="card">
        <h2>Service</h2>
        <div id="statusText" class="status-line muted"></div>
        <div class="row top-actions">
          <label class="checkbox-line checkbox-inline">
            <ui-checkbox id="enabledInput"></ui-checkbox>
            Enable MCP Server
          </label>
          <ui-button id="restartBtn">Restart</ui-button>
          <ui-button id="copyUrlBtn">Copy URL</ui-button>
          <ui-button id="checkUpdatesBtn">Check Updates</ui-button>
        </div>
        <div class="grid">
          <label>Server Port <ui-num-input id="portInput"></ui-num-input></label>
          <label>Tool Exposure
            <ui-select id="profileSelect">
              <option value="core">core</option>
              <option value="full">full</option>
              <option value="custom">custom</option>
            </ui-select>
          </label>
          <label class="checkbox-line">
            <ui-checkbox id="sessionsInput"></ui-checkbox>
            MCP Sessions
          </label>
        </div>
        <div id="updateStatus" class="client-status muted"></div>
        <p>Changes auto-save. Port/profile changes restart the server when needed.</p>
      </section>

      <section class="card">
        <h2>Tool Manager</h2>
        <div id="toolSummary" class="status-line muted"></div>
        <div class="row tool-presets">
          <ui-button id="useCoreBtn">Core</ui-button>
          <ui-button id="useFullBtn">Full</ui-button>
          <ui-button id="useCustomBtn">Custom</ui-button>
        </div>
        <div class="tool-config-grid">
          <label>Enabled Categories <ui-textarea id="enabledCategoriesInput"></ui-textarea></label>
          <label>Disabled Categories <ui-textarea id="disabledCategoriesInput"></ui-textarea></label>
          <label>Enabled Tools <ui-textarea id="enabledToolsInput"></ui-textarea></label>
          <label>Disabled Tools <ui-textarea id="disabledToolsInput"></ui-textarea></label>
        </div>
      </section>

      <section class="card">
        <h2>MCP Client Config</h2>
        <div class="row">
          <ui-select id="clientTargetSelect"></ui-select>
          <ui-button id="configureClientBtn" class="primary">One-Click Configure</ui-button>
        </div>
        <div id="clientTargetStatus" class="client-status muted"></div>
        <ui-textarea id="clientConfigText"></ui-textarea>
      </section>

      <section class="card">
        <details>
          <summary>Debug Output</summary>
          <pre id="output"></pre>
        </details>
      </section>
    </div>
  `,
  style: `
    :host {
      color: var(--color-normal-contrast);
      background: var(--color-normal-fill);
      font-size: 13px;
    }
    .mcp-root {
      padding: 14px;
      box-sizing: border-box;
      overflow: auto;
      height: 100%;
    }
    .hero {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    h1 {
      margin: 0;
      font-size: 22px;
    }
    h2 {
      margin: 0 0 10px 0;
      font-size: 15px;
    }
    p {
      margin: 4px 0 0 0;
      color: var(--color-normal-contrast-weakest);
    }
    .tip {
      margin: 0 0 10px 0;
    }
    code {
      font-family: Menlo, monospace;
      background: rgba(255,255,255,0.08);
      padding: 1px 4px;
      border-radius: 4px;
      color: var(--color-normal-contrast);
    }
    .card {
      border: 1px solid var(--color-normal-border);
      border-radius: 8px;
      background: var(--color-normal-fill-emphasis);
      padding: 12px;
      margin-bottom: 12px;
    }
    .row {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      margin-top: 8px;
    }
    .top-actions {
      margin-top: 0;
      margin-bottom: 10px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(140px, 1fr));
      gap: 8px;
      align-items: end;
    }
    .tool-config-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(180px, 1fr));
      gap: 8px;
      margin-top: 8px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      color: var(--color-normal-contrast-weak);
    }
    .checkbox-line {
      flex-direction: row;
      align-items: center;
      min-height: 28px;
    }
    .checkbox-inline {
      padding-top: 0;
      color: var(--color-normal-contrast);
      gap: 6px;
    }
    .status-pill {
      border-radius: 999px;
      padding: 6px 10px;
      background: #555;
      color: white;
      font-weight: 600;
    }
    .status-pill.running {
      background: #1f8f4d;
    }
    .status-pill.stopped {
      background: #8f3d3d;
    }
    .muted {
      color: var(--color-normal-contrast-weakest);
    }
    .status-line {
      margin-bottom: 10px;
      line-height: 1.5;
    }
    .client-status {
      margin: 8px 0;
      white-space: pre-wrap;
      word-break: break-all;
    }
    details {
      display: block;
    }
    summary {
      cursor: pointer;
      font-size: 15px;
      font-weight: 600;
      color: var(--color-normal-contrast);
      outline: none;
      user-select: none;
    }
    ui-textarea {
      width: 100%;
      min-height: 100px;
    }
    .tool-config-grid ui-textarea {
      min-height: 72px;
    }
    pre {
      min-height: 120px;
      max-height: 220px;
      overflow: auto;
      margin: 0;
      background: #111;
      color: #d7ffd7;
      padding: 10px;
      border-radius: 6px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .primary {
      border-color: #4aa3ff;
    }
  `,
  $: {
    root: '.mcp-root',
    statusPill: '#statusPill',
    versionText: '#versionText',
    statusText: '#statusText',
    enabledInput: '#enabledInput',
    portInput: '#portInput',
    profileSelect: '#profileSelect',
    sessionsInput: '#sessionsInput',
    restartBtn: '#restartBtn',
    copyUrlBtn: '#copyUrlBtn',
    checkUpdatesBtn: '#checkUpdatesBtn',
    updateStatus: '#updateStatus',
    toolSummary: '#toolSummary',
    useCoreBtn: '#useCoreBtn',
    useFullBtn: '#useFullBtn',
    useCustomBtn: '#useCustomBtn',
    enabledCategoriesInput: '#enabledCategoriesInput',
    disabledCategoriesInput: '#disabledCategoriesInput',
    enabledToolsInput: '#enabledToolsInput',
    disabledToolsInput: '#disabledToolsInput',
    clientTargetSelect: '#clientTargetSelect',
    configureClientBtn: '#configureClientBtn',
    clientTargetStatus: '#clientTargetStatus',
    clientConfigText: '#clientConfigText',
    output: '#output',
  },
  methods: {
    async refresh() {
      try {
        this.state = await request('get-panel-state');
        this.renderState();
      } catch (error) {
        this.showOutput(`Refresh failed: ${error.message}`);
      }
    },
    renderState() {
      const state = this.state || {};
      const status = state.status || {};
      const config = state.config || {};
      const isRunning = Boolean(status.running);

      this.$.versionText.textContent = `Version ${status.version || 'unknown'}`;
      this.$.statusPill.textContent = isRunning ? 'Running' : 'Stopped';
      this.$.statusPill.classList.toggle('running', isRunning);
      this.$.statusPill.classList.toggle('stopped', !isRunning);
      const portText = status.portFallbackActive
        ? `  |  Port fallback: ${status.requestedPort} -> ${status.port}`
        : '';
      this.$.statusText.textContent =
        `${status.url || ''}  |  Project: ${status.projectName || ''}  |  Cocos ${status.cocosVersion || ''}${portText}`;

      this.$.enabledInput.value = Boolean(isRunning || config.autostart);
      this.$.portInput.value = Number(config.port || status.port || 8765);
      this.$.profileSelect.value = config.toolProfile || status.toolProfile || 'core';
      this.$.sessionsInput.value = Boolean(config.enableSessions || status.enableSessions);
      this.$.enabledCategoriesInput.value = this.formatList(config.enabledToolCategories);
      this.$.disabledCategoriesInput.value = this.formatList(config.disabledToolCategories);
      this.$.enabledToolsInput.value = this.formatList(config.enabledTools);
      this.$.disabledToolsInput.value = this.formatList(config.disabledTools);
      this.renderUpdateStatus();
      this.renderToolSummary();

      this.$.clientConfigText.value = state.clientConfig ? state.clientConfig.codex : '';
      this.renderClientTargets();
    },
    formatList(value) {
      return Array.isArray(value) ? value.join('\n') : '';
    },
    parseList(value) {
      return String(value || '')
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean);
    },
    renderUpdateStatus() {
      const update = this.state && this.state.updateInfo;
      if (!update) {
        this.$.updateStatus.textContent = '';
        return;
      }
      if (!update.ok) {
        this.$.updateStatus.textContent = `Update check failed: ${update.error}`;
        return;
      }
      this.$.updateStatus.textContent = update.updateAvailable
        ? `Update available: ${update.latestVersion} (${update.releaseUrl})`
        : `Up to date: ${update.currentVersion}`;
    },
    renderToolSummary() {
      const catalog = (this.state && this.state.toolCatalog) || [];
      const enabled = catalog.filter((tool) => tool.enabled);
      const categories = Array.from(new Set(catalog.map((tool) => tool.category))).sort();
      this.$.toolSummary.textContent =
        `Enabled ${enabled.length}/${catalog.length} tools  |  Categories: ${categories.join(', ')}`;
    },
    renderClientTargets() {
      const targets = (this.state && this.state.clientTargets) || [];
      const preferred = this.state && this.state.config ? this.state.config.lastClientTargetId : '';
      const selected = this.$.clientTargetSelect.value || preferred || (targets[0] && targets[0].id);
      this.$.clientTargetSelect.innerHTML = targets
        .map((target) => `<option value="${target.id}">${target.name}</option>`)
        .join('');
      if (selected) {
        this.$.clientTargetSelect.value = selected;
      }
      this.renderClientTargetStatus();
    },
    renderClientTargetStatus() {
      const targets = (this.state && this.state.clientTargets) || [];
      const target = targets.find((item) => item.id === this.$.clientTargetSelect.value) || targets[0];
      if (!target) {
        this.$.clientTargetStatus.textContent = 'No client targets available.';
        return;
      }
      this.$.clientTargetStatus.textContent = `${target.configured ? 'Configured' : 'Not configured'}: ${target.configPath}`;
    },
    showOutput(value) {
      this.$.output.textContent = stringify(value);
    },
    async persistConfig(options = {}) {
      const { showOutput = false } = options;
      try {
        const panelState = await request('save-config', this.collectConfig());
        this.state = panelState;
        this.renderState();
        if (showOutput) {
          this.showOutput('Configuration saved.');
        }
        return panelState;
      } catch (error) {
        this.showOutput(`Save config failed: ${error.message}`);
        throw error;
      }
    },
    async runAction(action) {
      try {
        const result = await action();
        this.showOutput(result);
        await this.refresh();
      } catch (error) {
        this.showOutput(`Error: ${error.message}`);
      }
    },
    collectConfig() {
      return {
        host: (this.state && this.state.config && this.state.config.host) || (this.state && this.state.status && this.state.status.host) || '127.0.0.1',
        port: Number(this.$.portInput.value || 8765),
        toolProfile: this.$.profileSelect.value || 'core',
        enabledToolCategories: this.parseList(this.$.enabledCategoriesInput.value).map((item) => item.toLowerCase()),
        disabledToolCategories: this.parseList(this.$.disabledCategoriesInput.value).map((item) => item.toLowerCase()),
        enabledTools: this.parseList(this.$.enabledToolsInput.value),
        disabledTools: this.parseList(this.$.disabledToolsInput.value),
        enableSessions: Boolean(this.$.sessionsInput.value),
        autostart: Boolean(this.$.enabledInput.value),
        maxInteractionLogEntries: this.state && this.state.config ? this.state.config.maxInteractionLogEntries : 50,
        lastClientTargetId: this.$.clientTargetSelect.value || 'claude_code',
      };
    },
    async handleEnableToggle() {
      const shouldEnable = Boolean(this.$.enabledInput.value);
      const wasRunning = Boolean(this.state && this.state.status && this.state.status.running);

      await this.persistConfig();
      if (shouldEnable && !wasRunning) {
        await this.runAction(() => request('start-server'));
        return;
      }
      if (!shouldEnable && wasRunning) {
        await this.runAction(() => request('stop-server'));
        return;
      }
      await this.refresh();
    },
  },
  ready() {
    this.state = null;

    this.$.restartBtn.addEventListener('click', () => this.runAction(() => request('restart-server')));
    this.$.copyUrlBtn.addEventListener('click', () => {
      const status = this.state && this.state.status;
      const text = status && status.url ? status.url : '';
      navigator.clipboard.writeText(text)
        .then(() => this.showOutput('Copied URL to clipboard.'))
        .catch(() => this.showOutput(text));
    });
    this.$.checkUpdatesBtn.addEventListener('click', () => this.runAction(() => request('check-updates')));
    this.$.enabledInput.addEventListener('change', () => this.handleEnableToggle());
    this.$.portInput.addEventListener('change', () => this.persistConfig({ showOutput: true }));
    this.$.profileSelect.addEventListener('change', () => this.persistConfig({ showOutput: true }));
    this.$.sessionsInput.addEventListener('change', () => this.persistConfig({ showOutput: true }));
    this.$.enabledCategoriesInput.addEventListener('change', () => this.persistConfig({ showOutput: true }));
    this.$.disabledCategoriesInput.addEventListener('change', () => this.persistConfig({ showOutput: true }));
    this.$.enabledToolsInput.addEventListener('change', () => this.persistConfig({ showOutput: true }));
    this.$.disabledToolsInput.addEventListener('change', () => this.persistConfig({ showOutput: true }));
    this.$.useCoreBtn.addEventListener('click', () => {
      this.$.profileSelect.value = 'core';
      this.$.enabledCategoriesInput.value = '';
      this.$.disabledCategoriesInput.value = '';
      this.$.enabledToolsInput.value = '';
      this.$.disabledToolsInput.value = '';
      this.persistConfig({ showOutput: true });
    });
    this.$.useFullBtn.addEventListener('click', () => {
      this.$.profileSelect.value = 'full';
      this.$.enabledCategoriesInput.value = '';
      this.$.disabledCategoriesInput.value = '';
      this.$.enabledToolsInput.value = '';
      this.$.disabledToolsInput.value = '';
      this.persistConfig({ showOutput: true });
    });
    this.$.useCustomBtn.addEventListener('click', () => {
      this.$.profileSelect.value = 'custom';
      this.persistConfig({ showOutput: true });
    });
    this.$.clientTargetSelect.addEventListener('confirm', () => this.renderClientTargetStatus());
    this.$.clientTargetSelect.addEventListener('change', () => {
      this.renderClientTargetStatus();
      this.persistConfig();
    });
    this.$.configureClientBtn.addEventListener('click', () => {
      const targetId = this.$.clientTargetSelect.value;
      if (!targetId) {
        this.showOutput('Select a client target first.');
        return;
      }
      this.runAction(() => request('configure-client', targetId));
    });

    this.refresh();
  },
  close() {},
});
