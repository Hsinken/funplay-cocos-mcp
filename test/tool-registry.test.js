'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { createToolRegistry } = require('../lib/tool-registry');

function createRegistry(profile, projectPath = path.resolve('/tmp/funplay-cocos-test-project'), configExtras = {}) {
  return createToolRegistry({
    getRuntimeContext: () => ({
      config: { toolProfile: profile, ...configExtras },
      projectPath,
      version: '0.0.0-test',
    }),
    interactionLog: { add() {} },
    runtimeLog: { list: () => [], clear: () => 0 },
    sceneBridge: { call: async () => ({ ok: true }) },
    editorExecutor: async () => ({ ok: true }),
  });
}

test('core profile exposes the documented focused tool set', () => {
  const tools = createRegistry('core').listTools();
  assert.equal(tools.length, 28);
  assert.equal(tools.some((tool) => tool.name === 'execute_javascript'), true);
  assert.equal(tools.some((tool) => tool.name === 'get_editor_state'), true);
  assert.equal(tools.some((tool) => tool.name === 'get_tool_catalog'), true);
  assert.equal(tools.some((tool) => tool.name === 'validate_scene'), true);
  assert.equal(tools.some((tool) => tool.name === 'set_selection'), true);
  assert.equal(tools.some((tool) => tool.name === 'write_file'), false);
});

test('full profile exposes all built-in tools', () => {
  const tools = createRegistry('full').listTools();
  assert.equal(tools.length, 76);
  assert.equal(tools.some((tool) => tool.name === 'write_file'), true);
  assert.equal(tools.some((tool) => tool.name === 'get_editor_state'), true);
  assert.equal(tools.some((tool) => tool.name === 'set_selection'), true);
});

test('custom profile can expose a category and disable a specific tool', () => {
  const tools = createRegistry('custom', path.resolve('/tmp/funplay-cocos-test-project'), {
    enabledToolCategories: ['files'],
    disabledTools: ['write_file'],
  }).listTools();

  assert.equal(tools.some((tool) => tool.name === 'read_file'), true);
  assert.equal(tools.some((tool) => tool.name === 'write_file'), false);
  assert.equal(tools.some((tool) => tool.name === 'execute_javascript'), true);
});

test('tool catalog reports disabled tools under the current exposure settings', () => {
  const catalog = createRegistry('core', path.resolve('/tmp/funplay-cocos-test-project'), {
    disabledTools: ['execute_javascript'],
  }).listToolCatalog();
  const executeTool = catalog.find((tool) => tool.name === 'execute_javascript');
  assert.equal(executeTool.enabled, false);
  assert.equal(executeTool.category, 'execution');
});

test('file tools reject writes outside the project root', async () => {
  const registry = createRegistry('full');
  await assert.rejects(
    () => registry.callTool('write_file', { path: '../outside.txt', content: 'x' }),
    /outside the Cocos project/
  );
});

test('callToolDetailed preserves structured values and text output', async () => {
  const registry = createRegistry('core');
  const result = await registry.callToolDetailed('get_project_info', {});
  assert.equal(result.value.projectPath, path.resolve('/tmp/funplay-cocos-test-project'));
  assert.match(result.text, /projectPath/);
});
