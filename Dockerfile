FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* prisma.config.ts ./
RUN npm ci --legacy-peer-deps
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build
RUN npx tsc prisma/seed.ts --outDir dist/prisma --skipLibCheck --target ES2022 --module CommonJS

FROM node:20-alpine AS runtime
RUN apk add --no-cache ffmpeg dumb-init \
    && addgroup -S appgroup \
    && adduser -S appuser -G appgroup \
    && mkdir -p /app/storage/uploads /app/storage/thumbs \
    && chown -R appuser:appgroup /app
WORKDIR /app
ENV NODE_ENV=production
COPY --chown=appuser:appgroup package.json package-lock.json* prisma.config.ts ./
COPY --chown=appuser:appgroup prisma ./prisma
COPY --chown=appuser:appgroup --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev --legacy-peer-deps
COPY --chown=appuser:appgroup --from=builder /app/dist ./dist
USER appuser
EXPOSE 3568
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]