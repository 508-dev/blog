FROM node:24-bookworm-slim AS build

WORKDIR /app/prototype
ENV DATABASE_PATH=/data/data.db MEDIA_DIRECTORY=/data/uploads
RUN corepack enable
COPY prototype/package.json prototype/pnpm-lock.yaml prototype/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY prototype/ ./
COPY static/ ./public/
RUN pnpm build

FROM node:24-bookworm-slim
WORKDIR /app/prototype
# Coolify's HTTP health check runs curl or wget inside the container.
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321 \
    DATABASE_PATH=/data/data.db MEDIA_DIRECTORY=/data/uploads
COPY --from=build /app/prototype/dist ./dist
COPY --from=build /app/prototype/node_modules ./node_modules
COPY --from=build /app/prototype/package.json ./package.json
COPY --from=build /app/prototype/seed ./seed
COPY --from=build /app/prototype/scripts ./scripts
COPY prototype/docker-entrypoint.sh ./docker-entrypoint.sh
EXPOSE 4321
CMD ["sh", "docker-entrypoint.sh"]
