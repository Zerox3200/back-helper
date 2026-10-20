# Auth — `src/middleware/auth.middleware.js`

## Token

Accepted headers:
1. `Authorization: Bearer <jwt>`
2. Legacy: `token: <jwt>`

Verify secret: `process.env.SECRET_KEY || process.env.secretkey`

## Middleware

### `CheckToken`
- Missing/invalid → **401** envelope `"Unauthorized — …"`
- Sets:
  - `req.auth` = decoded payload
  - `req.id` = `decoded.id || decoded._id`
- Does **not** load User from DB by default (no User model required).

### `requireRoles(...roles)`
- Use **after** `CheckToken`
- Reads `req.auth.role` or `req.user.role`
- Fail → `httpError(..., 403)` → forbidden

### `CheckAdmin`
- Alias array: `[CheckToken, requireRoles("Admin")]`
- Spread or chain carefully — it's an array of middlewares:
  ```js
  router.get("/admin-only", ...CheckAdmin, controller);
  // or
  router.get("/admin-only", CheckToken, requireRoles("Admin"), controller);
  ```

## Route patterns

```js
import { CheckToken, requireRoles } from "../../middleware/auth.middleware.js";

router.get("/me", CheckToken, C.me);
router.delete("/:id", CheckToken, requireRoles("Admin"), C.remove);
```

## JWT payload convention (suggested)

```js
{ id, role, email?, iat, exp }
```

Sign elsewhere (Auth module when added) with `SECRET_KEY`.

## Rules

- Controllers must not call `jwt.verify` themselves.
- Never log tokens.
- Prefer Bearer over raw `token` header for new clients.
