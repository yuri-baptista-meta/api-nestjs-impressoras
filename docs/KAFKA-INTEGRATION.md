# ⚡ Integração Kafka

Sistema de impressão assíncrona via Apache Kafka 3.7.0 (modo KRaft).

---

## 🏗️ Arquitetura

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  Kafka Producer  │──────►│  Apache Kafka    │──────►│  printers-api    │
│  (Cliente ext.)  │       │  (KRaft mode)    │       │  (NestJS hybrid) │
└──────────────────┘       └──────────────────┘       └──────────┬───────┘
                                                                  │
                                                                  ▼
                                                       ┌──────────────────┐
                                                       │  Redis Cache     │
                                                       │  (impressoras)   │
                                                       └──────────────────┘
                                                                  │
                                                                  ▼
                                                       ┌──────────────────┐
                                                       │  SMB Server      │
                                                       │  (impressoras)   │
                                                       └──────────────────┘
```

---

## 📋 Configuração

### Docker Compose

```yaml
kafka:
  image: apache/kafka:3.7.0
  container_name: kafka
  ports:
    - "9092:9092"
  environment:
    # KRaft mode (sem Zookeeper)
    KAFKA_NODE_ID: 1
    KAFKA_PROCESS_ROLES: 'broker,controller'
    KAFKA_CONTROLLER_QUORUM_VOTERS: '1@kafka:9093'
    KAFKA_LISTENERS: 'PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093'
    KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://kafka:9092'
    KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER'
  volumes:
    - kafka-data:/var/lib/kafka/data
  networks:
    - printers-network
  healthcheck:
    test: kafka-broker-api-versions.sh --bootstrap-server=localhost:9092
    interval: 10s
    timeout: 5s
    retries: 5
```

---

### Variáveis de Ambiente (.env)

```env
# Kafka Configuration
KAFKA_BROKERS=kafka:9092
KAFKA_CLIENT_ID=printers-api
KAFKA_GROUP_ID=printers-consumer-group
KAFKA_TOPIC=print-jobs

# Opcional: modo de teste
DRY_RUN=true
```

---

### NestJS Module

```typescript
// src/kafka/kafka.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: configService.get('KAFKA_CLIENT_ID'),
              brokers: configService.get('KAFKA_BROKERS').split(','),
            },
            consumer: {
              groupId: configService.get('KAFKA_GROUP_ID'),
            },
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class KafkaModule {}
```

---

## 🎯 Consumer (printers-api)

### Controller

```typescript
// src/kafka/kafka-consumer.controller.ts
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PrintersService } from '../printers/printers.service';

@Controller()
export class KafkaConsumerController {
  constructor(private readonly printersService: PrintersService) {}

  @MessagePattern('print-jobs')
  async handlePrintJob(@Payload() message: any) {
    const start = Date.now();
    
    // Parse message (suporta Buffer ou objeto)
    let data: any;
    if (Buffer.isBuffer(message)) {
      data = JSON.parse(message.toString());
    } else if (message.value) {
      data = Buffer.isBuffer(message.value)
        ? JSON.parse(message.value.toString())
        : message.value;
    } else {
      data = message;
    }

    const { printerId, fileBase64 } = data;
    
    console.log(`[KafkaConsumerController] 📨 Mensagem Kafka recebida - printerId: ${printerId}`);

    try {
      const result = await this.printersService.print({ printerId, fileBase64 });
      const elapsed = Date.now() - start;
      
      console.log(`[KafkaConsumerController] ✅ Impressão enviada via Kafka - jobId: ${result.jobId} (${elapsed}ms)`);
      
      return result;
    } catch (error) {
      console.error(`[KafkaConsumerController] ❌ Erro ao processar job Kafka:`, error.message);
      throw error;
    }
  }
}
```

---

### Inicialização (Hybrid App)

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  const kafkaBrokers = configService.get('KAFKA_BROKERS');

  // Inicia Kafka consumer se configurado
  if (kafkaBrokers) {
    console.log('🔌 Conectando ao Kafka:', kafkaBrokers);
    
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
    console.log('✅ Kafka consumer iniciado com sucesso');
  } else {
    console.log('⚠️ Kafka desabilitado (KAFKA_BROKERS não configurado)');
  }

  await app.listen(3000);
  console.log('🚀 API HTTP rodando em http://localhost:3000');
}

bootstrap();
```

---

## 📤 Producer (Cliente Externo)

### Formato da Mensagem

```json
{
  "printerId": "a1b2c3d4e5f6g7h8",
  "fileBase64": "JVBERi0xLjQK...base64..."
}
```

---

### Exemplo: Node.js Producer

```javascript
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'my-producer',
  brokers: ['kafka:9092'],
});

const producer = kafka.producer();

async function sendPrintJob(printerId, fileBase64) {
  await producer.connect();
  
  await producer.send({
    topic: 'print-jobs',
    messages: [
      {
        value: JSON.stringify({
          printerId,
          fileBase64,
        }),
      },
    ],
  });
  
  console.log('✅ Job enviado para Kafka');
  await producer.disconnect();
}

// Uso
const fs = require('fs');
const pdfBase64 = fs.readFileSync('documento.pdf', 'base64');
sendPrintJob('a1b2c3d4e5f6g7h8', pdfBase64);
```

---

### Exemplo: Kafka Console Producer

```bash
# 1. Entrar no container Kafka
docker exec -it kafka bash

# 2. Iniciar producer
/opt/kafka/bin/kafka-console-producer.sh \
  --topic print-jobs \
  --bootstrap-server kafka:9092

# 3. Enviar mensagem (cole o JSON e pressione ENTER)
{"printerId":"a1b2c3d4e5f6g7h8","fileBase64":"JVBERi0xLjQK..."}

# 4. Sair (Ctrl+C)
```

---

## 🧪 Teste Manual Completo

### Passo 1: Obter ID da Impressora

```bash
curl http://localhost:3000/printers | jq -r '.[0].id'
# Exemplo output: 0d31f2f9a6525f56
```

---

### Passo 2: Preparar PDF de Teste

```bash
# Criar PDF de teste com texto "Teste Kafka"
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
(Teste Kafka) Tj
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

# Converter para base64
PDF_BASE64=$(base64 -w 0 test.pdf)
```

---

### Passo 3: Enviar via Kafka

```bash
# Entrar no container Kafka
docker exec -it kafka bash

# Iniciar producer
/opt/kafka/bin/kafka-console-producer.sh \
  --topic print-jobs \
  --bootstrap-server kafka:9092

# Cole esta mensagem (substitua o printerId):
{"printerId":"0d31f2f9a6525f56","fileBase64":"JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlIC9QYWdlCi9QYXJlbnQgMSAwIFIKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KL0NvbnRlbnRzIDQgMCBSCi9SZXNvdXJjZXMgPDwKL1Byb2NTZXQgWy9QREYgL1RleHRdCi9Gb250IDw8Ci9GMSA2IDAgUgo+Pgo+Pgo+PgplbmRvYmoKNCAwIG9iago8PC9MZW5ndGggNDQ+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCA3MDAgVGQKKFRlc3RlIEthZmthKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjYgMCBvYmoKPDwvVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKPj4KZW5kb2JqCjEgMCBvYmoKPDwvVHlwZSAvUGFnZXMKL0NvdW50IDEKL0tpZHMgWzMgMCBSXQo+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlIC9DYXRhbG9nCi9QYWdlcyAxIDAgUgo+PgplbmRvYmoKdHJhaWxlcgo8PC9TaXplIDcKL1Jvb3QgMiAwIFIKPj4Kc3RhcnR4cmVmCjU1NQolJUVPRgo="}

# Pressione ENTER para enviar
# Pressione Ctrl+C para sair
# Digite 'exit' para sair do container
```

---

### Passo 4: Verificar Logs

```bash
docker logs printers-api --tail=20
```

**Resultado Esperado (DRY_RUN=true):**
```
[KafkaConsumerController] 📨 Mensagem Kafka recebida - printerId: 0d31f2f9a6525f56
[PrintersService] ✅ Cache HIT - Retornando impressoras do Redis
[PrintersService] 🧪 [DRY_RUN] Simulando impressão para: HP M426f - Carazinho - jobId: job-mock-1704567890123
[KafkaConsumerController] ✅ Impressão enviada via Kafka - jobId: job-mock-1704567890123 (344ms)
```

**Resultado Esperado (DRY_RUN=false):**
```
[KafkaConsumerController] 📨 Mensagem Kafka recebida - printerId: 0d31f2f9a6525f56
[PrintersService] ✅ Cache HIT - Retornando impressoras do Redis
[PrintersService] ✅ Impressão enviada para: HP M426f - Carazinho - jobId: job-abc123-def456
[KafkaConsumerController] ✅ Impressão enviada via Kafka - jobId: job-abc123-def456 (1523ms)
```

---

## 🔍 Verificação de Saúde

### Verificar Kafka está rodando

```bash
docker ps | grep kafka
```

---

### Listar tópicos

```bash
docker exec -it kafka /opt/kafka/bin/kafka-topics.sh \
  --list \
  --bootstrap-server localhost:9092
```

**Output esperado:**
```
print-jobs
```

---

### Verificar consumer group

```bash
docker exec -it kafka /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --group printers-consumer-group
```

---

## ⚠️ Proteção contra Cache Expirado

O sistema usa **cache perpétuo** - mesmo que o cache tenha >5min, a impressão **SEMPRE funciona**:

```
Cache Idade         Comportamento
─────────────────────────────────────────────────
0-5min             ✅ Usa cache fresco
5min-30dias        ✅ Usa cache antigo (stale)
                   🔄 Atualiza em background
>30dias            ✅ Busca do SMB (bloqueia)
                   📦 Salva no Redis
```

**Resultado:** ❌ **NUNCA** retorna erro 500 por cache expirado!

---

## 📊 Performance

### Kafka Message Processing (DRY_RUN)
- Tempo médio: ~300ms
- Parse: ~1ms
- Cache hit: ~2ms
- Simulação: ~300ms

### Kafka Message Processing (Real)
- Tempo médio: ~1500ms
- Parse: ~1ms
- Cache hit: ~2ms
- SMB print: ~1500ms

### Cache Stale Scenario
- Resposta: ~2ms (não espera refresh)
- Background refresh: ~2000ms (não bloqueia)

---

## 🎯 Vantagens do Kafka

- ✅ **Assíncrono** - Cliente não espera impressão finalizar
- ✅ **Desacoplado** - Produtor não precisa conhecer API
- ✅ **Resiliente** - Mensagens persistidas no Kafka
- ✅ **Escalável** - Múltiplos consumers em paralelo
- ✅ **Confiável** - Consumer group com offset tracking
- ✅ **Cache perpétuo** - Nunca falha por cache expirado
