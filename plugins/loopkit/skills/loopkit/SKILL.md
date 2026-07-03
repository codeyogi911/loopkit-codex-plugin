---
name: loopkit
description: Run the LoopKit agent-first improvement loop over bounded telemetry using the hosted MCP tools; diagnose evidence-backed candidates, prepare evals and patch plans, respect human approval, and verify next-window impact.
---

# LoopKit

Use this skill when the user asks to use LoopKit, diagnose telemetry, inspect production failures, find recurring product pain, create an improvement candidate, record an improvement loop, or verify whether a shipped change improved the next telemetry window.

LoopKit is an agent-first improvement system with an OTLP telemetry store. The store is not the product by itself; the product is the closed loop:

```text
bounded evidence -> agent synthesis -> eval candidate -> patch plan -> human approval -> shipped fix -> next-window verification
```

## MCP Surface

This plugin registers the hosted MCP server as `loopops` at `https://mcp.loopops.dev`. It is the default agent read surface. On first use, the MCP client may ask the human to complete the Cloudflare Access OAuth flow.

Use the hosted tools for reads and loop-native writes:

- `loopkit_projects`: discover owned projects. If the account has several projects, pass `project` in later calls.
- `loopkit_diagnose`: get an evidence-backed improvement packet from a bounded window. Always pass `since_minutes` unless the user clearly wants the default window.
- `loopkit_telemetry`: resolve `record_id`, `trace_id`, or `session_id` evidence back to raw events. Keep `limit` and `since_minutes` bounded.
- `loopkit_sessions` and `loopkit_session`: inspect recent sessions and drill into one session.
- `loopkit_loops` and `loopkit_loop`: read recorded improvement cycles.
- `loopkit_record_loop_event`: record a lifecycle stage of the improvement loop itself.
- `loopkit_verify`: compare before and after windows for a loop run. Use `record: true` only when recording the verification event is intended.
- `loopkit_dashboard`, `loopkit_report`, and `loopkit_dashboard_link`: summarize state or provide a human dashboard handoff.

The hosted MCP does not emit runtime telemetry. Production telemetry is ingested separately with producer keys over the SDK or `/v1/traces`.

## Workflow

1. Resolve the project with `loopkit_projects` when needed.
2. Read a bounded evidence window with `loopkit_diagnose`.
3. Pick one recurring product-pain cluster, not a single isolated log line.
4. Resolve enough evidence with `loopkit_telemetry` or session tools to understand the failure.
5. Draft an eval candidate and patch plan grounded in real `evidence_ids`.
6. Stop at the human approval boundary before posting issues or PRs, mutating production, or merging code.
7. After a fix ships, call `loopkit_verify` or re-run diagnosis against the next window and report the delta.

## Guardrails

- Never pull the whole telemetry lake. Keep reads bounded with `since_minutes`, `limit`, or a specific evidence id.
- Never claim success without re-measuring the next telemetry window.
- Never use LoopKit to justify silent external writes. Issues, PRs, production changes, and merges still need explicit human approval.
- Treat `loopkit_archive_project` as consequential. Require the exact project id and explicit confirmation from the user before calling it.
- Keep project identity server-side. Do not trust telemetry payload fields as access authority.
