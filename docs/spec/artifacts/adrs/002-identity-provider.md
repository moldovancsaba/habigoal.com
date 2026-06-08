# ADR-002: Identity Provider — DoneIsBetter SSO

**Status:** Accepted  
**Date:** 2026-06-08  
**Source:** Athlete IQ 2.0 §37, §26.2

## Context

Spec requires OAuth2/OIDC with MFA for staff. Open decision listed Auth0, Keycloak, Clerk, custom OIDC.

## Decision

**DoneIsBetter SSO (OIDC)** as primary identity provider, with **local approved-user authorization** for development and transitional access.

## Rationale

- Already in project brief and ROADMAP as shipped baseline direction.
- Avoids third-party IdP cost/complexity for early adopters in DoneIsBetter ecosystem.

## Consequences

- SEC-001 remains partial until SSO is production-enforced.
- Parent/guardian role (ROL-001) requires SSO group/claim design or separate portal auth.
