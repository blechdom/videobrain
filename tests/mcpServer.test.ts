import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { afterEach, describe, expect, it } from 'vitest';

import {
  MAX_MCP_ERROR_MESSAGE_BYTES,
  MAX_MCP_RESULT_JSON_BYTES,
  MCP_TOOL_NAMES,
  createVideoBrainMcpServer,
  inspectGraphDocument,
  readOperatorCatalog,
} from '../server/mcpServer';
import {
  GRAPH_SCHEMA_VERSION,
  MAX_GRAPH_JSON_BYTES,
  createDefaultGraph,
  createGraphNode,
  getOperatorCatalog,
  inspectGraph,
  parseGraphDocument,
  type GraphDocument,
} from '../src/graph';

const openClients: Client[] = [];
const openServers: ReturnType<typeof createVideoBrainMcpServer>[] = [];

async function connectClient(): Promise<Client> {
  const server = createVideoBrainMcpServer();
  const client = new Client({ name: 'videobrain-test', version: '1.0.0' });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  openServers.push(server);
  openClients.push(client);
  return client;
}

function freezeGraphDocument(document: GraphDocument): GraphDocument {
  for (const node of document.nodes) {
    Object.freeze(node.position);
    Object.freeze(node.params);
    Object.freeze(node);
  }
  for (const edge of document.edges) {
    Object.freeze(edge.source);
    Object.freeze(edge.target);
    Object.freeze(edge);
  }
  Object.freeze(document.nodes);
  Object.freeze(document.edges);
  return Object.freeze(document);
}

afterEach(async () => {
  await Promise.all(openClients.splice(0).map((client) => client.close()));
  await Promise.all(openServers.splice(0).map((server) => server.close()));
});

describe('VideoBrain MCP graph tools', () => {
  it('derives its pure catalog and inspection results from production APIs', () => {
    const document = freezeGraphDocument(createDefaultGraph());
    const serialized = JSON.stringify(document);

    expect(readOperatorCatalog()).toEqual(getOperatorCatalog());
    expect(inspectGraphDocument(document)).toEqual(
      inspectGraph(parseGraphDocument(serialized)),
    );
    expect(inspectGraphDocument(document)).toEqual(
      inspectGraphDocument(document),
    );
    expect(JSON.stringify(document)).toBe(serialized);
  });

  it('enforces the canonical UTF-8 project JSON limit before inspection', () => {
    const oversizedDocument = {
      schemaVersion: GRAPH_SCHEMA_VERSION,
      nodes: [],
      edges: [],
      padding: 'x'.repeat(MAX_GRAPH_JSON_BYTES),
    };

    expect(() => inspectGraphDocument(oversizedDocument)).toThrow(
      `Project JSON exceeds the ${MAX_GRAPH_JSON_BYTES}-byte limit.`,
    );
  });

  it('keeps the complete catalog inside the MCP result ceiling', () => {
    const response = JSON.stringify({ catalog: readOperatorCatalog() });
    expect(new TextEncoder().encode(response).byteLength).toBeLessThanOrEqual(
      MAX_MCP_RESULT_JSON_BYTES,
    );
  });

  it('preserves expanded compiler diagnostics for a valid-size document', async () => {
    const client = await connectClient();
    const escapedIdentifier = (prefix: string, index: number): string => {
      const uniquePrefix = `${prefix}-${index.toString().padStart(3, '0')}-`;
      return `${uniquePrefix}${'\u0001'.repeat(128 - uniquePrefix.length)}`;
    };
    const document = {
      schemaVersion: GRAPH_SCHEMA_VERSION,
      nodes: [],
      edges: Array.from({ length: 240 }, (_, index) => ({
        id: escapedIdentifier('e', index),
        source: {
          nodeId: escapedIdentifier('s', index),
          portId: escapedIdentifier('sp', index),
        },
        target: {
          nodeId: escapedIdentifier('t', index),
          portId: escapedIdentifier('tp', index),
        },
      })),
    };
    const inputBytes = new TextEncoder().encode(JSON.stringify(document)).byteLength;
    expect(inputBytes).toBeLessThanOrEqual(MAX_GRAPH_JSON_BYTES);

    const result = await client.callTool({
      name: 'inspect_graph',
      arguments: { document },
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      inspection: { ok: false },
    });
    const text = result.content[0];
    expect(text?.type).toBe('text');
    if (text?.type === 'text') {
      const outputBytes = new TextEncoder().encode(text.text).byteLength;
      expect(outputBytes).toBeGreaterThan(MAX_GRAPH_JSON_BYTES);
      expect(outputBytes).toBeLessThanOrEqual(MAX_MCP_RESULT_JSON_BYTES);
    }
    expect(new TextEncoder().encode(JSON.stringify(result)).byteLength).toBeLessThanOrEqual(
      MAX_MCP_RESULT_JSON_BYTES,
    );
  });

  it('advertises exactly two closed-world read-only tools', async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();

    expect(tools.map(({ name }) => name)).toEqual(MCP_TOOL_NAMES);
    for (const tool of tools) {
      expect(tool.annotations).toMatchObject({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      });
    }
    expect(tools[0]?.inputSchema).toMatchObject({
      type: 'object',
      additionalProperties: false,
    });
    expect(tools[1]?.inputSchema).toMatchObject({
      type: 'object',
      required: ['document'],
      additionalProperties: false,
    });
  });

  it('returns the detached production catalog as text and structured content', async () => {
    const client = await connectClient();
    const result = await client.callTool({
      name: 'get_operator_catalog',
      arguments: {},
    });
    const structuredContent = JSON.parse(
      JSON.stringify({ catalog: getOperatorCatalog() }),
    ) as Record<string, unknown>;

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual(structuredContent);
    expect(result.content).toEqual([
      { type: 'text', text: JSON.stringify(structuredContent) },
    ]);
  });

  it('treats compiler diagnostics as a successful inspection result', async () => {
    const client = await connectClient();
    const document: GraphDocument = {
      schemaVersion: GRAPH_SCHEMA_VERSION,
      nodes: [
        createGraphNode('math', { x: 0, y: 0 }, {}, 'a'),
        createGraphNode('math', { x: 200, y: 0 }, {}, 'b'),
      ],
      edges: [
        {
          id: 'a-b',
          source: { nodeId: 'a', portId: 'value' },
          target: { nodeId: 'b', portId: 'a' },
        },
        {
          id: 'b-a',
          source: { nodeId: 'b', portId: 'value' },
          target: { nodeId: 'a', portId: 'a' },
        },
      ],
    };

    const result = await client.callTool({
      name: 'inspect_graph',
      arguments: { document },
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({
      inspection: inspectGraph(document),
    });
    expect(result.structuredContent).toMatchObject({
      inspection: {
        ok: false,
        issues: [expect.objectContaining({ code: 'cycle' })],
      },
    });
  });

  it('reports invalid documents without terminating the server', async () => {
    const client = await connectClient();
    const invalid = await client.callTool({
      name: 'inspect_graph',
      arguments: {
        document: { schemaVersion: 999, nodes: [], edges: [] },
      },
    });

    expect(invalid).toMatchObject({
      isError: true,
      structuredContent: {
        code: 'INVALID_GRAPH_DOCUMENT',
        message: 'Unsupported schema version "999".',
      },
    });

    const valid = await client.callTool({
      name: 'inspect_graph',
      arguments: { document: createDefaultGraph() },
    });
    expect(valid.isError).not.toBe(true);
    expect(valid.structuredContent).toMatchObject({
      inspection: { ok: true },
    });
  });

  it('leaves deep graph validation to the canonical parser', async () => {
    const client = await connectClient();
    let nested: Record<string, unknown> = {};
    for (let depth = 0; depth < 2_000; depth += 1) {
      nested = { nested };
    }

    const invalid = await client.callTool({
      name: 'inspect_graph',
      arguments: {
        document: {
          schemaVersion: GRAPH_SCHEMA_VERSION,
          nodes: [],
          edges: [],
          padding: nested,
        },
      },
    });

    expect(invalid).toMatchObject({
      isError: true,
      structuredContent: {
        code: 'INVALID_GRAPH_DOCUMENT',
        message: 'project.padding is not supported.',
      },
    });

    const valid = await client.callTool({
      name: 'inspect_graph',
      arguments: {
        document: {
          schemaVersion: GRAPH_SCHEMA_VERSION,
          nodes: [],
          edges: [],
        },
      },
    });
    expect(valid.isError).not.toBe(true);
  });

  it('bounds validation errors derived from adversarial input', async () => {
    const client = await connectClient();
    const oversizedKey = 'x'.repeat(MAX_GRAPH_JSON_BYTES - 100);
    const result = await client.callTool({
      name: 'inspect_graph',
      arguments: {
        document: {
          schemaVersion: GRAPH_SCHEMA_VERSION,
          nodes: [],
          edges: [],
          [oversizedKey]: true,
        },
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      code: 'INVALID_GRAPH_DOCUMENT',
    });
    const structuredContent: unknown = result.structuredContent;
    const message =
      typeof structuredContent === 'object' &&
      structuredContent !== null &&
      'message' in structuredContent
        ? structuredContent.message
        : undefined;
    expect(typeof message).toBe('string');
    expect(new TextEncoder().encode(String(message)).byteLength).toBeLessThanOrEqual(
      MAX_MCP_ERROR_MESSAGE_BYTES,
    );
    expect(String(message)).toMatch(/…$/);
    const text = result.content[0];
    expect(text?.type).toBe('text');
    if (text?.type === 'text') {
      expect(JSON.parse(text.text)).toEqual(result.structuredContent);
      expect(new TextEncoder().encode(text.text).byteLength).toBeLessThan(
        MAX_MCP_RESULT_JSON_BYTES,
      );
    }
  });

  it('rejects extra tool arguments at the MCP schema boundary', async () => {
    const client = await connectClient();
    const result = await client.callTool({
      name: 'get_operator_catalog',
      arguments: { unexpected: true },
    });

    expect(result.isError).toBe(true);
  });
});
