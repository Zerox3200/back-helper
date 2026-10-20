---
name: memory-save
description: Persist project facts into .cursor/memory after code changes. Use when adding modules, routes, helpers, env vars, or conventions.
---

# Memory save

Write markdown under `.cursor/memory/`. Never use Supermemory MCP.

## What to save

| Change | Update |
|--------|--------|
| New module | `module-cookbook.md` (example if pattern changes), `routes-catalog.md`, `MEMORY.md` modules list |
| New route | `routes-catalog.md` |
| New helper / export | `import-map.md` (+ topic file if API surface changed) |
| Upload preset / kind | `uploads-api.md` |
| Response / validation change | `api-contract.md` |
| Auth change | `auth.md` |
| Env / script | `env-and-scripts.md` |
| Non-obvious decision | `decisions.md` (dated bullet) |

## Format rules

- Prefer tables, bullet APIs, and copy-paste snippets over prose.
- Include exact import paths and function signatures.
- No secrets from `.env`.
- Keep `MEMORY.md` as a short index — put depth in topic files.
- Bump `Last updated` date on `MEMORY.md` when you change anything.
