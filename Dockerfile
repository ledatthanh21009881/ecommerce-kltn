# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm ci --legacy-peer-deps

COPY . .

# Build-time env (Compose truyền từ .env qua build.args → bake vào Next.js bundle)
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_BACKEND_URL_VPS
ARG NEXT_PUBLIC_WEBSOCKET_URL
ARG NEXT_PUBLIC_WEBSOCKET_PORT
ARG NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL_VPS=$NEXT_PUBLIC_BACKEND_URL_VPS
ENV NEXT_PUBLIC_WEBSOCKET_URL=$NEXT_PUBLIC_WEBSOCKET_URL
ENV NEXT_PUBLIC_WEBSOCKET_PORT=$NEXT_PUBLIC_WEBSOCKET_PORT
ENV NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=$NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# Stage 2: Run
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Runtime: BACKEND_URL, WEBSOCKET_URL, ... được inject qua docker-compose env_file: .env
CMD ["node", "server.js"]
