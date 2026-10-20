# Uploads API — `src/utils/multer.js`

All uploads go through this file. Disk root: `uploads/<folder>/<fieldname>/<nanoid>.<ext>`.

## Factories (spread into routes)

| Factory | Returns | Processing |
|---------|---------|------------|
| `imageUpload(config)` | `[multer, ?signature, sharp]` | Compress ± LQIP |
| `fileUpload(config)` | `[multer, ?signature, relativePaths]` | No Sharp |
| `pdfUpload(config)` | via `fileUpload` kind `pdf` | No Sharp |
| `spreadsheetUpload(config)` | via `fileUpload` kind `spreadsheet` | No Sharp |

Usage: `router.post("/", ...imageUpload(cfg), ctrl)`

## `imageUpload(config)`

| Key | Default | Notes |
|-----|---------|-------|
| `folder` | **required** | Under `uploads/` |
| `fields` | `"image"` | `string` \| `string[]` \| `{name,maxCount}[]` |
| `maxCount` | `5` | Per field; `1` → `.single()` |
| `generateLQIP` | `true` | |
| `lqipAsFile` | `false` | `true` → separate `_lqip.jpg` file path |
| `compressOptions` | quality 80, 1920², jpeg | `{ quality, maxWidth, maxHeight, format }` |
| `lqipOptions` | width 64, q 45, blur 1.5 | |
| `fileFilter` | `"image"` | `FILE_KINDS` key or `{ allowedMimeTypes, allowedExtensions, strict, enabled }` |
| `limits` | 5MB, 10 files | Multer limits |
| `any` | `false` | `.any()` |
| `validateSignature` | `true` | Magic bytes |

## `fileUpload(config)`

Same field/folder/limits/any/validateSignature plus:
- `kind` default `"anySafe"` (or pass `fileFilter`)

## `FILE_KINDS` keys

`image` · `pdf` · `spreadsheet` · `document` · `anySafe`

Custom filter object:
```js
{
  allowedMimeTypes: ["image/png"],
  allowedExtensions: [".png"],
  strict: true,   // need BOTH mime + ext
  enabled: true
}
```

## `UPLOAD_PRESETS` (functions → config)

Call then pass to factory:

```js
UPLOAD_PRESETS.avatar({ folder: "users" })
UPLOAD_PRESETS.cover({ folder: "banners" })
UPLOAD_PRESETS.gallery({ folder: "products", maxCount: 8 })
UPLOAD_PRESETS.document({ folder: "kyc" })
UPLOAD_PRESETS.pdf({ folder: "tickets" })
UPLOAD_PRESETS.spreadsheet({ folder: "imports" })
```

| Preset | Typical fields | Notes |
|--------|----------------|-------|
| `avatar` | `image`, max 1 | 800² jpeg q85, LQIP data-URI, 2MB |
| `cover` | `cover`, max 1 | 1920×1080 |
| `gallery` | `images`, max 10 | LQIP as file |
| `document` | `file` | use with `fileUpload` |
| `pdf` | `attachment` | use with `fileUpload` / `pdfUpload` |
| `spreadsheet` | `file` | xlsx/xls/csv |

```js
// images
...imageUpload(UPLOAD_PRESETS.avatar({ folder: "foos" }))

// non-images
...fileUpload(UPLOAD_PRESETS.pdf({ folder: "tickets" }))
...pdfUpload({ folder: "tickets" })
...spreadsheetUpload({ folder: "imports" })
```

## Low-level

```js
upload({ folder, fileFilter, limits, baseDir = "uploads" }) // → multer instance
compressImage(path, options)
compressImages(pathsOrFiles, options)
generateLQIP(path, options)           // data URI
generateLQIPFile(path, options)       // file path
compressImageWithLQIP(path, options)
compressUploadedImages(options)       // MW
compressUploadedImagesWithLQIP(options)
validateUploadedFileSignatures        // MW
sanitizeOriginalFilename(name)        // display only
```

## Controller extractors

```js
getSingleImage(req, fieldName = "image")
// → { path: "/uploads/...", lqip: "data:..." | "/uploads/..._lqip.jpg" | null }

getMultipleImages(req, fieldName = "images")
// → { paths: string[], lqips: (string|null)[] }

extractImagePaths(req, fieldNames) // string | string[]
// → { image, imageLQIP, ... }

getSinglePdf(req, fieldName = "attachment") // relative path | null
```

On processed files: `file.relativePath`, optional `file.lqip`, `file.originalNameDisplay`.

## Security invariants (do not weaken)

- Disk name = `nanoid(24) + ext` only
- Block svg/html/js/executable MIME
- Magic-byte check deletes bad files
- API stores/returns relative `/uploads/...` paths
- Default max file 5MB (avatar preset 2MB)

## Defaults

```js
DEFAULT_COMPRESS = { quality: 80, maxWidth: 1920, maxHeight: 1920, format: "jpeg" }
DEFAULT_LQIP = { width: 64, quality: 45, blur: 1.5 }
DEFAULT_LIMITS = { fileSize: 5 * 1024 * 1024, files: 10 }
```
