FROM node:alpine
RUN apk update && apk add fontconfig

WORKDIR /usr/src/app
COPY package.json .
RUN npm install

COPY . .
RUN npm start