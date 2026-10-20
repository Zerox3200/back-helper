# Env & scripts

## npm scripts (`package.json`)

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run dev` | `node --watch index.js` | Local reload |
| `npm start` | `node index.js` | Production-style |
| `npm test` | placeholder | not implemented |

## Environment variables

| Variable | Required | Default / notes |
|----------|----------|-----------------|
| `PORT` | no | `5200` |
| `NODE_ENV` | no | `development` — stack traces off when `production` |
| `MONGO_URI` | yes (prod) | `mongodb://127.0.0.1:27017/back-helper` |
| `SECRET_KEY` | yes (auth) | JWT secret |
| `secretkey` | legacy | fallback if `SECRET_KEY` missing |
| `CORS_ORIGIN` | no | CSV origins; if unset cors `origin: true` |
| `REDIS_URL` | no | `redis://127.0.0.1:6379` — app continues if down |
| `Email` | no | Nodemailer user |
| `Emailpassword` | no | Nodemailer pass |

Template file: `.env.example` (commit). Real `.env` is gitignored.

## DB connection — `DB/connection.js`

```js
conn()              // await; logs success/fail; throws on fail
isDbConnected()     // mongoose.connection.readyState === 1
```

## Redis — `src/utils/redis.js`

Optional. Soft-fail if Redis unavailable. Do not hard-require for request path unless feature needs cache.

## Mail — `src/utils/sendmail.js`

```js
SendMail({ to, subject, html }) // → boolean accepted
```

Uses Gmail transport + `Email` / `Emailpassword`.

## Git ignore (important)

`node_modules/`, `uploads/`, `.env`, `dist/`, `*.log`, assorted bat/json tools.
