#!/bin/bash
# Script de teste do sistema de cache de impressoras
# Execute: chmod +x test-cache-system.sh && ./test-cache-system.sh

BASE_URL="http://localhost:3000"

echo "🖨️  Testando Sistema de Cache de Impressoras"
echo "=============================================="
echo ""

# 1. Listar impressoras
echo "📋 1. Listando impressoras disponíveis..."
PRINTERS=$(curl -s "${BASE_URL}/printers")
echo "$PRINTERS" | jq '.'
echo ""

# Extrai o primeiro printerId
PRINTER_ID=$(echo "$PRINTERS" | jq -r '.[0].id')
PRINTER_NAME=$(echo "$PRINTERS" | jq -r '.[0].name')

if [ "$PRINTER_ID" == "null" ] || [ -z "$PRINTER_ID" ]; then
  echo "❌ Nenhuma impressora encontrada. Verifique a conexão SMB."
  exit 1
fi

echo "✅ Impressora selecionada: $PRINTER_NAME (ID: $PRINTER_ID)"
echo ""

# 2. Criar um PDF de teste simples em base64
echo "📄 2. Gerando PDF de teste..."
PDF_BASE64=$(echo "%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 24 Tf
100 700 Td
(Cache Test) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000317 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
408
%%EOF" | base64 -w 0)

echo "✅ PDF gerado (${#PDF_BASE64} caracteres)"
echo ""

# 3. Testar impressão com ID válido
echo "🖨️  3. Testando impressão com printerId válido..."
PRINT_RESPONSE=$(curl -s -X POST "${BASE_URL}/printers/print" \
  -H "Content-Type: application/json" \
  -d "{\"printerId\":\"${PRINTER_ID}\",\"fileBase64\":\"${PDF_BASE64}\"}")

echo "$PRINT_RESPONSE" | jq '.'
echo ""

# 4. Testar com ID inválido
echo "❌ 4. Testando com printerId inválido (deve falhar)..."
INVALID_RESPONSE=$(curl -s -X POST "${BASE_URL}/printers/print" \
  -H "Content-Type: application/json" \
  -d '{"printerId":"id-invalido-12345","fileBase64":"'${PDF_BASE64}'"}')

echo "$INVALID_RESPONSE" | jq '.'
echo ""

# 5. Aguardar expiração do cache (opcional, comentado por padrão)
# echo "⏳ 5. Aguardando expiração do cache (5 minutos)..."
# echo "   (Pressione Ctrl+C para pular)"
# sleep 300
# 
# echo "🖨️  6. Testando impressão com cache expirado (deve falhar)..."
# EXPIRED_RESPONSE=$(curl -s -X POST "${BASE_URL}/printers/print" \
#   -H "Content-Type: application/json" \
#   -d "{\"printerId\":\"${PRINTER_ID}\",\"fileBase64\":\"${PDF_BASE64}\"}")
# 
# echo "$EXPIRED_RESPONSE" | jq '.'
# echo ""

echo "=============================================="
echo "✅ Testes concluídos!"
echo ""
echo "💡 Dicas:"
echo "   - Verifique a impressora física para confirmar a impressão"
echo "   - IDs são determinísticos: mesmo nome = mesmo ID"
echo "   - Cache expira em 5 minutos"
echo "   - Execute GET /printers antes de cada impressão em produção"
