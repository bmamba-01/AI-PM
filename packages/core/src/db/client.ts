import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import path from "node:path";
import fs from "node:fs";

export interface DbAdapter {
  initialize(): Promise<void>;
  close(): Promise<void>;
  run(sql: string, params?: any[]): Promise<{ lastInsertRowid?: number; changes: number }>;
  get(sql: string, params?: any[]): Promise<any>;
  all(sql: string, params?: any[]): Promise<any[]>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

export interface Repository<TEntity, TCreateInput, TUpdateInput> {
  create(input: TCreateInput): Promise<TEntity>;
  getById(id: string): Promise<TEntity | null>;
  getAll(options?: QueryOptions): Promise<TEntity[]>;
  update(id: string, input: TUpdateInput): Promise<TEntity>;
  delete(id: string): Promise<void>;
  count(options?: QueryOptions): Promise<number>;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
  filters?: Record<string, unknown>;
  search?: string;
  searchFields?: string[];
}

export interface Migration {
  version: number;
  up: string[];
  down: string;
}

/** SQLite adapter using sql.js (pure WASM, no native build required) */
export class SQLiteAdapter implements DbAdapter {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;
  private migrations: Migration[];
  private dirty = false;

  constructor(dbPath: string, migrations: Migration[] = []) {
    this.dbPath = dbPath;
    this.migrations = migrations;
  }

  async initialize(): Promise<void> {
    const SQL = await initSqlJs();
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }
    this.db.run("PRAGMA foreign_keys = ON");
    await this.runMigrations();
  }

  async close(): Promise<void> {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
    }
  }

  async run(sql: string, params: any[] = []): Promise<{ lastInsertRowid?: number; changes: number }> {
    this.db!.run(sql, params);
    this.dirty = true;
    const lastInsertRowid = this.db!.exec("SELECT last_insert_rowid() as id")[0]?.values[0][0];
    const changes = this.db!.getRowsModified();
    return { lastInsertRowid: Number(lastInsertRowid), changes };
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    const stmt = this.db!.prepare(sql);
    stmt.bind(params);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row;
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    const stmt = this.db!.prepare(sql);
    stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  async exec(sql: string): Promise<void> {
    this.db!.run(sql);
    this.dirty = true;
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    this.db!.run("BEGIN TRANSACTION");
    try {
      const result = await fn();
      this.db!.run("COMMIT");
      this.dirty = true;
      return result;
    } catch (err) {
      this.db!.run("ROLLBACK");
      throw err;
    }
  }

  /** Persist to disk */
  save(): void {
    if (this.db && this.dirty) {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
      this.dirty = false;
    }
  }

  private async runMigrations(): Promise<void> {
    await this.exec(`CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`);
    const applied = new Set(
      (await this.all(`SELECT version FROM _migrations`)).map((r: any) => r.version)
    );
    for (const m of this.migrations) {
      if (!applied.has(m.version)) {
        await this.transaction(async () => {
          for (const sql of m.up) await this.exec(sql);
          await this.run(`INSERT INTO _migrations (version, applied_at) VALUES (?, ?)`, [m.version, new Date().toISOString()]);
        });
        console.log(`[db] migration ${m.version} applied`);
      }
    }
    this.save();
  }
}

/** In-memory adapter for testing/offline fallback */
export class MemoryAdapter implements DbAdapter {
  private data = new Map<string, any[]>();

  async initialize(): Promise<void> {}
  async close(): Promise<void> {}
  async run(_sql: string, _params: any[] = []) { return { changes: 0 }; }
  async get(_sql: string, _params: any[] = []) { return null; }
  async all(_sql: string, _params: any[] = []) { return []; }
  async exec(_sql: string) {}
  async transaction<T>(fn: () => Promise<T>): Promise<T> { return fn(); }
}

let dbAdapter: DbAdapter = new MemoryAdapter();

export function setDbAdapter(adapter: DbAdapter): void { dbAdapter = adapter; }
export function getDbAdapter(): DbAdapter { return dbAdapter; }
export async function initializeDatabase(): Promise<void> { await dbAdapter.initialize(); }
export async function closeDatabase(): Promise<void> { await dbAdapter.close(); }

