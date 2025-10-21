# -------------------------------------------------
# 1) Dependencies
# -------------------------------------------------
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Evita prompts e reduz ruído
ENV CI=true \
    npm_config_audit=false \
    npm_config_fund=false

# Copia apenas manifestos para cache eficiente
COPY package.json package-lock.json* ./

# Se houver yarn.lock ou pnpm-lock.yaml, remova do repo OU adapte os comandos
# '--legacy-peer-deps' evita ERESOLVE em peerDependencies conflitantes
RUN npm ci --legacy-peer-deps --loglevel=error


# -------------------------------------------------
# 2) Build
# -------------------------------------------------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

ENV CI=true \
    NEXT_TELEMETRY_DISABLED=1

# Copia node_modules resolvidos
COPY --from=deps /app/node_modules ./node_modules

# Copia o resto do código do app
COPY . .

# Garante binários do node_modules no PATH (sem NIXPACKS_PATH)
ENV PATH="/app/node_modules/.bin:${PATH}"

# (Opcional) Se usar sharp/libvips em Alpine; aqui (Debian) normalmente não precisa:
# RUN apt-get update && apt-get install -y --no-install-recommends libvips && rm -rf /var/lib/apt/lists/*

# Build do Next
RUN npm run build

# Junta configs do Next (se existirem) para copiar de forma opcional no runtime
RUN mkdir -p /opt/runtime && \
  for f in next.config.js next.config.mjs next.config.cjs next.config.ts; do \
    if [ -f "$f" ]; then cp "$f" /opt/runtime/; fi; \
  done


# -------------------------------------------------
# 3) Runtime
# -------------------------------------------------
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Copia artefatos necessários do build
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copia configs do Next se existirem (pasta pode estar vazia, não quebra build)
COPY --from=builder /opt/runtime/ ./

# Instala apenas deps de runtime (mantendo compatibilidade com 'next start')
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --omit=dev --loglevel=error

EXPOSE 3000
# Usa o bin do Next do node_modules, sem depender de PATH externo
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]
