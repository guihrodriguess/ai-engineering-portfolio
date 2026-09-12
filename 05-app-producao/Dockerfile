# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL não precisa apontar pro banco de verdade durante o build —
# db/client.ts inicializa a conexão de forma preguiçosa (ver comentário lá),
# só o build do Next.js precisa de um valor presente pra não quebrar.
ENV DATABASE_URL="postgres://placeholder:placeholder@localhost:5432/placeholder"
RUN npm run build

# Runtime — só o output "standalone" do Next.js (ver next.config.ts), não o
# node_modules de dev inteiro.
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
