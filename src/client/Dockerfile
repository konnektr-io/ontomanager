FROM node:lts-alpine AS build-stage

WORKDIR /src
COPY package.json ./

RUN pnpm install

COPY client .

ARG GITHUB_SHA_SHORT
ENV GITHUB_SHA_SHORT=$GITHUB_SHA_SHORT

FROM nginxinc/nginx-unprivileged:alpine-slim
USER root
RUN apk upgrade --no-cache
USER nginx
COPY client/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build-stage /src/dist/pwa /usr/share/nginx/html
EXPOSE 8080
