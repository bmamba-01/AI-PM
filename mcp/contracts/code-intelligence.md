# Code Intelligence MCP Contract

## Purpose

Provides high-performance code intelligence for AI agents through persistent knowledge graph indexing. Enables structural queries, call graph traversal, architecture analysis, and dead code detection without external API keys.

## Server

- **Name:** codebase-memory-mcp
- **Source:** https://github.com/DeusData/codebase-memory-mcp
- **Binary:** Single static binary (C, zero dependencies)
- **Storage:** SQLite at `~/.cache/codebase-memory-mcp/`

## Tools Provided

### Indexing
| Tool | Description |
|------|-------------|
| `index_repository` | Index a repository into the knowledge graph |
| `list_projects` | List all indexed projects with node/edge counts |
| `delete_project` | Remove a project and all its graph data |
| `index_status` | Check indexing status of a project |

### Querying
| Tool | Description |
|------|-------------|
| `search_graph` | Structured search by label, name pattern, file, degree |
| `trace_path` | BFS call graph traversal (depth 1-5) |
| `detect_changes` | Map git diff to affected symbols with risk classification |
| `query_graph` | Cypher-like graph queries (read-only) |
| `get_graph_schema` | Node/edge counts and relationship patterns |
| `get_code_snippet` | Read source code for a function by qualified name |
| `get_architecture` | Languages, packages, routes, hotspots, clusters |
| `search_code` | Grep-like text search within indexed files |
| `manage_adr` | CRUD for Architecture Decision Records |
| `ingest_traces` | Ingest runtime traces to validate HTTP_CALLS edges |

## Data Model

### Node Labels
`Project`, `Package`, `Folder`, `File`, `Module`, `Class`, `Function`, `Method`, `Interface`, `Enum`, `Type`, `Route`, `Resource`

### Edge Types
`CONTAINS_PACKAGE`, `CONTAINS_FOLDER`, `CONTAINS_FILE`, `DEFINES`, `DEFINES_METHOD`, `IMPORTS`, `CALLS`, `HTTP_CALLS`, `ASYNC_CALLS`, `IMPLEMENTS`, `HANDLES`, `USAGE`, `CONFIGURES`, `WRITES`, `MEMBER_OF`, `TESTS`, `USES_TYPE`, `FILE_CHANGES_WITH`

## Capabilities

- **158 languages** via tree-sitter AST
- **Hybrid LSP** for TypeScript/JS, Python, Go, C/C++, Java, Kotlin, Rust, PHP, C#
- **Semantic search** with bundled Nomic embeddings (no API key)
- **Architecture analysis** with Louvain community detection
- **Dead code detection** with zero-caller analysis
- **Git diff impact mapping** with risk classification
- **Cross-service linking** (HTTP, gRPC, GraphQL, channels)

## Integration with AI-PM Workflows

| Workflow | Use Case |
|----------|----------|
| `code-quality-guard` | `search_graph` for affected code, `trace_path` for call chain analysis, `detect_changes` for blast radius |
| `daily-briefing` | `get_architecture` for project health snapshot |
| `risk-control` | `detect_changes` for risk assessment of uncommitted changes |
| `reporting` | `get_architecture` for project metrics, `list_projects` for multi-repo status |
| `scope-control` | `search_graph` for impact analysis of requirement changes |

## Agent Configuration

### Claude Code
```json
// .claude/.mcp.json
{
  "mcpServers": {
    "codebase-memory-mcp": {
      "command": "codebase-memory-mcp",
      "args": []
    }
  }
}
```

### Auto-index on first connection
```bash
codebase-memory-mcp config set auto_index true
```

## Availability

| Server | Status | Priority |
|--------|--------|----------|
| codebase-memory-mcp | Optional (recommended) | Local-only, no auth required |

## Audit Notes

- All processing is local — no code leaves the machine
- Binary is signed, checksummed, MIT licensed
- SQLite storage at `~/.cache/codebase-memory-mcp/`
- Team-shared graph artifact: `.codebase-memory/graph.db.zst`
