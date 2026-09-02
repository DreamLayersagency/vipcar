FROM node:22-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY libs/contracts/package.json libs/contracts/package.json
COPY apps/identity/package.json apps/identity/package.json
COPY apps/gateway/package.json apps/gateway/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm install

COPY libs/contracts libs/contracts
COPY apps/gateway apps/gateway

RUN npm run build -w @vipcar/contracts
RUN npm run build -w @vipcar/gateway

FROM node:22-alpine
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo /repo
WORKDIR /repo/apps/gateway
CMD ["node", "dist/main.js"]
