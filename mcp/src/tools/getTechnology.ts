import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { findTechnologies } from "../data.js";
import { formatTechnologyDetail, formatTechnologySummary } from "../format.js";

export function registerGetTechnology(server: McpServer): void {
  server.registerTool(
    "sdtr_get_technology",
    {
      title: "Get technology",
      description:
        "Look up a single SAP Dev Tech Radar technology by its label or title " +
        "(e.g. \"ADT\", \"Web Dynpro ABAP\") and return its full detail page: " +
        "description, reason, recommendation, support, links, related " +
        "technologies and release history.",
      inputSchema: {
        name: z.string().describe("Label or title of the technology to look up")
      }
    },
    async ({ name }) => {
      const matches = findTechnologies(name);

      if (matches.length === 0) {
        return {
          content: [{ type: "text", text: `No technology found matching "${name}".` }],
          isError: true
        };
      }

      if (matches.length > 1) {
        const list = matches.map(formatTechnologySummary).join("\n");
        return {
          content: [
            {
              type: "text",
              text: `Multiple technologies match "${name}". Be more specific:\n${list}`
            }
          ]
        };
      }

      return {
        content: [{ type: "text", text: formatTechnologyDetail(matches[0]) }]
      };
    }
  );
}
