#syntax=docker/dockerfile:1.4
FROM oven/bun:1.2.22-alpine AS base
ARG DOTENV_PRIVATE_KEY_CI=privatekey
ENV DOTENV_PRIVATE_KEY_CI=${DOTENV_PRIVATE_KEY_CI}
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app
COPY . /app

# Install only production dependencies for the final runtime image
FROM base AS prod-deps
ENV CI=true
ENV NODE_BUILD=true
RUN bun install --frozen-lockfile

FROM base AS build
ENV CI=true
ENV NODE_BUILD=true
RUN bun install --frozen-lockfile
RUN bunx @dotenvx/dotenvx run -- bun run build

FROM node:20-alpine
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 sveltekit

# Copying build output and runtime deps, see: https://kit.svelte.dev/docs/adapter-node
COPY --from=prod-deps --chown=sveltekit:nodejs /app/node_modules /app/node_modules
COPY --from=build --chown=sveltekit:nodejs /app/build /app/build
COPY --from=build --chown=sveltekit:nodejs /app/package.json ./package.json
COPY --from=build --chown=sveltekit:nodejs /app/bun.lock ./bun.lock

# For SvelteKit ENV resolution, see: https://kit.svelte.dev/docs/adapter-node
ENV NODE_ENV=production
ARG PORT=8080
ENV HOST=0.0.0.0
ENV PORT=${PORT}
ENV ADDRESS_HEADER=X-Forwarded-For
ENV XFF_DEPTH=1
EXPOSE $PORT

USER sveltekit
CMD ["npx","-y","@dotenvx/dotenvx","run","--","node","build"]
