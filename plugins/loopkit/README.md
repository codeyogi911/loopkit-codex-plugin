# LoopKit Codex Plugin

This plugin gives Codex the LoopKit hosted MCP read surface and the harness-first LoopKit workflow instructions.

The plugin registers one MCP server:

```json
{
  "mcpServers": {
    "loopops": {
      "type": "http",
      "url": "https://mcp.loopops.dev"
    }
  }
}
```

The hosted endpoint uses Cloudflare Access Managed OAuth. It is read-oriented for agents, with loop-native writes for claiming projects, recording loop lifecycle events, verification events, and explicit project archival.

Local stdio MCP remains in `packages/mcp` for development and key-based setups. The plugin intentionally uses the hosted HTTP endpoint so it works after Codex installs or caches the plugin outside this repository.
