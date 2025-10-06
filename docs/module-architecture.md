# Arquitetura de Módulos NestJS

Documentação sobre a estrutura modular do projeto, explicando as decisões arquiteturais e boas práticas aplicadas.

---

## 🏗️ Estrutura do PrintersModule

O projeto utiliza um **módulo único** que agrupa todas as funcionalidades relacionadas a impressoras:

```typescript
@Module({
  controllers: [
    PrintersController,           // GET /printers, POST /printers/print
    PrintersManagementController, // GET /printers/management/*
  ],
  providers: [
    { provide: PRINTER_ADAPTER, ... }, // Adapter via interface
    PrintersService,                    // Cache + básico
    PrintersManagementService,          // Gerenciamento avançado
  ],
  exports: [PrintersService],
})
export class PrintersModule {}
```

**Razões para essa estrutura:**
- ✅ Ambos lidam com o mesmo domínio (impressoras)
- ✅ Compartilham o mesmo adapter via Dependency Injection
- ✅ PrintersManagementService depende de PrintersService (cache)
- ✅ Não há necessidade de isolamento em módulos separados
- ✅ Simplicidade e manutenibilidade

---

## 📐 Boas Práticas Aplicadas

### 1. Single Responsibility (Controllers)

Cada controller tem uma responsabilidade específica e bem definida:

#### PrintersController
**Responsabilidade:** Operações básicas de impressão

**Prefixo:** `/printers`

```typescript
@Controller('printers')
export class PrintersController {
  @Get()               // GET /printers - Lista impressoras
  @Post('print')       // POST /printers/print - Envia PDF
}
```

#### PrintersManagementController
**Responsabilidade:** Gerenciamento avançado de filas

**Prefixo:** `/printers/management`

```typescript
@Controller('printers/management')
export class PrintersManagementController {
  @Get('test')                     // GET /printers/management/test
  @Get(':id/status')               // GET /printers/management/:id/status
  @Get(':id/queue')                // GET /printers/management/:id/queue
  @Delete(':id/queue/:jobId')      // DELETE /printers/management/:id/queue/:jobId
  @Post(':id/pause')               // POST /printers/management/:id/pause
  @Post(':id/resume')              // POST /printers/management/:id/resume
  // ... etc
}
```

**Benefícios:**
- ✅ Cada controller tem propósito claro
- ✅ Prefixos diferentes evitam conflitos de rotas
- ✅ Fácil de testar isoladamente
- ✅ Documentação mais organizada
- ✅ Rotas agrupadas logicamente

---

### 2. Dependency Injection via Interface

Os services dependem de **abstrações** (interfaces) ao invés de implementações concretas:

```typescript
@Injectable()
export class PrintersManagementService {
  constructor(
    @Inject(PRINTER_ADAPTER) private readonly adapter: IPrinterAdapter,
  ) {}
}
```

**Por que usar interface?**
- ✅ **Flexibilidade:** Troca de protocolo sem alterar o service
- ✅ **Testabilidade:** Usa MockPrinterAdapter em testes
- ✅ **Desacoplamento:** Service não conhece implementação
- ✅ **SOLID:** Segue Dependency Inversion Principle

**Exemplo prático:**
```typescript
// Produção: usa SMB avançado
{ provide: PRINTER_ADAPTER, useClass: SmbAdvancedAdapter }

// Testes: usa Mock
{ provide: PRINTER_ADAPTER, useClass: MockPrinterAdapter }

// Futuro: usar IPP
{ provide: PRINTER_ADAPTER, useClass: IppAdvancedAdapter }
```

---

### 3. Provider Único com Interface

Um único provider é compartilhado por todos os services:

```typescript
providers: [
  {
    provide: PRINTER_ADAPTER,
    useFactory: (): SmbAdvancedAdapter => {
      const cfg: SmbCreds = {
        host: process.env.SMB_HOST!,
        user: process.env.SMB_USER!,
        pass: process.env.SMB_PASS!,
        domain: process.env.SMB_DOMAIN || undefined,
      };
      return new SmbAdvancedAdapter(cfg);
    },
  },
  PrintersService,              // Injeta PRINTER_ADAPTER
  PrintersManagementService,    // Injeta PRINTER_ADAPTER
]
```

**Vantagens:**
- ✅ **Singleton:** Uma única instância do adapter
- ✅ **Eficiência:** Reutiliza conexões e recursos
- ✅ **Configuração centralizada:** Mudanças em um único lugar
- ✅ **Consistência:** Ambos os services usam mesma implementação

---

## 🎯 Quando Usar Módulos Separados?

Nossa escolha por módulo único é apropriada para o projeto atual. Porém, em projetos maiores, você pode precisar separar em múltiplos módulos.

### Cenário 1: Features Independentes

**Exemplo de separação:**
```typescript
// Impressoras e Scanner são domínios diferentes
@Module({ /* ... */ })
export class PrintersModule {}

@Module({ /* ... */ })
export class ScannersModule {}

@Module({
  imports: [PrintersModule, ScannersModule],
})
export class AppModule {}
```

**Quando usar:**
- Domínios completamente diferentes
- Features sem dependências entre si
- Podem ser habilitadas/desabilitadas independentemente

---

### Cenário 2: Reutilização entre Módulos

**Exemplo de módulos com dependências:**
```typescript
// printers/printers.module.ts
@Module({
  controllers: [PrintersController],
  providers: [PrintersService],
  exports: [PrintersService], // ← Exporta para outros módulos
})
export class PrintersModule {}

// printers-management/printers-management.module.ts
@Module({
  imports: [PrintersModule], // ← Importa PrintersService
  controllers: [PrintersManagementController],
  providers: [PrintersManagementService],
})
export class PrintersManagementModule {}
```

**Quando usar:**
- Features podem ser usadas independentemente
- Módulo pode ser reutilizado em outros projetos
- Times separados mantêm cada módulo
- Lazy loading é necessário

---

### Cenário 3: Microservices/Grandes Aplicações

```typescript
@Module({
  imports: [
    RouterModule.register([
      {
        path: 'printers',
        module: PrintersModule, // ← Carrega apenas quando /printers for acessado
      },
    ]),
  ],
})
export class AppModule {}
```

**Quando usar:**
- Aplicação muito grande
- Otimização de startup
- Arquitetura de microservices

---

## ✅ Nossa Escolha Justificada

### Por que módulo único?

A decisão de manter controllers e services no mesmo módulo é **intencional e apropriada** porque:

1. **Domínio Único:** Ambos lidam com impressoras
2. **Dependência Forte:** Management precisa de PrintersService (cache)
3. **Sem Reutilização:** Não são usados em outros contextos
4. **Complexidade Desnecessária:** Separar não traria benefícios reais
5. **YAGNI Principle:** "You Ain't Gonna Need It" - mantemos simples

### Estrutura de Arquivos

```
src/printers/
├── printers.module.ts                    # ← Módulo único
│
├── printers.controller.ts                # GET /printers, POST /printers/print
├── printers.service.ts                   # Cache + lógica básica
│
├── printers-management.controller.ts     # GET /printers/management/*
└── printers-management.service.ts        # Lógica avançada
```

**Benefícios:**
- ✅ Simplicidade (controllers separados, módulo único)
- ✅ Acoplamento apropriado (mesmo domínio)
- ✅ DI compartilhado (mesmo adapter)
- ✅ Manutenção mais fácil
- ✅ Navegação clara no projeto
- ✅ Sem conflito de rotas (prefixos diferentes)

---

## 🔄 Evolução Futura

Se o projeto crescer significativamente, a estrutura pode evoluir:

### Opção 1: Subpastas no Mesmo Módulo

```
src/printers/
├── printers.module.ts
├── core/
│   ├── printers.controller.ts
│   └── printers.service.ts
└── management/
    ├── management.controller.ts
    └── management.service.ts
```

**Quando usar:** Módulo está ficando grande, mas ainda é único domínio

### Opção 2: Módulos Separados

```
src/
├── printers-core/
│   └── printers-core.module.ts
│
└── printers-management/
    └── printers-management.module.ts (importa PrintersCoreModule)
```

**Quando usar:** Features precisam ser independentes ou reutilizadas

**Por enquanto:** Estrutura atual é ideal! 👍

---

## 🏛️ Fluxo de Dependências

```
PrintersService ──────────┐
                          ├──→ PRINTER_ADAPTER (interface)
PrintersManagementService ┘         ↓
                              SmbAdvancedAdapter (implementação concreta)
```

**Como funciona:**
1. Ambos os services injetam a interface `IPrinterAdapter`
2. O módulo configura qual implementação usar (via `PRINTER_ADAPTER`)
3. NestJS cria uma única instância e injeta em ambos
4. Services não conhecem a implementação concreta

**Resultado:**
- ✅ Services testáveis isoladamente
- ✅ Fácil trocar implementação
- ✅ Código desacoplado e flexível

---

## 📚 Referências NestJS

### Documentação Oficial

- [Modules](https://docs.nestjs.com/modules)
- [Dependency Injection](https://docs.nestjs.com/fundamentals/custom-providers)
- [Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules)

### Padrões Recomendados

1. **Feature Modules:** Agrupe por feature/domínio
2. **Shared Modules:** Para código reutilizado
3. **Core Module:** Para serviços singleton globais
4. **Config Module:** Centraliza configurações

### Nossa Aplicação

```
AppModule (raiz)
└── PrintersModule (feature)
    ├── PRINTER_ADAPTER (shared via DI)
    ├── PrintersService
    └── PrintersManagementService
```

---

## 💡 Dicas de Organização

### ✅ Criar módulo separado quando:

- Domínio diferente (Users, Auth, Payments, etc)
- Pode ser desabilitado independentemente
- Será reutilizado em outros projetos
- Time diferente vai manter
- Lazy loading é necessário

### ✅ Manter no mesmo módulo quando:

- Mesmo domínio (Printers + PrintersManagement)
- Fortemente acoplados
- Compartilham providers
- Sempre usados juntos
- Time único mantém ambos

---

## 🎓 Conclusão

A arquitetura atual com **controllers/services separados no mesmo módulo** é:

✅ **Apropriada** - Para o tamanho e complexidade atual  
✅ **Flexível** - Usa interfaces para desacoplar  
✅ **Testável** - DI permite mocks fáceis  
✅ **Manutenível** - Organização clara e lógica  
✅ **Profissional** - Segue boas práticas do NestJS  
✅ **Escalável** - Pode evoluir conforme necessário  

Esta estrutura demonstra compreensão sólida de arquitetura de software e boas práticas do framework NestJS! 🚀

---

## 🎯 Quando Usar Módulos Separados?

### Cenário 1: Features Independentes

**Se tivéssemos:**
```typescript
// Impressoras e Scanner são domínios diferentes
PrintersModule    → Gerencia impressoras
ScannersModule    → Gerencia scanners
```

**Estrutura:**
```typescript
// printers/printers.module.ts
@Module({
  controllers: [PrintersController],
  providers: [PrintersService],
  exports: [PrintersService],
})
export class PrintersModule {}

// scanners/scanners.module.ts
@Module({
  controllers: [ScannersController],
  providers: [ScannersService],
})
export class ScannersModule {}

// app.module.ts
@Module({
  imports: [PrintersModule, ScannersModule],
})
export class AppModule {}
```

---

### Cenário 2: Reutilização entre Módulos

**Se Management fosse usado por outros módulos:**
```typescript
// printers/printers.module.ts
@Module({
  controllers: [PrintersController],
  providers: [PrintersService],
  exports: [PrintersService], // ← Exporta para outros módulos
})
export class PrintersModule {}

// printers-management/printers-management.module.ts
@Module({
  imports: [PrintersModule], // ← Importa PrintersService
  controllers: [PrintersManagementController],
  providers: [PrintersManagementService],
})
export class PrintersManagementModule {}

// app.module.ts
@Module({
  imports: [
    PrintersModule,           // ← Pode ser usado sozinho
    PrintersManagementModule, // ← Adicional, depende do PrintersModule
  ],
})
export class AppModule {}
```

**Quando usar:**
- Features podem ser habilitadas/desabilitadas independentemente
- Módulo pode ser usado em outros projetos
- Time separado mantém cada módulo

---

### Cenário 3: Lazy Loading (Microservices/Grandes Apps)

```typescript
// app.module.ts
@Module({
  imports: [
    RouterModule.register([
      {
        path: 'printers',
        module: PrintersModule, // ← Carrega apenas quando /printers for acessado
      },
    ]),
  ],
})
```

**Quando usar:**
- Aplicação muito grande
- Otimização de startup
- Microservices architecture

---

## ✅ Nossa Escolha Justificada

### Por que **não** separamos em módulos?

1. **Domínio Único:** Ambos lidam com impressoras
2. **Dependência Forte:** Management precisa de PrintersService (cache)
3. **Sem Reutilização:** Ninguém mais usa esses controllers/services
4. **Complexidade Desnecessária:** Separar não traria benefícios reais

### Estrutura Final

```
src/printers/
├── printers.module.ts                    # ← Módulo único
│
├── printers.controller.ts                # Operações básicas
├── printers.service.ts                   # Cache + lógica básica
│
├── printers-management.controller.ts     # Operações avançadas
└── printers-management.service.ts        # Lógica avançada
```

**Benefícios:**
- ✅ Simplicidade (menos arquivos)
- ✅ Acoplamento apropriado (mesmo domínio)
- ✅ DI compartilhado (mesmo adapter)
- ✅ Manutenção mais fácil

---

## 🔄 Evolução Futura

### Se crescer muito, podemos refatorar:

```
src/
├── printers/
│   ├── printers.module.ts
│   ├── core/
│   │   ├── printers.controller.ts
│   │   └── printers.service.ts
│   └── management/
│       ├── management.controller.ts
│       └── management.service.ts
│
└── adapters/
    └── (adapters compartilhados)
```

Ou até mesmo:

```
src/
├── printers-core/
│   └── printers-core.module.ts
│
└── printers-management/
    └── printers-management.module.ts (importa PrintersCoreModule)
```

**Mas por enquanto, YAGNI (You Ain't Gonna Need It)!**

---

## 📚 Referências NestJS

### Documentação Oficial

- [Modules](https://docs.nestjs.com/modules)
- [Dependency Injection](https://docs.nestjs.com/fundamentals/custom-providers)
- [Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules)

### Padrões Recomendados

1. **Feature Modules:** Agrupe por feature/domínio
2. **Shared Modules:** Para código reutilizado
3. **Core Module:** Para serviços singleton globais
4. **Config Module:** Centraliza configurações

### Nossa Aplicação

```
AppModule (raiz)
└── PrintersModule (feature)
    ├── PRINTER_ADAPTER (shared via DI)
    ├── PrintersService
    └── PrintersManagementService
```

---

## 💡 Dicas de Organização

### Quando criar módulo separado:

- ✅ Domínio diferente (Users, Auth, Payments, etc)
- ✅ Pode ser desabilitado independentemente
- ✅ Será reutilizado em outros projetos
- ✅ Time diferente vai manter
- ✅ Lazy loading é necessário

### Quando manter no mesmo módulo:

- ✅ Mesmo domínio (Printers + PrintersManagement)
- ✅ Fortemente acoplados
- ✅ Compartilham providers
- ✅ Sempre usados juntos
- ✅ Time único mantém ambos

---

## 🎓 Conclusão

Nossa arquitetura atual com **controllers/services separados no mesmo módulo** é:

✅ **Válida** - Segue boas práticas do NestJS  
✅ **Apropriada** - Para o tamanho e complexidade atual  
✅ **Flexível** - Usa interfaces para desacoplar  
✅ **Testável** - DI permite mocks fáceis  
✅ **Manutenível** - Organização clara e lógica  

Se o projeto crescer significativamente, podemos refatorar para módulos separados. Por enquanto, a estrutura atual é ideal! 👍
