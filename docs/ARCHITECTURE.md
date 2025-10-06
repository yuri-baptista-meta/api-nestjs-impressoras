# 🏗️ Arquitetura e Padrões de Projeto

Design patterns aplicados no projeto para manutenibilidade e escalabilidade.

---

## 📐 Estrutura de Módulos

```
src/
├── app.module.ts              # Módulo raiz
├── main.ts                    # Bootstrap (HTTP + Kafka hybrid)
│
├── domain/                    # Camada de domínio
│   ├── print.types.ts         # Tipos de negócio
│   └── printer-adapter.interface.ts  # Contrato de adaptadores
│
├── adapters/                  # Implementações de protocolo
│   ├── smbclient.adapter.ts   # SMB básico
│   ├── smb-advanced.adapter.ts # SMB com rpcclient
│   └── alternative-adapters.ts # IPP/LPD/Mock
│
├── printers/                  # Módulo de impressoras
│   ├── printers.module.ts     # Configuração DI
│   ├── printers.controller.ts # GET /printers, POST /print
│   ├── printers.service.ts    # Lógica + cache
│   ├── printers-management.controller.ts # Gerenciamento avançado
│   ├── printers-management.service.ts    # rpcclient operations
│   └── dtos/
│       └── print.dto.ts       # Validação de requisição
│
├── redis/                     # Módulo de cache
│   └── redis.module.ts        # Cliente Redis global
│
├── kafka/                     # Módulo Kafka
│   ├── kafka.module.ts        # Cliente Kafka
│   └── kafka-consumer.controller.ts # Consumer de print-jobs
│
└── interceptors/              # Cross-cutting concerns
    └── log.interceptor.ts     # Logging HTTP
```

---

## 🎯 Padrões de Projeto Aplicados

### 1. Adapter Pattern (Strategy)

**Problema:** Diferentes protocolos de impressão (SMB, IPP, LPD) com APIs distintas.

**Solução:** Interface única que padroniza operações.

```typescript
// domain/printer-adapter.interface.ts
export interface IPrinterAdapter {
  listPrinters(): Promise<Array<{ name: string; uri: string }>>;
  printPdf(params: { printerShare: string; fileBase64: string }): Promise<{ jobId: string }>;
}

export const PRINTER_ADAPTER = Symbol('PRINTER_ADAPTER');
```

**Implementações:**

```typescript
// adapters/smbclient.adapter.ts
export class SmbClientAdapter implements IPrinterAdapter {
  async listPrinters() { /* smbclient -L */ }
  async printPdf() { /* smbclient \\server\printer -c "print" */ }
}

// adapters/smb-advanced.adapter.ts
export class SmbAdvancedAdapter implements IPrinterAdapter {
  async listPrinters() { /* rpcclient -c "enumprinters" */ }
  async printPdf() { /* rpcclient -c "printjob" */ }
  
  // Métodos extras
  async getPrinterStatus() { /* rpcclient -c "getprinterstatus" */ }
  async listJobs() { /* rpcclient -c "enumjobs" */ }
  async cancelJob() { /* rpcclient -c "canceljob" */ }
}

// adapters/alternative-adapters.ts
export class IppAdapter implements IPrinterAdapter {
  async listPrinters() { /* ipp-list */ }
  async printPdf() { /* ipp-print */ }
}

export class MockPrinterAdapter implements IPrinterAdapter {
  async listPrinters() { return [/* mock data */]; }
  async printPdf() { return { jobId: 'mock-123' }; }
}
```

**Vantagens:**
- ✅ Troca de protocolo sem modificar services
- ✅ Fácil adicionar novos protocolos
- ✅ Testável com `MockPrinterAdapter`
- ✅ TypeScript garante contrato

---

### 2. Dependency Injection

**Problema:** Services acoplados a implementações concretas.

**Solução:** Injeção via interface usando Symbol token.

```typescript
// printers/printers.module.ts
@Module({
  providers: [
    {
      provide: PRINTER_ADAPTER,
      useFactory: (): SmbAdvancedAdapter => {
        const cfg: SmbCreds = {
          host: process.env.SMB_HOST!,
          user: process.env.SMB_USER!,
          pass: process.env.SMB_PASS!,
          domain: process.env.SMB_DOMAIN,
        };
        return new SmbAdvancedAdapter(cfg);
      },
    },
    PrintersService,
    PrintersManagementService,
  ],
})
export class PrintersModule {}
```

```typescript
// printers/printers.service.ts
@Injectable()
export class PrintersService {
  constructor(
    @Inject(PRINTER_ADAPTER) private readonly adapter: IPrinterAdapter,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}
  
  async list() {
    // Usa this.adapter (não conhece implementação)
  }
}
```

**Vantagens:**
- ✅ **Singleton** - uma instância compartilhada
- ✅ **Testável** - mock via provider override
- ✅ **Flexível** - troca em um único lugar
- ✅ **SOLID** - Dependency Inversion Principle

---

### 3. Single Responsibility (Controllers)

**Problema:** Um controller gigante com múltiplas responsabilidades.

**Solução:** Separar por domínio/responsabilidade.

#### PrintersController
**Responsabilidade:** Operações básicas de impressão

```typescript
@Controller('printers')
export class PrintersController {
  @Get()               // GET /printers
  @Post('print')       // POST /printers/print
}
```

#### PrintersManagementController
**Responsabilidade:** Gerenciamento avançado de filas

```typescript
@Controller('printers/management')
export class PrintersManagementController {
  @Get('test')                     // GET /printers/management/test
  @Get(':id/status')               // GET /printers/management/:id/status
  @Get(':id/queue')                // GET /printers/management/:id/queue
  @Delete(':id/queue/:jobId')      // DELETE /printers/management/:id/queue/:jobId
  @Post(':id/pause')               // POST /printers/management/:id/pause
  @Post(':id/resume')              // POST /printers/management/:id/resume
}
```

**Vantagens:**
- ✅ Fácil localizar funcionalidades
- ✅ Documentação clara
- ✅ Testes isolados
- ✅ Prefixos de rota diferentes

---

### 4. Repository Pattern (Cache)

**Problema:** Lógica de cache espalhada pelo service.

**Solução:** Abstrair cache em métodos dedicados.

```typescript
export class PrintersService {
  private async getCachedPrinters(): Promise<CacheEntry | null> {
    const cached = await this.redis.get(CACHE_KEY);
    if (!cached) return null;
    
    return JSON.parse(cached);
  }

  private async setCachedPrinters(printers: Printer[]): Promise<void> {
    const cacheEntry: CacheEntry = {
      printers,
      lastUpdated: Date.now(),
    };
    
    await this.redis.setex(
      CACHE_KEY,
      CACHE_TTL_SECONDS,
      JSON.stringify(cacheEntry),
    );
  }
  
  async list(): Promise<Printer[]> {
    const cached = await this.getCachedPrinters();
    
    if (cached) {
      const age = (Date.now() - cached.lastUpdated) / 1000;
      
      if (age < CACHE_STALE_SECONDS) {
        console.log('✅ Cache HIT');
        return cached.printers;
      }
      
      console.log('⚠️ Cache stale - retornando + atualizando background');
      this.refreshCacheInBackground();
      return cached.printers;
    }
    
    console.log('❌ Cache MISS - buscando do SMB');
    const printers = await this.adapter.listPrinters();
    await this.setCachedPrinters(printers);
    return printers;
  }
}
```

**Vantagens:**
- ✅ Lógica de cache isolada
- ✅ Fácil mudar estratégia
- ✅ Testável isoladamente

---

### 5. Stale-While-Revalidate

**Problema:** Cache expirando causando latência/erros.

**Solução:** Retornar cache antigo + atualizar em background.

```typescript
const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;  // 30 dias
const CACHE_STALE_MS = 5 * 60 * 1000;          // 5 minutos

async list(): Promise<Printer[]> {
  const cached = await this.getCachedPrinters();
  
  if (!cached) {
    // Cache MISS - busca bloqueante
    return this.fetchAndCache();
  }
  
  const age = Date.now() - cached.lastUpdated;
  
  if (age < CACHE_STALE_MS) {
    // Cache fresco - retorna imediatamente
    return cached.printers;
  }
  
  // Cache stale - retorna antigo + refresh em background
  this.refreshCacheInBackground();
  return cached.printers;
}

private async refreshCacheInBackground(): Promise<void> {
  if (this.isRefreshing) return;
  
  this.isRefreshing = true;
  
  try {
    const printers = await this.adapter.listPrinters();
    await this.setCachedPrinters(printers);
    console.log('📦 Cache atualizado em background');
  } finally {
    this.isRefreshing = false;
  }
}
```

**Vantagens:**
- ✅ **Performance** - Respostas rápidas (<2ms)
- ✅ **Disponibilidade** - Nunca retorna erro por cache expirado
- ✅ **Resiliência** - Se SMB cair, usa cache antigo
- ✅ **Kafka-friendly** - Consumer nunca falha

---

### 6. Hybrid Architecture (HTTP + Kafka)

**Problema:** API precisa servir HTTP e consumir Kafka simultaneamente.

**Solução:** NestJS Hybrid Application.

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  const kafkaBrokers = configService.get('KAFKA_BROKERS');

  // Adiciona microservice Kafka SE configurado
  if (kafkaBrokers) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: configService.get('KAFKA_CLIENT_ID'),
          brokers: kafkaBrokers.split(','),
        },
        consumer: {
          groupId: configService.get('KAFKA_GROUP_ID'),
        },
      },
    });

    await app.startAllMicroservices();
    console.log('✅ Kafka consumer iniciado');
  }

  await app.listen(3000);
  console.log('🚀 API HTTP rodando');
}
```

**Vantagens:**
- ✅ Um único processo
- ✅ Compartilha services (cache, adapter)
- ✅ Opcional (se não configurar Kafka, só roda HTTP)
- ✅ Escalável (múltiplas instâncias com consumer group)

---

### 7. Global Module Pattern

**Problema:** Injetar Redis em vários módulos é verboso.

**Solução:** `@Global()` module.

```typescript
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => new Redis(/* ... */),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
```

```typescript
// Qualquer service pode injetar sem importar RedisModule
@Injectable()
export class PrintersService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}
}
```

**Vantagens:**
- ✅ DRY - import uma vez em AppModule
- ✅ Singleton global
- ✅ Conveniente para serviços compartilhados

---

### 8. DTO Validation

**Problema:** Validar dados de entrada manualmente.

**Solução:** class-validator + class-transformer.

```typescript
// dtos/print.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class PrintDto {
  @IsString()
  @IsNotEmpty()
  printerId: string;

  @IsString()
  @IsNotEmpty()
  fileBase64: string;
}
```

```typescript
// printers.controller.ts
@Post('print')
async print(@Body() dto: PrintDto) {
  // dto já validado automaticamente
  return this.printersService.print(dto);
}
```

**Vantagens:**
- ✅ Validação automática
- ✅ Respostas 400 com erros claros
- ✅ TypeScript type-safe

---

## 🎯 SOLID Principles

### Single Responsibility
- ✅ PrintersController - operações básicas
- ✅ PrintersManagementController - gerenciamento avançado
- ✅ PrintersService - lógica + cache
- ✅ PrintersManagementService - operações rpcclient

### Open/Closed
- ✅ Adicionar novo protocolo (IPP) sem modificar services
- ✅ Apenas criar `IppAdapter implements IPrinterAdapter`

### Liskov Substitution
- ✅ Qualquer implementação de `IPrinterAdapter` funciona
- ✅ MockPrinterAdapter substitui SmbAdvancedAdapter em testes

### Interface Segregation
- ✅ IPrinterAdapter - métodos essenciais
- ✅ SmbAdvancedAdapter - métodos extras além da interface

### Dependency Inversion
- ✅ Services dependem de `IPrinterAdapter` (abstração)
- ✅ Não dependem de `SmbClientAdapter` (implementação)

---

## 📊 Fluxo de Dados

```
HTTP Request                 Kafka Message
     │                            │
     ▼                            ▼
┌──────────────┐         ┌──────────────┐
│ Controller   │         │   Consumer   │
└──────┬───────┘         └──────┬───────┘
       │                        │
       └───────┬────────────────┘
               ▼
       ┌──────────────┐
       │   Service    │
       │  (+ cache)   │
       └──────┬───────┘
              │
              ├─── Redis (cache)
              │
              └─── Adapter (interface)
                      │
                      ├─── SmbClientAdapter
                      ├─── SmbAdvancedAdapter
                      ├─── IppAdapter
                      └─── MockPrinterAdapter
```

---

## 🧪 Testabilidade

### Testes Unitários

```typescript
describe('PrintersService', () => {
  let service: PrintersService;
  let mockAdapter: MockPrinterAdapter;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(async () => {
    mockAdapter = new MockPrinterAdapter();
    mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
    } as any;

    const module = await Test.createTestingModule({
      providers: [
        PrintersService,
        { provide: PRINTER_ADAPTER, useValue: mockAdapter },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get(PrintersService);
  });

  it('should return cached printers', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({
      printers: [{ id: '1', name: 'Test' }],
      lastUpdated: Date.now(),
    }));

    const result = await service.list();
    
    expect(result).toHaveLength(1);
    expect(mockAdapter.listPrinters).not.toHaveBeenCalled(); // Usou cache!
  });
});
```

---

## 🎯 Quando Usar Módulos Separados?

**Módulo Único** (atual) é apropriado quando:
- ✅ Funcionalidades relacionadas ao mesmo domínio
- ✅ Compartilham providers (adapter, cache)
- ✅ Projeto de tamanho médio

**Módulos Separados** quando:
- 🚧 Features completamente independentes (ex: auth, billing)
- 🚧 Equipes diferentes mantendo cada módulo
- 🚧 Necessidade de lazy loading

---

## 📚 Referências

- [NestJS Modules](https://docs.nestjs.com/modules)
- [Dependency Injection](https://docs.nestjs.com/fundamentals/custom-providers)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Adapter Pattern](https://refactoring.guru/design-patterns/adapter)
- [Stale-While-Revalidate](https://web.dev/stale-while-revalidate/)
