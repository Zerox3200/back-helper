# Routes catalog

Base URL: `http://localhost:${PORT}` (default **5200**)

Update this file whenever `app.router.js` or a module router changes.

## Core

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/health` | no | 200/503 DB readiness |
| GET | `/uploads/*` | no | static files |

## Feature modules

None mounted yet. When adding a module:

1. Create `src/modules/<Feature>/<Feature>.router.js`
2. Mount in `src/app.router.js`: `app.use("/foos", fooRouter)`
3. Append a section below with method/path/validation/upload/controller

```js
// src/app.router.js
import fooRouter from "./modules/Foo/Foo.router.js";
app.use("/foos", fooRouter);
```
