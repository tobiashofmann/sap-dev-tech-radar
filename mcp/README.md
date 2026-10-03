# sdtr-mcp-server

MCP server exposing the SAP Dev Tech Radar data for querying by AI clients.

## Data

The server reads `./sdtr.json`, which is generated from the `.toml` definitions in
[`../definitions`](../definitions) by the root conversion script. Generate/refresh it with:

```bash
cd ..
npm run conv
```

## Setup

```bash
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
