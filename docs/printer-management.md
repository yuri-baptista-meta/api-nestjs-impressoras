# Gerenciamento Avançado de Impressoras SMB

## 🔍 Sua Pergunta

> "Usando o protocolo SMB, é possível verificar o status de uma impressora? Como ela está, se tem fila para imprimir nela, quais itens estão nessa lista, se dá para remover algo da fila ou etc?"

**Resposta:** ✅ **SIM, mas com limitações** dependendo da ferramenta usada.

---

## 📊 Comparação de Ferramentas

### 1. `smbclient` (Implementação Atual)

**Capacidades:**
- ✅ Listar impressoras compartilhadas
- ✅ Enviar documentos para impressão

**Limitações:**
- ❌ Não verifica status (online/offline/erro)
- ❌ Não lista fila de impressão
- ❌ Não cancela jobs
- ❌ Não pausa/retoma impressora

**Conclusão:** Ferramenta **básica**, apenas para impressão simples.

---

### 2. `rpcclient` (Implementação Avançada) ✅

**Capacidades:**
- ✅ Listar impressoras com detalhes
- ✅ Verificar status da impressora (online/offline/paused/error)
- ✅ Listar jobs na fila
- ✅ Ver detalhes dos jobs (usuário, documento, páginas, tamanho)
- ✅ Cancelar jobs específicos
- ✅ Pausar/retomar jobs
- ✅ Pausar/retomar impressora inteira
- ✅ Limpar fila completa

**Limitações:**
- ⚠️ Requer `samba-common-bin` instalado
- ⚠️ Parsing de output (não há API estruturada)
- ⚠️ Não funciona com todos os servidores SMB
- ⚠️ Limitado por permissões do usuário

**Conclusão:** Ferramenta **avançada**, permite gerenciamento completo.

---

## 🛠️ Instalação do rpcclient

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install samba-common-bin
```

### CentOS/RHEL
```bash
sudo yum install samba-client
```

### macOS
```bash
brew install samba
```

### Verificar instalação
```bash
rpcclient --version
# Samba version 4.x.x
```

---

## 🚀 Novo Adapter: `SmbAdvancedAdapter`

Implementei um adapter completo que suporta todas as operações de gerenciamento.

### Estrutura

```typescript
export class SmbAdvancedAdapter implements IPrinterAdapter {
  // Operações básicas (interface)
  listPrinters()
  printPdf()
  
  // Operações avançadas (extras)
  getPrinterStatus(printerName)      // Status da impressora
  listJobs(printerName)               // Lista fila
  cancelJob(printerName, jobId)       // Cancela job
  pauseJob(printerName, jobId)        // Pausa job
  resumeJob(printerName, jobId)       // Retoma job
  pausePrinter(printerName)           // Pausa impressora
  resumePrinter(printerName)          // Retoma impressora
  clearQueue(printerName)             // Limpa fila
}
```

---

## 📡 Endpoints REST de Gerenciamento

### 1. Verificar Status da Impressora

```http
GET /printers/management/:id/status
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

**Status possíveis:**
- `ONLINE` - Funcionando normalmente
- `OFFLINE` - Desligada ou sem rede
- `PAUSED` - Pausada manualmente
- `ERROR` - Com erro (sem papel, atolamento, etc)
- `UNKNOWN` - Não foi possível determinar

---

### 2. Listar Fila de Impressão

```http
GET /printers/management/:id/queue
```

**Resposta:**
```json
[
  {
    "jobId": 123,
    "printerName": "HP LaserJet 9020",
    "userName": "joao.silva",
    "documentName": "relatorio_financeiro.pdf",
    "totalPages": 15,
    "pagesPrinted": 5,
    "size": 2048576,
    "status": "PRINTING",
    "submittedTime": "2025-10-06T10:30:00.000Z"
  },
  {
    "jobId": 124,
    "printerName": "HP LaserJet 9020",
    "userName": "maria.santos",
    "documentName": "contrato.pdf",
    "totalPages": 8,
    "pagesPrinted": 0,
    "size": 512000,
    "status": "QUEUED",
    "submittedTime": "2025-10-06T10:32:00.000Z"
  }
]
```

**Status dos jobs:**
- `QUEUED` - Na fila, aguardando
- `PRINTING` - Sendo impresso agora
- `PAUSED` - Pausado manualmente
- `ERROR` - Com erro
- `PRINTED` - Concluído
- `DELETED` - Cancelado

---

### 3. Cancelar Job Específico

```http
DELETE /printers/management/:id/queue/:jobId
```

**Exemplo:**
```bash
curl -X DELETE http://localhost:3000/printers/management/a1b2c3d4e5f6g7h8/queue/124
```

**Resposta:**
```json
{
  "success": true,
  "message": "Job 124 cancelado com sucesso"
}
```

---

### 4. Limpar Fila Completa

```http
DELETE /printers/management/:id/queue
```

**Resposta:**
```json
{
  "canceledCount": 5,
  "message": "5 job(s) cancelado(s)"
}
```

---

### 5. Pausar Impressora

```http
POST /printers/management/:id/pause
```

**Resposta:**
```json
{
  "success": true,
  "message": "Impressora \"HP LaserJet 9020\" pausada"
}
```

---

### 6. Retomar Impressora

```http
POST /printers/management/:id/resume
```

**Resposta:**
```json
{
  "success": true,
  "message": "Impressora \"HP LaserJet 9020\" retomada"
}
```

---

### 7. Pausar Job Específico

```http
POST /printers/management/:id/queue/:jobId/pause
```

---

### 8. Retomar Job Pausado

```http
POST /printers/management/:id/queue/:jobId/resume
```

---

## 🧪 Exemplos de Uso

### Cenário 1: Monitorar Status

```bash
# 1. Listar impressoras
curl http://localhost:3000/printers

# 2. Pegar ID da primeira
PRINTER_ID=$(curl -s http://localhost:3000/printers | jq -r '.[0].id')

# 3. Verificar status
curl "http://localhost:3000/printers/management/$PRINTER_ID/status" | jq '.'

# Resposta:
# {
#   "name": "HP LaserJet 9020",
#   "status": "ONLINE",
#   "jobsInQueue": 2
# }
```

---

### Cenário 2: Gerenciar Fila

```bash
# Ver fila
curl "http://localhost:3000/printers/management/$PRINTER_ID/queue" | jq '.'

# Resposta:
# [
#   { "jobId": 123, "status": "PRINTING", "documentName": "doc1.pdf" },
#   { "jobId": 124, "status": "QUEUED", "documentName": "doc2.pdf" }
# ]

# Cancelar job específico
curl -X DELETE "http://localhost:3000/printers/management/$PRINTER_ID/queue/124"

# Limpar fila inteira
curl -X DELETE "http://localhost:3000/printers/management/$PRINTER_ID/queue"
```

---

### Cenário 3: Pausar para Manutenção

```bash
# Pausar impressora
curl -X POST "http://localhost:3000/printers/management/$PRINTER_ID/pause"

# Fazer manutenção...
sleep 60

# Retomar impressora
curl -X POST "http://localhost:3000/printers/management/$PRINTER_ID/resume"
```

---

### Cenário 4: Dashboard de Monitoramento

```javascript
// Frontend React/Vue/Angular

async function monitorPrinters() {
  const printers = await fetch('/printers').then(r => r.json());
  
  for (const printer of printers) {
    const status = await fetch(`/printers/management/${printer.id}/status`).then(r => r.json());
    
    console.log(`${printer.name}:`);
    console.log(`  Status: ${status.status}`);
    console.log(`  Fila: ${status.jobsInQueue} jobs`);
    
    // Atualiza UI
    updatePrinterCard(printer.id, status);
  }
}

// Atualiza a cada 10s
setInterval(monitorPrinters, 10000);
```

---

## ⚠️ Limitações e Considerações

### 1. Permissões do Usuário

O usuário SMB precisa ter permissões adequadas:

```bash
# Testar manualmente
rpcclient -U usuario%senha //servidor -c "enumprinters"

# Se der erro de permissão:
# - Usuário precisa ser "Operator de Impressão" no Windows
# - Ou membro do grupo "Print Operators"
```

### 2. Parsing de Output

O `rpcclient` não tem saída estruturada (JSON/XML), então precisamos fazer **parsing manual**:

```
# Output do rpcclient é texto puro:
Job Id: 123
Printer: HP LaserJet
User: DOMAIN\usuario
Document: arquivo.pdf
Total Pages: 5
Status: 0x0

# Precisamos parsear com regex
```

### 3. Compatibilidade

- ✅ **Windows Server** com compartilhamento SMB
- ✅ **Samba** (Linux) como servidor
- ⚠️ **macOS** como servidor (limitado)
- ❌ **Impressoras IPP nativas** (use outro adapter)

### 4. Performance

Cada operação faz uma chamada RPC:
- `listJobs()` - ~200-500ms
- `getPrinterStatus()` - ~100-300ms
- `cancelJob()` - ~50-150ms

Para dashboards em tempo real, considere:
- Cache com TTL curto (30s)
- WebSockets para updates em tempo real
- Pooling de conexões

---

## 🔄 Alternativas (Outros Protocolos)

### IPP (Internet Printing Protocol)

**Vantagens:**
- ✅ Padrão da indústria
- ✅ API estruturada (não precisa parsing)
- ✅ Mais rápido que SMB/RPC
- ✅ Funciona cross-platform

**Desvantagens:**
- ❌ Nem todas impressoras SMB suportam IPP
- ❌ Requer configuração adicional

**Biblioteca Node.js:**
```bash
npm install ipp
```

```typescript
import * as ipp from 'ipp';

// Listar jobs
const printer = ipp.Printer('http://impressora:631/ipp/printer');
const jobs = await printer.jobs();

// Cancelar job
await printer.cancelJob(jobId);
```

---

### CUPS (Common Unix Printing System)

Se o servidor for Linux com CUPS:

```bash
# Listar fila
lpstat -o impressora

# Cancelar job
cancel impressora-123

# Status
lpstat -p impressora
```

**Wrapper Node.js:**
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function listCupsJobs(printer: string) {
  const { stdout } = await execAsync(`lpstat -o ${printer}`);
  return parseCupsOutput(stdout);
}
```

---

## 📝 Como Habilitar no Projeto

### Opção 1: Substituir Adapter Atual

```typescript
// printers.module.ts

{
  provide: PRINTER_ADAPTER,
  useFactory: () => {
    return new SmbAdvancedAdapter({
      host: process.env.SMB_HOST!,
      user: process.env.SMB_USER!,
      pass: process.env.SMB_PASS!,
      domain: process.env.SMB_DOMAIN,
    });
  },
}
```

### Opção 2: Adicionar Como Service Separado

```typescript
// printers.module.ts

@Module({
  controllers: [
    PrintersController,
    PrintersManagementController, // ← Novo controller
  ],
  providers: [
    { provide: PRINTER_ADAPTER, useClass: SmbClientAdapter },
    PrintersService,
    {
      provide: SmbAdvancedAdapter,
      useFactory: () => new SmbAdvancedAdapter({ /* ... */ }),
    },
    PrintersManagementService, // ← Novo service
  ],
})
export class PrintersModule {}
```

---

## 🎯 Resumo

| Recurso | smbclient | rpcclient | IPP | CUPS |
|---------|-----------|-----------|-----|------|
| **Listar impressoras** | ✅ | ✅ | ✅ | ✅ |
| **Imprimir** | ✅ | ✅ | ✅ | ✅ |
| **Ver status** | ❌ | ✅ | ✅ | ✅ |
| **Listar fila** | ❌ | ✅ | ✅ | ✅ |
| **Cancelar job** | ❌ | ✅ | ✅ | ✅ |
| **Pausar/retomar** | ❌ | ✅ | ✅ | ✅ |
| **Cross-platform** | ✅ | ⚠️ | ✅ | ⚠️ |
| **Facilidade** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

---

## 🚀 Recomendação

Para seu projeto:

1. **Manter `smbclient` para impressão** (funciona bem)
2. **Adicionar `rpcclient` para gerenciamento** (status, fila, cancelar)
3. **Criar endpoints opcionais** de gerenciamento (não obrigatórios)
4. **Documentar limitações** (requer permissões, parsing de texto)

**Vantagem:** Seu projeto fica completo e profissional, com dashboard de gerenciamento! 🎉
