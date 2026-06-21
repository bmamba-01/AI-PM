import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { loadRegistry, loadBuiltinProfiles } from "./configLoader.js";
import { runDoctor } from "./doctor.js";

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ai-pm-doctor-"));
}

describe("MCP Doctor", () => {
  const registry = loadRegistry();
  const builtin = loadBuiltinProfiles();

  describe("with empty project (no MCP config)", () => {
    it("returns degraded status because default profile expects servers", () => {
      const root = tempDir();
      try {
        const report = runDoctor(root, registry, builtin.defaultProfile);
        // Default profile expects filesystem, sqlite, codebase-memory — so empty project is degraded
        expect(report.health).toBe("degraded");
        expect(report.connectors.length).toBeGreaterThan(0);
        expect(report.connectors.every(c => c.status === "not_configured")).toBe(true);
        expect(report.summary.enabled).toBe(0);
        expect(report.summary.not_configured).toBeGreaterThan(0);
      } finally { fs.rmSync(root, { recursive: true }); }
    });

    it("returns healthy for minimal registry with only filesystem (no degraded workflows)", () => {
      const root = tempDir();
      try {
        // Minimal registry: only filesystem, no required_for for specific workflows
        const minimalRegistry: typeof registry = {
          version: 1,
          defaults: { access_mode: "read_only", mutation_policy: "approval_required", unavailable_behavior: "degrade_gracefully" },
          servers: {
            filesystem: { category: "local_memory", priority: 1, contracts: ["local-memory"], required_for: ["all_workflows"], read_capabilities: ["read_files"], mutation_capabilities: [] },
          },
        };
        const report = runDoctor(root, minimalRegistry, builtin.offlineProfile);
        // No specific workflows require servers → no degradation → healthy
        expect(report.health).toBe("healthy");
        expect(report.workflows.length).toBe(0); // all_workflows is skipped
      } finally { fs.rmSync(root, { recursive: true }); }
    });
  });

  describe("with configured but disabled connector", () => {
    it("reports degraded health when required workflow servers are disabled", () => {
      const root = tempDir();
      try {
        const configDir = path.join(root, ".superagent");
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(path.join(configDir, "mcp-config.json"), JSON.stringify({
          servers: [
            { id: "github", enabled: false, token: "ghp_test123" },
            { id: "filesystem", enabled: true },
          ],
        }, null, 2));

        const report = runDoctor(root, registry, builtin.defaultProfile);
        const gh = report.connectors.find(c => c.server_id === "github");
        // github is in config but disabled; filesystem is enabled by profile default
        expect(gh?.status).toBe("disabled");
        expect(report.health).not.toBe("healthy");
      } finally { fs.rmSync(root, { recursive: true }); }
    });
  });

  describe("with enabled connector", () => {
    it("reports enabled connector correctly", () => {
      const root = tempDir();
      try {
        const configDir = path.join(root, ".superagent");
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(path.join(configDir, "mcp-config.json"), JSON.stringify({
          servers: [
            { id: "github", enabled: true, token: "ghp_test123", url: "https://api.github.com" },
          ],
        }, null, 2));

        const report = runDoctor(root, registry, builtin.defaultProfile);
        const gh = report.connectors.find(c => c.server_id === "github");
        expect(gh?.status).toBe("enabled");
        expect(gh?.has_token).toBe(true);
        expect(gh?.has_url).toBe(true);
      } finally { fs.rmSync(root, { recursive: true }); }
    });
  });

  describe("with offline profile", () => {
    it("shows online servers as disabled, filesystem as enabled", () => {
      const root = tempDir();
      try {
        const configDir = path.join(root, ".superagent");
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(path.join(configDir, "mcp-config.json"), JSON.stringify({
          servers: [
            { id: "filesystem", enabled: true },
            { id: "sqlite", enabled: true },
          ],
        }, null, 2));

        const report = runDoctor(root, registry, builtin.offlineProfile);
        const fs_ = report.connectors.find(c => c.server_id === "filesystem");
        const gh = report.connectors.find(c => c.server_id === "github");
        expect(fs_?.status).toBe("enabled");
        expect(gh?.status).toBe("disabled");
      } finally { fs.rmSync(root, { recursive: true }); }
    });
  });

  describe("mutation analysis", () => {
    it("identifies servers with mutations", () => {
      const root = tempDir();
      try {
        const report = runDoctor(root, registry, builtin.defaultProfile);
        expect(report.mutations.servers_with_mutations).toContain("github");
        expect(report.mutations.mutation_count).toBeGreaterThan(0);
      } finally { fs.rmSync(root, { recursive: true }); }
    });

    it("confirms global approval required", () => {
      const root = tempDir();
      try {
        const report = runDoctor(root, registry, builtin.defaultProfile);
        expect(report.mutations.global_approval_required).toBe(true);
      } finally { fs.rmSync(root, { recursive: true }); }
    });
  });

  describe("workflow degradation", () => {
    it("flags workflows when required servers are missing", () => {
      const root = tempDir();
      try {
        const report = runDoctor(root, registry, builtin.offlineProfile);
        const degraded = report.workflows.filter(w => w.degraded);
        expect(degraded.length).toBeGreaterThan(0);
        const dailyBrief = degraded.find(w => w.workflow_id === "daily-briefing");
        expect(dailyBrief).toBeDefined();
        expect(dailyBrief!.missing_servers).toContain("github");
      } finally { fs.rmSync(root, { recursive: true }); }
    });

    it("reports no degraded workflows when all required servers enabled", () => {
      const root = tempDir();
      try {
        const configDir = path.join(root, ".superagent");
        fs.mkdirSync(configDir, { recursive: true });
        const allServerIds = Object.keys(registry.servers);
        const enabledServers = allServerIds.map(id => ({ id, enabled: true, token: `tok_${id}` }));
        fs.writeFileSync(path.join(configDir, "mcp-config.json"), JSON.stringify({
          servers: enabledServers,
        }, null, 2));

        const report = runDoctor(root, registry, builtin.defaultProfile);
        expect(report.summary.degraded_workflows).toBe(0);
      } finally { fs.rmSync(root, { recursive: true }); }
    });
  });

  describe("JSON output shape", () => {
    it("returns complete doctor report", () => {
      const root = tempDir();
      try {
        const report = runDoctor(root, registry, builtin.defaultProfile);
        expect(report.profile).toBe("default");
        expect(report.project_root).toBe(root);
        expect(report.checked_at).toBeDefined();
        expect(report.health).toBeDefined();
        expect(report.connectors).toBeDefined();
        expect(report.workflows).toBeDefined();
        expect(report.mutations).toBeDefined();
        expect(report.summary).toBeDefined();
        expect(typeof report.summary.total_connectors).toBe("number");
        expect(typeof report.summary.enabled).toBe("number");
        expect(typeof report.summary.disabled).toBe("number");
        expect(typeof report.summary.not_configured).toBe("number");
        expect(typeof report.summary.total_workflows).toBe("number");
        expect(typeof report.summary.degraded_workflows).toBe("number");
      } finally { fs.rmSync(root, { recursive: true }); }
    });
  });
});
