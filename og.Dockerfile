FROM node:alpine
RUN apk update && apk add fontconfig
RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY pnpm-lock.yaml ./
RUN pnpm fetch

ADD package.json .
ADD apps/og ./apps/og

RUN pnpm install -r --offline
RUN pnpm run -r build 

CMD [ "node", "apps/og/dist/index.ts" ]