import type { RegistryConfig, ProfileConfig } from "./configTypes.js";
export declare function loadRegistry(registryPath?: string): RegistryConfig;
export declare function loadProfile(profilePath: string): ProfileConfig;
export declare function loadBuiltinProfiles(): {
    defaultProfile: ProfileConfig;
    offlineProfile: ProfileConfig;
};
//# sourceMappingURL=configLoader.d.ts.map