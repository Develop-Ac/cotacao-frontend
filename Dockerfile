# ---------------------------
# 1) Dependências
# ---------------------------
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Evita prompts e reduz ruído
ENV CI=true \
    npm_config_audit=false \
    npm_config_fund=false

# Copia apenas manifestos para travar cache de dependências
COPY package.json package-lock.json* ./

# Se você usa 'yarn.lock' ou 'pnpm-lock.yaml', remova-os do repo
# OU troque a linha abaixo pela ferramenta correspondente (yarn/pnpm).
# 'legacy-peer-deps' evita o ERESOLVE em cenários de peer deps conflitantes
RUN npm ci --legacy-peer-deps --loglevel=error

# ---------------------------
# 2) Build
# ---------------------------
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV CI=true \
    NEXT_TELEMETRY_DISABLED=1

# Em Debian/Bookworm não precisa de 'libc6-compat' (problemas do Sharp são raros aqui).
# Mas se você usa 'sharp', deixe comentado para Alpine ou libvips:
# RUN apt-get update && apt-get install -y --no-install-recommends libvips && rm -rf /var/lib/apt/lists/*

# Copia node_modules do estágio de deps
COPY --from=deps /app/node_modules ./node_modules
# Copia o resto do código
COPY . .

# Garante que os binários do node_modules entrem no PATH (sem NIXPACKS_PATH)
ENV PATH="/app/node_modules/.bin:${PATH}"

# Build do Next
RUN npm run build

# ---------------------------
# 3) Runtime
# ---------------------------
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Copia os artefatos de build e static
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js

# Instala apenas deps de runtime
COPY --from=deps /app/node_modules ./node_modules
# Remove devDeps se necessário (se seu projeto instala devDeps por padrão)
RUN npm prune --omit=dev --loglevel=error

EXPOSE 3000
# Use o bin do Next do node_modules (sem depender de PATH externo)
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]
