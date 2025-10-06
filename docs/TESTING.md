# 🧪 Estratégias de Teste

Guia completo para testar a API de impressão, incluindo modo DRY_RUN para ambientes sem impressoras reais.

---

## 🎯 Modo DRY_RUN

**Problema:** Testar impressão sem hardware físico.

**Solução:** Flag `DRY_RUN=true` que simula impressões sem enviar para impressora real.

---

## ⚙️ Configuração

### Ativar DRY_RUN

```env
# .env
DRY_RUN=true
```

**Comportamento:**
- ✅ API funciona normalmente
- ✅ Cache funciona normalmente  
- ✅ Kafka funciona normalmente
- 🧪 Impressões são **SIMULADAS** (não enviam para SMB)
- 🧪 JobIDs são gerados como `job-mock-{timestamp}`

---

### Logs em DRY_RUN

```
[PrintersService] 🧪 [DRY_RUN] Simulando impressão para: HP LaserJet 9020 - jobId: job-mock-1704567890123
[KafkaConsumerController] ✅ Impressão enviada via Kafka - jobId: job-mock-1704567890123 (344ms)
```

---

## 📋 Testes Manuais

### 1. Health Check

```bash
curl http://localhost:3000/
```

**Resultado Esperado:**
```html
<h1>Hello World!</h1>
```

---

### 2. Listar Impressoras

```bash
curl http://localhost:3000/printers | jq '.'
```

**Resultado Esperado:**
```json
[
  {
    "id": "a1b2c3d4e5f6g7h8",
    "name": "HP LaserJet 9020",
    "uri": "smb://servidor/HP%20LaserJet%209020",
    "cachedAt": "2025-01-06T14:30:00.000Z"
  }
]
```

**Logs Esperados:**
- Primeira chamada: `❌ Cache MISS - Buscando impressoras do SMB`
- Segunda chamada: `✅ Cache HIT - Retornando impressoras do Redis`

---

### 3. Testar Cache Stale

```bash
# 1. Primeira chamada (popula cache)
curl http://localhost:3000/printers > /dev/null

# 2. Esperar 6 minutos
sleep 360

# 3. Segunda chamada (cache stale)
curl http://localhost:3000/printers | jq '.'
```

**Logs Esperados:**
```
[PrintersService] ✅ Cache HIT - Retornando impressoras do Redis
[PrintersService] ⚠️ Cache stale (400s old) - Atualizando em background...
[PrintersService] 🔄 Background refresh iniciado
[PrintersService] 📦 Cache atualizado no Redis (45 impressoras, TTL: 2592000s)
```

**Resultado:**
- ✅ Resposta rápida (~2ms) com cache antigo
- ✅ Cache atualizado em background (~2000ms)

---

### 4. Impressão via HTTP (DRY_RUN)

```bash
# 1. Obter ID da impressora
PRINTER_ID=$(curl -s http://localhost:3000/printers | jq -r '.[0].id')
echo "Printer ID: $PRINTER_ID"

# 2. Criar PDF de teste
cat > test.pdf << 'EOF'
%PDF-1.4
%âãÏÓ
3 0 obj
<</Type /Page
/Parent 1 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/ProcSet [/PDF /Text]
/Font <<
/F1 6 0 R
>>
>>
>>
endobj
4 0 obj
<</Length 44>>
stream
BT
/F1 24 Tf
100 700 Td
(Teste HTTP) Tj
ET
endstream
endobj
6 0 obj
<</Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
1 0 obj
<</Type /Pages
/Count 1
/Kids [3 0 R]
>>
endobj
2 0 obj
<</Type /Catalog
/Pages 1 0 R
>>
endobj
trailer
<</Size 7
/Root 2 0 R
>>
startxref
555
%%EOF
EOF

# 3. Converter para base64
PDF_BASE64=$(base64 -w 0 test.pdf)

# 4. Enviar para impressão
curl -X POST http://localhost:3000/printers/print \
  -H "Content-Type: application/json" \
  -d "{
    \"printerId\": \"$PRINTER_ID\",
    \"fileBase64\": \"$PDF_BASE64\"
  }" | jq '.'
```

**Resultado Esperado (DRY_RUN=true):**
```json
{
  "jobId": "job-mock-1704567890123"
}
```

**Logs Esperados:**
```
[PrintersService] ✅ Cache HIT - Retornando impressoras do Redis
[PrintersService] 🧪 [DRY_RUN] Simulando impressão para: HP LaserJet 9020 - jobId: job-mock-1704567890123
```

---

### 5. Impressão via Kafka (DRY_RUN)

#### Passo 1: Obter ID da Impressora

```bash
curl http://localhost:3000/printers | jq -r '.[0].id'
# Output: 0d31f2f9a6525f56
```

---

#### Passo 2: Entrar no Container Kafka

```bash
docker exec -it kafka bash
```

---

#### Passo 3: Iniciar Producer

```bash
/opt/kafka/bin/kafka-console-producer.sh \
  --topic print-jobs \
  --bootstrap-server kafka:9092
```

**Aguarde o prompt `>`**

---

#### Passo 4: Enviar Mensagem

Cole o JSON (substitua `printerId` pelo ID real):

```json
{"printerId":"0d31f2f9a6525f56","fileBase64":"JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlIC9QYWdlCi9QYXJlbnQgMSAwIFIKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KL0NvbnRlbnRzIDQgMCBSCi9SZXNvdXJjZXMgPDwKL1Byb2NTZXQgWy9QREYgL1RleHRdCi9Gb250IDw8Ci9GMSA2IDAgUgo+Pgo+Pgo+PgplbmRvYmoKNCAwIG9iago8PC9MZW5ndGggNDQ+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCA3MDAgVGQKKFRlc3RlIEthZmthKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjYgMCBvYmoKPDwvVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKPj4KZW5kb2JqCjEgMCBvYmoKPDwvVHlwZSAvUGFnZXMKL0NvdW50IDEKL0tpZHMgWzMgMCBSXQo+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlIC9DYXRhbG9nCi9QYWdlcyAxIDAgUgo+PgplbmRvYmoKdHJhaWxlcgo8PC9TaXplIDcKL1Jvb3QgMiAwIFIKPj4Kc3RhcnR4cmVmCjU1NQolJUVPRgo="}
```

**Pressione ENTER para enviar**

---

#### Passo 5: Sair

- **Ctrl+C** - parar producer
- `exit` - sair do container

---

#### Passo 6: Verificar Logs

```bash
docker logs printers-api --tail=20
```

**Logs Esperados (DRY_RUN=true):**
```
[KafkaConsumerController] 📨 Mensagem Kafka recebida - printerId: 0d31f2f9a6525f56
[PrintersService] ✅ Cache HIT - Retornando impressoras do Redis
[PrintersService] 🧪 [DRY_RUN] Simulando impressão para: HP M426f - Carazinho - jobId: job-mock-1704567890123
[KafkaConsumerController] ✅ Impressão enviada via Kafka - jobId: job-mock-1704567890123 (344ms)
```

---

## 🔧 Testes de Gerenciamento

### Status da Impressora

```bash
PRINTER_ID=$(curl -s http://localhost:3000/printers | jq -r '.[0].id')
curl http://localhost:3000/printers/management/$PRINTER_ID/status | jq '.'
```

**Resultado Esperado:**
```json
{
  "name": "HP LaserJet 9020",
  "status": "ONLINE",
  "jobsInQueue": 0,
  "statusMessage": null
}
```

---

### Listar Fila

```bash
curl http://localhost:3000/printers/management/$PRINTER_ID/queue | jq '.'
```

**Resultado Esperado:**
```json
[]
```

**Nota:** DRY_RUN não adiciona jobs reais à fila, então sempre vazio.

---

## 📊 Verificações de Infraestrutura

### Verificar Containers

```bash
docker ps
```

**Esperado:**
```
CONTAINER ID   IMAGE                    STATUS         PORTS
abc123         printers-api:latest      Up 5 minutes   0.0.0.0:3000->3000/tcp
def456         redis:7-alpine           Up 5 minutes   0.0.0.0:6379->6379/tcp
ghi789         apache/kafka:3.7.0       Up 5 minutes   0.0.0.0:9092->9092/tcp
```

---

### Verificar Redis

```bash
docker exec -it printers-redis redis-cli

# Ver cache
GET printers:list

# Ver TTL
TTL printers:list

# Sair
exit
```

**Esperado:**
```
127.0.0.1:6379> TTL printers:list
(integer) 2591700  # ~30 dias em segundos
```

---

### Verificar Kafka

```bash
# Listar tópicos
docker exec -it kafka /opt/kafka/bin/kafka-topics.sh \
  --list \
  --bootstrap-server localhost:9092
```

**Esperado:**
```
print-jobs
```

```bash
# Ver consumer group
docker exec -it kafka /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --group printers-consumer-group
```

**Esperado:**
```
GROUP                    TOPIC      PARTITION  CURRENT-OFFSET  LAG
printers-consumer-group  print-jobs 0          5               0
```

---

## 🧪 Testes Unitários

### Setup

```typescript
import { Test } from '@nestjs/testing';
import { PrintersService } from './printers.service';
import { PRINTER_ADAPTER } from '../domain/printer-adapter.interface';
import { REDIS_CLIENT } from '../redis/redis.module';
import { MockPrinterAdapter } from '../adapters/alternative-adapters';

describe('PrintersService', () => {
  let service: PrintersService;
  let mockAdapter: MockPrinterAdapter;
  let mockRedis: any;

  beforeEach(async () => {
    mockAdapter = new MockPrinterAdapter();
    mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        PrintersService,
        { provide: PRINTER_ADAPTER, useValue: mockAdapter },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get(PrintersService);
  });

  it('should return cached printers on cache hit', async () => {
    const cachedData = {
      printers: [{ id: '1', name: 'Test', uri: 'smb://test', cachedAt: new Date().toISOString() }],
      lastUpdated: Date.now(),
    };
    
    mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

    const result = await service.list();
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Test');
    expect(mockRedis.get).toHaveBeenCalledWith('printers:list');
  });

  it('should fetch from SMB on cache miss', async () => {
    mockRedis.get.mockResolvedValue(null);
    jest.spyOn(mockAdapter, 'listPrinters').mockResolvedValue([
      { name: 'HP Printer', uri: 'smb://server/HP' }
    ]);

    const result = await service.list();
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('HP Printer');
    expect(mockAdapter.listPrinters).toHaveBeenCalled();
    expect(mockRedis.setex).toHaveBeenCalled();
  });

  it('should return stale cache and refresh in background', async () => {
    const staleData = {
      printers: [{ id: '1', name: 'Old', uri: 'smb://old', cachedAt: new Date().toISOString() }],
      lastUpdated: Date.now() - (6 * 60 * 1000), // 6 minutos atrás
    };
    
    mockRedis.get.mockResolvedValue(JSON.stringify(staleData));

    const result = await service.list();
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Old'); // Retorna cache antigo
    
    // Aguardar background refresh
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verificar que tentou atualizar
    expect(mockAdapter.listPrinters).toHaveBeenCalled();
  });
});
```

---

### Executar Testes

```bash
npm test
```

---

## 🎯 Checklist de Testes

### Antes de Deploy

- [ ] Health check responde
- [ ] Lista impressoras (cache miss)
- [ ] Lista impressoras (cache hit)
- [ ] Cache stale funciona (retorna antigo + refresh background)
- [ ] Impressão HTTP (DRY_RUN)
- [ ] Impressão Kafka (DRY_RUN)
- [ ] Containers rodando (API, Redis, Kafka)
- [ ] Redis tem dados com TTL correto
- [ ] Kafka consumer conectado
- [ ] Logs sem erros

---

### Performance

- [ ] Cache hit < 10ms
- [ ] Cache miss < 3s
- [ ] Cache stale responde < 10ms
- [ ] Background refresh não bloqueia
- [ ] Impressão HTTP < 2s (DRY_RUN ~300ms)
- [ ] Impressão Kafka < 2s (DRY_RUN ~300ms)

---

### Resiliência

- [ ] Redis reiniciado - cache persiste
- [ ] Kafka reiniciado - consumer reconecta
- [ ] SMB indisponível - usa cache antigo
- [ ] Cache > 5min - não retorna erro 500
- [ ] Múltiplos requests simultâneos - um único refresh

---

## 🚀 Scripts Úteis

### Rebuild e Teste Completo

```bash
# Parar containers
docker-compose down -v

# Rebuild
docker-compose build --no-cache

# Iniciar
docker-compose up -d

# Aguardar inicialização
sleep 10

# Testar
curl http://localhost:3000/printers | jq '.'
```

---

### Monitorar Logs em Tempo Real

```bash
# Todos os containers
docker-compose logs -f

# Apenas API
docker logs printers-api -f

# Apenas Kafka
docker logs kafka -f
```

---

### Limpar Ambiente

```bash
# Parar e remover tudo
docker-compose down -v

# Remover imagens
docker rmi printers-api:latest

# Limpar volumes órfãos
docker volume prune -f
```

---

## 📚 Referências

- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Docker Compose Testing](https://docs.docker.com/compose/production/)
