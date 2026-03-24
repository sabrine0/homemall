FROM node:20-alpine

RUN apk add --no-cache openssl

RUN corepack enable

WORKDIR /workspace

COPY . .

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @homemall/shared build \
  && pnpm --filter @homemall/scoring build \
  && pnpm --filter @homemall/api prisma:generate \
  && pnpm --filter @homemall/api build

EXPOSE 4000

CMD ["pnpm", "--filter", "@homemall/api", "start"]
