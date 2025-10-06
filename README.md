# API NestJS - Sistema de Impressoras SMB

API REST profissional para gerenciamento e impressão em impressoras de rede via protocolo SMB, com suporte a operações avançadas via `rpcclient`.

## 🚀 Características

### Operações Básicas
- ✅ Descoberta automática de impressoras SMB
- ✅ Impressão de PDFs via smbclient
- ✅ Sistema de cache distribuído com Redis (5 min TTL)
- ✅ IDs únicos e determinísticos (SHA256)
- ✅ Cache compartilhado entre múltiplas instâncias

### Operações Avançadas (rpcclient)
- ✅ Verificação de status de impressoras
- ✅ Listagem de jobs na fila
- ✅ Cancelamento de jobs específicos
- ✅ Pausar/retomar jobs e impressoras
- ✅ Limpeza completa de filas

### Infraestrutura
- ✅ Cache distribuído com Redis
- ✅ Consumer Kafka para impressões assíncronas (modo híbrido)
- ✅ Rate limiting (50 req/min)
- ✅ Logs de requisições e cache
- ✅ Arquitetura SOLID com interfaces
- ✅ Suporte completo a Docker + Docker Compose
- ✅ Múltiplos adapters (SMB, IPP, LPD, Mock)
- ✅ Persistência de cache com volume Docker

## 📋 Pré-requisitos

- Node.js >= 18
- Docker (recomendado) ou:
  - `smbclient` para operações básicas
  - `samba-common-bin` (rpcclient) para operações avançadas
- Acesso a servidor SMB com impressoras compartilhadas

### Instalação Manual (sem Docker)

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install smbclient samba-common-bin
```

**macOS:**
```bash
brew install samba
```

## 🔧 Instalação

```bash
# Clone o repositório
git clone https://github.com/yuri-baptista-meta/api-nestjs-impressoras.git
cd api-nestjs-impressoras

# Instale dependências
npm install

# Configure variáveis de ambiente
cp copy\ env .env
# Edite .env com suas credenciais SMB
```

## ⚙️ Configuração

Crie o arquivo `.env` na raiz do projeto:

```env
# Configurações da API
PORT=3000

# Credenciais do servidor SMB
SMB_HOST=servidor.dominio.local
SMB_USER=usuario
SMB_PASS=senha
SMB_DOMAIN=DOMINIO

# Configurações do Redis (Docker)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# Configurações do Kafka (Opcional - para modo consumer)
KAFKA_BROKERS=kafka:9092
KAFKA_CLIENT_ID=printers-api
KAFKA_GROUP_ID=printers-consumer-group
KAFKA_TOPIC=print-jobs
```

**Notas:** 
- Para ambientes Docker, use `redis` e `kafka` (nomes dos serviços)
- Para execução local, use `localhost:6379` e `localhost:9092`
- **Kafka é opcional** - se não configurado, API funciona apenas com HTTP REST

## 🏃 Executando

### Docker (Recomendado)
```bash
# Inicia API + Redis + Kafka
docker-compose up -d

# Verifica status
docker ps

# Ver logs
docker logs printers-api -f
docker logs printers-redis -f
docker logs kafka -f
```

**Serviços inclusos:**
- `printers-api` - API NestJS (porta 3000)
- `printers-redis` - Redis 7 Alpine (porta 6379)
- `kafka` - Kafka 3.x em modo KRaft (porta 9092)
- Volumes persistentes para cache e mensagens

### Desenvolvimento
```bash
npm install
npm run dev
```

### Produção
```bash
npm run build
npm run prod
```

## 📚 API Endpoints

### Operações Básicas

#### `GET /printers`
Lista todas as impressoras disponíveis.

**Query params:**
- `refresh=true` - Força atualização do cache

**Resposta:**
```json
[
  {
    "id": "a1b2c3d4e5f6g7h8",
    "name": "HP LaserJet 9020",
    "uri": "smb://servidor/HP%20LaserJet%209020",
    "cachedAt": "2025-10-06T14:30:00.000Z"
  }
]
```

#### `POST /printers/print`
Envia um PDF para impressão.

**Body:**
```json
{
  "printerId": "a1b2c3d4e5f6g7h8",
  "fileBase64": "JVBERi0xLjQK..."
}
```

**Resposta:**
```json
{
    "jobId": "job-uuid-12345"
}
```

### Operações Avançadas (Gerenciamento)

> **📍 Nota:** As rotas de gerenciamento usam o prefixo `/printers/management/`

#### `GET /printers/management/:id/status`
Verifica status de uma impressora.

**Resposta:**
```json
{
  "name": "HP LaserJet 9020",
  "status": "ONLINE",
  "jobsInQueue": 3,
  "statusMessage": null
}
```

#### `GET /printers/management/:id/queue`
Lista jobs na fila de impressão.

**Resposta:**
```json
[
  {
    "jobId": 123,
    "printerName": "HP LaserJet 9020",
    "userName": "joao.silva",
    "documentName": "documento.pdf",
    "totalPages": 5,
    "pagesPrinted": 2,
    "size": 204800,
    "status": "PRINTING",
    "submittedTime": "2025-10-06T14:25:00.000Z"
  }
]
```

#### `DELETE /printers/management/:id/queue/:jobId`
Cancela um job específico.

#### `DELETE /printers/management/:id/queue`
Limpa toda a fila de uma impressora.

#### `POST /printers/management/:id/pause`
Pausa a impressora (todos os jobs).

#### `POST /printers/management/:id/resume`
Retoma uma impressora pausada.

#### `POST /printers/management/:id/queue/:jobId/pause`
Pausa um job específico.

#### `POST /printers/management/:id/queue/:jobId/resume`
Retoma um job pausado.

---

## 🚀 Sistema de Cache Redis

### Visão Geral

A API utiliza **Redis** como cache distribuído para armazenar a lista de impressoras, melhorando significativamente a performance e permitindo escalabilidade horizontal.

### Performance

| Cenário | Sem Cache | Com Redis | Ganho |
|---------|-----------|-----------|-------|
| 1ª chamada | 1.704s | 1.704s | - |
| Chamadas subsequentes | 1.704s | 0.247s | **85.5%** |

### Características

- ✅ **TTL Automático:** Cache expira em 5 minutos (300s)
- ✅ **Cache Compartilhado:** Múltiplas instâncias da API usam o mesmo cache
- ✅ **Persistência:** Dados sobrevivem a restart da API
- ✅ **Refresh Manual:** Use `?refresh=true` para forçar atualização
- ✅ **Observabilidade:** Logs detalhados de Cache HIT/MISS

### Endpoints de Cache

```bash
# Listar impressoras (usa cache se disponível)
GET /printers

# Forçar atualização do cache
GET /printers?refresh=true

# Verificar status do cache
GET /printers/cache-info
```

**Exemplo de resposta do `/cache-info`:**
```json
{
  "exists": true,
  "ttl": 245
}
```

### Inspecionando o Cache

```bash
# Conectar ao Redis
docker exec -it printers-redis redis-cli

# Listar chaves
KEYS *

# Ver conteúdo
GET printers:list

# Verificar TTL
TTL printers:list
```

### Documentação Completa

Para detalhes sobre arquitetura, troubleshooting e operações avançadas, consulte:
📖 **[Sistema de Cache - Documentação Completa](./docs/cache-system.md)**

---

## 📨 Consumer Kafka (Modo Híbrido)

### Visão Geral

A API funciona em **modo híbrido**: aceita requisições de impressão via **HTTP REST** e **Kafka** simultaneamente.

### Características

- ✅ **Assíncrono**: Impressões via Kafka não bloqueiam o producer
- ✅ **Escalável**: Múltiplas instâncias consomem do mesmo tópico
- ✅ **Resiliente**: Mensagens persistem se a API cair
- ✅ **Mesma lógica**: HTTP e Kafka usam o mesmo `PrintersService`

### Como Funciona

```
Producer (Sistema Externo)
    ↓
Kafka (tópico: print-jobs)
    ↓
API Consumer (automático)
    ↓
PrintersService.print()
    ↓
Impressora
```

### Formato da Mensagem

Envie mensagens JSON para o tópico `print-jobs`:

```json
{
  "printerId": "d64a128a9eab1907",
  "fileBase64": "JVBERi0xLjQK..."
}
```

### Teste Rápido

```bash
# 1. Entrar no container Kafka
docker exec -it kafka bash

# 2. Produzir mensagem
kafka-console-producer --topic print-jobs --bootstrap-server localhost:9092

# 3. Cole o JSON (substitua com IDs reais):
{"value": {"printerId": "d64a128a9eab1907", "fileBase64": "JVBERi0..."}}

# 4. Ver logs da API
docker logs printers-api -f
```

**Você verá:**
```
[KafkaConsumerController] 📨 Mensagem Kafka recebida - printerId: d64a128a...
[PrintersService] ❌ Cache MISS - Buscando impressoras do servidor SMB
[KafkaConsumerController] ✅ Impressão enviada via Kafka - jobId: xxx (1234ms)
```

### Desabilitar Kafka

Para rodar apenas com HTTP REST (sem Kafka):

1. Remova ou comente `KAFKA_BROKERS` no `.env`
2. Reinicie a aplicação

A API detecta automaticamente e inicia apenas com HTTP.

### Documentação Completa

📖 **[Como Testar Kafka](./docs/KAFKA-TESTING.md)** - Guia completo de testes
📖 **[Integração Kafka](./docs/INTEGRACAO-KAFKA.md)** - Arquitetura e decisões

---

## 📚 Documentação Adicional

- **[Sistema de Cache](./docs/cache-system.md)** - Funcionamento do cache e IDs únicos
- **[Operações Avançadas](./docs/printer-management.md)** - Gerenciamento de filas com rpcclient
- **[Padrões de Projeto](./docs/design-patterns.md)** - Arquitetura SOLID e interfaces
- **[Adapters e Interfaces](./docs/interface-improvements.md)** - Type-safety e implementações
- **[Setup Docker](./docs/docker-setup.md)** - Configuração e testes com Docker
- **[Testes de API](./docs/api-testing.md)** - Exemplos com cURL e clientes



## 🧪 Testes Rápidos

```bash
# Health check
curl http://localhost:3000/

# Listar impressoras
curl http://localhost:3000/printers | jq '.'

# Status de uma impressora (após obter ID)
curl http://localhost:3000/printers/management/{printerId}/status | jq '.'

# Fila de impressão
curl http://localhost:3000/printers/management/{printerId}/queue | jq '.'
```

Para exemplos completos, veja [docs/api-testing.md](./docs/api-testing.md).

## 🏗️ Arquitetura

```
src/
├── adapters/
│   ├── smbclient.adapter.ts         # Implementação SMB básica
│   ├── smb-advanced.adapter.ts      # Implementação SMB avançada (rpcclient)
│   └── alternative-adapters.ts      # IPP, LPD, Mock
├── domain/
│   ├── printer-adapter.interface.ts # Contrato de adapters (SOLID)
│   └── print.types.ts               # Tipos de domínio
├── printers/
│   ├── printers.controller.ts       # Rotas básicas
│   ├── printers.service.ts          # Lógica + cache
│   ├── printers.module.ts           # DI e configuração
│   ├── printers-management.controller.ts  # Rotas avançadas
│   └── printers-management.service.ts     # Gerenciamento avançado
└── interceptors/
    └── log.interceptor.ts           # Logging de requisições
```

**Padrões aplicados:**
- Adapter Pattern (múltiplos protocolos)
- Dependency Injection (NestJS)
- SOLID Principles (DIP, OCP, LSP)
- Read-through Cache Pattern

## �️ Tecnologias

- **NestJS 10** - Framework Node.js com TypeScript
- **smbclient** - Cliente SMB para impressão básica
- **rpcclient** - Cliente RPC para gerenciamento avançado
- **RxJS** - Programação reativa
- **Docker** - Containerização

## 🔐 Segurança

- ✅ Rate limiting (50 req/min via @nestjs/throttler)
- ✅ CORS habilitado
- ✅ Validação de IDs antes de operações
- ✅ Credenciais via variáveis de ambiente
- ⚠️ Não commitar arquivo `.env`

## 📝 Scripts Disponíveis

```bash
npm run dev        # Desenvolvimento com watch mode
npm run build      # Build para produção
npm run prod       # Executa versão de produção
npm run lint       # Linter ESLint
npm run format     # Formata código com Prettier
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📄 Licença

UNLICENSED - Uso privado

## 👤 Autor

**yuri-baptista-meta**
- GitHub: [@yuri-baptista-meta](https://github.com/yuri-baptista-meta)
- Repositório: [api-nestjs-impressoras](https://github.com/yuri-baptista-meta/api-nestjs-impressoras)
