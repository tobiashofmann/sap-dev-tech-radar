import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listTechnologies } from "../data.js";
import { formatTechnologyListMarkdown } from "../format.js";
import { QUADRANTS, RINGS } from "../types.js";

const ListTechnologiesInputSchema = z
  .object({
    ring: z
      .enum(RINGS)
      .optional()
      .describe("Filter by ring, e.g. 'ADOPT', 'USE', 'HOLD', 'STOP', 'DEPRECATED'"),
    quadrant: z
      .enum(QUADRANTS)
      .optional()
      .describe("Filter by quadrant, e.g. 'Tools', 'Frameworks', 'UI', 'Technology'")
  })
  .strict();

type ListTechnologiesInput = z.infer<typeof ListTechnologiesInputSchema>;

export function registerListTechnologies(server: McpServer): void {
  server.registerTool(
    "sdtr_list_technologies",
    {
      title: "List Tech Radar Entries",
      description: `List technologies on the SAP Dev Tech Radar, optionally filtered by ring and/or quadrant. Filters are combined with AND when both are given. With no filters, returns every technology on the radar.

Args:
  - ring (optional, one of ADOPT | USE | HOLD | STOP | DEPRECATED): only return technologies in this ring
  - quadrant (optional, one of Tools | Frameworks | UI | Technology): only return technologies in this quadrant

Examples:
  - List all technologies in ring ADOPT -> { ring: "ADOPT" }
  - List all technologies in quadrant UI -> { quadrant: "UI" }
  - List technologies in ring USE and quadrant Frameworks -> { ring: "USE", quadrant: "Frameworks" }

Returns:
  A summary list (title, label, ring, quadrant) of matching technologies. Use sdtr_get_technology for full details on a specific one.`,
      inputSchema: ListTechnologiesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ ring, quadrant }: ListTechnologiesInput) => {
      const technologies = listTechnologies({ ring, quadrant });

      return {
        content: [{ type: "text" as const, text: formatTechnologyListMarkdown(technologies) }],
        structuredContent: {
          count: technologies.length,
          technologies: technologies.map((tech) => ({
            title: tech.title,
            label: tech.label,
            ring: tech.ring,
            quadrant: tech.quadrant,
            trend: tech.trend,
            link: tech.link
          }))
        }
      };
    }
  );
}
