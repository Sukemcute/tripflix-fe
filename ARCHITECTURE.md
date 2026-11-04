# Architecture guide — Frontend

AI agents: read this file and [RULES.md](RULES.md) before changing code.

## Source of truth

- [System architecture](docs/architecture/10-de-xuat-kien-truc-va-repo.md)
- [Repository structure and decisions](docs/architecture/11-de-xuat-cau-truc-repo.md)
- [Architecture document index and diagrams](docs/architecture/README.md)

## Frontend rules

- Keep mobile, web and admin in their existing apps; put shared code in `packages/`.
- Call backend and AI APIs through `packages/api-client`. Generated contracts come from the sibling `tripflix-be` and `tripflix-ai` repos.
- Put user-facing Vietnamese text in `packages/i18n`; use design tokens from `packages/tokens`.
- Keep platform-specific code inside the app that owns that platform. `packages/app-core` stays independent of React Native and React DOM.
- Organize app code by feature and respect the ownership rules in `RULES.md`.
