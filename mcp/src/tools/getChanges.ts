import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadReleaseData } from "../data.js";

export function registerGetChanges(server: McpServer): void {
  server.registerTool(
    "sdtr_get_changes",
    {
      title: "Get changes since last release",
      description:
        "List what changed in the current (not-yet-released) draft of the " +
        "SAP Dev Tech Radar compared to the most recently published release: " +
        "new entries, entries that moved to a different ring, and entries " +
        "newly marked DEPRECATED.",
      inputSchema: {}
    },
    async () => {
      const { date, changes } = loadReleaseData();

      if (changes.items.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No changes since release ${changes.previousRelease ?? "(none published yet)"}.`
            }
          ]
        };
      }

      const lines = changes.items.map((item) => {
        const transition = item.previousRing ? `${item.previousRing} -> ${item.currentRing}` : item.currentRing;
        return `- [${item.type}] ${item.title} (${item.quadrant}): ${transition}`;
      });

      return {
        content: [
          {
            type: "text",
            text:
              `Current draft: ${date}. Changes since release ${changes.previousRelease ?? "(none published yet)"}:\n` +
              lines.join("\n")
          }
        ]
      };
    }
  );
}
