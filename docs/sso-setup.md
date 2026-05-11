# SSO Setup

Habigoal is prepared to authenticate against `https://sso.doneisbetter.com` using OAuth/OpenID Connect-style endpoints.

## Client setup on `sso.doneisbetter.com`

Create a client for Habigoal with these production values:

- Client name: `Habigoal`
- Application URL: `https://habigoal.com`
- Redirect URI: `https://habigoal.com/api/oauth/callback`
- Requested scopes: `openid profile email`

If the SSO admin UI supports multiple redirect URIs, also add:

- Preview redirect URI: `https://habigoal.com/api/oauth/callback`
- Local redirect URI: `http://localhost:3000/api/oauth/callback`

If the provider exposes logout URL configuration, capture that value and put it into `SSO_LOGOUT_URL`.

## Required app environment variables

```txt
APP_URL=https://habigoal.com
SSO_CLIENT_ID=...
SSO_CLIENT_SECRET=...
SSO_BASE_URL=https://sso.doneisbetter.com
SSO_REDIRECT_URI=https://habigoal.com/api/oauth/callback
SSO_LOGOUT_URL=
AUTH_SECRET=<long random secret>
SURVEY_ENFORCE_AUTH=true
```

## Behavior

- Login starts at `/api/auth/login`
- The app preserves the requested in-app return path through the SSO flow
- Callback completes at `/api/oauth/callback`
- Local roles are still controlled by Habigoal's own `users` collection
- SSO identifies the person; Habigoal decides what they may do

## Whitelist model

Habigoal only grants access when the authenticated email exists in the local `users` collection.

Bootstrap behavior:

- if no users exist at all, the first successful SSO user is promoted to `admin,conductor`
- after that, only locally approved users can enter

## Validation checklist

1. Set the production env vars in Vercel.
2. Confirm at least one local admin user exists, or intentionally rely on the first-user bootstrap.
3. Open `https://habigoal.com/en`.
4. Start login.
5. Complete SSO.
6. Confirm redirect back to the requested Habigoal path.
7. Confirm `/api/auth/me` returns the signed-in user.
