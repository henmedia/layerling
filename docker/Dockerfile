# syntax=docker/dockerfile:1

# The Alpine release of the final image. The Node binary comes from the official node image built on the same
# release, so it finds the musl and libstdc++ it was linked against.
ARG ALPINE_VERSION=3.24

FROM node:24-bookworm-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV LAYERLING_STANDALONE=true
RUN npm run build

# Only what the running server needs: the traced server and the browser files. The webpack cache (about 300 MB)
# stays behind because the standalone output leaves it out. Taken out of what the tracer picked up: sharp, which
# only serves Next's image optimizer (off in next.config.ts) and is built for glibc while the runner uses musl;
# typescript and the source folder, which only the build reads; and the bundler's copy of the CAD kernel, since
# every loader asks for /occt/<version>/ instead (scripts/generate-service-worker.mjs skips it for that reason).
RUN mkdir -p /runtime \
  && cp -a apps/web/.next/standalone/. /runtime/ \
  && cp -a apps/web/.next/static /runtime/apps/web/.next/static \
  && cp -a apps/web/public /runtime/apps/web/public \
  && rm -rf /runtime/node_modules/sharp /runtime/node_modules/@img \
    /runtime/node_modules/typescript /runtime/apps/web/src \
    /runtime/apps/web/.next/static/media/occt-wasm.*.wasm \
  && find /runtime/node_modules \( -name '*.map' -o -name '*.d.ts' \) -type f -delete \
  && ln -s ../../.codex /runtime/apps/web/.codex

# Node by itself, stripped, without npm, yarn or corepack: the server does not need them.
FROM node:24-alpine${ALPINE_VERSION} AS node-runtime
RUN apk add --no-cache binutils \
  && strip --strip-all /usr/local/bin/node

FROM alpine:${ALPINE_VERSION} AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

# 999:999 as before, so the folders people already gave the container keep working; Alpine's ping group had 999.
RUN apk add --no-cache libstdc++ \
  && delgroup ping \
  && addgroup -S -g 999 nodejs \
  && adduser -S -D -H -u 999 -G nodejs nextjs

COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=builder /runtime/ /app/

# The start page keeps the preview pictures of the designs here; the folder must belong to the user the
# server runs as, or every picture is refused and the cards stay on "No preview yet". The standalone server
# changes into apps/web, and the link it finds there leads back to this folder, where the volume is mounted.
RUN mkdir -p /app/.codex/project-thumbnails \
  && chown -R nextjs:nodejs /app/.codex

# Up to 1.158.0 the image was the Node image, which starts through docker-entrypoint.sh, with "npm start" as
# its command. Portainer and Synology's Container Manager keep both when they recreate a container from a
# newer image (Issue #1664), and this image has neither the script nor npm: such a container did not start.
# The script is back, under the same name, and takes "npm start" for the server; anything else runs as the
# Node image's script ran it, a first word that is an option or a script file handed to node.
COPY --chmod=755 <<'EOF' /usr/local/bin/docker-entrypoint.sh
#!/bin/sh
set -e
case "$*" in
  "npm start" | "npm run start") set -- node apps/web/server.js ;;
esac
if [ "${1#-}" != "$1" ] || [ -z "$(command -v "$1")" ] || { [ -f "$1" ] && ! [ -x "$1" ]; }; then
  set -- node "$@"
fi
exec "$@"
EOF

USER nextjs
EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "apps/web/server.js"]
