# Melhorias na Interface IPrinterAdapter

## 📋 Resumo

A interface `IPrinterAdapter` foi expandida para incluir todos os métodos de gerenciamento avançado de impressoras, garantindo que **todos os adapters** implementem a mesma interface completa.

## 🎯 Objetivo

Garantir **type-safety** e **contrato formal** para todas as operações de impressora, independente do protocolo usado (SMB básico, SMB avançado, IPP, LPD, Mock).

---

## 📦 Estrutura da Interface

### Interface Completa: `IPrinterAdapter`

```typescript
export interface IPrinterAdapter {
  // ✅ Operações básicas (suportadas por todos)
  listPrinters(): Promise<Array<{ name: string; uri: string }>>;
  printPdf(params: { printerShare: string; fileBase64: string }): Promise<{ jobId: string }>;

  // 🔧 Operações avançadas (suportadas apenas por rpcclient)
  getPrinterStatus(printerName: string): Promise<PrinterStatus>;
  listJobs(printerName: string): Promise<PrintJob[]>;
  cancelJob(printerName: string, jobId: number): Promise<boolean>;
  pauseJob(printerName: string, jobId: number): Promise<boolean>;
  resumeJob(printerName: string, jobId: number): Promise<boolean>;
  pausePrinter(printerName: string): Promise<boolean>;
  resumePrinter(printerName: string): Promise<boolean>;
  clearQueue(printerName: string): Promise<number>;
}
```

### Tipos Auxiliares

```typescript
export interface PrinterStatus {
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'PAUSED' | 'ERROR' | 'UNKNOWN';
  jobsInQueue: number;
  statusMessage?: string;
}

export interface PrintJob {
  jobId: number;
  printerName: string;
  userName: string;
  documentName: string;
  totalPages: number;
  pagesPrinted: number;
  size: number;
  status: 'QUEUED' | 'PRINTING' | 'PAUSED' | 'ERROR' | 'PRINTED' | 'DELETED';
  submittedTime: Date;
}
```

---

## 🔄 Implementações

### 1. **SmbAdvancedAdapter** (Implementação completa)

✅ **Suporta todos os métodos** usando `rpcclient`:

```typescript
export class SmbAdvancedAdapter implements IPrinterAdapter {
  // ✅ Implementação real de todos os métodos
  async getPrinterStatus(printerName: string): Promise<PrinterStatus> {
    const output = await this.runRpc(`getprinter "${printerName}"`);
    // Parse do output do rpcclient...
  }
  
  async listJobs(printerName: string): Promise<PrintJob[]> {
    const output = await this.runRpc(`enumjobs "${printerName}"`);
    // Parse do output do rpcclient...
  }
  
  // ... todos os outros métodos implementados
}
```

**Usa:** `rpcclient` (samba-common-bin)

---

### 2. **SmbClientAdapter** (Implementação básica)

⚠️ **Suporta apenas operações básicas** usando `smbclient`:

```typescript
export class SmbClientAdapter implements IPrinterAdapter {
  // ✅ Operações básicas funcionam
  async listPrinters() { /* ... */ }
  async printPdf() { /* ... */ }
  
  // ❌ Métodos avançados lançam exceção
  async getPrinterStatus(printerName: string): Promise<PrinterStatus> {
    throw new Error(
      'getPrinterStatus não implementado: smbclient não suporta consulta de status. ' +
      'Use SmbAdvancedAdapter com rpcclient para funcionalidades avançadas.'
    );
  }
  
  // ... todos os métodos avançados lançam erro similar
}
```

**Usa:** `smbclient` (apenas)

**Comportamento:**
- ✅ Operações básicas: funcionam normalmente
- ❌ Operações avançadas: lançam erro informativo

---

### 3. **IppAdapter** e **LpdAdapter**

⚠️ **Stubs com erro** para métodos avançados:

```typescript
export class IppAdapter implements IPrinterAdapter {
  async listPrinters() { /* implementação IPP */ }
  async printPdf() { /* implementação IPP */ }
  
  // ❌ Métodos avançados lançam exceção
  async getPrinterStatus(): Promise<PrinterStatus> {
    throw new Error('getPrinterStatus não implementado no adapter IPP básico');
  }
  // ... outros métodos similares
}
```

**Comportamento:** Mesma lógica do SmbClientAdapter - erros informativos.

---

### 4. **MockPrinterAdapter** (Para testes)

✅ **Implementa todos os métodos com dados simulados**:

```typescript
export class MockPrinterAdapter implements IPrinterAdapter {
  async listPrinters() { 
    return [{ name: 'Mock Printer 1', uri: 'mock://printer1' }];
  }
  
  async printPdf() { 
    return { jobId: 'mock-job-123' };
  }
  
  // ✅ Métodos avançados retornam dados fake (não lançam erro)
  async getPrinterStatus(printerName: string): Promise<PrinterStatus> {
    return {
      name: printerName,
      status: 'ONLINE',
      jobsInQueue: 0,
      statusMessage: 'Mock status - always online'
    };
  }
  
  async listJobs(): Promise<PrintJob[]> {
    return [];
  }
  
  async cancelJob(): Promise<boolean> {
    console.log('[MOCK] Cancelando job');
    return true;
  }
  // ... outros métodos retornam valores mock
}
```

**Uso:** Testes unitários e CI/CD.

---

## 🎁 Benefícios

### 1. **Type-Safety Completo**

```typescript
// ✅ TypeScript garante que todos os adapters implementam todos os métodos
const adapter: IPrinterAdapter = new SmbAdvancedAdapter(config);

// ✅ Autocomplete funciona para todos os métodos
await adapter.getPrinterStatus('HP LaserJet');
```

### 2. **Troca de Implementação Transparente**

```typescript
// No printers.module.ts
{
  provide: PRINTER_ADAPTER,
  useFactory: (configService: ConfigService) => {
    // ✅ Ambos implementam IPrinterAdapter
    return useAdvanced 
      ? new SmbAdvancedAdapter(config)
      : new SmbClientAdapter(config);
  }
}
```

### 3. **Erros Informativos**

```typescript
// Ao usar SmbClientAdapter:
try {
  await adapter.getPrinterStatus('HP');
} catch (error) {
  // Error: getPrinterStatus não implementado: smbclient não suporta consulta de status.
  //        Use SmbAdvancedAdapter com rpcclient para funcionalidades avançadas.
}
```

### 4. **Facilita Testes**

```typescript
// Em testes unitários
const mockAdapter = new MockPrinterAdapter();

// ✅ Todos os métodos funcionam sem dependências externas
expect(await mockAdapter.getPrinterStatus('test')).toEqual({
  name: 'test',
  status: 'ONLINE',
  jobsInQueue: 0
});
```

---

## 📊 Matriz de Suporte

| Método | SmbAdvanced | SmbClient | IPP | LPD | Mock |
|--------|-------------|-----------|-----|-----|------|
| `listPrinters()` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `printPdf()` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `getPrinterStatus()` | ✅ | ❌ | ❌ | ❌ | ✅ (fake) |
| `listJobs()` | ✅ | ❌ | ❌ | ❌ | ✅ (fake) |
| `cancelJob()` | ✅ | ❌ | ❌ | ❌ | ✅ (fake) |
| `pauseJob()` | ✅ | ❌ | ❌ | ❌ | ✅ (fake) |
| `resumeJob()` | ✅ | ❌ | ❌ | ❌ | ✅ (fake) |
| `pausePrinter()` | ✅ | ❌ | ❌ | ❌ | ✅ (fake) |
| `resumePrinter()` | ✅ | ❌ | ❌ | ❌ | ✅ (fake) |
| `clearQueue()` | ✅ | ❌ | ❌ | ❌ | ✅ (fake) |

**Legenda:**
- ✅ = Implementado e funcional
- ❌ = Lança erro informativo
- ✅ (fake) = Retorna dados simulados

---

## 🔧 Como Usar

### Cenário 1: Apenas Impressão Básica

```typescript
// Use SmbClientAdapter
const adapter = new SmbClientAdapter({
  host: '172.16.1.227',
  user: 'admin',
  pass: 'senha123'
});

// ✅ Funciona
await adapter.listPrinters();
await adapter.printPdf({ printerShare: 'HP', fileBase64: '...' });

// ❌ Lança erro
await adapter.getPrinterStatus('HP'); // Error!
```

### Cenário 2: Gerenciamento Completo

```typescript
// Use SmbAdvancedAdapter
const adapter = new SmbAdvancedAdapter({
  host: '172.16.1.227',
  user: 'admin',
  pass: 'senha123'
});

// ✅ Todas as operações funcionam
await adapter.listPrinters();
await adapter.printPdf({ printerShare: 'HP', fileBase64: '...' });
await adapter.getPrinterStatus('HP');
await adapter.listJobs('HP');
await adapter.cancelJob('HP', 123);
```

### Cenário 3: Testes Unitários

```typescript
// Use MockPrinterAdapter
const adapter = new MockPrinterAdapter();

// ✅ Todos os métodos funcionam sem dependências
await adapter.listPrinters(); // Retorna dados mock
await adapter.getPrinterStatus('test'); // Retorna status fake
```

---

## 🚀 Melhorias Futuras

### 1. **Adapter IPP Completo**
Implementar métodos avançados usando biblioteca IPP real (ex: `ipp-printer`).

### 2. **Fallback Graceful**
```typescript
async getPrinterStatus(name: string): Promise<PrinterStatus> {
  try {
    return await this.actualImplementation(name);
  } catch (e) {
    return { name, status: 'UNKNOWN', jobsInQueue: 0 };
  }
}
```

### 3. **Feature Detection**
```typescript
interface IPrinterAdapter {
  capabilities(): {
    supportsStatus: boolean;
    supportsQueue: boolean;
    supportsCancel: boolean;
  };
}
```

---

## 📝 Conclusão

A interface unificada garante:
- ✅ **Type-safety** em TypeScript
- ✅ **Contrato formal** para todos os adapters
- ✅ **Erros informativos** para funcionalidades não suportadas
- ✅ **Facilidade de testes** com mock adapter
- ✅ **Flexibilidade** para adicionar novos protocolos

Agora todos os adapters seguem o mesmo contrato, facilitando manutenção e evolução do sistema! 🎉
