FROM node:20-bookworm-slim AS base
WORKDIR /app

# ---- deps (dev) ----
FROM base AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# ---- dev ----
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
CMD ["node", "--watch", "app.js"]

# ---- deps (prod) ----
FROM base AS deps-prod
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- prod ----
FROM base AS prod
ENV NODE_ENV=production
COPY --from=deps-prod /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
