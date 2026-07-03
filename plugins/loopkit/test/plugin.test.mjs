import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const pluginRoot = dirname(dirname(fileURLToPath(import.meta.url)));

async function readJson(path) {
  return JSON.parse(await readFile(join(pluginRoot, path), "utf8"));
}

test("plugin manifest exposes LoopKit skill and hosted MCP", async () => {
  const manifest = await readJson(".codex-plugin/plugin.json");

  assert.equal(manifest.name, "loopkit");
  assert.match(manifest.version, /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/);
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.mcpServers, "./.mcp.json");
  assert.equal(manifest.interface.displayName, "LoopKit");
  assert.ok(manifest.interface.capabilities.includes("Read"));
  assert.ok(manifest.interface.capabilities.includes("Write"));
  assert.ok(Array.isArray(manifest.interface.defaultPrompt));
  assert.ok(manifest.interface.defaultPrompt.length <= 3);
});

test("MCP config points to the hosted endpoint without local secrets or paths", async () => {
  const mcp = await readJson(".mcp.json");
  const server = mcp.mcpServers.loopops;

  assert.deepEqual(Object.keys(mcp.mcpServers), ["loopops"]);
  assert.equal(server.type, "http");
  assert.equal(server.url, "https://mcp.loopops.dev");
  assert.equal(server.command, undefined);
  assert.equal(server.args, undefined);

  const raw = JSON.stringify(mcp);
  assert.doesNotMatch(raw, /LOOPKIT_[A-Z_]*KEY/);
  assert.doesNotMatch(raw, /lk_(?:agent|ingest|feedback)_/);
  assert.doesNotMatch(raw, /\/Users\//);
});

test("skill frontmatter is present and preserves harness guardrails", async () => {
  const skill = await readFile(join(pluginRoot, "skills/loopkit/SKILL.md"), "utf8");

  assert.match(skill, /^---\nname: loopkit\n/m);
  assert.match(skill, /description: Run the LoopKit agent-first improvement loop/);
  assert.match(skill, /bounded evidence/);
  assert.match(skill, /human approval boundary/);
  assert.match(skill, /Never pull the whole telemetry lake/);
});

test("repo marketplace exposes the LoopKit plugin from the expected path", async () => {
  const repoRoot = dirname(dirname(pluginRoot));
  const marketplace = JSON.parse(
    await readFile(join(repoRoot, ".agents/plugins/marketplace.json"), "utf8")
  );
  const entry = marketplace.plugins.find((plugin) => plugin.name === "loopkit");

  assert.equal(marketplace.name, "loopkit");
  assert.equal(marketplace.interface.displayName, "LoopKit");
  assert.equal(entry.source.source, "local");
  assert.equal(entry.source.path, "./plugins/loopkit");
  assert.equal(entry.policy.installation, "AVAILABLE");
  assert.equal(entry.policy.authentication, "ON_INSTALL");
});
