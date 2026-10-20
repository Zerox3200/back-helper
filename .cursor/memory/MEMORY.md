# back-helper — agent memory index

**Last updated:** 2026-10-20 (Example module removed)  
**Role:** Pro Express ESM backend starter. Agents should answer from this folder first.

---

## How to use (agents)

1. Read this index.
2. Open **one** topic file from the table below.
3. Use `actions.md` for copy-paste workflows.
4. Only open source if memory is wrong/missing → then update memory (`memory-save` skill).

Skills: `.cursor/skills/memory-search` · `memory-save` · `memory-init`  
Rule: `.cursor/rules/local-memory.mdc` (always on)

---

## Stack (facts)

| Item | Value |
|------|--------|
| Runtime | Node, `"type": "module"` |
| Entry | `index.js` → `src/app.router.js` |
| HTTP | Express 4 |
| DB | Mongoose 8 → `MONGO_URI` |
| Validation | Joi 17 |
| Auth | JWT (`jsonwebtoken`) |
| Uploads | Multer + Sharp (`src/utils/multer.js`) |
| Cache | Redis optional (`src/utils/redis.js`) |
| Mail | Nodemailer (`src/utils/sendmail.js`) |
| Scripts | `npm run dev` (`node --watch`), `npm start` |

---

## Topic index

| Topic | File | Use when |
|-------|------|----------|
| Architecture & folders | [architecture.md](./architecture.md) | Where files live, bootstrap order |
| API envelope | [api-contract.md](./api-contract.md) | Success/error JSON, Joi errors, helpers |
| New module cookbook | [module-cookbook.md](./module-cookbook.md) | Scaffold feature end-to-end |
| Uploads API | [uploads-api.md](./uploads-api.md) | Multer/Sharp presets, extract helpers |
| Auth | [auth.md](./auth.md) | Token, roles, middleware order |
| Env & scripts | [env-and-scripts.md](./env-and-scripts.md) | Env vars, npm, ports |
| Routes catalog | [routes-catalog.md](./routes-catalog.md) | All mounted paths |
| Import map | [import-map.md](./import-map.md) | Exact import paths & exports |
| Actions / recipes | [actions.md](./actions.md) | Step checklists for common tasks |
| Decisions log | [decisions.md](./decisions.md) | Why we chose X |

---

## Quick lookup (no file open needed)

### Module flow
`router → isvalid* / upload → controller (ErrorCatch) → service → DB model`

### Response envelope
```json
{
  "success": true,
  "statusCode": 200,
  "message": "…",
  "data": {},
  "errors": null
}
```
HTTP status **===** `statusCode`. Failures: `success: false`; Joi → `errors: [{ field, message, type }]`.

### Never do
- `res.json({…})` without helpers
- Mongoose in routers
- Joi schemas inside controllers
- Trust client filenames on disk
- Commit `.env` / `uploads/`

### Key paths
| Concern | Path |
|---------|------|
| Bootstrap | `index.js` |
| Router mount + global errors | `src/app.router.js` |
| Responses | `src/helpers/response.helpers.js` |
| Service errors | `src/helpers/httpError.js` |
| Async wrap | `src/utils/ErrorCatch.js` |
| Validation MW | `src/middleware/validation.middleware.js` |
| Auth MW | `src/middleware/auth.middleware.js` |
| Uploads | `src/utils/multer.js` |
| DB connect | `DB/connection.js` |
| Feature modules | `src/modules/<Feature>/` (empty until you add one) |

### Modules present
- _(none yet — scaffold with `module-cookbook.md` / action A1)_

### Upload one-liners
```js
...imageUpload(UPLOAD_PRESETS.avatar({ folder: "foos" }))
...imageUpload(UPLOAD_PRESETS.gallery({ folder: "products", maxCount: 8 }))
...fileUpload({ folder: "docs", kind: "pdf", fields: "attachment" })
...spreadsheetUpload({ folder: "imports" })
```

### Controller skeleton
```js
export const create = ErrorCatch(async (req, res) => {
  try {
    const data = await FooService.createFoo(req.body);
    return successResponse(res, { statusCode: 201, message: "Created", data });
  } catch (error) {
    return handleServiceError(res, error);
  }
});
```

### Service error
```js
throw httpError("Not found", 404);
```

---

## Memory maintenance checklist

After any non-trivial change, tick:

- [ ] `routes-catalog.md` if routes changed  
- [ ] `import-map.md` if exports/paths changed  
- [ ] Topic file for the domain  
- [ ] `decisions.md` if behavior/tradeoff changed  
- [ ] Bump **Last updated** above  
