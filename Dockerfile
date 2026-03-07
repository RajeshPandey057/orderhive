#syntax=docker/dockerfile:1.4
FROM node:20-alpine AS base
ARG DOTENV_PRIVATE_KEY_CI=privatekey
ENV DOTENV_PRIVATE_KEY_CI=${DOTENV_PRIVATE_KEY_CI}
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
# chromium + deps are installed for puppeteer PDF generation (avoids downloading bundled Chromium)
RUN apk add --no-cache libc6-compat chromium nss freetype harfbuzz ca-certificates ttf-freefont
# Use the system Chromium instead of puppeteer's auto-downloaded binary
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
# enable corepack for pnpm
RUN npm install -g corepack@latest && corepack enable && corepack prepare pnpm@latest --activate

COPY . /app
WORKDIR /app

# First install the dependencies (as they change less often)
FROM base AS prod-deps
ENV CI=true
ENV NODE_BUILD=true
# mount pnpm store as cache & fetch dependencies
RUN pnpm install --prod --frozen-lockfile


FROM base AS build
ENV CI=true
ENV NODE_BUILD=true
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN pnpm install --frozen-lockfile
RUN pnpm dlx @dotenvx/dotenvx run -- pnpm run build


FROM base
# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 sveltekit
USER sveltekit
# Copying build file and JSON, see: https://kit.svelte.dev/docs/adapter-node
COPY --from=prod-deps --chown=sveltekit:nodejs /app/node_modules /app/node_modules
COPY --from=build --chown=sveltekit:nodejs /app/build /app/build
COPY --from=build --chown=sveltekit:nodejs /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build --chown=sveltekit:nodejs /app/package.json ./package.json

# For SvelteKit ENV resolution, see: https://kit.svelte.dev/docs/adapter-node
ENV NODE_ENV=production
ARG PORT=8080
ENV HOST=0.0.0.0
ENV PORT=${PORT}
ENV ADDRESS_HEADER=X-Forwarded-For
ENV XFF_DEPTH=1
EXPOSE $PORT
CMD ["pnpm","dlx","@dotenvx/dotenvx", "run", "--", "node", "build"]
