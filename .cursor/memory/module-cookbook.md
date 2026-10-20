# Module cookbook — add a feature `Foo`

Do **not** invent a new structure. Follow the templates below.

## Checklist

1. [ ] `DB/Foo/Foo.model.js`
2. [ ] `src/modules/Foo/Foo.validation.js`
3. [ ] `src/modules/Foo/Foo.service.js`
4. [ ] `src/modules/Foo/Foo.controller.js`
5. [ ] `src/modules/Foo/Foo.router.js`
6. [ ] Mount in `src/app.router.js`: `app.use("/foos", fooRouter)`
7. [ ] Update memory: `routes-catalog.md`, `MEMORY.md` modules list

## File templates

### Model

```js
// DB/Foo/Foo.model.js
import mongoose from "mongoose";

const fooSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    // ...
  },
  { timestamps: true }
);

export const Foo = mongoose.models.Foo || mongoose.model("Foo", fooSchema);
```

### Validation

```js
// src/modules/Foo/Foo.validation.js
import Joi from "joi";

export const createFooSchema = Joi.object({
  title: Joi.string().trim().min(2).max(120).required(),
});

export const updateFooSchema = Joi.object({
  title: Joi.string().trim().min(2).max(120).optional(),
}).min(1);

export const fooIdParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

export const listFoosQuerySchema = Joi.object({
  search: Joi.string().trim().max(100).optional().allow(""),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});
```

### Service

```js
// src/modules/Foo/Foo.service.js
import { Foo } from "../../../DB/Foo/Foo.model.js";
import { httpError } from "../../helpers/httpError.js";

export const createFoo = async (payload) => { /* ... */ };
export const getFooById = async (id) => {
  const doc = await Foo.findById(id);
  if (!doc) throw httpError("Foo not found", 404);
  return serialize(doc);
};
```

Rules:
- Serialize for API (expose `id` not raw quirks unless needed).
- Throw `httpError`, never `res`.

### Controller

```js
import { ErrorCatch } from "../../utils/ErrorCatch.js";
import { successResponse } from "../../helpers/response.helpers.js";
import { handleServiceError } from "../../helpers/httpError.js";
import * as FooService from "./Foo.service.js";

export const create = ErrorCatch(async (req, res) => {
  try {
    const data = await FooService.createFoo(req.body);
    return successResponse(res, { statusCode: 201, message: "Foo created", data });
  } catch (error) {
    return handleServiceError(res, error);
  }
});
```

### Router (MW order)

```js
import { Router } from "express";
import { isvalid, isvalidParams, isvalidQuery } from "../../middleware/validation.middleware.js";
import { CheckToken, requireRoles } from "../../middleware/auth.middleware.js";
import { imageUpload, UPLOAD_PRESETS } from "../../utils/multer.js";
import * as C from "./Foo.controller.js";
import { createFooSchema, fooIdParamSchema, listFoosQuerySchema } from "./Foo.validation.js";

const router = Router();

router.get("/", isvalidQuery(listFoosQuerySchema), C.list);
router.get("/:id", isvalidParams(fooIdParamSchema), C.getById);

router.post(
  "/",
  CheckToken,
  ...imageUpload(UPLOAD_PRESETS.avatar({ folder: "foos" })), // optional
  isvalid(createFooSchema),
  C.create
);

export default router;
```

**Order rule:** auth → upload → validate → controller.

If multipart: put `isvalid` **after** multer so `req.body` is populated.

### Mount

```js
// src/app.router.js
import fooRouter from "./modules/Foo/Foo.router.js";
app.use("/foos", fooRouter);
```

## Image field tip (optional)

In the controller after `imageUpload`:

```js
const { path, lqip } = getSingleImage(req, "image");
await createFoo({ ...req.body, image: path, imageLqip: lqip });
```

List endpoints should return `{ items, pagination: { page, limit, total, pages } }`.
