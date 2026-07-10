---
name: loopkit
description: Run the LoopOps agent-first improvement loop over bounded telemetry using the hosted MCP tools; open every session from the memory block, walk guided replays to one harness lever, prove prompt fixes with edge replay, respect human approval, and verify trajectory impact on the next window.
---

# LoopOps

Use this skill when the user asks to use LoopOps, diagnose telemetry, inspect production failures, find recurring product pain, make an agent better, create an improvement candidate, record an improvement loop, verify whether a shipped change improved the next telemetry window — or says **"process the loop"**, **"what happened overnight"**, or **"analyze the new telemetry"** (observe and decide every unprocessed telemetry record since the last loop).

LoopOps connects production software to the coding agent that maintains it. The store is not the product; the product is the closed loop:

```text
bounded telemetry -> cited records -> ONE harness lever -> human approval -> shipped fix -> next-window verification
```

## Open every session with memory

`loopops_observe` and `loopops_diagnose` return `memory` as their FIRST field: what was already fixed (verified, with deltas), what REGRESSED (re-open those first — cited `evidence_ids` included), what's in flight (continue on its run_id), and how many candidates are new. Read it before anything else — never re-diagnose history the server already remembers.

## Select the project from repo context

Project selection is a prerequisite for every project-scoped tool. If the MCP URL
is not pinned and the user did not name a project, call `loopops_projects` before
Observe/Diagnose. In a coding repo, run `git remote get-url origin` and compare
the GitHub `owner/repo` to each project's name, id, or `repository_full_name`
when present.

- If one project matches the current repo, pass `project: "<project_id>"` in
  later tool calls.
- If the human asks to link the current repo and that project has no repository,
  call `loopops_link_repository` with the exact `project_id` and GitHub
  `owner/repo`. This stores LoopOps metadata only; it does not access GitHub.
- If nothing matches cleanly, choose by project name/id when clear; ask the
  human only when the list is genuinely ambiguous.

A `selection_required` result is a routing handoff, not an Observe result: no
window was claimed, no read ran, and no cursor moved.

## MCP Surface

This plugin registers the hosted MCP server as `loopops` at `https://mcp.loopops.dev`. On first use, the MCP client may ask the human to complete the Cloudflare Access OAuth flow. A project created at loopops.dev/start (or via `POST /v1/signup`) is bound to its keys, not the account — bind it once with `loopops_claim` (`project_id` + `recovery_code` from signup) and it becomes readable here.

- `loopops_projects` / `loopops_link_repository` / `loopops_claim`: discover owned projects, add an idempotent GitHub repository association to an explicitly named owned project, and bind a signup project to this account. Pass `project` in later calls when the account owns several; in a coding repo, use `git remote get-url origin` as the hint for which project id to choose. Linking updates `loopops_projects` and the dashboard from the same metadata record; it never calls GitHub.
- `loopops_observe`, `loopops_decide`, `loopops_observations`, `loopops_observation`: the observation cycle — claim unprocessed telemetry records, record the decided pains, inspect the cursor. `peek: true` reports the would-be claim WITHOUT claiming; use it for scheduled checks and first-look/status requests, then claim for real only when you are ready to diagnose and decide.
- `loopops_diagnose`: the improvement packet — memory first, then evidence-backed candidates with stable `cluster_id`, server-computed `status` (new | in_progress | verified | regression), `replayable_count`, and token_burn ranking.
- `loopops_sessions` / `loopops_session`: sessions ranked by `scorecard` (five 0-100 dimensions: success, efficiency, decision, tool_health, safety). `loopops_session` is the GUIDED REPLAY: `guided_replay.halt` names the single highest-leverage moment — step, plain-words note, evidence_ids, harness_area, and the ONE lever to pull. Trust the halt: fix one lever, verify, come back for the rest.
- `loopops_scoring`: the scoring loop itself — read the current weights, the calibration evidence (aggregated revisions: a persistent mean_delta names the weight that misreads reality), and whether the last weight change made agreement better. Change a weight only with accumulated calibration evidence and a reason; changes are attributed and recorded as events.
- `loopops_score`: when your semantic reading of a session disagrees with the deterministic scorecard (especially efficiency — the server has no task baseline for whether the token spend was reasonable), record your revision: overall 0-100, optional per-dimension scores, and the REQUIRED reason naming what the counting misread. It rides alongside the deterministic score, never overwrites it. The `score_review` field on every session read is this standing ask.
- `loopops_telemetry`: resolve cited `evidence_ids` (`record_id`) / `trace_id` / `session_id` to raw telemetry records. Records carry a first-class `capture` block (unit, input, output, model, expected, replayable) when the producer captured enough to replay.
- `loopops_replay`: prompt-only PROVE-BEFORE-SHIP — re-run a cluster's captured llm_call failures (needs `replayable_count > 0`) with a candidate prompt/model change, graded against captured expectations. Results land as eval telemetry. A replay NEVER closes a loop.
- `loopops_eval_spec`: for tool/graph/retrieval failures — emits a schema-valid spec with reconstructed real inputs; YOU execute it against the real code and report outcomes to `POST /v1/evals` exactly as its report block shows.
- `loopops_improve`: record lifecycle stages (diagnosed → approved → issue_opened → pr_opened → merged) with the candidate's `cluster_id`. Recording is loop bookkeeping; posting the actual issue/PR is an external write and needs human approval first.
- `loopops_verify`: window-over-window verdict, `record: true` to persist. Refuses on `no_data` and `unjoined_cluster` — never fabricate a verify. The result carries `trajectory` (success_rate, tokens_per_session, steps_per_session, tool_failure_rate deltas) — cite those numbers when claiming an agent got better.
- `loopops_loops` / `loopops_loop`: recorded cycles, led by the `funnel` (time_to_first_verified_fix, verified-fixes-per-week — the numbers that define winning; never count fixes generated).
- `loopops_dashboard`, `loopops_report`, `loopops_dashboard_link`: state summaries and the human console handoff.
- `loopops_feedback`: file one concrete toolkit friction (or keep-this) at the moment it occurs — LoopOps runs this loop on itself.

The hosted MCP does not emit runtime telemetry. Production telemetry is ingested with producer keys: Vercel AI SDK agents wire ONE integration — AI SDK 7 `registerTelemetry(loopOps())` from `@getloopops/sdk/ai` (no per-call flag, runs on Workers/Edge too), AI SDK 6 `registerLoopOps()` from `@getloopops/sdk/otel` + `experimental_telemetry`; anything else POSTs OTLP/HTTP JSON or protobuf to `/v1/traces`. To make failures REPLAYABLE, emit the capture contract on units: `unit` (llm_call | tool_call | graph_node | retrieval), `input`, `output`, `model` (llm_call), `expected` when known — or just emit gen_ai.* semconv; the worker derives capture with zero producer changes.

## "How do I make this agent better?" — the hero move

1. `loopops_sessions` → sort by `scorecard.overall` ascending; pick the worst session.
2. `loopops_session` on it → read `guided_replay.halt`: the one moment, the cited records, the harness_area, the lever.
3. Prepare the fix for that ONE lever (approval-gated). For prompt/model fixes with `replayable_count > 0`, prove it first with `loopops_replay`; for tool/graph fixes, emit `loopops_eval_spec` and execute it against the real code.
4. Record stages with `loopops_improve`; after the fix ships, `loopops_verify record: true` — the trajectory deltas are the proof.

## "Process the loop" — the morning ritual

When the user says "process the loop", "what happened overnight", or "analyze the new telemetry":

1. **Select** — resolve the project first. If needed, call `loopops_projects`
   and use the current Git remote as a hint to choose the matching project id;
   pass `project: "<project_id>"` in every later project-scoped call.
2. **Peek** — call `loopops_observe` with `peek: true`. This reads the would-be
   window and `memory` without claiming anything. If it is quiet
   (`observation: null` and no regression/in-flight work that needs attention),
   report "nothing unprocessed" and stop.
3. **Observe** — if the peek shows work and the user asked for a full loop, call
   `loopops_observe` again without `peek` to claim the window. Read `memory`
   first. The lake read path rolls ~60-90s behind ingest — retry once after
   ~90s when fresh telemetry is expected. Once a real observation is open, finish
   it with `loopops_decide` (pains or empty); otherwise future Observe calls will
   adopt the same open window.
4. **Diagnose** the observation yourself: drill only what you act on
   (`loopops_telemetry`, `loopops_session`). Act on `new`, continue
   `in_progress` on its run_id, skip `verified`, reopen `regression` with a fresh
   run_id referencing the prior run.
5. **Decide** — `loopops_decide` records a PRIORITIZED pains list (max 10), each with `issue_class` (tooling | trajectory), the `harness_area` that must move (`prompt|tools|context|retrieval|orchestration|guardrails|model|approval|infra|other`), grounded `evidence_ids` (ungrounded pains are rejected), a `hypothesis`, and `suggested_next` (`patch|observe|skip`). Most agent failures are configuration failures — before tagging `model`, check for a missing tool, a vague rule, an absent guardrail, or noisy context. Deciding nothing is worth acting on is a valid decision; the cursor advances either way.
6. Report the pains in priority order and offer `loopops_dashboard_link`.
7. **Improve** — for the top pain, draft the approval-gated fix plan, prove it where provable (replay / eval spec), and record `loopops_improve` stage `diagnosed` with the pain's `evidence_ids` and `cluster_id`.

## Hard rules

- **Approval boundary**: never post issues, open PRs, merge, deploy, or make any external write without explicit human approval. Recording loop stages is bookkeeping and fine; the artifact itself waits.
- **Bounded telemetry**: resolve by `evidence_ids` (record ids) / bounded windows; never scan history. Keep reads bounded with `since_minutes`, `limit`, or a specific record id.
- **Honest verification**: a merged PR is a claim; a moved window is a fact. Never record a verify the server refused, and never claim success without re-measuring the next window. Cite trajectory numbers, not vibes.
- **Consequential tools**: treat `loopops_archive_project` as consequential — require the exact project id and explicit user confirmation. Keep project identity server-side; never trust telemetry payload fields as access authority.
- **File friction**: when a LoopOps tool wastes your tokens or confuses you, file it with `loopops_feedback` at that moment — one concrete report beats a reconstructed essay.
