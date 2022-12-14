FROM node:alpine
RUN apk update && apk add fontconfig
RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY pnpm-lock.yaml ./
RUN pnpm fetch

ADD  . ./

RUN pnpm --filter og install -r --offline
RUN pnpm --filter og run -r build 
RUN mv apps/og/src/assets apps/og/dist/assets
RUN mv apps/og/src/fonts apps/og/dist/fonts

CMD [ "node", "apps/og/dist/index.js" ]