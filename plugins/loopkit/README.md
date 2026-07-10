# LoopOps Codex Plugin

This plugin connects Codex to LoopOps' drive port — the hosted MCP surface plus the harness-first LoopOps workflow instructions, so Codex can run the improvement loop (observe → diagnose → decide → improve → verify) over any project that emits telemetry.

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

The hosted HTTP endpoint is the only MCP surface (the stdio package was retired 2026-07-10), so the plugin works after Codex installs or caches it outside this repository. Key-based/headless setups drive the same operations over the plain /v1 HTTP API.
