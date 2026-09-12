# Build from the MONOREPO ROOT so the pnpm lockfile/workspace resolve:
#   docker build -f services/graph-engine/Dockerfile -t graph-engine .
# Coolify: Build Pack = Dockerfile, Base Directory = /, Dockerfile Location = /services/graph-engine/Dockerfile
FROM node:24-alpine AS build
RUN npm i -g pnpm@10
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY services/graph-engine/package.json services/graph-engine/
RUN pnpm install --frozen-lockfile --filter graph-engine...
COPY services/graph-engine services/graph-engine
RUN pnpm --filter graph-engine build \
 && pnpm --filter graph-engine --prod deploy --legacy /out

FROM node:24-alpine
ENV NODE_ENV=production PORT=3401
WORKDIR /app
COPY --from=build /out /app
USER node
EXPOSE 3401
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3401/health || exit 1
CMD ["node", "dist/index.js"]
