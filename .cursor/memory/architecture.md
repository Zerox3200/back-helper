# Architecture

## Bootstrap order (`index.js`)

1. `dotenv.config()`
2. `express()` + `cors` (`CORS_ORIGIN` CSV or `true`)
3. `appRouter(app, express)` — parsers, routes, 404, global error handler
4. `await conn()` — Mongoose
5. `app.listen(PORT || 5200)`

Failure to connect DB → `process.exit(1)`.

## Folder map

```
back-helper/
├── index.js
├── package.json                 # "type": "module"
├── .env / .env.example
├── uploads/                     # runtime only (gitignored)
├── DB/
│   ├── connection.js            # conn(), isDbConnected()
│   └── <Entity>/<Entity>.model.js
├── src/
│   ├── app.router.js            # static /uploads, json, health, mounts, errors
│   ├── helpers/
│   │   ├── response.helpers.js
│   │   └── httpError.js
│   ├── middleware/
│   │   ├── validation.middleware.js
│   │   └── auth.middleware.js
│   ├── utils/
│   │   ├── multer.js            # Multer + Sharp
│   │   ├── ErrorCatch.js
│   │   ├── AppError.js
│   │   ├── redis.js
│   │   └── sendmail.js
│   └── modules/
│       └── <Feature>/
│           ├── <Feature>.validation.js
│           ├── <Feature>.service.js
│           ├── <Feature>.controller.js
│           └── <Feature>.router.js
└── .cursor/
    ├── memory/                  # THIS knowledge base
    ├── rules/
    └── skills/
```

## Layer responsibilities

| Layer | Owns | Must not |
|-------|------|----------|
| Router | HTTP method/path, MW order | Business logic, DB |
| Validation | Joi shape, strip/convert | Side effects |
| Upload MW | Files on disk + Sharp | Business rules |
| Controller | Wire req → service → response | Heavy queries |
| Service | Rules, DB, `httpError` | `res` object |
| Model | Schema only | HTTP |

## Request pipeline (typical write)

```
CORS → json/urlencoded → route mount
  → CheckToken? → requireRoles?
  → ...imageUpload / fileUpload?
  → isvalid / isvalidParams / isvalidQuery
  → controller (ErrorCatch)
  → service
  → successResponse | handleServiceError
```

Unhandled → global handler in `app.router.js` → same envelope.

## Static files

- URL prefix: `/uploads`
- Disk root: `uploads/`
- Options: `dotfiles: "deny"`, no etag, `maxAge: 0`

## Health

`GET /health` — 200 if Mongo readyState === 1, else 503. Same envelope fields + `data.{ status, timestamp, uptime, database }`.
