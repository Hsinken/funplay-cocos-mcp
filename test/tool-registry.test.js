'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { createToolRegistry } = require('../lib/tool-registry');

function createRegistry(profile, projectPath = path.resolve('/tmp/funplay-cocos-test-project')) {
  return createToolRegistry({
    getRuntimeContext: () => ({
      config: { toolProfile: profile },
      projectPath,
    }),
    interactionLog: { add() {} },
    sceneBridge: { call: async () => ({ ok: true }) },
    editorExecutor: async () => ({ ok: true }),
  });
}

test('core profile exposes the documented focused tool set', () => {
  const tools = createRegistry('core').listTools();
  assert.equal(tools.length, 22);
  assert.equal(tools.some((tool) => tool.name === 'execute_javascript'), true);
  assert.equal(tools.some((tool) => tool.name === 'get_editor_state'), true);
  assert.equal(tools.some((tool) => tool.name === 'set_selection'), true);
  assert.equal(tools.some((tool) => tool.name === 'write_file'), false);
});

test('full profile exposes all built-in tools', () => {
  const tools = createRegistry('full').listTools();
  assert.equal(tools.length, 70);
  assert.equal(tools.some((tool) => tool.name === 'write_file'), true);
  assert.equal(tools.some((tool) => tool.name === 'get_editor_state'), true);
  assert.equal(tools.some((tool) => tool.name === 'set_selection'), true);
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
