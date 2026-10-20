---
name: memory-search
description: Search project-local .cursor/memory before reading source code. Use when starting a task, answering architecture questions, or looking up APIs/conventions.
---

# Memory search

1. Open `.cursor/memory/MEMORY.md` and use the **Topic index** + **Quick lookup**.
2. Read the linked markdown file under `.cursor/memory/` (not source) for details.
3. If the answer is incomplete, grep inside `.cursor/memory/**/*.md` for keywords.
4. Only then open application source if memory is missing or outdated — then run **memory-save**.

## Keyword → file

| Need | File |
|------|------|
| Folder layout, bootstrap | `architecture.md` |
| Response JSON shape | `api-contract.md` |
| Add a feature / CRUD | `module-cookbook.md` |
| Multer / Sharp / presets | `uploads-api.md` |
| JWT / roles | `auth.md` |
| Env vars / npm scripts | `env-and-scripts.md` |
| Mounted routes | `routes-catalog.md` |
| Import paths | `import-map.md` |
| Copy-paste actions | `actions.md` |
| Past decisions | `decisions.md` |
---

## Skills

- `memory-init` — scaffold / repair memory tree
- `memory-save` — persist new facts after changes
