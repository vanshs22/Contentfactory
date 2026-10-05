FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg chromium fonts-liberation ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3100
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY hyperframes ./hyperframes
COPY n8n ./n8n
RUN mkdir -p /app/storage && chown -R node:node /app
USER node
EXPOSE 3100
CMD ["node", "dist/index.js"]
