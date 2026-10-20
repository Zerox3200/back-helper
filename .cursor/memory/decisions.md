# Decisions log

Append-only. Newest first.

## 2026-10-20 — Local memory over Supermemory

Supermemory MCP disabled. Project knowledge lives in `.cursor/memory/` with always-on `local-memory` rule + memory-* skills so agents can work without re-reading source.

## 2026-10-20 — Unified response envelope

All success/error/Joi/global handlers share `{ success, statusCode, message, data, errors }`. HTTP status must equal `statusCode`. Avoids frontend special-casing.

## 2026-10-20 — Removed starter Example module

Sample `Example` feature removed so the starter ships empty. Scaffold new features from `module-cookbook.md` / action A1 only.

## 2026-10-20 — Module layers

Forced split: validation → controller → service → model. Routers stay declarative. Templates in `module-cookbook.md` are the canonical guide.

## 2026-10-20 — Dynamic Multer + Sharp

Single `src/utils/multer.js` with `FILE_KINDS` + `UPLOAD_PRESETS` factories instead of app-specific (shop/product) hardcodes. Magic-byte validation + nanoid disk names required.

## 2026-10-20 — Auth without User model

`CheckToken` attaches JWT payload only. Role checks use `req.auth.role`. DB user loading is optional for future Auth module — starter must boot without a User collection.

## 2026-10-20 — Soft Redis

Redis is optional; connection failures must not crash the API.
