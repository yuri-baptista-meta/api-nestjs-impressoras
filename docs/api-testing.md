# Testes de API

Exemplos de testes das APIs REST usando cURL, clientes HTTP e scripts.

## 🚀 Pré-requisitos

```bash
# Inicie a API
docker-compose up -d
# ou
npm run dev
```

---

## 📡 Operações Básicas

### Health Check

```bash
curl http://localhost:3000/
```

**Resposta:** `<h1>Hello World!</h1>`

### Listar Impressoras

```bash
# Primeira chamada (busca do SMB - ~200ms)
curl http://localhost:3000/printers | jq '.'

# Segunda chamada (cache - ~5ms) ⚡
time curl http://localhost:3000/printers | jq '.'

# Forçar refresh do cache
curl 'http://localhost:3000/printers?refresh=true' | jq '.'
```

**Resposta:**
```json
[
  {
    "id": "a1b2c3d4e5f6g7h8",
    "name": "HP LaserJet 9020",
    "uri": "smb://servidor/HP%20LaserJet%209020",
    "cachedAt": "2025-10-06T14:30:00.000Z"
  }
]
```

### Imprimir PDF

```bash
# 1. Obter ID da impressora
PRINTER_ID=$(curl -s http://localhost:3000/printers | jq -r '.[0].id')

# 2. Converter PDF para base64
PDF_BASE64=$(base64 -w 0 documento.pdf)

# 3. Enviar para impressão
curl -X POST http://localhost:3000/printers/print \
  -H "Content-Type: application/json" \
  -d "{
    \"printerId\": \"$PRINTER_ID\",
    \"fileBase64\": \"$PDF_BASE64\"
  }"
```

**Resposta:**
```json
{
  "jobId": "job-abc123-def456"
}
```

---

## 🔧 Operações Avançadas

### Status da Impressora

```bash
# Obter ID e verificar status
PRINTER_ID=$(curl -s http://localhost:3000/printers | jq -r '.[0].id')
curl http://localhost:3000/printers/management/$PRINTER_ID/status | jq '.'
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

### Listar Fila de Impressão

```bash
curl http://localhost:3000/printers/management/$PRINTER_ID/queue | jq '.'
```

**Resposta:**
```json
[
  {
    "jobId": 123,
    "printerName": "HP LaserJet 9020",
    "userName": "joao.silva",
    "documentName": "documento.pdf",
    "totalPages": 5,
    "pagesPrinted": 2,
    "size": 204800,
    "status": "PRINTING",
    "submittedTime": "2025-10-06T14:25:00.000Z"
  }
]
```

### Cancelar Job

```bash
# Cancelar job específico
curl -X DELETE http://localhost:3000/printers/management/$PRINTER_ID/queue/123

# Limpar toda a fila
curl -X DELETE http://localhost:3000/printers/management/$PRINTER_ID/queue
```

### Pausar/Retomar

```bash
# Pausar impressora
curl -X POST http://localhost:3000/printers/management/$PRINTER_ID/pause

# Retomar impressora
curl -X POST http://localhost:3000/printers/management/$PRINTER_ID/resume

# Pausar job específico
curl -X POST http://localhost:3000/printers/management/$PRINTER_ID/queue/123/pause

# Retomar job específico
curl -X POST http://localhost:3000/printers/management/$PRINTER_ID/queue/123/resume
```

---

## 🐛 Testando Erros

### Impressora não encontrada

```bash
curl http://localhost:3000/printers/id-invalido/status
```

**Resposta:** `404 Not Found`

### Cache expirado

```bash
# Aguarde > 5 minutos depois de listar impressoras
curl -X POST http://localhost:3000/printers/print \
  -H "Content-Type: application/json" \
  -d '{"printerId":"antigo","fileBase64":"..."}'
```

**Resposta:** `404 - Cache expirado`

---

## 🌐 Cliente Browser (JavaScript)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Print Test</title>
</head>
<body>
  <input type="file" id="pdfInput" accept=".pdf">
  <button onclick="print()">Imprimir</button>
  
  <script>
    let printers = [];
    
    // Carrega impressoras ao abrir página
    fetch('http://localhost:3000/printers')
      .then(r => r.json())
      .then(data => {
        printers = data;
        console.log('Impressoras disponíveis:', printers);
      });
    
    async function print() {
      const file = document.getElementById('pdfInput').files[0];
      if (!file || printers.length === 0) return;
      
      // Converte PDF para base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        
        // Envia para impressão
        const response = await fetch('http://localhost:3000/printers/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            printerId: printers[0].id,
            fileBase64: base64
          })
        });
        
        const result = await response.json();
        console.log('Impresso! Job ID:', result.jobId);
      };
      
      reader.readAsDataURL(file);
    }
  </script>
</body>
</html>
```

---

## 🧪 Scripts de Teste

### Script Bash Completo

```bash
#!/bin/bash

API_URL="http://localhost:3000"

echo "🧪 Testando API de Impressoras..."

# 1. Health check
echo -n "1. Health check... "
curl -s $API_URL | grep -q "Hello World" && echo "✅" || echo "❌"

# 2. Listar impressoras
echo -n "2. Listar impressoras... "
PRINTERS=$(curl -s $API_URL/printers)
echo $PRINTERS | jq -e '.[0].id' >/dev/null && echo "✅" || echo "❌"

# 3. Obter ID da primeira impressora
PRINTER_ID=$(echo $PRINTERS | jq -r '.[0].id')
echo "   Printer ID: $PRINTER_ID"

# 4. Status da impressora
echo -n "3. Status da impressora... "
curl -s $API_URL/printers/management/$PRINTER_ID/status | jq -e '.status' >/dev/null && echo "✅" || echo "❌"

# 5. Fila de impressão
echo -n "4. Fila de impressão... "
curl -s $API_URL/printers/management/$PRINTER_ID/queue | jq -e 'type == "array"' >/dev/null && echo "✅" || echo "❌"

# 6. Cache (segunda chamada deve ser muito mais rápida)
echo "5. Testando cache..."
time1=$(date +%s%N)
curl -s $API_URL/printers >/dev/null
time2=$(date +%s%N)
echo "   Primeira chamada: $(( (time2 - time1) / 1000000 ))ms"

time3=$(date +%s%N)
curl -s $API_URL/printers >/dev/null
time4=$(date +%s%N)
echo "   Segunda chamada (cache): $(( (time4 - time3) / 1000000 ))ms ⚡"

echo "🎉 Testes concluídos!"
```

Salve como `test-api.sh` e execute:
```bash
chmod +x test-api.sh
./test-api.sh
```

---

## 📊 Testando Performance

### Apache Bench

```bash
# 100 requisições, 10 concorrentes
ab -n 100 -c 10 http://localhost:3000/printers
```

### wrk

```bash
# 30 segundos, 10 threads, 100 conexões
wrk -t10 -c100 -d30s http://localhost:3000/printers
```

---

## 🔍 Monitoramento

### Logs em tempo real

```bash
# Docker
docker-compose logs -f

# Local
npm run dev  # Já mostra logs
```

### Métricas de Cache

```bash
# Ver performance (segunda chamada deve ser ~40x mais rápida)
echo "Primeira chamada:"
time curl -s http://localhost:3000/printers >/dev/null

echo "Segunda chamada (cache):"
time curl -s http://localhost:3000/printers >/dev/null
```

**Esperado:**
- Primeira: ~0.200s
- Segunda: ~0.005s

---

## 📚 Referências

- [cURL Documentation](https://curl.se/docs/)
- [jq JSON Processor](https://stedolan.github.io/jq/)
- [HTTPie](https://httpie.io/) - Alternativa amigável ao cURL
- [Postman](https://www.postman.com/) - Cliente GUI
