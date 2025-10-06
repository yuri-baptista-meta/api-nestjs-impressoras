# 📡 API REST Endpoints

API HTTP para gerenciamento e impressão em impressoras SMB via rede.

---

## 🚀 Quick Start

```bash
# Inicie os containers
docker-compose up -d

# Verifique o status
curl http://localhost:3000/
```

---

## 📋 Operações Básicas

### Health Check

```bash
curl http://localhost:3000/
```

**Resposta:**
```html
<h1>Hello World!</h1>
```

---

### Listar Impressoras

```http
GET /printers
```

**Query Params:**
- `refresh=true` (opcional) - força atualização do cache

**Exemplo:**
```bash
# Lista impressoras (usa cache se disponível)
curl http://localhost:3000/printers | jq '.'

# Força refresh do cache
curl 'http://localhost:3000/printers?refresh=true' | jq '.'
```

**Resposta:**
```json
[
  {
    "id": "a1b2c3d4e5f6g7h8",
    "name": "HP LaserJet 9020",
    "uri": "smb://servidor/HP%20LaserJet%209020",
    "cachedAt": "2025-01-06T14:30:00.000Z"
  },
  {
    "id": "9f8e7d6c5b4a3210",
    "name": "OKI-ES5112 Motoristas",
    "uri": "smb://servidor/OKI-ES5112%20Motoristas",
    "cachedAt": "2025-01-06T14:30:00.000Z"
  }
]
```

**Logs:**
- ✅ `Cache HIT` - retorna do Redis (<5min)
- ⚠️ `Cache stale` - retorna cache antigo e atualiza background (5min-30dias)
- ❌ `Cache MISS` - busca do SMB (>30dias ou primeira vez)

---

### Imprimir PDF

```http
POST /printers/print
Content-Type: application/json
```

**Body:**
```json
{
  "printerId": "a1b2c3d4e5f6g7h8",
  "fileBase64": "JVBERi0xLjQK...base64..."
}
```

**Exemplo Completo:**
```bash
# 1. Obter ID da impressora
PRINTER_ID=$(curl -s http://localhost:3000/printers | jq -r '.[0].id')

# 2. Converter PDF para base64
PDF_BASE64=$(base64 -w 0 documento.pdf)

# 3. Enviar para impressão
curl -X POST http://localhost:3000/printers/print \
  -H "Content-Type: application/json" \
  -d "{
    \"printerId\": \"$PRINTER_ID\",
    \"fileBase64\": \"$PDF_BASE64\"
  }"
```

**Resposta Sucesso:**
```json
{
  "jobId": "job-abc123-def456"
}
```

**Resposta DRY_RUN:**
```json
{
  "jobId": "job-mock-1704567890123"
}
```

**Logs:**
- 🧪 `[DRY_RUN] Simulando impressão` - modo teste ativo
- ✅ `Impressão enviada` - sucesso (real ou simulado)

---

## 🔧 Gerenciamento Avançado

Operações avançadas com `rpcclient` para gerenciar filas de impressão.

### Status da Impressora

```http
GET /printers/management/:id/status
```

**Exemplo:**
```bash
PRINTER_ID=$(curl -s http://localhost:3000/printers | jq -r '.[0].id')
curl http://localhost:3000/printers/management/$PRINTER_ID/status | jq '.'
```

**Resposta:**
```json
{
  "name": "HP LaserJet 9020",
  "status": "ONLINE",
  "jobsInQueue": 3,
  "statusMessage": null
}
```

**Possíveis Status:**
- `ONLINE` - Impressora operacional
- `PAUSED` - Impressora pausada
- `OFFLINE` - Impressora offline
- `ERROR` - Erro na impressora

---

### Listar Fila de Impressão

```http
GET /printers/management/:id/queue
```

**Exemplo:**
```bash
curl http://localhost:3000/printers/management/$PRINTER_ID/queue | jq '.'
```

**Resposta:**
```json
[
  {
    "jobId": "123",
    "user": "joao.silva",
    "document": "Relatorio_Q4.pdf",
    "status": "PRINTING",
    "pages": 15,
    "size": "2.3MB",
    "submitted": "2025-01-06T14:22:10.000Z"
  },
  {
    "jobId": "124",
    "user": "maria.santos",
    "document": "Contrato.pdf",
    "status": "PENDING",
    "pages": 8,
    "size": "1.1MB",
    "submitted": "2025-01-06T14:23:45.000Z"
  }
]
```

---

### Cancelar Job de Impressão

```http
DELETE /printers/management/:id/queue/:jobId
```

**Exemplo:**
```bash
curl -X DELETE http://localhost:3000/printers/management/$PRINTER_ID/queue/123
```

**Resposta:**
```json
{
  "success": true,
  "message": "Job 123 cancelado com sucesso"
}
```

---

### Pausar Impressora

```http
POST /printers/management/:id/pause
```

**Exemplo:**
```bash
curl -X POST http://localhost:3000/printers/management/$PRINTER_ID/pause
```

**Resposta:**
```json
{
  "success": true,
  "message": "Impressora HP LaserJet 9020 pausada"
}
```

---

### Retomar Impressora

```http
POST /printers/management/:id/resume
```

**Exemplo:**
```bash
curl -X POST http://localhost:3000/printers/management/$PRINTER_ID/resume
```

**Resposta:**
```json
{
  "success": true,
  "message": "Impressora HP LaserJet 9020 retomada"
}
```

---

### Pausar Job Específico

```http
POST /printers/management/:id/queue/:jobId/pause
```

**Exemplo:**
```bash
curl -X POST http://localhost:3000/printers/management/$PRINTER_ID/queue/124/pause
```

---

### Retomar Job Específico

```http
POST /printers/management/:id/queue/:jobId/resume
```

---

### Limpar Toda Fila

```http
DELETE /printers/management/:id/queue
```

**Exemplo:**
```bash
curl -X DELETE http://localhost:3000/printers/management/$PRINTER_ID/queue
```

**Resposta:**
```json
{
  "success": true,
  "message": "Fila da impressora HP LaserJet 9020 limpa (5 jobs removidos)"
}
```

---

## 🎯 Status Codes

| Código | Significado                          |
|--------|--------------------------------------|
| 200    | Sucesso                              |
| 201    | Job criado com sucesso               |
| 400    | Dados inválidos (ID/base64)          |
| 404    | Impressora não encontrada            |
| 500    | Erro interno (SMB/Redis)             |

---

## 🧪 Modo DRY_RUN

Para testar sem impressoras reais, configure:

```env
DRY_RUN=true
```

**Comportamento:**
- ✅ API funciona normalmente
- ✅ Cache funciona normalmente
- ✅ Kafka funciona normalmente
- 🧪 **Impressões são SIMULADAS** (não enviam para impressora real)
- 🧪 JobIDs são gerados como `job-mock-{timestamp}`

**Logs em DRY_RUN:**
```
🧪 [DRY_RUN] Simulando impressão para: HP LaserJet 9020 - jobId: job-mock-1704567890123
```

---

## 📊 Performance

### Primeira Chamada (Cache MISS)
- Tempo: ~2000ms (busca SMB via `smbclient`)
- Log: ❌ Cache MISS

### Cache Fresco (<5min)
- Tempo: ~2ms (Redis)
- Log: ✅ Cache HIT

### Cache Stale (5min-30dias)
- Tempo: ~2ms (retorna imediatamente)
- Background: ~2000ms (atualiza depois)
- Log: ⚠️ Cache stale

### Impressão (DRY_RUN)
- Tempo: ~300ms (simulado)
- Log: 🧪 [DRY_RUN] Simulando impressão

### Impressão (Real)
- Tempo: ~1500ms (envia via `smbclient`)
- Log: ✅ Impressão enviada
