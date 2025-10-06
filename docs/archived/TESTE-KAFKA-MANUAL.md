# 🧪 Teste Manual Kafka (COM DRY_RUN - Sem Impressora Real)

## ✅ Garantia de Segurança

**DRY_RUN=true** está ativado no `.env` - **NADA SERÁ IMPRESSO DE VERDADE!**

---

## 📋 Passo a Passo

### **Passo 1: Obter ID de uma Impressora**

Em um terminal do Windows:

```bash
curl http://localhost:3000/printers
```

**Copie um `id` da resposta**, exemplo:
```json
{
  "id": "0d31f2f9a6525f56",
  "name": "HP M426f - Carazinho",
  ...
}
```

---

### **Passo 2: Entrar no Container Kafka**

```bash
docker exec -it kafka bash
```

Você verá o prompt mudar para algo como: `root@abc123:/opt/kafka#`

---

### **Passo 3: Iniciar o Producer Console**

Dentro do container Kafka, execute:

```bash
/opt/kafka/bin/kafka-console-producer.sh \
  --topic print-jobs \
  --bootstrap-server kafka:9092
```

**Aguarde aparecer o prompt `>`** - isso significa que o producer está pronto!

---

### **Passo 4: Enviar Mensagem JSON**

Cole esta mensagem (substitua o `printerId` pelo ID que você copiou no Passo 1):

```json
{"printerId":"0d31f2f9a6525f56","fileBase64":"JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlIC9QYWdlCi9QYXJlbnQgMSAwIFIKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KL0NvbnRlbnRzIDQgMCBSCi9SZXNvdXJjZXMgPDwKL1Byb2NTZXQgWy9QREYgL1RleHRdCi9Gb250IDw8Ci9GMSA2IDAgUgo+Pgo+Pgo+PgplbmRvYmoKNCAwIG9iago8PC9MZW5ndGggNDQ+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCA3MDAgVGQKKFRlc3RlIEthZmthKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjYgMCBvYmoKPDwvVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKPj4KZW5kb2JqCjEgMCBvYmoKPDwvVHlwZSAvUGFnZXMKL0NvdW50IDEKL0tpZHMgWzMgMCBSXQo+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlIC9DYXRhbG9nCi9QYWdlcyAxIDAgUgo+PgplbmRvYmoKdHJhaWxlcgo8PC9TaXplIDcKL1Jvb3QgMiAwIFIKPj4Kc3RhcnR4cmVmCjU1NQolJUVPRgo="}
```

**Pressione ENTER** para enviar a mensagem!

---

### **Passo 5: Sair do Producer**

- Pressione **Ctrl+C** para parar o producer
- Digite **`exit`** para sair do container Kafka

---

### **Passo 6: Verificar Logs da API**

Em outro terminal (Windows), execute:

```bash
docker logs printers-api --tail=20
```

---

## ✅ Resultado Esperado (COM DRY_RUN)

Você deve ver nos logs:

```
[KafkaConsumerController] 📨 Mensagem Kafka recebida - printerId: 0d31f2f9...
[PrintersService] ✅ Cache HIT - Retornando impressoras do Redis
[PrintersService] 🧪 [DRY_RUN] Simulando impressão para: HP M426f - Carazinho - jobId: job-mock-1696615234567
[KafkaConsumerController] ✅ Impressão enviada via Kafka - jobId: job-mock-1696615234567 (234ms)
```

**🎯 Sinais de sucesso:**
- ✅ Emoji `📨` = Mensagem recebida
- ✅ Emoji `🧪` = **DRY_RUN ativo (simulação)**
- ✅ Emoji `✅` = Processamento concluído
- ✅ `jobId: job-mock-...` = ID simulado (não real)
- ✅ Tempo de processamento em milissegundos

---

## 🔴 Se Ver Erro

### **Erro: "printerId not found"**
```
❌ Erro ao processar mensagem Kafka: Impressora com ID "xxx" não encontrada
```

**Solução:** O ID está errado! Copie um ID válido do endpoint `/printers`

---

### **Erro: "Cannot destructure property 'printerId'"**
```
TypeError: Cannot destructure property 'printerId' of 'message.value' as it is undefined
```

**Solução:** O JSON está malformado. Certifique-se de colar o JSON completo em uma única linha.

---

## 🧪 Testando Cenários de Erro

### **Impressora Inválida:**
```json
{"printerId":"id-invalido-123","fileBase64":"JVBERi0xLjQK"}
```

**Resultado esperado:**
```
❌ Erro ao processar mensagem Kafka: Impressora com ID "id-invalido-123" não encontrada
```

---

### **Dados Faltando:**
```json
{"printerId":"0d31f2f9a6525f56"}
```

**Resultado esperado:**
```
❌ Erro ao processar mensagem Kafka: printerId e fileBase64 são obrigatórios
```

---

## 🚀 Para Produção (Desabilitar DRY_RUN)

Quando quiser realmente imprimir:

1. Edite `.env`:
   ```env
   DRY_RUN=false
   # ou remova a linha completamente
   ```

2. Reinicie a API:
   ```bash
   docker compose restart printers-api
   ```

3. Repita o teste
4. **Agora SIM irá imprimir de verdade!** ⚠️

---

## 📊 Comandos Úteis

### Ver mensagens processadas:
```bash
docker logs printers-api -f
```

### Ver status do Kafka:
```bash
docker logs kafka --tail=20
```

### Ver consumer group:
```bash
docker exec kafka /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server kafka:9092 \
  --describe \
  --group printers-consumer-group-server
```

### Ver mensagens no tópico:
```bash
docker exec kafka /opt/kafka/bin/kafka-console-consumer.sh \
  --topic print-jobs \
  --from-beginning \
  --bootstrap-server kafka:9092 \
  --max-messages 5
```

---

## 🎯 Resumo

1. **DRY_RUN=true** = Modo Teste (sem impressora real) ✅
2. **DRY_RUN=false** = Modo Produção (impressão real) ⚠️
3. Sempre verifique os logs para confirmar o comportamento
4. O emoji **🧪** indica que está em modo simulação

---

**Agora pode testar tranquilo! Nada será impresso de verdade com DRY_RUN ativado! 🧪**
