FROM node:20-alpine

RUN apk add --no-cache openssl

RUN corepack enable

WORKDIR /workspace

COPY . .

RUN pnpm install --frozen-lockfile

ENV NODE_OPTIONS="--max-old-space-size=1536"

RUN pnpm --filter @homemall/shared build \
  && pnpm --filter @homemall/web build

EXPOSE 3000

CMD ["pnpm", "--filter", "@homemall/web", "start"]
