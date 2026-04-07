FROM node:20-alpine

RUN apk add --no-cache openssl

RUN corepack enable

WORKDIR /workspace

ARG API_SERVER_URL=""
ARG NEXT_PUBLIC_API_URL=""
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=""
ARG COOKIE_NAME="homemall_token"

ENV API_SERVER_URL=${API_SERVER_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
ENV COOKIE_NAME=${COOKIE_NAME}

COPY . .

RUN pnpm install --frozen-lockfile --filter @homemall/web...

ENV NODE_OPTIONS="--max-old-space-size=1536"

RUN pnpm --filter @homemall/shared build \
  && pnpm --filter @homemall/web build

EXPOSE 3000

CMD ["pnpm", "--filter", "@homemall/web", "start"]
