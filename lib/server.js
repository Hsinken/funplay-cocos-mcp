'use strict';

const http = require('http');
const { safeStringify } = require('./utils');
const IMAGE_DATA_URI_PREFIX = 'data:image/png;base64,';
const LOG_PREFIX = '[Funplay Cocos MCP Server]';
const MAX_PORT_FALLBACK_ATTEMPTS = 20;
const MAX_REQUEST_BODY_BYTES = 4 * 1024 * 1024;
const MCP_PROTOCOL_VERSION = '2025-11-25';
const SUPPORTED_PROTOCOL_VERSIONS = [
  MCP_PROTOCOL_VERSION,
  '2025-06-18',
  '2025-03-26',
  '2024-11-05',
];

function json(response, statusCode, payload, protocolVersion = MCP_PROTOCOL_VERSION) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'MCP-Protocol-Version': protocolVersion,
  });
  response.end(JSON.stringify(payload));
}

function textContent(value) {
  if (typeof value === 'string' && value.startsWith(IMAGE_DATA_URI_PREFIX)) {
    return [
      {
        type: 'image',
        data: value.slice(IMAGE_DATA_URI_PREFIX.length),
        mimeType: 'image/png',
      },
      {
        type: 'text',
        text: 'Screenshot captured successfully.',
      },
    ];
  }

  return [
    {
      type: 'text',
      text: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
    },
  ];
}

function isStructuredValue(value) {
  return value !== null && typeof value === 'object' && !Buffer.isBuffer(value);
}

function structuredContent(value) {
  if (!isStructuredValue(value)) {
    return null;
  }

  try {
    return JSON.parse(safeStringify(value));
  } catch (error) {
    return null;
  }
}

class McpServer {
  constructor(options) {
    this.config = options.config;
    this.toolRegistry = options.toolRegistry;
    this.resourceProvider = options.resourceProvider;
    this.promptProvider = options.promptProvider;
    this.interactionLog = options.interactionLog;
    this.serverName = options.serverName;
    this.serverVersion = options.serverVersion;
    this.server = null;
    this.actualPort = null;
    this.portFallbackInfo = null;
    this.negotiatedProtocolVersion = MCP_PROTOCOL_VERSION;
  }

  isRunning() {
    return Boolean(this.server && this.server.listening);
  }

  getPort() {
    if (this.server && typeof this.server.address === 'function') {
      const address = this.server.address();
      if (address && typeof address.port === 'number') {
        return address.port;
      }
    }
    return this.actualPort || this.config.port;
  }

  getRequestedPort() {
    return this.config.port;
  }

  getPortFallbackInfo() {
    return this.portFallbackInfo;
  }

  async start() {
    if (this.isRunning()) {
      console.log(`${LOG_PREFIX} Start skipped: already running.`);
      return;
    }

    this.actualPort = null;
    this.portFallbackInfo = null;

    const requestHandler = async (request, response) => {
      try {
        if (request.method === 'GET' && request.url === '/health') {
          console.log(`${LOG_PREFIX} GET /health`);
          return json(response, 200, { ok: true, name: this.serverName, version: this.serverVersion }, this.negotiatedProtocolVersion);
        }

        if (!this.isAllowedOrigin(request)) {
          console.warn(`${LOG_PREFIX} Rejected ${request.method} ${request.url}: invalid Origin header.`);
          return json(response, 403, { error: 'Forbidden: invalid Origin header' }, this.negotiatedProtocolVersion);
        }

        if (request.method !== 'POST') {
          console.warn(`${LOG_PREFIX} Rejected ${request.method} ${request.url}: method not allowed.`);
          return json(response, 405, { error: 'Method Not Allowed' }, this.negotiatedProtocolVersion);
        }

        const body = await this.readBody(request);
        if (!body) {
          return json(response, 400, this.createError(null, -32700, 'Parse error: empty body'), this.negotiatedProtocolVersion);
        }

        let rpc;
        try {
          rpc = JSON.parse(body);
        } catch (error) {
          return json(response, 400, this.createError(null, -32700, `Parse error: ${error.message}`), this.negotiatedProtocolVersion);
        }

        if (rpc && rpc.method) {
          console.log(`${LOG_PREFIX} RPC ${rpc.method}`);
        }

        const protocolHeaderError = this.validateProtocolVersionHeader(request, rpc);
        if (protocolHeaderError) {
          return json(response, 400, protocolHeaderError, this.negotiatedProtocolVersion);
        }

        const result = await this.handleRpcRequest(rpc);
        if (result == null) {
          response.writeHead(204, { 'MCP-Protocol-Version': this.negotiatedProtocolVersion });
          response.end();
          return;
        }

        return json(response, 200, result, this.negotiatedProtocolVersion);
      } catch (error) {
        console.error(`${LOG_PREFIX} Request handling failed: ${error.message}`);
        const statusCode = error.statusCode || 500;
        const rpcCode = error.rpcCode || -32603;
        const message = statusCode === 500 ? `Internal error: ${error.message}` : error.message;
        return json(response, statusCode, this.createError(null, rpcCode, message), this.negotiatedProtocolVersion);
      }
    };

    let attempt = 0;
    let port = this.config.port;
    let lastError = null;

    while (attempt <= MAX_PORT_FALLBACK_ATTEMPTS) {
      console.log(`${LOG_PREFIX} Creating HTTP server on ${this.config.host}:${port}...`);
      const candidate = http.createServer(requestHandler);

      try {
        await this.listen(candidate, port, this.config.host);
        this.server = candidate;
        this.actualPort = candidate.address() && typeof candidate.address().port === 'number'
          ? candidate.address().port
          : port;

        if (this.actualPort !== this.config.port) {
          this.portFallbackInfo = {
            requestedPort: this.config.port,
            actualPort: this.actualPort,
            attempts: attempt,
          };
          console.warn(
            `${LOG_PREFIX} Port ${this.config.port} was unavailable. ` +
            `Fell back to ${this.actualPort}.`
          );
        }

        console.log(`${LOG_PREFIX} Listening on http://${this.config.host}:${this.actualPort}/`);
        return;
      } catch (error) {
        lastError = error;
        if (error && error.code === 'EADDRINUSE' && port < 65535 && attempt < MAX_PORT_FALLBACK_ATTEMPTS) {
          const nextPort = port + 1;
          console.warn(
            `${LOG_PREFIX} Port ${port} is already in use. ` +
            `Trying fallback port ${nextPort}...`
          );
          port = nextPort;
          attempt += 1;
          continue;
        }

        candidate.removeAllListeners();
        break;
      }
    }

    this.server = null;
    this.actualPort = null;
    this.portFallbackInfo = null;
    throw lastError || new Error('Failed to start MCP server.');
  }

  async stop() {
    if (!this.server) {
      console.log(`${LOG_PREFIX} Stop skipped: server object is empty.`);
      return;
    }

    console.log(`${LOG_PREFIX} Closing HTTP server...`);
    const active = this.server;
    this.server = null;
    this.actualPort = null;
    this.portFallbackInfo = null;
    await new Promise((resolve, reject) => {
      active.close((error) => {
        if (error) {
          console.error(`${LOG_PREFIX} Close failed: ${error.message}`);
          reject(error);
          return;
        }
        console.log(`${LOG_PREFIX} HTTP server closed.`);
        resolve();
      });
    });
  }

  listen(server, port, host) {
    return new Promise((resolve, reject) => {
      const onError = (error) => {
        server.off('listening', onListening);
        reject(error);
      };
      const onListening = () => {
        server.off('error', onError);
        resolve();
      };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(port, host);
    });
  }

  readBody(request) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      request.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_REQUEST_BODY_BYTES) {
          const error = new Error(`Request body exceeds ${MAX_REQUEST_BODY_BYTES} bytes.`);
          error.statusCode = 413;
          error.rpcCode = -32600;
          reject(error);
          request.destroy();
          return;
        }
        chunks.push(chunk);
      });
      request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      request.on('error', reject);
    });
  }

  isAllowedOrigin(request) {
    const origin = request.headers && request.headers.origin;
    if (!origin) {
      return true;
    }

    try {
      const parsed = new URL(String(origin));
      const hostname = parsed.hostname.toLowerCase();
      const configuredHost = String(this.config.host || '').toLowerCase();
      return hostname === 'localhost'
        || hostname === '127.0.0.1'
        || hostname === '::1'
        || (configuredHost && hostname === configuredHost);
    } catch (error) {
      return false;
    }
  }

  validateProtocolVersionHeader(request, rpc) {
    const header = request.headers && request.headers['mcp-protocol-version'];
    if (!header || (rpc && rpc.method === 'initialize')) {
      return null;
    }

    const version = Array.isArray(header) ? header[0] : String(header);
    if (!SUPPORTED_PROTOCOL_VERSIONS.includes(version)) {
      return this.createError(
        rpc && rpc.id,
        -32600,
        `Unsupported MCP protocol version header: ${version}`
      );
    }

    return null;
  }

  async handleRpcRequest(request) {
    if (!request || request.jsonrpc !== '2.0') {
      return this.createError(request && request.id, -32600, 'Invalid Request');
    }

    const method = request.method;
    if (typeof method !== 'string' || !method) {
      return this.createError(request.id, -32600, 'Invalid Request: method is required');
    }

    if (method === 'initialize') {
      this.negotiatedProtocolVersion = this.negotiateProtocolVersion(request.params && request.params.protocolVersion);
      return this.createResult(request.id, {
        protocolVersion: this.negotiatedProtocolVersion,
        serverInfo: {
          name: this.serverName,
          version: this.serverVersion,
        },
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      });
    }

    if (method === 'notifications/initialized' || method === 'notifications/cancelled' || method.startsWith('notifications/')) {
      return null;
    }

    if (method === 'tools/list') {
      return this.createResult(request.id, { tools: this.toolRegistry.listTools() });
    }

    if (method === 'tools/call') {
      const params = request.params || {};
      if (typeof params.name !== 'string' || !params.name) {
        return this.createError(request.id, -32602, "Invalid params: 'name' is required");
      }

      try {
        const output = typeof this.toolRegistry.callToolDetailed === 'function'
          ? await this.toolRegistry.callToolDetailed(params.name, params.arguments || {})
          : { value: null, text: await this.toolRegistry.callTool(params.name, params.arguments || {}) };
        const result = { content: textContent(output.text) };
        const structured = structuredContent(output.value);
        if (structured) {
          result.structuredContent = structured;
        }
        return this.createResult(request.id, result);
      } catch (error) {
        return this.createResult(request.id, {
          content: textContent(error.message),
          isError: true,
        });
      }
    }

    if (method === 'resources/list') {
      return this.createResult(request.id, { resources: this.resourceProvider.listResources() });
    }

    if (method === 'resources/read') {
      const params = request.params || {};
      if (typeof params.uri !== 'string' || !params.uri) {
        return this.createError(request.id, -32602, "Invalid params: 'uri' is required");
      }
      return this.createResult(request.id, await this.resourceProvider.readResource(params.uri));
    }

    if (method === 'resources/templates/list') {
      return this.createResult(request.id, { resourceTemplates: this.resourceProvider.listResourceTemplates() });
    }

    if (method === 'prompts/list') {
      return this.createResult(request.id, { prompts: this.promptProvider.listPrompts() });
    }

    if (method === 'prompts/get') {
      const params = request.params || {};
      if (typeof params.name !== 'string' || !params.name) {
        return this.createError(request.id, -32602, "Invalid params: 'name' is required");
      }
      return this.createResult(request.id, this.promptProvider.getPrompt(params.name, params.arguments || {}));
    }

    return this.createError(request.id, -32601, `Method not found: ${method}`);
  }

  negotiateProtocolVersion(clientVersion) {
    if (SUPPORTED_PROTOCOL_VERSIONS.includes(clientVersion)) {
      return clientVersion;
    }
    return MCP_PROTOCOL_VERSION;
  }

  createResult(id, result) {
    return {
      jsonrpc: '2.0',
      id,
      result,
    };
  }

  createError(id, code, message) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
      },
    };
  }
}

module.exports = {
  McpServer,
  MCP_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
};
