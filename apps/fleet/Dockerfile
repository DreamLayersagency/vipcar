FROM node:22-alpine AS build
RUN apk add --no-cache openssl libc6-compat
WORKDIR /repo

COPY package.json package-lock.json ./
COPY libs/contracts/package.json libs/contracts/package.json
COPY apps/identity/package.json apps/identity/package.json
COPY apps/catalog/package.json apps/catalog/package.json
COPY apps/cms/package.json apps/cms/package.json
COPY apps/booking/package.json apps/booking/package.json
COPY apps/notify/package.json apps/notify/package.json
COPY apps/fleet/package.json apps/fleet/package.json
COPY apps/billing/package.json apps/billing/package.json
COPY apps/dispatch/package.json apps/dispatch/package.json
COPY apps/gateway/package.json apps/gateway/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm install

COPY libs/contracts libs/contracts
COPY apps/fleet apps/fleet

RUN npm run build -w @vipcar/contracts
RUN npm run build -w @vipcar/fleet

FROM node:22-alpine
RUN apk add --no-cache openssl libc6-compat
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo /repo
WORKDIR /repo/apps/fleet
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
