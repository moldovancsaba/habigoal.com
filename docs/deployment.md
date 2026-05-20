# Deployment

## Repository

GitHub repository: `https://github.com/moldovancsaba/habigoal.com`

The deployable app is the repository root.

## Vercel

Recommended Vercel settings:

- Root directory: repository root
- Framework preset: Next.js
- Install command: `npm install`
- Build command: `npm run build`
- Node.js: `22.x`

## Production Environment Variables

```txt
MONGODB_URI
MONGODB_DB
MONGODB_APP_NAME
IMGBB_API_KEY

APP_URL
SSO_CLIENT_ID
SSO_CLIENT_SECRET
SSO_BASE_URL
SSO_REDIRECT_URI
SSO_LOGOUT_URL
AUTH_SECRET
HABIGOAL_ENFORCE_AUTH
```

Production values should follow this shape:

```txt
MONGODB_DB=habigoal
MONGODB_APP_NAME=habigoal
APP_URL=https://habigoal.com
SSO_BASE_URL=https://sso.doneisbetter.com
SSO_REDIRECT_URI=https://habigoal.com/api/oauth/callback
HABIGOAL_ENFORCE_AUTH=true
```

`SSO_LOGOUT_URL` is optional and should stay empty unless DoneIsBetter provides a logout endpoint.

## Local Environment

Local development can use `.env` or `.env.local`.

```bash
cp .env.example .env
npm run db:ping
npm run dev
```

Open-mode local development:

```txt
HABIGOAL_ENFORCE_AUTH=false
```

SSO-like local testing:

```txt
HABIGOAL_ENFORCE_AUTH=true
APP_URL=http://localhost:3000
SSO_REDIRECT_URI=http://localhost:3000/api/oauth/callback
AUTH_SECRET=<long random secret>
```

## MongoDB Atlas Checklist

1. Create an Atlas database user with read/write access to the `habigoal` database.
2. Add Vercel network access. A broad `0.0.0.0/0` rule can be used for early testing; production should use the narrowest practical Vercel egress model available.
3. Set `MONGODB_URI`, `MONGODB_DB`, and `MONGODB_APP_NAME` in Vercel.
4. Redeploy after changing environment variables.
5. Verify with `GET /api/health`.

Local verification:

```bash
npm run db:ping
```

## Database Setup And Seeds

Prepare indexes/base collections:

```bash
npm run db:setup
```

Optional local/demo seed commands:

```bash
npm run db:seed-demo
npm run db:seed-showcase
```

Migration/backfill helpers:

```bash
npm run db:backfill-standards-version
npm run db:backfill-daily-tracker-history
npm run db:migrate-survey-identifiers
```

## ImgBB Uploads

Evidence uploads go through `/api/uploads/imgbb`.

The server requires `IMGBB_API_KEY`; the browser never receives the key.

Stored attachment metadata includes:

- image URL
- thumbnail URL
- delete URL when returned by ImgBB
- file name
- MIME type
- size
- upload time

## SSO Deployment Checklist

1. Configure the DoneIsBetter client with `https://habigoal.com/api/oauth/callback`.
2. Add `SSO_CLIENT_ID`, `SSO_CLIENT_SECRET`, `SSO_BASE_URL`, `SSO_REDIRECT_URI`, `AUTH_SECRET`, and `HABIGOAL_ENFORCE_AUTH=true` in Vercel.
3. Ensure at least one local admin user exists or intentionally rely on first-login bootstrap.
4. Redeploy.
5. Test `/api/auth/login`, `/api/oauth/callback`, `/api/auth/me`, and `/api/auth/logout`.

Full setup is documented in [SSO Setup](sso-setup.md).

## Post-Deploy Checks

1. `GET /api/health` reports MongoDB configured and reachable.
2. Public pages return `200`:
   - `/en`
   - `/en/news`
   - `/en/legal/gtc`
   - `/en/legal/privacy`
3. Protected pages redirect to SSO when logged out and `HABIGOAL_ENFORCE_AUTH=true`.
4. Athlete login routes to the linked athlete profile.
5. Trainer login routes to `/dashboard`.
6. Admin login routes to `/dashboard/settings`.
7. Create a check-in and verify it appears in athlete history.
8. Save a weekly plan and verify it appears on the matching athlete detail page.
9. Generate a PDF/report from athlete or record detail.
10. Verify locale-sensitive pages do not show mixed-language action labels.
