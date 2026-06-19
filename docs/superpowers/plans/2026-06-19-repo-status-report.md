# Repo Status Report — 2026-06-19

**Reviewer:** Orchestrator (thay thế Codex)  
**Commit:** `637fce9 Plan next runtime functions and delegation forecast`  
**Mục đích:** Xác nhận plan đang đúng hướng, xác định blockers, và đề xuất hành động tiếp theo.

---

## 1. Tổng quan trạng thái

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| `@ai-pm/core` build | ✅ PASS | Đã verify trước đó |
| `@ai-pm/core` test | ✅ PASS | 2 files, 3 tests |
| `@ai-pm/mcp` build | ❌ FAIL | WIP từ Agent 1/MCP |
| `@ai-pm/cli` build | ❌ FAIL | Phụ thuộc MCP WIP |
| `@ai-pm/desktop` build | ⚠️ Unknown | Chưa verify |
| Operating layer docs | ✅ Hoàn thành | Agent entrypoints, playbooks, workflows, MCP registry |
| Templates | ✅ 9 templates | Đã move đúng vào `templates/` |
| Plan docs | ✅ Mới nhất | `2026-06-19-next-runtime-functions.md` |
| Delegation forecast | ✅ Mới nhất | `2026-06-19-delegation-forecast.md` |

---

## 2. Phân tích chi tiết các blockers

### Blocker 1: Root `mcp/` directory ngoài package boundary

**Vấn đề:** Thư mục `mcp/` ở root chứa:
- `mcp/src/connectionManager.ts` — bản sao code trùng lặp, có nhiều lỗi type
- `mcp/serverRegistry.ts` — class `MCPRegistry` dùng `MCPManager` từ file sai

**Hậu quả:** Code trùng lặp giữa `mcp/src/connectionManager.ts` (root) và `packages/mcp/src/connectionManager.ts` (package). File root có lỗi:
- Dùng `fs` mà không import
- Dùng `index` thay vì `existingIndex` ở dòng 134
- Dùng `configPath` mà không define ở dòng 175
- Reference `MCPConfig` type mà không define

**Khắc phục:** Xóa toàn bộ `mcp/src/` và `mcp/serverRegistry.ts` khỏi root. Các file này đã có trong `packages/mcp/src/`.

### Blocker 2: `packages/mcp/src/registry/index.ts` circular export

**Vấn đề:** File `index.ts` chứa:
```ts
export * from "./configTypes.js";
export * from "./configLoader.js";
export * from "./configValidator.js";
export * from "./index.js";  // ← self-import, circular reference
```

**Hậu quả:** Circular dependency sẽ gây lỗi build hoặc undefined exports.

**Khắc phục:** Xóa dòng `export * from "./index.js";`

### Blocker 3: CLI import sai function từ configLoader

**Vấn đề:** `packages/cli/src/commands/mcp.ts` dòng 7:
```ts
import { validateConfigs, loadRegistry, loadProfile, loadBuiltinProfiles } from '@ai-pm/mcp/registry/configLoader';
```

Nhưng `validateConfigs` được export từ `configValidator.ts`, không phải `configLoader.ts`.

**Hậu quả:** TypeScript sẽ không resolve được `validateConfigs` khi import từ `configLoader`.

**Khắc phục:** Đổi import thành:
```ts
import { loadRegistry, loadProfile, loadBuiltinProfiles } from '@ai-pm/mcp/registry/configLoader';
import { validateConfigs } from '@ai-pm/mcp/registry/configValidator';
```

Hoặc đảm bảo `packages/mcp/src/registry/index.ts` export đúng (sau khi sửa circular export) và CLI import từ `@ai-pm/mcp/registry` thay vì `@ai-pm/mcp/registry/configLoader`.

### Blocker 4: `packages/mcp/package.json` thiếu exports

**Vấn đề:** Package exports chỉ liệt kê:
- `./registry/configLoader`
- `./connectionManager`

Thiếu export cho `./registry/configValidator` hoặc cập nhật `./registry` để re-export tất cả.

**Khắc phục:** Thêm export `./registry/configValidator` hoặc sửa `./registry` để include validator.

### Blocker 5: Root `mcp/` YAML config có thể conflict

**Vấn đề:** `configLoader.ts` resolve path bằng:
```ts
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const DEFAULT_REGISTRY_PATH = path.join(REPO_ROOT, "mcp/registry.yaml");
```

Sau khi build, `__dirname` sẽ là `packages/mcp/dist/registry/`, nên path sẽ resolve đến root `mcp/registry.yaml`. Điều này OK nhưng cần đảm bảo root `mcp/` chỉ chứa YAML/MD, không chứa `.ts` source files.

**Khắc phục:** Đã xử lý nếu xóa `mcp/src/` và `mcp/serverRegistry.ts`.

---

## 3. Đánh giá Plan

### Plan hiện tại (`2026-06-19-next-runtime-functions.md`)

**Đúng hướng:**
- Task 1 (Stabilization Gate) đúng — cần fix MCP/CLI trước khi làm runtime mới
- Task 2-5 (Audit CLI, Project Scan, Approval Queue, Workflow Schema) được sequence đúng
- Known blockers được liệt kê chính xác

**Cần cập nhật:**
- Thêm Blocker 2-5 (phát hiện mới từ review này)
- Cập nhật "Last verified on" sau khi fix

### Delegation Forecast

**Phân công hợp lý:**
- Agent 1: MCP/CLI repair → đúng là blocker #1
- Agent 2: Templates → đã hoàn thành (9 templates trong `templates/`)
- Agent 3: MCP validation → phụ thuộc Agent 1
- Agent 4: Workflow schemas → chưa bắt đầu (thư mục `schemas/` chưa tồn tại)
- Agent 5: Approval queue docs → low priority
- Agent 6: Desktop daily brief → medium risk

**Cần cập nhật:**
- Agent 2 đã hoàn thành → chuyển sang Candidate A (Template Index)
- Agent 4 cần bắt đầu sớm vì Task 5 trong plan phụ thuộc schemas

---

## 4. Hành động đề xuất

### Ưu tiên cao (phải làm trước khi tiếp tục runtime)

1. **Xóa root `mcp/src/` và `mcp/serverRegistry.ts`** — loại bỏ code trùng lặp
2. **Sửa `packages/mcp/src/registry/index.ts`** — xóa self-import
3. **Sửa CLI import** — import `validateConfigs` đúng nguồn
4. **Thêm MCP package exports** — export `configValidator`
5. **Chạy build verify** — `pnpm build` phải green toàn bộ

### Ưu tiên trung bình (sau khi repo green)

6. Agent 2 chuyển sang Template Index (`templates/templates.yaml`)
7. Agent 4 bắt đầu workflow schemas (`schemas/workflows/`)
8. Bắt đầu Task 2 (Audit CLI) khi repo stable

### Ưu tiên thấp

9. Agent 5: Approval queue docs
10. Agent 6: Desktop daily brief panel

---

## 5. Kết luận

Plan đang **đúng hướng** nhưng bị chặn bởi 5 blockers liên quan đến MCP/CLI WIP. Cần sửa các blockers này trước khi bất kỳ runtime work nào được bắt đầu. Delegation forecast cần cập nhật trạng thái Agent 2 (hoàn thành) và ưu tiên Agent 4 (chưa bắt đầu).

**Đánh giá tổng thể:** Plan đúng, execution đang bị阻 (blocked) bởi MCP WIP. Sau khi fix blockers, pipeline sẽ chạy顺畅.
