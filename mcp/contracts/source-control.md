# Source Control MCP Contract

## Purpose

Normalize GitHub, GitLab, and local git data for code quality and delivery control.

## Entities

```yaml
pull_request:
  id: string
  title: string
  author: string
  branch: string
  base_branch: string
  status: open|closed|merged|draft
  checks_status: pass|fail|pending|unknown
  changed_files:
    - string
  linked_issues:
    - string
  url: string
```

```yaml
commit:
  sha: string
  author: string
  message: string
  timestamp: string
  changed_files:
    - string
```

## Read Operations

- read repositories
- read branches
- read commits
- read diffs
- read pull requests
- read checks

## Mutations

All mutations require approval:

- create branch
- push branch
- open pull request
- comment on pull request
- approve pull request
- request changes
- merge pull request

## Degraded Mode

If hosted source control is unavailable, use local git commands and mark remote PR coverage unavailable.

