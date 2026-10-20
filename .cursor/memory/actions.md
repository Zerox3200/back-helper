# Actions — step recipes (do without opening source)

## A1 — Add a new CRUD module `Foo`

1. Create `DB/Foo/Foo.model.js` (see `module-cookbook.md` template).
2. Create four files under `src/modules/Foo/` (validation, service, controller, router).
3. In service: throw `httpError(msg, code)`; serialize docs.
4. In controller: `ErrorCatch` + `successResponse` / `handleServiceError`.
5. In router: `isvalid*` order; optional `...imageUpload(...)`.
6. Mount: `app.use("/foos", fooRouter)` in `src/app.router.js`.
7. Memory: update `routes-catalog.md`, `MEMORY.md` modules list, bump date.
8. Smoke: `GET /health`, then hit the new routes (e.g. `GET /foos`).

## A2 — Protect a route

```js
import { CheckToken, requireRoles } from "../../middleware/auth.middleware.js";
router.post("/", CheckToken, requireRoles("Admin"), isvalid(schema), C.create);
```

## A3 — Add image upload to a route

```js
import { imageUpload, UPLOAD_PRESETS, getSingleImage } from "../../utils/multer.js";

// router — multer BEFORE joi when multipart
router.post(
  "/",
  ...imageUpload(UPLOAD_PRESETS.avatar({ folder: "foos" })),
  isvalid(createSchema),
  C.create
);

// controller
const { path, lqip } = getSingleImage(req, "image");
await Service.create({ ...req.body, image: path, imageLqip: lqip });
```

## A4 — PDF / spreadsheet upload

```js
...pdfUpload({ folder: "tickets", fields: "attachment" })
...spreadsheetUpload({ folder: "imports", fields: "file" })
// or
...fileUpload({ folder: "docs", kind: "document", fields: "file", maxCount: 1 })
```

## A5 — Return paginated list

Service returns:
```js
{ items, pagination: { page, limit, total, pages } }
```
Controller:
```js
return successResponse(res, { message: "Fetched", data });
```

## A6 — Validation-only change

1. Edit Joi in `*.validation.js`.
2. No controller change if field already passed through.
3. If new field → update model + service + `api-contract` only if envelope changes (rare).

## A7 — Change response shape globally

1. Edit `src/helpers/response.helpers.js` only.
2. Update `api-contract.md` + `MEMORY.md` quick lookup.
3. Do **not** fork shapes in controllers.

## A8 — Add env var

1. Add to `.env.example` with safe placeholder.
2. Read via `process.env.NAME` with default if safe.
3. Document in `env-and-scripts.md`.
4. Never commit real `.env` values into memory.

## A9 — Wire Redis / mail in a feature

- Redis: import from `src/utils/redis.js`; treat miss as cache skip.
- Mail: `await SendMail({ to, subject, html })`; check boolean.

## A10 — Fix / extend global errors

Edit `src/app.router.js` final `app.use((error, req, res, next) => …)` — must call `errorResponse` envelope. Keep status mapping: `statusCode || cause || status`.

## A11 — After any of the above

Run mental checklist in `MEMORY.md` → Memory maintenance. Prefer updating topic files over leaving stale docs.
