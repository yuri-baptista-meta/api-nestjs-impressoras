# Padrões de Projeto e POO Aplicados

## 🎯 Problema Identificado

Você perguntou: **"O adapter do samba não herda a obrigatoriedade de implementar essas funções, certo?"**

**Resposta:** Estava certo! Antes da refatoração, não havia **contrato formal** garantindo que o adapter implementasse os métodos necessários.

---

## ❌ ANTES da Refatoração

### Problemas

```typescript
// Service dependia diretamente da classe concreta
export class PrintersService {
  constructor(private readonly smb: SmbClientAdapter) {} // ← Acoplamento forte
  
  async list() {
    return this.smb.listPrinters(); // ← Sem garantia de que o método existe
  }
}

// Adapter sem contrato
export class SmbClientAdapter {
  async listPrinters() { /* ... */ } // ← Pode mudar sem aviso
  async printPdf() { /* ... */ }      // ← Pode ser renomeado/removido
}
```

### Violações de SOLID

1. **❌ Dependency Inversion Principle (DIP)**
   - Service depende de implementação concreta, não de abstração
   
2. **❌ Open/Closed Principle (OCP)**
   - Para adicionar novo protocolo (IPP), precisa modificar o service

3. **❌ Liskov Substitution Principle (LSP)**
   - Não há garantia de que substitutos funcionarão

### Problemas Práticos

```typescript
// ❌ Difícil de testar (precisa do smbclient instalado)
describe('PrintersService', () => {
  it('should list printers', async () => {
    const service = new PrintersService(new SmbClientAdapter(config));
    // ↑ Testes dependem de servidor SMB real!
  });
});

// ❌ Impossível trocar implementação sem modificar código
// Se quiser usar IPP em vez de SMB, precisa:
// 1. Modificar PrintersService
// 2. Modificar PrintersModule
// 3. Modificar tipos/imports
```

---

## ✅ DEPOIS da Refatoração

### Estrutura

```
src/
├── domain/
│   └── printer-adapter.interface.ts  ← CONTRATO (abstração)
│
├── adapters/
│   ├── smbclient.adapter.ts         ← Implementação SMB
│   └── alternative-adapters.ts       ← Implementações IPP/LPD/Mock
│
└── printers/
    ├── printers.service.ts           ← Depende da INTERFACE
    └── printers.module.ts            ← Configura DI
```

### 1. Interface (Contrato)

```typescript
// src/domain/printer-adapter.interface.ts

/**
 * Contrato formal que OBRIGA implementações a ter esses métodos.
 */
export interface IPrinterAdapter {
  listPrinters(): Promise<Array<{ name: string; uri: string }>>;
  printPdf(params: { printerShare: string; fileBase64: string }): Promise<{ jobId: string }>;
}

export const PRINTER_ADAPTER = Symbol('PRINTER_ADAPTER');
```

**Benefícios:**
- ✅ TypeScript garante que qualquer classe que implemente essa interface DEVE ter esses métodos
- ✅ Serve como documentação (qualquer dev sabe o que precisa implementar)
- ✅ IDE/Compiler detecta erros automaticamente

### 2. Implementação (Adapter)

```typescript
// src/adapters/smbclient.adapter.ts

export class SmbClientAdapter implements IPrinterAdapter {
  //                             ↑
  //                    OBRIGADO a implementar:
  //                    - listPrinters()
  //                    - printPdf()
  
  async listPrinters() { /* ... */ }
  async printPdf() { /* ... */ }
}
```

**Se você esquecer de implementar um método:**

```typescript
export class SmbClientAdapter implements IPrinterAdapter {
  // ❌ ERRO de compilação:
  // "Class 'SmbClientAdapter' incorrectly implements interface 'IPrinterAdapter'.
  //  Property 'listPrinters' is missing"
}
```

### 3. Service (Consumidor)

```typescript
// src/printers/printers.service.ts

export class PrintersService {
  constructor(
    @Inject(PRINTER_ADAPTER) private readonly printerAdapter: IPrinterAdapter
    //                                                        ↑
    //                                          Depende da INTERFACE, não da classe
  ) {}
  
  async list() {
    return this.printerAdapter.listPrinters(); // ← Chama método da interface
  }
}
```

**Benefícios:**
- ✅ Service não sabe/não se importa qual implementação está sendo usada
- ✅ Pode ser SMB, IPP, LPD, Mock - todos funcionam igual
- ✅ Fácil de testar (injeta mock)

### 4. Module (Configuração DI)

```typescript
// src/printers/printers.module.ts

@Module({
  providers: [
    {
      provide: PRINTER_ADAPTER,        // ← Token de injeção
      useFactory: () => {
        return new SmbClientAdapter(config); // ← Escolhe implementação aqui
      },
    },
    PrintersService,
  ],
})
export class PrintersModule {}
```

**Trocar implementação é trivial:**

```typescript
// Usar IPP em vez de SMB? Só muda aqui:
{
  provide: PRINTER_ADAPTER,
  useFactory: () => new IppAdapter({ host: '...' }), // ← Sem tocar no service!
}

// Ambiente de teste? Usa mock:
{
  provide: PRINTER_ADAPTER,
  useClass: MockPrinterAdapter, // ← Sem SMB real
}
```

---

## 🏛️ Padrões de Projeto Aplicados

### 1. **Adapter Pattern**

**Propósito:** Converter interface de uma classe em outra interface esperada pelo cliente.

```
Cliente (PrintersService)
    ↓ espera
Interface (IPrinterAdapter)
    ↓ implementada por
Adapters (SMB, IPP, LPD)
    ↓ traduzem para
APIs externas (smbclient, ipp lib, etc)
```

**Exemplo:**
- `SmbClientAdapter` traduz a interface `IPrinterAdapter` para comandos do `smbclient`
- `IppAdapter` traduz a mesma interface para protocolo IPP
- Service não precisa saber dessas diferenças

### 2. **Dependency Injection (DI)**

**Propósito:** Inverter o controle de criação de dependências.

```typescript
// ❌ Sem DI (acoplamento)
export class PrintersService {
  private adapter = new SmbClientAdapter(config); // ← Service cria dependência
}

// ✅ Com DI (desacoplamento)
export class PrintersService {
  constructor(
    @Inject(PRINTER_ADAPTER) private adapter: IPrinterAdapter // ← Recebe pronta
  ) {}
}
```

**Benefícios:**
- Service não precisa saber como criar o adapter
- Fácil trocar implementação
- Testável (injeta mock)

### 3. **Strategy Pattern**

**Propósito:** Definir família de algoritmos intercambiáveis.

```typescript
// Diferentes estratégias de impressão:
- SmbClientAdapter   → Estratégia SMB
- IppAdapter         → Estratégia IPP
- LpdAdapter         → Estratégia LPD
- MockPrinterAdapter → Estratégia Mock

// Service usa qualquer uma sem saber a diferença
```

---

## 🧪 Exemplo: Testes Unitários

### Antes (Difícil)

```typescript
describe('PrintersService', () => {
  it('should list printers', async () => {
    // ❌ Precisa de servidor SMB real
    const adapter = new SmbClientAdapter({
      host: 'servidor-real',
      user: 'user',
      pass: 'pass',
    });
    const service = new PrintersService(adapter);
    
    const printers = await service.list(); // ← Depende de rede/SMB
    expect(printers).toBeDefined();
  });
});
```

### Depois (Fácil)

```typescript
import { MockPrinterAdapter } from '@/adapters/alternative-adapters';

describe('PrintersService', () => {
  let service: PrintersService;
  let mockAdapter: MockPrinterAdapter;

  beforeEach(() => {
    mockAdapter = new MockPrinterAdapter();
    service = new PrintersService(mockAdapter); // ← Injeta mock
  });

  it('should list printers from cache', async () => {
    // ✅ Teste isolado, sem dependências externas
    mockAdapter.addMockPrinter('Test Printer', 'mock://test');
    
    const printers = await service.list();
    
    expect(printers).toHaveLength(1);
    expect(printers[0].name).toBe('Test Printer');
  });

  it('should return cached printers on second call', async () => {
    await service.list(); // Primeira chamada
    
    const start = Date.now();
    await service.list(); // Segunda chamada (cache)
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(10); // ← Muito rápido (cache)
  });
});
```

---

## 🔄 Exemplo: Trocar Implementação em Runtime

```typescript
// printers.module.ts

@Module({
  providers: [
    {
      provide: PRINTER_ADAPTER,
      useFactory: (configService: ConfigService) => {
        const protocol = configService.get('PRINTER_PROTOCOL');
        
        // ✅ Escolhe implementação baseado em config
        switch (protocol) {
          case 'smb':
            return new SmbClientAdapter({ /* ... */ });
          
          case 'ipp':
            return new IppAdapter({ /* ... */ });
          
          case 'lpd':
            return new LpdAdapter(/* ... */);
          
          default:
            return new MockPrinterAdapter(); // Fallback
        }
      },
      inject: [ConfigService],
    },
    PrintersService,
  ],
})
export class PrintersModule {}
```

**No `.env`:**
```env
# Produção
PRINTER_PROTOCOL=smb

# Desenvolvimento local
PRINTER_PROTOCOL=mock

# Cliente com impressoras IPP
PRINTER_PROTOCOL=ipp
```

---

## 📊 Comparação: Antes vs Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Contrato** | ❌ Inexistente | ✅ Interface formal |
| **Acoplamento** | ❌ Forte (classe concreta) | ✅ Fraco (interface) |
| **Testabilidade** | ❌ Difícil (precisa SMB) | ✅ Fácil (usa mock) |
| **Extensibilidade** | ❌ Modificar service | ✅ Apenas adicionar adapter |
| **Manutenção** | ❌ Mudanças propagam | ✅ Isoladas no adapter |
| **DIP (SOLID)** | ❌ Violado | ✅ Respeitado |
| **OCP (SOLID)** | ❌ Violado | ✅ Respeitado |
| **Garantia de compilação** | ❌ Nenhuma | ✅ TypeScript valida |

---

## 🎓 Princípios SOLID Aplicados

### **D - Dependency Inversion Principle**

> "Dependa de abstrações, não de implementações concretas."

✅ **Aplicado:**
```typescript
// Service depende da interface (abstração)
constructor(@Inject(PRINTER_ADAPTER) private adapter: IPrinterAdapter) {}

// Não depende da classe (concreta)
// constructor(private adapter: SmbClientAdapter) {} ← Evitado
```

### **O - Open/Closed Principle**

> "Aberto para extensão, fechado para modificação."

✅ **Aplicado:**
```typescript
// Adicionar novo protocolo (IPP) não modifica PrintersService
export class IppAdapter implements IPrinterAdapter { /* ... */ }

// Só precisa registrar no module
{ provide: PRINTER_ADAPTER, useClass: IppAdapter }
```

### **L - Liskov Substitution Principle**

> "Subtipos devem ser substituíveis por seus tipos base."

✅ **Aplicado:**
```typescript
// Qualquer implementação de IPrinterAdapter pode substituir outra
const adapter: IPrinterAdapter = 
  useMock ? new MockPrinterAdapter() : new SmbClientAdapter(config);

// Service funciona com qualquer uma
const service = new PrintersService(adapter);
```

---

## 🚀 Próximos Passos (Opcional)

Se quiser levar ainda mais longe:

### 1. **Factory Pattern**
```typescript
export class PrinterAdapterFactory {
  static create(protocol: string): IPrinterAdapter {
    switch (protocol) {
      case 'smb': return new SmbClientAdapter();
      case 'ipp': return new IppAdapter();
      default: throw new Error('Unknown protocol');
    }
  }
}
```

### 2. **Decorator Pattern**
```typescript
// Adiciona logging sem modificar adapters
export class LoggingPrinterAdapter implements IPrinterAdapter {
  constructor(private wrapped: IPrinterAdapter) {}
  
  async listPrinters() {
    console.log('[LOG] Listing printers...');
    const result = await this.wrapped.listPrinters();
    console.log(`[LOG] Found ${result.length} printers`);
    return result;
  }
  
  async printPdf(params) {
    console.log(`[LOG] Printing to ${params.printerShare}`);
    return this.wrapped.printPdf(params);
  }
}

// Uso:
const adapter = new LoggingPrinterAdapter(new SmbClientAdapter());
```

### 3. **Repository Pattern**
```typescript
// Se quiser persistir impressoras em DB
export interface IPrinterRepository {
  findAll(): Promise<Printer[]>;
  findById(id: string): Promise<Printer>;
  save(printer: Printer): Promise<void>;
}
```

---

## 📝 Resumo

**Antes:** Service dependia diretamente de `SmbClientAdapter` (classe concreta), sem garantias.

**Depois:** 
1. ✅ Criada interface `IPrinterAdapter` (contrato formal)
2. ✅ `SmbClientAdapter` implementa a interface (obrigatório)
3. ✅ Service depende da interface (desacoplado)
4. ✅ DI configura qual implementação usar (flexível)

**Resultado:**
- 🎯 TypeScript **garante** que adapters implementam métodos necessários
- 🔧 Fácil adicionar novos protocolos (IPP, LPD, etc)
- 🧪 Testes unitários simples (usa mock)
- 📦 Código segue SOLID (especialmente DIP e OCP)
- 🚀 Manutenção facilitada (mudanças isoladas)
