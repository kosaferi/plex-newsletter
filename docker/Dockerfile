FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Health check
HEALTHCHECK --interval=60s --timeout=10s --start-period=5s \
  CMD node -e "require('./config')" || exit 1

CMD ["node", "src/index.js"]
