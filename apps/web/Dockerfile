FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

COPY apps/web ./apps/web
COPY packages/shared ./packages/shared

RUN pnpm --filter @firmador/shared build
RUN pnpm --filter @firmador/web build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --filter @firmador/web --prod --frozen-lockfile

COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/web/dist ./apps/web/dist

EXPOSE 4321
CMD ["pnpm", "--filter", "@firmador/web", "preview"]

