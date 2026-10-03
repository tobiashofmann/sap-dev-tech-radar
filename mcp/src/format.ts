import type { Technology } from "./types.js";

export function formatTechnologyMarkdown(tech: Technology): string {
  const lines = [
    `# ${tech.title} (${tech.label})`,
    "",
    `- **Ring**: ${tech.ring}`,
    `- **Quadrant**: ${tech.quadrant}`,
    `- **Trend**: ${tech.trend ?? "n/a"}`,
    tech.since ? `- **Since**: ${tech.since}` : undefined,
    "",
    tech.description,
    "",
    `**Reason**: ${tech.reason}`,
    `**Support**: ${tech.support}`
  ].filter((line): line is string => line !== undefined);

  const linkEntries = Object.entries(tech.links ?? {});
  if (linkEntries.length > 0) {
    lines.push("", "**Links**:");
    for (const [name, url] of linkEntries) {
      lines.push(`- [${name}](${url})`);
    }
  }

  return lines.join("\n");
}

export function formatTechnologyListMarkdown(technologies: Technology[]): string {
  if (technologies.length === 0) {
    return "No technologies matched the given filter.";
  }

  const lines = [`Found ${technologies.length} technolog${technologies.length === 1 ? "y" : "ies"}:`, ""];
  for (const tech of technologies) {
    lines.push(`- **${tech.title}** (${tech.label}) — ${tech.ring} / ${tech.quadrant}`);
  }
  return lines.join("\n");
}
