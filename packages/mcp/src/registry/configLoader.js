import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import yaml from "yaml";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const DEFAULT_REGISTRY_PATH = path.join(REPO_ROOT, "mcp/registry.yaml");
const DEFAULT_PROFILES_DIR = path.join(REPO_ROOT, "mcp/profiles");
export function loadRegistry(registryPath = DEFAULT_REGISTRY_PATH) {
    const raw = fs.readFileSync(registryPath, "utf-8");
    const parsed = yaml.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.defaults || !parsed.servers) {
        throw new Error(`Invalid registry shape in ${registryPath}`);
    }
    return parsed;
}
export function loadProfile(profilePath) {
    const raw = fs.readFileSync(profilePath, "utf-8");
    const parsed = yaml.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.name) {
        throw new Error(`Invalid profile shape in ${profilePath}`);
    }
    return parsed;
}
export function loadBuiltinProfiles() {
    const defaultProfile = loadProfile(path.join(DEFAULT_PROFILES_DIR, "default.yaml"));
    const offlineProfile = loadProfile(path.join(DEFAULT_PROFILES_DIR, "offline-local.yaml"));
    return { defaultProfile, offlineProfile };
}
//# sourceMappingURL=configLoader.js.map