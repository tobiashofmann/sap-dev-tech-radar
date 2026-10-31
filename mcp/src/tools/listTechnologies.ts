import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { QUADRANTS, RINGS } from "../types.js";
import { listTechnologies } from "../data.js";
import { formatTechnologySummary } from "../format.js";

export function registerListTechnologies(server: McpServer): void {
  server.registerTool(
    "sdtr_list_technologies",
    {
      title: "List technologies",
      description:
        "List SAP Dev Tech Radar technologies, optionally filtered by ring " +
        "(ADOPT/USE/HOLD/STOP/DEPRECATED) and/or quadrant " +
        "(Tools/Frameworks/UI/Technology).",
      inputSchema: {
        ring: z
          .enum(RINGS)
          .optional()
          .describe("Only include technologies in this ring"),
        quadrant: z
          .enum(QUADRANTS)
          .optional()
          .describe("Only include technologies in this quadrant")
      }
    },
    async ({ ring, quadrant }) => {
      const matches = listTechnologies({ ring, quadrant });

      if (matches.length === 0) {
        return {
          content: [{ type: "text", text: "No technologies match that filter." }]
        };
      }

      const text = matches.map(formatTechnologySummary).join("\n");
      return {
        content: [{ type: "text", text: `${matches.length} technologies:\n${text}` }]
      };
    }
  );
}
