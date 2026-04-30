'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  MCP_PROTOCOL_VERSION,
  McpServer,
  SUPPORTED_PROTOCOL_VERSIONS,
} = require('../lib/server');

function createServer(toolRegistry = {}) {
  return new McpServer({
    config: { host: '127.0.0.1', port: 8765 },
    toolRegistry: {
      listTools: () => [],
      callTool: async () => 'ok',
      ...toolRegistry,
    },
    resourceProvider: {
      listResources: () => [],
      listResourceTemplates: () => [],
      readResource: async () => ({ contents: [] }),
    },
    promptProvider: {
      listPrompts: () => [],
      getPrompt: () => ({ messages: [] }),
    },
    interactionLog: { add() {} },
    serverName: 'test-server',
    serverVersion: '0.0.0-test',
  });
}

test('initialize negotiates the current MCP protocol version by default', async () => {
  const server = createServer();
  const response = await server.handleRpcRequest({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {},
  });

  assert.equal(response.result.protocolVersion, MCP_PROTOCOL_VERSION);
  assert.equal(response.result.serverInfo.name, 'test-server');
});

test('initialize can negotiate an older supported MCP protocol version', async () => {
  const server = createServer();
  const olderVersion = SUPPORTED_PROTOCOL_VERSIONS[SUPPORTED_PROTOCOL_VERSIONS.length - 1];
  const response = await server.handleRpcRequest({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: olderVersion },
  });

  assert.equal(response.result.protocolVersion, olderVersion);
});

test('tool execution failures are returned as MCP tool errors', async () => {
  const server = createServer({
    callTool: async () => {
      throw new Error('bad arguments');
    },
  });

  const response = await server.handleRpcRequest({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: { name: 'example', arguments: {} },
  });

  assert.equal(response.error, undefined);
  assert.equal(response.result.isError, true);
  assert.deepEqual(response.result.content, [{ type: 'text', text: 'bad arguments' }]);
});

test('tool object results include structuredContent', async () => {
  const value = { ok: true, count: 2 };
  const server = createServer({
    callToolDetailed: async () => ({
      value,
      text: JSON.stringify(value, null, 2),
    }),
  });

  const response = await server.handleRpcRequest({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: { name: 'example', arguments: {} },
  });

  assert.deepEqual(response.result.structuredContent, value);
  assert.equal(response.result.content[0].type, 'text');
});

test('structuredContent sanitizes circular values', async () => {
  const value = { ok: true };
  value.self = value;
  const server = createServer({
    callToolDetailed: async () => ({
      value,
      text: '{ "ok": true, "self": "[Circular]" }',
    }),
  });

  const response = await server.handleRpcRequest({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: { name: 'example', arguments: {} },
  });

  assert.deepEqual(response.result.structuredContent, { ok: true, self: '[Circular]' });
});

test('unsupported protocol version headers are rejected when present after initialize', () => {
  const server = createServer();
  const response = server.validateProtocolVersionHeader(
    { headers: { 'mcp-protocol-version': '1999-01-01' } },
    { jsonrpc: '2.0', id: 3, method: 'tools/list' }
  );

  assert.equal(response.error.code, -32600);
  assert.match(response.error.message, /Unsupported MCP protocol version/);
});
