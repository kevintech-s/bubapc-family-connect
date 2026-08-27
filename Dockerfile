# BUBAPC Family Connect - Production Docker image
# Serves both the API (Express) and the built web frontend from one container.

# ---------- Stage 1: Build the web client ----------
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci || npm install
COPY client/ .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---------- Stage 2: Build the API server ----------
FROM node:20-alpine AS server-build
WORKDIR /app/server
# Install build tools required by sharp's native bindings
RUN apk add --no-cache python3 make g++ libc6-compat
COPY server/package.json server/package-lock.json* ./
RUN npm ci || npm install
COPY server/ .
RUN npm run build

# ---------- Stage 3: Runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Prune server deps to production only, keep sharp native build
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/package.json ./server/package.json
# Frontend build output
COPY --from=client-build /app/client/dist ./client/dist

# uploads must live at /app/uploads (resolved via ../../ from dist/)
COPY server/uploads ./uploads
RUN mkdir -p ./uploads && chmod -R 777 ./uploads

WORKDIR /app/server
EXPOSE 5000
CMD ["node", "dist/index.js"]
