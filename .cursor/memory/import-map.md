# Import map (exact paths)

From a file inside `src/modules/<Feature>/`:

## Responses & errors

```js
import { successResponse, errorResponse, formatJoiErrors } from "../../helpers/response.helpers.js";
import { httpError, handleServiceError } from "../../helpers/httpError.js";
import { ErrorCatch } from "../../utils/ErrorCatch.js";
import { AppError } from "../../utils/AppError.js";
```

## Middleware

```js
import { isvalid, isvalidQuery, isvalidParams, isvalidAll } from "../../middleware/validation.middleware.js";
import { CheckToken, requireRoles, CheckAdmin } from "../../middleware/auth.middleware.js";
```

## Uploads

```js
import {
  upload,
  imageUpload,
  fileUpload,
  pdfUpload,
  spreadsheetUpload,
  UPLOAD_PRESETS,
  FILE_KINDS,
  getSingleImage,
  getMultipleImages,
  extractImagePaths,
  getSinglePdf,
  compressImage,
  generateLQIP,
  validateUploadedFileSignatures,
  sanitizeOriginalFilename,
} from "../../utils/multer.js";
```

## Models (from module)

```js
import { Foo } from "../../../DB/Foo/Foo.model.js";
// pattern: ../../../DB/<Entity>/<Entity>.model.js
```

## App router mount

```js
// src/app.router.js
import fooRouter from "./modules/Foo/Foo.router.js";
app.use("/foos", fooRouter);
```

## Bootstrap

```js
import { appRouter } from "./src/app.router.js";
import { conn, isDbConnected } from "./DB/connection.js";
```

## Utils (optional)

```js
import { SendMail } from "../../utils/sendmail.js";
// redis helpers — see src/utils/redis.js exports when needed
```

## Export inventory (quick)

| Module | Named exports |
|--------|----------------|
| `response.helpers.js` | `successResponse`, `errorResponse`, `formatJoiErrors` |
| `httpError.js` | `httpError`, `handleServiceError` |
| `ErrorCatch.js` | `ErrorCatch` |
| `AppError.js` | `AppError` |
| `validation.middleware.js` | `isvalid`, `isvalidQuery`, `isvalidParams`, `isvalidAll` |
| `auth.middleware.js` | `CheckToken`, `requireRoles`, `CheckAdmin` |
| `connection.js` | `conn`, `isDbConnected` |
| `app.router.js` | `appRouter` |
