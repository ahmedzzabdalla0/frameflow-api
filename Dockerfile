FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
RUN apk add --no-cache ffmpeg dumb-init \
    && addgroup -S appgroup \
    && adduser -S appuser -G appgroup
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/storage/uploads /app/storage/thumbs \
    && chown -R appuser:appgroup /app
USER appuser
EXPOSE 3568
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
