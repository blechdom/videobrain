import type { CallToolResult } from '@modelcontextprotocol/server';
import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';

import {
  GraphDocumentError,
  MAX_GRAPH_JSON_BYTES,
  getOperatorCatalog,
  inspectGraph,
  parseGraphDocument,
  type GraphInspection,
  type OperatorCatalogSnapshot,
} from '../src/graph/index';

export const MCP_SERVER_NAME = 'videobrain-graph-inspector';
export const MCP_SERVER_VERSION = '0.1.0';
export const MCP_TOOL_NAMES = [
  'get_operator_catalog',
  'inspect_graph',
] as const;
export const MAX_MCP_RESULT_JSON_BYTES = MAX_GRAPH_JSON_BYTES * 8;
export const MAX_MCP_ERROR_MESSAGE_BYTES = 4_096;

const JSON_OBJECT_SCHEMA = z.record(z.string(), z.json());
const SHALLOW_OBJECT_SCHEMA = z.record(z.string(), z.unknown());
const EMPTY_INPUT_SCHEMA = z.object({}).strict();
const INSPECT_GRAPH_INPUT_SCHEMA = z
  .object({
    document: SHALLOW_OBJECT_SCHEMA.describe(
      'A caller-supplied VideoBrain GraphDocument JSON object. It is validated by the production graph parser and compiler.',
    ),
  })
  .strict();
const CATALOG_OUTPUT_SCHEMA = z
  .object({ catalog: JSON_OBJECT_SCHEMA })
  .strict();
const INSPECTION_OUTPUT_SCHEMA = z
  .object({ inspection: JSON_OBJECT_SCHEMA })
  .strict();

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

type McpToolErrorCode =
  | 'INTERNAL_ERROR'
  | 'INVALID_GRAPH_DOCUMENT'
  | 'RESULT_TOO_LARGE';

function jsonByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function boundedErrorMessage(value: string): string {
  if (jsonByteLength(value) <= MAX_MCP_ERROR_MESSAGE_BYTES) {
    return value;
  }

  const suffix = '…';
  const contentLimit = MAX_MCP_ERROR_MESSAGE_BYTES - jsonByteLength(suffix);
  let result = '';
  let resultBytes = 0;
  for (const character of value) {
    const characterBytes = jsonByteLength(character);
    if (resultBytes + characterBytes > contentLimit) {
      break;
    }
    result += character;
    resultBytes += characterBytes;
  }
  return `${result}${suffix}`;
}

function errorResult(
  code: McpToolErrorCode,
  message: string,
): CallToolResult {
  const structuredContent = {
    code,
    message: boundedErrorMessage(message),
  };
  return {
    content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
    structuredContent,
    isError: true,
  };
}

function jsonResult(
  key: 'catalog' | 'inspection',
  value: object,
): CallToolResult {
  const text = JSON.stringify({ [key]: value });
  if (jsonByteLength(text) > MAX_MCP_RESULT_JSON_BYTES) {
    return errorResult(
      'RESULT_TOO_LARGE',
      `Serialized tool output exceeds the ${MAX_MCP_RESULT_JSON_BYTES}-byte limit.`,
    );
  }

  const structuredContent = JSON.parse(text) as Record<string, unknown>;
  const result: CallToolResult = {
    content: [{ type: 'text', text }],
    structuredContent,
  };
  if (jsonByteLength(JSON.stringify(result)) > MAX_MCP_RESULT_JSON_BYTES) {
    return errorResult(
      'RESULT_TOO_LARGE',
      `Serialized tool output exceeds the ${MAX_MCP_RESULT_JSON_BYTES}-byte limit.`,
    );
  }
  return result;
}

function internalErrorResult(): CallToolResult {
  console.error('VideoBrain MCP tool failed unexpectedly.');
  return errorResult('INTERNAL_ERROR', 'The MCP tool failed unexpectedly.');
}

function serializeGraphDocumentInput(value: unknown): string {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new GraphDocumentError('Project must be a JSON object.');
    }
    return serialized;
  } catch (error) {
    if (error instanceof GraphDocumentError) {
      throw error;
    }
    throw new GraphDocumentError('Project must be valid JSON.');
  }
}

export function readOperatorCatalog(): OperatorCatalogSnapshot {
  return getOperatorCatalog();
}

export function inspectGraphDocument(value: unknown): GraphInspection {
  const document = parseGraphDocument(serializeGraphDocumentInput(value));
  return inspectGraph(document);
}

function catalogToolResult(): CallToolResult {
  try {
    return jsonResult('catalog', readOperatorCatalog());
  } catch {
    return internalErrorResult();
  }
}

function inspectionToolResult(value: unknown): CallToolResult {
  try {
    return jsonResult('inspection', inspectGraphDocument(value));
  } catch (error) {
    if (error instanceof GraphDocumentError) {
      return errorResult('INVALID_GRAPH_DOCUMENT', error.message);
    }
    return internalErrorResult();
  }
}

export function createVideoBrainMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
    },
    {
      instructions:
        'Read-only access to the VideoBrain production operator catalog and offline inspection of caller-supplied GraphDocument data. These tools do not read a running browser or modify graphs.',
    },
  );

  server.registerTool(
    MCP_TOOL_NAMES[0],
    {
      title: 'Get VideoBrain operator catalog',
      description:
        'Return the complete, versioned VideoBrain operator catalog derived from the production registry, including typed indexed ports, parameters, execution costs, and graph limits.',
      inputSchema: EMPTY_INPUT_SCHEMA,
      outputSchema: CATALOG_OUTPUT_SCHEMA,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    catalogToolResult,
  );

  server.registerTool(
    MCP_TOOL_NAMES[1],
    {
      title: 'Inspect a VideoBrain graph',
      description:
        'Validate and compile a caller-supplied VideoBrain GraphDocument, then return diagnostics, reachability, execution order, typed bindings, and bounded resource costs without rendering or mutation. This does not inspect a running browser.',
      inputSchema: INSPECT_GRAPH_INPUT_SCHEMA,
      outputSchema: INSPECTION_OUTPUT_SCHEMA,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    ({ document }) => inspectionToolResult(document),
  );

  return server;
}
