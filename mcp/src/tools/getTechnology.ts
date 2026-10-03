import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { findTechnologies } from "../data.js";
import { formatTechnologyMarkdown } from "../format.js";

const GetTechnologyInputSchema = z
  .object({
    name: z
      .string()
      .min(1, "name must not be empty")
      .describe("Technology name or label to look up, e.g. 'ADT' or 'Web Dynpro ABAP'. Case-insensitive.")
  })
  .strict();

type GetTechnologyInput = z.infer<typeof GetTechnologyInputSchema>;

export function registerGetTechnology(server: McpServer): void {
  server.registerTool(
    "sdtr_get_technology",
    {
      title: "Get Tech Radar Entry",
      description: `Look up a single technology on the SAP Dev Tech Radar by its label or title.

Matching is case-insensitive. Tries an exact match against the label (e.g. "ADT") or title (e.g. "ABAP Development Tools") first; if none is found, falls back to a substring match and may return several candidates.

Args:
  - name (string): Technology name or label to search for, e.g. "ADT", "CAP", "Web Dynpro ABAP"

Returns:
  The matching technology entry (title, description, reason, support, links, ring, quadrant, trend, since, link). If the name is ambiguous, returns all candidates so the caller can narrow down. If nothing matches, returns an explanatory message.`,
      inputSchema: GetTechnologyInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ name }: GetTechnologyInput) => {
      const matches = findTechnologies(name);

      if (matches.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No technology found matching "${name}". Try sdtr_list_technologies to browse by ring or quadrant.`
            }
          ]
        };
      }

      if (matches.length === 1) {
        return {
          content: [{ type: "text" as const, text: formatTechnologyMarkdown(matches[0]) }],
          structuredContent: { technology: matches[0] }
        };
      }

      const text = [
        `"${name}" is ambiguous, found ${matches.length} matches:`,
        "",
        ...matches.map((tech) => `- **${tech.title}** (${tech.label})`)
      ].join("\n");

      return {
        content: [{ type: "text" as const, text }],
        structuredContent: { technologies: matches }
      };
    }
  );
}
