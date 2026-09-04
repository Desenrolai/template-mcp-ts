import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

/**
 * Creates and registers all MCP tools.
 * Pure factory — no side-effects, easily testable.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: 'desenrolai-mcp-template',
    version: '0.1.0',
  });

  // ── Tool: hello ──────────────────────────────────────────────────────────────
  // Example tool. Replace with your actual tools.
  server.tool(
    'hello',
    'Returns a greeting message',
    { name: z.string().min(1).describe('Name to greet') },
    // Este texto e asserido literalmente em `server.test.ts` — o porque da
    // duplicacao esta comentado la, junto da assercao.
    async ({ name }) => ({
      content: [{ type: 'text', text: `Hello, ${name}! This is the Desenrolai MCP template.` }],
    }),
  );

  return server;
}
