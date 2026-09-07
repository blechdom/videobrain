import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const serverEntry = fileURLToPath(
  new URL('../dist-mcp/videobrain-mcp.mjs', import.meta.url),
);
const client = new Client({
  name: 'videobrain-stdio-smoke',
  version: '1.0.0',
});
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverEntry],
  cwd: tmpdir(),
});

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.deepEqual(
    tools.map(({ name }) => name),
    ['get_operator_catalog', 'inspect_graph'],
  );

  const catalog = await client.callTool({
    name: 'get_operator_catalog',
    arguments: {},
  });
  assert.notEqual(catalog.isError, true);
  assert.equal(catalog.structuredContent?.catalog.protocolVersion, 1);

  const invalid = await client.callTool({
    name: 'inspect_graph',
    arguments: {
      document: { schemaVersion: 999, nodes: [], edges: [] },
    },
  });
  assert.equal(invalid.isError, true);

  const valid = await client.callTool({
    name: 'inspect_graph',
    arguments: {
      document: { schemaVersion: 1, nodes: [], edges: [] },
    },
  });
  assert.notEqual(valid.isError, true);
  assert.equal(valid.structuredContent?.inspection.ok, true);
} finally {
  await client.close();
}

console.log('VideoBrain MCP stdio smoke test passed.');
