# 📦 Sistema de Cache Redis

Cache perpétuo com estratégia **stale-while-revalidate** para alta disponibilidade.

---

## 🎯 Objetivo

**Problema:** Cache tradicional com TTL curto (5min) causava erros 500 quando expirava durante processamento Kafka.

**Solução:** Cache perpétuo que **NUNCA** retorna erro por expiração - usa dados stale e atualiza em background.

---

## 🏗️ Arquitetura

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

---

## ⚙️ Configuração

### Docker Compose

```yaml
redis:
  image: redis:7-alpine
  container_name: printers-redis
  ports:
    - "6379:6379"
  volumes:
    - redis-data:/data
  networks:
    - printers-network
  command: redis-server --save 60 1 --loglevel warning
```

---

### Variáveis de Ambiente (.env)

```env
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0
```

---

### RedisModule (NestJS)

```typescript
// src/redis/redis.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const client = new Redis({
          host: configService.get('REDIS_HOST'),
          port: parseInt(configService.get('REDIS_PORT')),
          db: parseInt(configService.get('REDIS_DB')),
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 50, 2000),
        });

        client.on('connect', () => console.log('✅ Redis conectado'));
        client.on('error', (err) => console.error('❌ Erro Redis:', err));

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
```

---

## 📊 Estrutura do Cache

### Chave Redis

```
printers:list
```

---

### Formato do Valor

```json
{
  "printers": [
    {
      "id": "a1b2c3d4e5f6g7h8",
      "name": "HP LaserJet 9020",
      "uri": "smb://servidor/HP%20LaserJet%209020",
      "cachedAt": "2025-01-06T14:30:00.000Z"
    }
  ],
  "lastUpdated": 1704551400000
}
```

---

### Parâmetros de Cache

```typescript
const CACHE_KEY = 'printers:list';
const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;  // 30 dias (2.592.000s)
const CACHE_STALE_MS = 5 * 60 * 1000;          // 5 minutos (300.000ms)
```

---

## 🔄 Fluxo de Funcionamento

### Diagrama de Decisão

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REQUISIÇÃO (GET /printers ou Kafka)              │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Existe cache Redis?   │
                    └────────┬───────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
               NÃO                       SIM
                │                         │
                ▼                         ▼
    ┌───────────────────────┐   ┌───────────────────────┐
    │  CACHE MISS (1ª vez)  │   │  Calcular idade cache │
    │  ❌ Cache vazio       │   │  age = now - lastUpd  │
    └───────────┬───────────┘   └───────────┬───────────┘
                │                            │
                │                 ┌──────────┴──────────┐
                │                 │                     │
                │            age < 5min            age > 5min
                │            (FRESCO)              (STALE)
                │                 │                     │
                │                 ▼                     ▼
                │     ┌──────────────────┐   ┌────────────────────┐
                │     │  Cache HIT       │   │  Cache HIT (stale) │
                │     │  ✅ Retorna      │   │  ✅ Retorna cache  │
                │     │     imediatamente │   │  ⚠️ Mas atualiza   │
                │     └──────────────────┘   │     em background  │
                │                            └────────┬───────────┘
                │                                     │
                │                                     ▼
                │                         ┌────────────────────┐
                │                         │ isRefreshing?      │
                │                         └────────┬───────────┘
                │                                  │
                │                         ┌────────┴────────┐
                │                         │                 │
                │                        NÃO               SIM
                │                         │                 │
                │                         ▼                 ▼
                │              ┌──────────────────┐  ┌──────────────┐
                │              │ Inicia refresh   │  │ Ignora       │
                │              │ em background    │  │ (já rodando) │
                │              └────────┬─────────┘  └──────────────┘
                │                       │
                ▼                       ▼
    ┌───────────────────────────────────────────┐
    │         Buscar do SMB (smbclient)         │
    │    (Bloqueia só se cache totalmente vazio)│
    └───────────────────┬───────────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │  Salvar no Redis      │
            │  • printers[]         │
            │  • lastUpdated: now   │
            │  • TTL: 30 dias       │
            └───────────┬───────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │  📦 Cache atualizado  │
            │  ✅ Resposta enviada  │
            └───────────────────────┘
```

---

## 📋 Cenários Detalhados

### **Cenário 1: Primeira Requisição (Cache Vazio)**

```
Cliente         API                Redis              SMB
  │              │                   │                 │
  │─GET /printers─►                  │                 │
  │              │──Existe cache?───►│                 │
  │              │◄─────NÃO──────────│                 │
  │              │                   │                 │
  │              │──List printers───────────────────►  │
  │              │◄────45 impressoras────────────────  │
  │              │                   │                 │
  │              │──SETEX (30d)─────►│                 │
  │              │◄─────OK───────────│                 │
  │              │                   │                 │
  │◄─45 impressoras                  │                 │
  
Tempo: ~2000ms (busca SMB)
Log: ❌ Cache MISS - Buscando impressoras do SMB
```

---

### **Cenário 2: Cache Fresco (<5min)**

```
Cliente         API                Redis              SMB
  │              │                   │                 │
  │─GET /printers─►                  │                 │
  │              │──GET cache───────►│                 │
  │              │◄─{printers, ts}───│                 │
  │              │                   │                 │
  │              │ (age = 120s < 300s)                 │
  │              │ ✅ FRESH!          │                 │
  │              │                   │                 │
  │◄─45 impressoras                  │                 │

Tempo: ~2ms (Redis)
Log: ✅ Cache HIT - Retornando impressoras do Redis
```

---

### **Cenário 3: Cache Stale (>5min)**

```
Cliente         API                Redis              SMB
  │              │                   │                 │
  │─GET /printers─►                  │                 │
  │              │──GET cache───────►│                 │
  │              │◄─{printers, ts}───│                 │
  │              │                   │                 │
  │              │ (age = 400s > 300s)                 │
  │              │ ⚠️ STALE!          │                 │
  │              │                   │                 │
  │◄─45 impressoras (cache antigo)   │                 │
  │              │                   │                 │
  │              │─────BACKGROUND────────────────────► │
  │              │                   │  List printers  │
  │              │◄────45 impressoras (atualizado)──── │
  │              │                   │                 │
  │              │──SETEX (30d)─────►│                 │
  │              │◄─────OK───────────│                 │

Tempo resposta: ~2ms (não espera SMB!)
Tempo total: ~2000ms (atualiza depois)
Log: ⚠️ Cache stale (400s old) - Atualizando em background...
     🔄 Background refresh iniciado
     📦 Cache atualizado no Redis (45 impressoras, TTL: 2592000s)
```

---

### **Cenário 4: Kafka Print com Cache Stale**

```
Kafka           API                Redis              SMB       Impressora
  │              │                   │                 │             │
  │─print job────►│                  │                 │             │
  │              │──GET cache───────►│                 │             │
  │              │◄─{printers, ts}───│                 │             │
  │              │                   │                 │             │
  │              │ (age = 500s > 300s)                 │             │
  │              │ ⚠️ STALE!          │                 │             │
  │              │                   │                 │             │
  │              │ ✅ USA CACHE ANTIGO!                │             │
  │              │                   │                 │             │
  │              │────────DRY_RUN────────────────────────────────►  │
  │              │                   │                 │ (simulado)  │
  │◄─success─────│                   │                 │             │
  │              │                   │                 │             │
  │              │─────BACKGROUND────────────────────► │             │
  │              │     (atualiza depois)               │             │

Tempo: ~300ms (DRY_RUN) ou ~1500ms (real)
Resultado: ✅ SEMPRE FUNCIONA! Nunca erro 500!
```

---

## 🎯 Comportamento por Idade

```
Idade do Cache          Comportamento                     Logs
─────────────────────────────────────────────────────────────────
0-5min (fresco)        ✅ Retorna cache                  ✅ Cache HIT
                       ⏸️ Não atualiza
─────────────────────────────────────────────────────────────────
5min-30dias (stale)    ✅ Retorna cache antigo           ⚠️ Cache stale
                       🔄 Atualiza em background         📦 Cache atualizado
─────────────────────────────────────────────────────────────────
>30 dias (expirado)    ✅ Busca do SMB (bloqueia)        ❌ Cache MISS
                       📦 Salva no Redis                 📦 Cache atualizado
─────────────────────────────────────────────────────────────────
```

---

## 🔒 Proteção contra Refresh Duplicado

```typescript
private isRefreshing = false;

private async refreshCacheInBackground(): Promise<void> {
  // Previne múltiplos refreshes simultâneos
  if (this.isRefreshing) {
    console.log('[PrintersService] 🔄 Refresh já em andamento, ignorando duplicata');
    return;
  }

  this.isRefreshing = true;
  console.log('[PrintersService] 🔄 Background refresh iniciado');

  try {
    const printers = await this.adapter.listPrinters();
    const cacheEntry: CacheEntry = {
      printers: printers.map(/* ... */),
      lastUpdated: Date.now(),
    };

    await this.redis.setex(
      CACHE_KEY,
      CACHE_TTL_SECONDS,
      JSON.stringify(cacheEntry),
    );

    console.log(`[PrintersService] 📦 Cache atualizado no Redis (${printers.length} impressoras, TTL: ${CACHE_TTL_SECONDS}s)`);
  } catch (error) {
    console.error('[PrintersService] ❌ Erro ao atualizar cache em background:', error.message);
  } finally {
    this.isRefreshing = false;
  }
}
```

**Cenário:**
```
Request 1                     Request 2                     Request 3
    │                             │                             │
    │──Cache stale (400s)         │                             │
    │──isRefreshing = false       │                             │
    │──Inicia refresh             │                             │
    │──isRefreshing = true        │                             │
    │                             │──Cache stale (401s)         │
    │                             │──isRefreshing = true        │
    │                             │──IGNORA (já rodando)        │
    │                             │                             │──Cache stale (402s)
    │                             │                             │──isRefreshing = true
    │                             │                             │──IGNORA (já rodando)
    │                             │                             │
    │──Refresh concluído          │                             │
    │──isRefreshing = false       │                             │
```

---

## 📊 Performance

| Operação                    | Tempo Médio | Log                               |
|-----------------------------|-------------|-----------------------------------|
| **Cache HIT (fresco)**      | ~2ms        | ✅ Cache HIT                      |
| **Cache HIT (stale)**       | ~2ms        | ⚠️ Cache stale (XXs old)          |
| **Cache MISS (1ª vez)**     | ~2000ms     | ❌ Cache MISS                     |
| **Background refresh**      | ~2000ms     | 🔄 Background refresh iniciado    |
| **Impressão (DRY_RUN)**     | ~300ms      | 🧪 [DRY_RUN] Simulando impressão |
| **Impressão (real)**        | ~1500ms     | ✅ Impressão enviada              |

---

## 🎯 Vantagens do Cache Perpétuo

- ✅ **Alta Disponibilidade** - API nunca retorna erro 500 por cache expirado
- ✅ **Performance** - Respostas em ~2ms mesmo com cache stale
- ✅ **Resiliência** - Se SMB cair, usa cache antigo (até 30 dias)
- ✅ **Escalabilidade** - Background refresh não bloqueia requests
- ✅ **Kafka-friendly** - Consumer nunca falha por cache expirado
- ✅ **Proteção** - Flag `isRefreshing` previne refreshes duplicados

---

## 🧪 Verificação

### Ver cache no Redis

```bash
docker exec -it printers-redis redis-cli

# Ver chave
GET printers:list

# Ver TTL
TTL printers:list

# Sair
exit
```

---

### Logs de sucesso

```
[PrintersService] ✅ Cache HIT - Retornando impressoras do Redis
[PrintersService] Cache age: 120s (< 300s) - Cache fresco
```

```
[PrintersService] ✅ Cache HIT - Retornando impressoras do Redis
[PrintersService] ⚠️ Cache stale (400s old) - Atualizando em background...
[PrintersService] 🔄 Background refresh iniciado
[PrintersService] 📦 Cache atualizado no Redis (45 impressoras, TTL: 2592000s)
```

```
[PrintersService] ❌ Cache MISS - Buscando impressoras do SMB
[PrintersService] 📦 Cache atualizado no Redis (45 impressoras, TTL: 2592000s)
```
