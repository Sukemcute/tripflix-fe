# Tripflix architecture guide — Frontend

AI agents: read this file and [RULES.md](RULES.md) before changing code.

## Canonical system architecture

![Tripflix system architecture v4.3](docs/architecture/06-kien-truc-tong-quan.png)

The diagram above is the canonical system view (v4.3, 2026-11-04). Keep the frontend aligned with it: the `tripflix-fe` repo contains the Expo Android app, the Next.js user website, and the Next.js admin site. They call backend services through Traefik over HTTPS APIs; video uploads go directly to S3, then playback uses CloudFront. Do not send video through the API Gateway.

The [editable diagram](docs/architecture/06-kien-truc-tong-quan.drawio) is the source for the preview. Supporting decisions and repo structure are in [architecture doc 10](docs/architecture/10-de-xuat-kien-truc-va-repo.md) and [architecture doc 11](docs/architecture/11-de-xuat-cau-truc-repo.md). If a supporting document conflicts with the v4.3 diagram, flag the conflict and follow the diagram until the architecture is reconciled.

## Frontend boundaries

- Keep Android, user web, and admin in their respective apps; put shared code in `packages/`.
- Call backend and AI APIs through `packages/api-client`. Generate contracts from the sibling `tripflix-be` and `tripflix-ai` repos.
- Put user-facing Vietnamese text in `packages/i18n`; use design tokens from `packages/tokens`.
- Keep platform-specific code inside the app that owns that platform. `packages/app-core` stays independent of React Native and React DOM.
- Organize app code by feature and follow the ownership rules in `RULES.md`.
