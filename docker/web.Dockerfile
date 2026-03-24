FROM node:20-alpine

RUN corepack enable

WORKDIR /workspace

COPY . .

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @homemall/shared build \
  && pnpm --filter @homemall/web build

EXPOSE 3000

CMD ["pnpm", "--filter", "@homemall/web", "start"]
