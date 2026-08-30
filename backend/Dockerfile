# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000

RUN addgroup -g 1001 -S nodejs && adduser -S express -u 1001

COPY --from=deps --chown=express:nodejs /app/node_modules ./node_modules
COPY --chown=express:nodejs . .

USER express
EXPOSE 4000

CMD ["node", "main.js"]
