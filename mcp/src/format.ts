import type { Technology } from "./types.js";

export function formatTechnologySummary(tech: Technology): string {
  const since = tech.ring === "DEPRECATED" && tech.since ? ` (since ${tech.since})` : "";
  return `${tech.title} [${tech.label}] - ${tech.quadrant} / ${tech.ring}${since}`;
}

export function formatTechnologyDetail(tech: Technology): string {
  const lines = [
    `# ${tech.title} (${tech.label})`,
    `Quadrant: ${tech.quadrant}`,
    `Ring: ${tech.ring}${tech.ring === "DEPRECATED" && tech.since ? ` (since ${tech.since})` : ""}`,
    tech.trend ? `Trend: ${tech.trend}` : null,
    "",
    `## Description`,
    tech.description,
    "",
    `## Reason`,
    tech.reason,
    "",
    `## Recommendation`,
    tech.recommendation,
    "",
    `## Support`,
    tech.support
  ];

  if (tech.links.length > 0) {
    lines.push("", "## Links", ...tech.links.map((link) => `- ${link.name}: ${link.url}`));
  }

  if (tech.related.length > 0) {
    lines.push(
      "",
      "## Related technologies",
      ...tech.related.map((related) => `- ${related.title} (${related.quadrant} / ${related.ring})`)
    );
  }

  if (tech.releaseHistory.length > 0) {
    lines.push(
      "",
      "## Release history",
      ...tech.releaseHistory.map((entry) => `- ${entry.release}: ${entry.ring}`)
    );
  }

  return lines.filter((line) => line !== null).join("\n");
}
