# API de Impressoras SMB - Resumo Técnico

> Serviço REST para descoberta, impressão e gerenciamento de impressoras de rede via protocolo SMB com cache distribuído Redis.

## 🎯 O que faz

- **Descobre** impressoras compartilhadas em servidores Windows/Samba
- **Imprime** PDFs em impressoras de rede
- **Gerencia** filas de impressão (status, pausar, cancelar jobs)
- **Cacheia** lista de impressoras no Redis (cache distribuído com 5min TTL)

## 🔌 Endpoints Principais

### Operações Básicas
```
GET  /printers                        → Lista impressoras (cache Redis 5min)
GET  /printers?refresh=true           → Atualiza cache forçadamente
GET  /printers/cache-info             → Status do cache (exists, ttl)
POST /printers/print                  → Envia PDF para impressão
```

### Gerenciamento de Filas
```
GET    /printers/management/:id/status       → Status da impressora
GET    /printers/management/:id/queue        → Lista jobs na fila
DELETE /printers/management/:id/queue/:jobId → Cancela job específico
DELETE /printers/management/:id/queue        → Limpa fila completa
POST   /printers/management/:id/pause        → Pausa impressora
POST   /printers/management/:id/resume       → Retoma impressora
```

## ⚡ Como Funciona

### 1. Descoberta de Impressoras (com Cache Redis)
```
Cliente → GET /printers
          ↓
      Cache existe no Redis?
          ↓ Sim (Cache HIT ~0.25s)
      ← Retorna do Redis
      
      ↓ Não (Cache MISS ~1.7s)
      smbclient lista shares no servidor SMB
          ↓
      Gera IDs únicos (SHA256 do nome)
          ↓
      Salva no Redis (setex 300s)
          ↓
      ← Retorna [{ id, name, uri, cachedAt }]
```

**Performance:**
- Cache HIT: ~0.247s (Redis)
- Cache MISS: ~1.704s (SMB + Redis)
- Ganho: 85.5% de redução no tempo

### 2. Impressão
```
Cliente → POST /printers/print { printerId, fileBase64 }
          ↓
      Valida ID no cache
          ↓
      Decodifica base64 → arquivo temp
          ↓
      smbclient envia para share SMB
          ↓
      ← Retorna { jobId }
```

### 3. Gerenciamento
```
Cliente → GET /printers/management/:id/status
          ↓
      rpcclient consulta servidor SMB
          ↓
      Parse do output (getprinter/enumjobs)
          ↓
      ← Retorna { status, jobsInQueue, ... }
```

## 🏗️ Arquitetura

```
PrintersController              → Operações básicas (listar, imprimir)
PrintersManagementController    → Gerenciamento avançado (filas, status)
                ↓
PrintersService                 → Lógica básica + integração com Redis
PrintersManagementService       → Lógica de gerenciamento
                ↓
        IPrinterAdapter         → Interface (contrato)
                ↓
    SmbAdvancedAdapter          → Implementação (smbclient + rpcclient)
                
Redis (Container Docker)        → Cache distribuído persistente
```

**Padrões:** Adapter Pattern + Dependency Injection + Read-through Cache + Distributed Caching

### Infraestrutura

```
┌─────────────────┐
│  printers-api   │────┐
│   (NestJS)      │    │
└─────────────────┘    │
                       │  printers-network
┌─────────────────┐    │  (Docker bridge)
│  printers-redis │────┘
│   (Redis 7)     │
└─────────────────┘
        │
        └──> redis-data (volume persistente)
```

## 📦 Dependências Externas

### Sistema Operacional
- **smbclient** - Impressão e listagem de shares SMB
- **rpcclient** - Operações avançadas (status, filas, controle)

### Infraestrutura
- **Servidor SMB** - Windows Server ou Samba com impressoras compartilhadas
- **Redis 7** - Cache distribuído (incluído no docker-compose.yml)

## ⚙️ Configuração Necessária

```env
# Servidor SMB
SMB_HOST=servidor.dominio.local    # Servidor com impressoras
SMB_USER=usuario                    # Usuário com permissões
SMB_PASS=senha                      # Senha do usuário
SMB_DOMAIN=DOMINIO                  # Domínio (opcional)

# Redis (Docker)
REDIS_HOST=redis                    # Nome do serviço (Docker) ou localhost
REDIS_PORT=6379                     # Porta padrão
REDIS_DB=0                          # Database 0
```

**Permissões necessárias no servidor:**
- Leitura de shares (`enumprinters`)
- Envio de documentos (`print`)
- Gerenciamento de filas (`Print Operators` para operações avançadas)

## 🚀 Execução

```bash
# Docker (recomendado - inclui Redis)
docker-compose up -d

# Verificar serviços
docker ps

# Logs
docker logs printers-api -f
docker logs printers-redis -f

# Local (requer Redis instalado)
npm install
npm run dev
```

## 📊 Performance

| Operação | Tempo | Cache | Detalhes |
|----------|-------|-------|----------|
| Lista impressoras (1ª vez) | ~1.704s | ❌ MISS | Busca SMB + salva Redis |
| Lista impressoras (cache) | ~0.247s | ✅ HIT | Leitura Redis |
| Impressão | ~500ms | - | smbclient |
| Status/fila | ~300ms | - | rpcclient |

**Cache:** 
- TTL: 5 minutos (auto-expiração)
- Atualização: Automática (após expirar) ou manual (`?refresh=true`)
- Compartilhado: Entre todas as instâncias da API
- Persistente: Sobrevive a restart da API

## 🔒 Segurança

- Rate limiting: 50 req/min
- Validação de IDs antes de operações
- Credenciais em variáveis de ambiente
- CORS habilitado para integração
- Redis em rede interna Docker (não exposto)

## 🔗 Integração com Outros Serviços

### Exemplo de Uso (cURL)
```bash
# 1. Obter impressoras (usa cache se disponível)
curl http://localhost:3000/printers

# 2. Verificar status do cache
curl http://localhost:3000/printers/cache-info

# 3. Forçar refresh do cache
curl http://localhost:3000/printers?refresh=true

# 4. Imprimir documento
curl -X POST http://localhost:3000/printers/print \
  -H "Content-Type: application/json" \
  -d '{
    "printerId": "a1b2c3d4e5f6g7h8",
    "fileBase64": "JVBERi0xLjQK..."
  }'
```

### Inspecionar Cache (Redis CLI)
```bash
# Conectar ao Redis
docker exec -it printers-redis redis-cli

# Ver chaves
KEYS *

# Ver conteúdo do cache
GET printers:list

# Ver TTL restante
TTL printers:list

# Limpar cache
DEL printers:list
```

---

## 📚 Documentação Completa

Para informações detalhadas sobre cada componente:

- **[Sistema de Cache Redis](./cache-system.md)** - Arquitetura, performance, troubleshooting
- **[Gerenciamento de Impressoras](./printer-management.md)** - Operações avançadas
- **[Padrões de Projeto](./design-patterns.md)** - Arquitetura SOLID
- **[Setup Docker](./docker-setup.md)** - Configuração de containers
- **[Testes de API](./api-testing.md)** - Exemplos práticos

# 3. Verificar status
curl http://localhost:3000/printers/management/a1b2c3d4e5f6g7h8/status
```

### Exemplo de Integração (TypeScript)
```typescript
const response = await fetch('http://printers-api:3000/printers/print', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    printerId: 'a1b2c3d4e5f6g7h8',
    fileBase64: Buffer.from(pdfBuffer).toString('base64')
  })
});

const { jobId } = await response.json();
```

## 📝 Observações Importantes

1. **IDs determinísticos:** Mesmo nome = mesmo ID (sempre)
2. **Cache expira:** Listar impressoras antes de imprimir se passou > 5min
3. **Operações avançadas:** Requerem `rpcclient` (samba-common-bin)
4. **Permissões:** Usuário SMB precisa de direitos adequados no servidor
5. **Formatos:** Apenas PDFs são suportados atualmente

## 📚 Documentação Completa

Para detalhes de implementação, troubleshooting e exemplos avançados, consulte `/docs`.

---

**Tech Stack:** NestJS 10 + TypeScript + SMB Protocol + Docker  
**Porta:** 3000 (padrão)  
**Health Check:** `GET /` → `<h1>Hello World!</h1>`
