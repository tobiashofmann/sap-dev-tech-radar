import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGetTechnology } from "./tools/getTechnology.js";
import { registerListTechnologies } from "./tools/listTechnologies.js";
import { registerGetChanges } from "./tools/getChanges.js";

const server = new McpServer({
  name: "sdtr-mcp-server",
  version: "1.0.0"
});

registerGetTechnology(server);
registerListTechnologies(server);
registerGetChanges(server);

const transport = new StdioServerTransport();
await server.connect(transport);
