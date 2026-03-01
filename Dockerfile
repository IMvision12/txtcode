# ---- Build Stage ----
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ---- Production Stage ----
FROM node:20-slim

# Install common CLI tools that txtcode tools may invoke
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    curl \
    iputils-ping \
    dnsutils \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Signal that we're running inside Docker (used by keychain fallback)
ENV TXTCODE_DOCKER=1

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts 2>/dev/null || npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Default workspace mount point
RUN mkdir -p /workspace /root/.txtcode

WORKDIR /workspace

ENTRYPOINT ["node", "/app/dist/cli/index.js"]
