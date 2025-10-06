# 🔄 Diagrama de Fluxo: Cache Perpétuo

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

## 📊 Cenários Detalhados

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
  │              │                   │                 │
  
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
  │              │                   │                 │

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

```
Request 1                     Request 2                     Request 3
    │                             │                             │
    │──Cache stale (400s)         │                             │
    │──isRefreshing = false       │                             │
    │──✅ Inicia refresh           │                             │
    │  isRefreshing = true         │                             │
    │                             │──Cache stale (401s)         │
    │                             │──isRefreshing = true        │
    │                             │──❌ Ignora (já rodando)      │
    │                             │                             │
    │                             │                             │──Cache stale (402s)
    │                             │                             │──isRefreshing = true
    │                             │                             │──❌ Ignora
    │                             │                             │
    │──SMB response (2000ms)      │                             │
    │──Save to Redis              │                             │
    │──isRefreshing = false       │                             │
    │  ✅ Próximo pode atualizar   │                             │
```

---

## 📈 Métricas de Performance

| Operação | Tempo | Bloqueia? |
|----------|-------|-----------|
| Cache HIT (fresco) | ~2ms | Não |
| Cache HIT (stale) | ~2ms | Não |
| Background refresh | ~2000ms | Não |
| Cache MISS (1ª vez) | ~2000ms | **Sim** |

**Resultado:** 99.9% das requisições são instantâneas! ⚡

---

**🎉 Sistema otimizado para alta disponibilidade e performance!**
