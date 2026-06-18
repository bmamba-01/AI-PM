import * as Y from "yjs";

export interface SyncProvider {
  name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sync(doc: Y.Doc): Promise<void>;
  isConnected(): boolean;
}

export interface ConflictResolution {
  strategy: "local-wins" | "remote-wins" | "merge" | "manual";
  autoResolve: boolean;
}

export interface SyncState {
  isOnline: boolean;
  lastSync: string | null;
  pendingChanges: number;
  errors: string[];
}

export class SyncEngine {
  private providers = new Map<string, SyncProvider>();
  private conflictResolution: ConflictResolution = { strategy: "merge", autoResolve: true };
  private doc: Y.Doc;
  private isOnline = false;
  private lastSync: string | null = null;
  private pendingChanges = 0;
  private reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private stateListeners: ((state: SyncState) => void)[] = [];

  constructor(doc?: Y.Doc) {
    this.doc = doc || new Y.Doc();
  }

  registerProvider(provider: SyncProvider): void {
    this.providers.set(provider.name, provider);
  }

  async connect(providerName: string): Promise<void> {
    const provider = this.providers.get(providerName);
    if (!provider) throw new Error(`Provider ${providerName} not found`);
    try {
      await provider.connect();
      this.isOnline = true;
      this.notifyState();
      console.log(`[sync] connected: ${providerName}`);
    } catch (err) {
      console.error(`[sync] connect failed: ${providerName}`, err);
      this.scheduleReconnect(providerName);
    }
  }

  async disconnectAll(): Promise<void> {
    for (const [name, provider] of this.providers) {
      try { await provider.disconnect(); } catch {}
    }
    for (const timer of this.reconnectTimers.values()) clearTimeout(timer);
    this.reconnectTimers.clear();
    this.isOnline = false;
    this.notifyState();
  }

  async syncAll(): Promise<void> {
    for (const [name, provider] of this.providers) {
      if (!provider.isConnected()) continue;
      try {
        await provider.sync(this.doc);
        this.lastSync = new Date().toISOString();
        this.pendingChanges = 0;
        this.notifyState();
      } catch (err) {
        console.error(`[sync] provider ${name} sync failed:`, err);
        this.scheduleReconnect(name);
      }
    }
  }

  private scheduleReconnect(providerName: string, delay = 5000): void {
    if (this.reconnectTimers.has(providerName)) return;
    const timer = setTimeout(async () => {
      this.reconnectTimers.delete(providerName);
      console.log(`[sync] reconnecting: ${providerName}`);
      await this.connect(providerName);
      if (this.isOnline) await this.syncAll();
    }, Math.min(delay * 2, 60000));
    this.reconnectTimers.set(providerName, timer);
  }

  onStateChange(listener: (state: SyncState) => void): () => void {
    this.stateListeners.push(listener);
    return () => { this.stateListeners = this.stateListeners.filter(l => l !== listener); };
  }

  private notifyState(): void {
    const state: SyncState = { isOnline: this.isOnline, lastSync: this.lastSync, pendingChanges: this.pendingChanges, errors: [] };
    this.stateListeners.forEach(l => l(state));
  }

  getDoc(): Y.Doc { return this.doc; }
  setConflictResolution(r: ConflictResolution): void { this.conflictResolution = r; }
  getState(): SyncState { return { isOnline: this.isOnline, lastSync: this.lastSync, pendingChanges: this.pendingChanges, errors: [] }; }
}

export class LocalStorageProvider implements SyncProvider {
  name = "local";
  private connected = false;
  private storagePath: string;

  constructor(storagePath: string) { this.storagePath = storagePath; }

  async connect(): Promise<void> { this.connected = true; }
  async disconnect(): Promise<void> { this.connected = false; }
  async sync(doc: Y.Doc): Promise<void> {
    const fs = await import("node:fs");
    const state = Y.encodeStateAsUpdate(doc);
    fs.default.writeFileSync(this.storagePath, Buffer.from(state));
  }
  isConnected(): boolean { return this.connected; }
}

export const syncEngine = new SyncEngine();
