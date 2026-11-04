# syntax=docker/dockerfile:1
# Build với context là gốc repo: docker build -f apps/admin/Dockerfile --target prod .
# Stage dev dùng cho máy local (tripflix-be: pnpm stack:up / stack:watch); stage prod là image đẩy lên GHCR.
ARG APP=@tripflix/admin

FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

# Chỉ giữ phần monorepo mà app cần
FROM base AS prune
ARG APP
COPY . .
RUN pnpm dlx turbo@2.11.10 prune ${APP} --docker

# Cài dependency trước, để sửa code không làm cài lại
FROM base AS deps
COPY --from=prune /repo/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS dev
ARG APP
ENV APP=${APP} NODE_ENV=development
COPY --from=prune /repo/out/full/ .
EXPOSE 3200
CMD pnpm --filter=${APP} dev

FROM dev AS build
ARG APP
ENV NODE_ENV=production
RUN pnpm turbo run build --filter=${APP}

FROM node:24-slim AS prod
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3200 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/admin/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build --chown=node:node /repo/apps/admin/public ./apps/admin/public
USER node
EXPOSE 3200
CMD ["node", "apps/admin/server.js"]
