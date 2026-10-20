---
name: memory-init
description: Initialize or repair the project-local .cursor/memory knowledge base for back-helper.
---

# Memory init

Ensure this tree exists:

```
.cursor/
  memory/
    MEMORY.md              # index (required)
    architecture.md
    api-contract.md
    module-cookbook.md
    uploads-api.md
    auth.md
    env-and-scripts.md
    routes-catalog.md
    import-map.md
    actions.md
    decisions.md
  skills/
    memory-search/SKILL.md
    memory-save/SKILL.md
    memory-init/SKILL.md
  rules/
    local-memory.mdc       # alwaysApply
```

If files are missing, recreate them from the current codebase and fill APIs so agents rarely need to open `src/`.
