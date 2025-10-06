FROM node:20-slim

# Instala smbclient (impressão básica) e samba-common-bin (rpcclient para gerenciamento avançado)
RUN apt-get update && apt-get install -y --no-install-recommends \
      smbclient \
      samba-common-bin \
    && rm -rf /var/lib/apt/lists/*

# Verifica instalação (opcional, pode comentar para build mais rápido)
RUN smbclient --version && rpcclient --version

# App
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# Build (se usar TS; se JS, remova)
# RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/main.js"]
