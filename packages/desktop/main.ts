import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "node:child_process";
import { loadMcpConfig, saveMcpConfig, upsertMcpServer, removeMcpServer, setMcpServerEnabled, MCPServerConfig } from "@ai-pm/mcp/connectionManager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === "development";
const PRELOAD_PATH = path.join(__dirname, "preload.js");
const DIST_PATH = path.join(__dirname, "dist");
const INDEX_PATH = path.join(DIST_PATH, "index.html");

let mainWindow: BrowserWindow | null = null;
let ollamaProcess: any = null;
let currentProjectRoot = process.cwd();

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
    mainWindow.loadURL("http://localhost:3000");
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
  
  try {
    ollamaProcess = spawn("ollama", ["serve"], {
      detached: true,
      stdio: "ignore"
    });
    ollamaProcess.unref();
    console.log("Ollama server started");
  } catch (error) {
    console.warn("Ollama not found, local LLM features disabled:", error);
  }
}

app.whenReady().then(() => {
  startOllama();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
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