#!/bin/bash
# Script para rebuild completo e teste do container com rpcclient

set -e

echo "🚀 Rebuild Completo do Container"
echo "================================="
echo ""

# 1. Para e remove container antigo
echo "📦 Parando container antigo..."
docker-compose down 2>/dev/null || true
echo ""

# 2. Build da nova imagem
echo "🔨 Building nova imagem (com rpcclient)..."
docker-compose build --no-cache
echo ""

# 3. Inicia container
echo "▶️  Iniciando container..."
docker-compose up -d
echo ""

# Aguarda container ficar pronto
echo "⏳ Aguardando container inicializar..."
sleep 5

# 4. Verifica saúde do container
echo "🏥 Verificando saúde do container..."
if docker ps --format '{{.Names}}' | grep -q "printers-api"; then
  echo "✅ Container rodando"
else
  echo "❌ Container não está rodando"
  echo ""
  echo "Logs:"
  docker logs printers-api
  exit 1
fi
echo ""

# 5. Verifica rpcclient
echo "🔍 Verificando rpcclient..."
if docker exec printers-api which rpcclient > /dev/null 2>&1; then
  echo "✅ rpcclient instalado"
  docker exec printers-api rpcclient --version | head -1
else
  echo "❌ rpcclient não encontrado"
  exit 1
fi
echo ""

# 6. Verifica smbclient
echo "🔍 Verificando smbclient..."
if docker exec printers-api which smbclient > /dev/null 2>&1; then
  echo "✅ smbclient instalado"
  docker exec printers-api smbclient --version | head -1
else
  echo "❌ smbclient não encontrado"
  exit 1
fi
echo ""

# 7. Testa API
echo "🌐 Testando API..."
sleep 2
if curl -s http://localhost:3000/ > /dev/null; then
  echo "✅ API respondendo"
  RESPONSE=$(curl -s http://localhost:3000/)
  echo "   Response: $RESPONSE"
else
  echo "⚠️  API ainda não está respondendo"
  echo "   Aguarde alguns segundos e tente:"
  echo "   curl http://localhost:3000/"
fi
echo ""

# 8. Instruções finais
echo "================================="
echo "✅ Container pronto para uso!"
echo ""
echo "📝 Próximos passos:"
echo ""
echo "1. Configure o .env com suas credenciais SMB:"
echo "   SMB_HOST=seu-servidor"
echo "   SMB_USER=usuario"
echo "   SMB_PASS=senha"
echo ""
echo "2. Teste conexão SMB:"
echo "   docker exec printers-api rpcclient -U \"\$SMB_USER%\$SMB_PASS\" \"//\$SMB_HOST\" -c \"enumprinters\""
echo ""
echo "3. Teste API de listagem:"
echo "   curl http://localhost:3000/printers | jq '.'"
echo ""
echo "4. Ver logs em tempo real:"
echo "   docker logs -f printers-api"
echo ""
echo "5. Entrar no container:"
echo "   docker exec -it printers-api bash"
echo ""
echo "================================="
