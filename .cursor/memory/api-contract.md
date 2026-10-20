# API contract

## Envelope (mandatory)

```ts
type ApiResponse<T = unknown> = {
  success: boolean;
  statusCode: number;      // MUST match HTTP status
  message: string;
  data: T | null;
  errors: ApiFieldError[] | null;
};

type ApiFieldError = {
  field: string;
  message: string;
  type: string;            // Joi type, e.g. "any.required"
};
```

### Success defaults
- `success: true`
- `errors: null`
- `statusCode`: 200 (create → 201)

### Error defaults
- `success: false`
- `data`: usually `null`
- `errors`: Joi details or `null`

## Helpers — `src/helpers/response.helpers.js`

```js
successResponse(res, { message = "Success", data = null, statusCode = 200 })
errorResponse(res, { message = "Error", data = null, statusCode = 500, errors = null })
formatJoiErrors(joiError) // → ApiFieldError[] | null
```

## HTTP errors — `src/helpers/httpError.js`

```js
httpError(message, statusCode = 500, errors = null)
// throws Error with { statusCode, errors, isOperational: true }

handleServiceError(res, error)
// → errorResponse using error.statusCode || error.cause || 500
```

## Async wrap — `src/utils/ErrorCatch.js`

```js
export const foo = ErrorCatch(async (req, res) => { ... });
```

Catches rejections → `errorResponse`. Maps Joi / `ValidationError` → 400 + formatted errors.

## AppError — `src/utils/AppError.js`

```js
new AppError(message, statusCode = 400, errors = null)
```

## Validation MW — `src/middleware/validation.middleware.js`

Joi options always: `{ abortEarly: false, stripUnknown: true, convert: true }`.

| Export | Source | Assigns |
|--------|--------|---------|
| `isvalid(schema)` | `req.body` | `req.body = value` |
| `isvalidQuery(schema)` | `req.query` | `req.query = value` |
| `isvalidParams(schema)` | `req.params` | `req.params = value` |
| `isvalidAll(schema)` | body+params+query merge | `req.validated = value` |

Fail → **400** + envelope with `errors` array; `message` = joined field messages.

## Global 404 / 500

- Unknown route: message `"Route not found"`, `statusCode` 404
- Global handler uses `error.statusCode || error.cause || error.status` (ValidationError → 400)

## Controller pattern (copy)

```js
import { ErrorCatch } from "../../utils/ErrorCatch.js";
import { successResponse } from "../../helpers/response.helpers.js";
import { handleServiceError } from "../../helpers/httpError.js";

export const create = ErrorCatch(async (req, res) => {
  try {
    const data = await Service.create(req.body);
    return successResponse(res, {
      statusCode: 201,
      message: "Created successfully",
      data,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
});
```

## Sample Joi fail body

```json
{
  "success": false,
  "statusCode": 400,
  "message": "title is required",
  "data": null,
  "errors": [
    { "field": "title", "message": "title is required", "type": "any.required" }
  ]
}
```
