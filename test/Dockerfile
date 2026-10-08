FROM node:24-alpine
WORKDIR /srv
COPY package.json package-lock.json ./
COPY api/package.json api/package.json
COPY app/package.json app/package.json
COPY workers/package.json workers/package.json
COPY shared/package.json shared/package.json
RUN npm ci --omit=dev --workspace=api --workspace=workers --workspace=shared
COPY api api
COPY shared shared
COPY workers workers
COPY test test
USER node
CMD ["npm", "run", "test:integration"]
