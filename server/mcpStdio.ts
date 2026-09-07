import { serveStdio } from '@modelcontextprotocol/server/stdio';

import { createVideoBrainMcpServer } from './mcpServer';

void serveStdio(createVideoBrainMcpServer);
console.error('VideoBrain read-only MCP server listening on stdio.');
