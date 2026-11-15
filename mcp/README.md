# sdtr-mcp-server

MCP server exposing the SAP Dev Tech Radar data for querying by AI clients.

## Data

The server reads `../radar/data.json`, the enriched release data the root
conversion script writes for the Vue front end (see the root `CLAUDE.md`).
Generate/refresh it from the repo root with:

```bash
npm run conv
```

`radar/` is gitignored and generated, so `npm run conv` must be run at least
once (and again after any `definitions/**/*.toml` change) before the server
has data to serve.

## Setup

```bash
cd mcp
npm install
npm run build
```

## Run

```bash
npm start
```

For local development without a build step:

```bash
npm run dev
```

## Tools

- `sdtr_get_technology` — look up a single technology by label or title (e.g. `ADT`, `Web Dynpro ABAP`).
- `sdtr_list_technologies` — list technologies, optionally filtered by `ring` (`ADOPT` | `USE` | `HOLD` | `STOP` | `DEPRECATED`) and/or `quadrant` (`Tools` | `Frameworks` | `UI` | `Technology`).
- `sdtr_get_changes` — list what's new, moved to a different ring, or newly deprecated in the current draft compared to the last published release.

## Client configuration

Add to your MCP client config (stdio transport):

```json
{
  "mcpServers": {
    "sdtr": {
      "command": "node",
      "args": ["/absolute/path/to/sap-dev-tech-radar/mcp/dist/index.js"]
    }
  }
}
```
