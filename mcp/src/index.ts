#!/usr/bin/env node
/**
 * MCP server exposing the SAP Dev Tech Radar data (sdtr.json) for querying
 * individual technologies or listing them by ring and/or quadrant.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGetTechnology } from "./tools/getTechnology.js";
import { registerListTechnologies } from "./tools/listTechnologies.js";

const server = new McpServer({
  name: "sdtr-mcp-server",
  version: "1.0.0"
});

registerGetTechnology(server);
registerListTechnologies(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SAP Dev Tech Radar MCP server running via stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
