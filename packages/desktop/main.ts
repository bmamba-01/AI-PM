import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { loadMcpConfig, upsertMcpServer, removeMcpServer, setMcpServerEnabled, MCPServerConfig } from "@ai-pm/mcp/connectionManager";
import { ApprovalQueue, MemoryStore, type ApprovalDecision } from "@ai-pm/core/runtime";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === "development";
const PRELOAD_PATH = path.join(__dirname, "preload.js");
const INDEX_PATH = path.join(__dirname, "index.html");

let mainWindow: BrowserWindow | null = null;
let ollamaProcess: any = null;
let currentProjectRoot = process.cwd();

// ── Local server state ──────────────────────────────────────────────────────
let serverProcess: ChildProcess | null = null;
let serverPort = 3847;
let serverRunning = false;

function startLocalServer(): void {
  if (serverProcess) return;

  const serverPath = path.join(__dirname, "..", "node_modules", "@ai-pm", "server", "dist", "index.js");
  try {
    serverProcess = spawn(process.execPath, [serverPath], {
      env: { ...process.env, PORT: String(serverPort), PROJECT_ROOT: currentProjectRoot },
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    serverProcess.stdout?.on("data", (data: Buffer) => {
      const msg = data.toString();
      console.log("[server]", msg.trim());
      if (msg.includes("listening on")) serverRunning = true;
    });

    serverProcess.stderr?.on("data", (data: Buffer) => {
      console.warn("[server:err]", data.toString().trim());
    });

    serverProcess.on("error", (err) => {
      console.warn("[server] spawn error:", err.message);
      serverRunning = false;
      serverProcess = null;
    });

    serverProcess.on("exit", () => {
      serverRunning = false;
      serverProcess = null;
    });

    serverRunning = true;
    console.log(`[server] started on port ${serverPort}`);
  } catch (err) {
    console.warn("[server] failed to start:", err);
    serverRunning = false;
    serverProcess = null;
  }
}

function stopLocalServer(): void {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
    serverRunning = false;
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#1e1e1e",
      symbolColor: "#ffffff",
      height: 36
    },
    icon: path.join(__dirname, "assets/icon.png"),
    show: false
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    if (isDev) mainWindow?.webContents.openDevTools();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:8080");
  } else {
    mainWindow.loadFile(INDEX_PATH);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

function startOllama(): void {
  if (ollamaProcess) return;
  
  const ollamaBin = process.env.OLLAMA_BIN ?? "ollama";
  try {
    ollamaProcess = spawn(ollamaBin, ["serve"], {
      detached: true,
      stdio: "ignore"
    });

    ollamaProcess.on("error", (error: Error) => {
      console.warn("Ollama not available, local LLM features disabled:", error.message);
      ollamaProcess = null;
    });

    ollamaProcess.on("exit", () => {
      ollamaProcess = null;
    });

    ollamaProcess.unref();
    console.log("Ollama server started");
  } catch (error) {
    console.warn("Ollama not available, local LLM features disabled:", error);
    ollamaProcess = null;
  }
}

app.whenReady().then(() => {
  startOllama();
  startLocalServer();
  createWindow();

  if (process.env.AI_PM_DESKTOP_SMOKE === "1") {
    setTimeout(() => app.quit(), 3000);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => {
  stopLocalServer();
});

app.on("window-all-closed", () => {
  if (ollamaProcess) {
    ollamaProcess.kill();
  }
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("dialog:openFile", async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ["openFile"],
    filters: [{ name: "All Files", extensions: ["*"] }]
  });
  return result.filePaths[0];
});

ipcMain.handle("dialog:saveFile", async (_, defaultPath: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath
  });
  return result.filePath;
});

ipcMain.handle("shell:openExternal", async (_, url: string) => {
  await shell.openExternal(url);
});

ipcMain.handle("app:getVersion", () => app.getVersion());
ipcMain.handle("app:getPlatform", () => process.platform);

// MCP IPC handlers
ipcMain.handle("get-mcp-config", async () => {
  return loadMcpConfig(currentProjectRoot);
});

ipcMain.handle("get-language", async () => {
  return "en";
});

ipcMain.handle("toggle-server", async (_, id: string, enabled: boolean) => {
  const config = setMcpServerEnabled(currentProjectRoot, id, enabled);
  return { success: true, servers: config.servers };
});

ipcMain.handle("remove-server", async (_, id: string) => {
  const config = removeMcpServer(currentProjectRoot, id);
  return { success: true, servers: config.servers };
});

ipcMain.handle("add-server", async (_, server: MCPServerConfig) => {
  const config = upsertMcpServer(currentProjectRoot, server);
  return { success: true, servers: config.servers };
});

// Approval Queue IPC handlers
const approvalQueue = new ApprovalQueue(currentProjectRoot);

ipcMain.handle("approvals:list", async (_, filter?: { status?: string; priority?: string }) => {
  return approvalQueue.listItems(filter);
});

ipcMain.handle("approvals:count", async () => {
  return approvalQueue.getCounts();
});

ipcMain.handle("approvals:get", async (_, id: string) => {
  return approvalQueue.getItem(id);
});

ipcMain.handle("approvals:decide", async (_, id: string, payload: { decided_by: string; decision: string; reason?: string; notes?: string }) => {
  return approvalQueue.decide(id, { ...payload, decision: payload.decision as ApprovalDecision });
});

ipcMain.handle("approvals:create", async (_, input: Parameters<ApprovalQueue['createItem']>[0]) => {
  return approvalQueue.createItem(input);
});

ipcMain.handle("approvals:resubmit", async (_, id: string, summary_diff: string) => {
  return approvalQueue.resubmit(id, summary_diff);
});

// Memory Store IPC handlers
const memoryStore = new MemoryStore(currentProjectRoot);

ipcMain.handle("memory:summary", async () => {
  return memoryStore.getSummary();
});

ipcMain.handle("memory:tasks", async (_, filter?: { status?: string }) => {
  return memoryStore.listTasks(filter?.status ? { status: filter.status as any } : undefined);
});

ipcMain.handle("memory:artifacts", async (_, filter?: { status?: string; type?: string }) => {
  return memoryStore.listArtifacts(
    filter && (filter.status || filter.type)
      ? { status: filter.status as any, type: filter.type }
      : undefined,
  );
});

// Local Server IPC handlers

async function checkServerHealth(): Promise<{ ok: boolean; version?: string }> {
  if (!serverRunning) return { ok: false };
  try {
    const http = await import("node:http");
    return await new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${serverPort}/api/health`, { timeout: 2000 }, (res) => {
        let body = "";
        res.on("data", (chunk: Buffer) => { body += chunk; });
        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            resolve({ ok: res.statusCode === 200 && data.status === "ok", version: data.version });
          } catch {
            resolve({ ok: false });
          }
        });
      });
      req.on("error", () => resolve({ ok: false }));
      req.on("timeout", () => { req.destroy(); resolve({ ok: false }); });
    });
  } catch {
    return { ok: false };
  }
}

ipcMain.handle("server:getStatus", async () => {
  const health = await checkServerHealth();
  return {
    running: serverRunning,
    host: "127.0.0.1",
    port: serverPort,
    url: `http://127.0.0.1:${serverPort}`,
    projectRoot: currentProjectRoot,
    health,
  };
});

ipcMain.handle("server:health", async () => {
  return checkServerHealth();
});

ipcMain.handle("server:start", () => {
  startLocalServer();
  return { running: serverRunning, port: serverPort };
});

ipcMain.handle("server:stop", () => {
  stopLocalServer();
  return { running: false, port: serverPort };
});
