# 🖨️ API de Impressão SMB

API REST para gerenciamento e impressão em impressoras de rede via protocolo SMB.

---

## ⚡ Quick Start

```bash
# Clone e configure
git clone https://github.com/yuri-baptista-meta/api-nestjs-impressoras.git
cd api-nestjs-impressoras
cp copy\ env .env
# Edite .env com suas credenciais SMB

# Inicie com Docker
docker-compose up -d

# Teste
curl http://localhost:3000/printers
```

---

## 🚀 Funcionalidades

- ✅ **Listar impressoras** - Descoberta automática via SMB
- ✅ **Imprimir PDFs** - Via HTTP REST ou Kafka (assíncrono)
- ✅ **Gerenciar filas** - Status, cancelar, pausar/retomar
- ✅ **Cache Redis** - Cache perpétuo com stale-while-revalidate
- ✅ **Modo DRY_RUN** - Testar sem impressoras reais
- ✅ **Docker Ready** - Compose com API + Redis + Kafka

---

## 📋 Pré-requisitos

- **Docker** (recomendado) ou Node.js 18+
- **Servidor SMB** com impressoras compartilhadas
- **Credenciais** de acesso ao servidor

---

## 🔧 Configuração

Crie `.env` na raiz:

```env
# Servidor SMB
SMB_HOST=servidor.dominio.local
SMB_USER=usuario
SMB_PASS=senha
SMB_DOMAIN=DOMINIO

# Redis & Kafka (nomes dos serviços Docker)
REDIS_HOST=redis
KAFKA_BROKERS=kafka:9092

# Opcional: modo de teste
DRY_RUN=true
```

---

## 🏃 Executar

### Docker (Recomendado)
```bash
docker-compose up -d
```

### Desenvolvimento
```bash
npm install
npm run dev
```

---

## 📡 API Endpoints

### Básicos
- `GET /printers` - Lista impressoras (com cache)
- `POST /printers/print` - Imprime PDF (base64)

### Gerenciamento Avançado
- `GET /printers/management/:id/status` - Status da impressora
- `GET /printers/management/:id/queue` - Fila de impressão
- `DELETE /printers/management/:id/queue/:jobId` - Cancelar job
- `POST /printers/management/:id/pause` - Pausar impressora

**Exemplo:**
```bash
# Listar impressoras
curl http://localhost:3000/printers

# Imprimir
curl -X POST http://localhost:3000/printers/print \
  -H "Content-Type: application/json" \
  -d '{"printerId":"abc123","fileBase64":"JVBERi0..."}'
```

---

## 📚 Documentação Completa

Toda a documentação detalhada está em **[`/docs`](./docs/README.md)**:

- **[API-ENDPOINTS.md](./docs/API-ENDPOINTS.md)** - Todos os endpoints HTTP com exemplos
- **[KAFKA-INTEGRATION.md](./docs/KAFKA-INTEGRATION.md)** - Impressão assíncrona via Kafka
- **[REDIS-CACHE.md](./docs/REDIS-CACHE.md)** - Sistema de cache perpétuo (com diagramas)
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Padrões de projeto e estrutura
- **[TESTING.md](./docs/TESTING.md)** - Testes e modo DRY_RUN

---

## 🏗️ Arquitetura

```
src/
├── adapters/           # Implementações de protocolos (SMB, IPP, Mock)
├── domain/             # Interfaces e tipos de negócio
├── printers/           # Controllers e Services
├── redis/              # Módulo de cache
├── kafka/              # Consumer de mensagens
└── interceptors/       # Logs e middleware
```

**Padrões aplicados:** Adapter, Dependency Injection, SOLID, Stale-While-Revalidate

📖 **Detalhes:** [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## 🛠️ Stack

- **NestJS 10** - Framework TypeScript
- **Redis 7** - Cache perpétuo
- **Kafka 3.7** - Mensageria assíncrona (KRaft mode)
- **Docker** - Containerização

---

## 📝 Scripts

```bash
npm run dev        # Desenvolvimento com watch
npm run build      # Build produção
npm run prod       # Executar produção
npm test           # Testes unitários
```

---

## 🤝 Contribuir

1. Fork o projeto
2. Crie branch: `git checkout -b feature/nova`
3. Commit: `git commit -m 'Add feature'`
4. Push: `git push origin feature/nova`
5. Abra Pull Request

---

## 📄 Licença

UNLICENSED - Uso privado

---

## 👤 Autor

**yuri-baptista-meta**  
GitHub: [@yuri-baptista-meta](https://github.com/yuri-baptista-meta)
