# Build stage
FROM node:20 AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Runtime stage
FROM node:20-slim
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY public/ ./public/
COPY sql/ ./sql/

RUN mkdir -p /app/uploads/pending && chown -R node:node /app/uploads

USER node
EXPOSE 8080
CMD ["node", "dist/index.js"]
