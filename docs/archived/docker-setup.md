# Docker Setup com rpcclient

Guia para configuração e testes do ambiente Docker com suporte a operações avançadas via `rpcclient`.

## 📦 O que está incluído

**Ferramentas instaladas:**
- ✅ `smbclient` - Impressão básica e listagem
- ✅ `rpcclient` - Gerenciamento avançado de impressoras
- ✅ Node.js 20 (slim)

---

## 🚀 Quick Start

### 1. Build e Inicialização

```bash
# Build da imagem
docker-compose build

# Inicia container
docker-compose up -d

# Verifica logs
docker-compose logs -f
```

### 2. Verificação

```bash
# Testa rpcclient
docker exec printers-api rpcclient --version

# Testa smbclient  
docker exec printers-api smbclient --version
```

**Saída esperada:** `Version 4.17.12-Debian`

---

## 🧪 Testes

### Script Automatizado

```bash
chmod +x test-rpcclient-docker.sh
./test-rpcclient-docker.sh
```

### Testes Manuais

```bash
# Listar impressoras
docker exec printers-api rpcclient -U "usuario%senha" "//servidor" -c "enumprinters"

# Status de impressora
docker exec printers-api rpcclient -U "usuario%senha" "//servidor" -c 'getprinter "HP LaserJet"'

# Fila de impressão
docker exec printers-api rpcclient -U "usuario%senha" "//servidor" -c 'enumjobs "HP LaserJet"'
```

---

## ⚙️ Configuração

### Arquivo .env

```env
PORT=3000
SMB_HOST=servidor.dominio.local
SMB_USER=usuario
SMB_PASS=senha
SMB_DOMAIN=DOMINIO
```

### Usar variáveis nos testes

```bash
export $(cat .env | xargs)
docker exec printers-api rpcclient -U "$SMB_USER%$SMB_PASS" "//$SMB_HOST" -c "enumprinters"
```

---

## 🐛 Troubleshooting

### Container não inicia

```bash
# Ver logs
docker-compose logs

# Rebuild
docker-compose build --no-cache
```

### rpcclient não encontrado

```bash
# Verifica instalação
docker exec -it printers-api bash
dpkg -l | grep samba-common-bin
```

### Erros de Conexão

**NT_STATUS_LOGON_FAILURE:**
- Verifique credenciais no `.env`

**NT_STATUS_IO_TIMEOUT:**
- Servidor inacessível
- Verifique firewall/rede

**NT_STATUS_ACCESS_DENIED:**
- Usuário precisa permissões de "Print Operators"

---

## 📊 Comandos rpcclient Úteis

```bash
# Listagem
rpcclient ... -c "enumprinters"
rpcclient ... -c 'getprinter "Nome"'
rpcclient ... -c 'enumjobs "Nome"'

# Gerenciamento
rpcclient ... -c 'setprinter "Nome" 1'  # Pausar
rpcclient ... -c 'setprinter "Nome" 2'  # Retomar
rpcclient ... -c 'setjob "Nome" 123 4'  # Cancelar job
```

---

## 🔧 Estrutura do Dockerfile

```dockerfile
FROM node:20-slim

# Instala Samba tools
RUN apt-get update && apt-get install -y \
    smbclient samba-common-bin \
    && rm -rf /var/lib/apt/lists/*

# Verifica instalação
RUN smbclient --version && rpcclient --version

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/src/main.js"]
```
