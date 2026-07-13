# syntax=docker/dockerfile:1

# Multi-stage build for the Exquisite Telephone server, which serves the
# built Svelte client's static assets itself (see infrastructure.md —
# single Fly.io app/process, no separate static host). Uses pnpm's own
# multi-stage Docker idiom (corepack + a prod-deps stage that installs
# with --prod, mirrored from pnpm's documented Docker pattern) rather
# than a hand-rolled copy-everything approach (constitution Principle V).

FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Pin the exact pnpm version used in development rather than letting
# corepack activate whatever is latest — newer pnpm majors have shipped
# supply-chain policies (e.g. minimumReleaseAge) that can reject a
# same-day-published lockfile entry deterministically at build time.
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app
COPY . .

# Prunes devDependencies out of every workspace package's node_modules,
# keeping only what's needed to run the built server (socket.io,
# serve-static, and the @exquisite-telephone/shared workspace link).
FROM base AS prod-deps
# --ignore-scripts: the root "prepare" script (husky) is a dev-only git
# hook installer that isn't present (or needed) once devDependencies are
# pruned, and would otherwise fail this stage.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile --ignore-scripts

# Full install (including devDependencies) so the build toolchain
# (typescript, vite, svelte-check, etc.) is available, then build
# shared -> server -> client per the root "build" script.
FROM base AS build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm run build

# Slim runtime: only the compiled output and pruned node_modules needed
# to run `node server/dist/index.js`. Directory layout mirrors the
# monorepo (server/, shared/, client/ as siblings under /app) so pnpm's
# node_modules symlinks (e.g. server/node_modules/@exquisite-telephone/shared
# -> ../../../shared) and the server's default CLIENT_DIST_PATH
# resolution (../../client/dist relative to server/dist) both keep working.
FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/server/node_modules ./server/node_modules

COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/shared/package.json ./shared/package.json
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/client/dist ./client/dist

ENV PORT=3000
ENV CLIENT_DIST_PATH=/app/client/dist
EXPOSE 3000

CMD ["node", "server/dist/index.js"]
