FROM node:20-slim

# Instala smbclient (e opcionalmente ghostscript futuramente)
RUN apt-get update && apt-get install -y --no-install-recommends \
      smbclient \
    && rm -rf /var/lib/apt/lists/*

# App
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# Build (se usar TS; se JS, remova)
# RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Se usar TS compilado: node dist/main.js
CMD ["node", "dist/main.js"]
