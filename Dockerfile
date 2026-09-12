# syntax=docker/dockerfile:1
#
# One image, two Railway services, distinguished only by PROCESS_ROLE.
# TZ stays UTC on purpose: every cron passes { timezone: 'Asia/Karachi' }
# explicitly, so a differently-configured host can never move anyone's 9 AM.

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app
ENV TZ=UTC

# ---------------------------------------------------------------- dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json      apps/web/
COPY apps/worker/package.json   apps/worker/
COPY packages/core/package.json packages/core/
COPY packages/contracts/package.json packages/contracts/
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------- build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules      ./apps/web/node_modules
COPY --from=deps /app/apps/worker/node_modules   ./apps/worker/node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY . .

# NEXT_PUBLIC_* are inlined at build time, so they must be present here.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN pnpm build

# -------------------------------------------------------------------- runtime
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["node", "server.js"]
