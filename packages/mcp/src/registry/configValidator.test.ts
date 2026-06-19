import { describe, it, expect } from "vitest";
import { loadRegistry, loadProfile, loadBuiltinProfiles } from "./configLoader.js";
import { validateConfigs } from "./configValidator.js";

const FIXTURE_DIR = String.raw`C:\Works\AI-PM`;

describe("configLoader", () => {
  it("loads registry from default path", () => {
    const registry = loadRegistry();
    expect(registry.version).toBe(1);
    expect(registry.servers.github).toBeDefined();
  });

  it("loads default profile", () => {
    const profile = loadProfile(`${FIXTURE_DIR}/mcp/profiles/default.yaml`);
    expect(profile.name).toBe("default");
  });

  it("loads offline profile", () => {
    const profile = loadProfile(`${FIXTURE_DIR}/mcp/profiles/offline-local.yaml`);
    expect(profile.name).toBe("offline-local");
  });

  it("loads builtin profiles together", () => {
    const result = loadBuiltinProfiles();
    expect(result.defaultProfile.enabled_servers).toContain("filesystem");
    expect(result.offlineProfile.disabled_online_servers).toContain("github");
  });

  it("rejects invalid registry", () => {
    expect(() => loadRegistry(`${FIXTURE_DIR}/README.md`)).toThrow();
  });

  it("validates clean builtin configs", () => {
    const registry = loadRegistry();
    const profiles = Object.values(loadBuiltinProfiles());
    const report = validateConfigs(registry, profiles);
    expect(report.issues).toHaveLength(0);
    expect(report.valid).toBe(true);
  });

  it("detects profile references missing from registry", () => {
    const registry = loadRegistry();
    const profile = {
      version: 1,
      name: "bad",
      enabled_servers: ["non_existent_server"],
    };
    const report = validateConfigs(registry, [profile]);
    expect(report.valid).toBe(false);
    expect(report.issues.some((i) => i.code === "PROFILE_REFERENCES_UNKNOWN_SERVER")).toBe(true);
  });

  it("warns about missing contract files when registry references them", () => {
    const registry = loadRegistry();
    const modified = {
      ...registry,
      servers: {
        ...registry.servers,
        fake: {
          category: "documentation" as const,
          priority: 1,
          contracts: ["does-not-exist"],
          required_for: ["daily-briefing" as unknown as import("./configTypes.js").WorkflowId],
          read_capabilities: ["search"],
          mutation_capabilities: ["update"],
        },
      },
    };
    const report = validateConfigs(
      modified as unknown as import("./configTypes.js").RegistryConfig,
      []
    );
    expect(report.valid).toBe(false);
    expect(report.issues.some((i) => i.code === "MISSING_CONTRACT_FILE")).toBe(true);
  });
});
