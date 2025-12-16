# syntax=docker/dockerfile:1

FROM node:20-alpine as builder
# EXPOSE 5000
# ENV NODE_ENV=production

WORKDIR /app
COPY ["package.json", "package-lock.json", "./"]
COPY ["scripts/", "scripts/"]
COPY ["templates/", "templates/"]
RUN npm ci
# --omit=dev
COPY . .
RUN npm run keys:generate
RUN npm run build

FROM node:20-alpine as runner-env
WORKDIR /app
COPY --from=builder ["/app/package.json", "/app/package-lock.json", "./"]
RUN npm ci --omit=dev

FROM gcr.io/distroless/nodejs20-debian12 as runner
EXPOSE 5000

COPY --from=busybox:1.35.0-uclibc /bin/sh /bin/sh
COPY --from=runner-env /app /app
COPY --from=builder ["app/private.jwk", "app/public.jwk", "app/"]
COPY --from=builder ["app/templates/", "app/dist/templates"]
COPY --from=builder ["app/dist", "app/dist"]

WORKDIR /app
CMD ["dist/app.js"]
