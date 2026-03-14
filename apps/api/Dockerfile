FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

RUN pnpm --filter @firmador/shared build
RUN pnpm --filter @firmador/api build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --filter @firmador/api --prod --frozen-lockfile

COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/dist ./apps/api/dist

EXPOSE 3000
CMD ["pnpm", "--filter", "@firmador/api", "start:prod"]

