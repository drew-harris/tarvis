FROM oven/bun:1.2.2 as base

WORKDIR /app

COPY ./package.json ./
COPY bun.lock ./

RUN bun install --frozen-lockfile

COPY . .
USER bun
EXPOSE 3000/tcp
WORKDIR /app
ENTRYPOINT [ "bun", "dev"]
