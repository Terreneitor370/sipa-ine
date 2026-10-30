FROM node:22-bookworm-slim

WORKDIR /workspace/apps/api

COPY apps/api/package*.json ./
RUN npm ci --omit=dev

WORKDIR /workspace
COPY apps/api/src ./apps/api/src
COPY db ./db

WORKDIR /workspace/apps/api
EXPOSE 4000

CMD ["npm", "start"]
