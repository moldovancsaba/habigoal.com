# SSO Setup

Habigoal authenticates with DoneIsBetter SSO and authorizes users through its own local `users` collection.

SSO answers: who is this person?

Habigoal answers: what can this person access?

## DoneIsBetter Client

Production client values:

- Client name: `Habigoal`
- Application URL: `https://habigoal.com`
- Redirect URI: `https://habigoal.com/api/oauth/callback`
- Allowed scopes:
  - `openid`
  - `profile`
  - `email`
  - `offline_access` if the provider requires it for the client

Optional local redirect URI:

- `http://localhost:3000/api/oauth/callback`

Optional alternate redirect URI, only if the provider requires front-channel callback registration:

- `https://habigoal.com/auth/callback`

The implemented app callback is `/api/oauth/callback`.

## Required Environment Variables

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

`AUTH_SECRET` signs the local `survey_session` cookie. Treat it as production secret material.

## Runtime Flow

1. User opens a protected route.
2. Middleware redirects to `/api/auth/login?next=<requested-path>`.
3. Login route stores `oauth_state` and `oauth_return_to` cookies.
4. DoneIsBetter redirects back to `/api/oauth/callback`.
5. Callback exchanges the code for a token and reads SSO user info.
6. Habigoal checks the local `users` collection for the email.
7. If authorized, Habigoal creates a signed local session.
8. User is redirected by role.

## Role Redirects

- `athlete`: `/{locale}/athletes/{athleteId}`
- `trainer`: `/{locale}/dashboard`
- `admin`: `/{locale}/dashboard/settings`

Public `news` and `legal` return paths are preserved.

## Local Authorization Rules

Local roles:

- `athlete`
- `trainer`
- `admin`

Bootstrap behavior:

- If no users exist, the first successful SSO login is inserted as `admin`.
- After users exist, unapproved SSO emails are denied and redirected with `error=access_denied`.

Admin safety rules:

- users cannot be saved with zero roles
- an admin cannot remove their own admin role
- the final admin cannot be demoted or deleted

## Athlete Linking

Athlete users should have `athleteId` set in the local user record. Without it, the user can authenticate but has no usable athlete scope.

When linked correctly:

- `/athletes` redirects to the athlete's own profile
- athlete APIs filter to that one profile
- check-in creation is limited to that athlete
- habit records are limited to that athlete

## Trainer Scoping

Trainer users are scoped by team membership:

- teams store `trainerEmails[]`
- teams store `athleteIds[]`
- trainer API and UI surfaces use those team assignments for athlete access

## Validation Checklist

1. Confirm production env vars are set in Vercel.
2. Confirm `SURVEY_ENFORCE_AUTH=true`.
3. Confirm at least one admin exists in `users`.
4. Open `https://habigoal.com/en/dashboard`.
5. Complete SSO.
6. Confirm `/api/auth/me` returns the expected `primaryRole`.
7. Confirm athlete, trainer, and admin users land on their correct surfaces.
8. Confirm a signed-in athlete cannot open another athlete profile or trainer/admin dashboard page.
9. Confirm a trainer cannot open `/dashboard/settings`.
10. Confirm logout clears the local session.
