# ─── builder ───────────────────────────────────────────────────────────────────
FROM node:24-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src/ ./src/

RUN npm run build

# ─── runtime ───────────────────────────────────────────────────────────────────
FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Usuario nao-root ja existente na imagem oficial (uid 1000).
USER node

# MCP usa transporte stdio — o forge.yaml declara deploy.kind: stdio.
# Este container e executado por um cliente MCP (Claude Desktop, Cursor).
# NAO adicione EXPOSE nem HEALTHCHECK HTTP aqui: nao ha porta para sondar, e um
# HEALTHCHECK que escreva em stdout corromperia o proprio protocolo.
CMD ["node", "dist/index.js"]
