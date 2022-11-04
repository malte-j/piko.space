FROM node:16-bullseye-slim AS build
RUN npm install -g pnpm


WORKDIR /app
COPY pnpm-lock.yaml ./
RUN pnpm fetch

ADD . ./

RUN pnpm install -r --offline
RUN pnpm run -r build 


FROM gcr.io/distroless/nodejs:16
COPY --from=build /app/apps/backend/bundle.js /usr/src/app/
COPY --from=build /app/apps/frontend/dist /usr/src/app/dist/
WORKDIR /usr/src/app
CMD ["bundle.js"]
