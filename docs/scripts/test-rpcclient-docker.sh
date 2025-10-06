#!/bin/bash
# Script para testar rpcclient dentro do container Docker

echo "🐳 Testando rpcclient no container Docker"
echo "=========================================="
echo ""

# 1. Verifica se o container está rodando
CONTAINER_NAME="printers-api"

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "❌ Container '$CONTAINER_NAME' não está rodando"
  echo ""
  echo "Iniciando container..."
  docker-compose up -d
  sleep 5
fi

echo "✅ Container rodando"
echo ""

# 2. Verifica versão do smbclient
echo "📦 Verificando smbclient..."
docker exec $CONTAINER_NAME smbclient --version
echo ""

# 3. Verifica versão do rpcclient
echo "📦 Verificando rpcclient..."
docker exec $CONTAINER_NAME rpcclient --version
echo ""

# 4. Testa conexão SMB (se .env estiver configurado)
if [ -f .env ]; then
  source .env
  
  if [ -n "$SMB_HOST" ] && [ -n "$SMB_USER" ] && [ -n "$SMB_PASS" ]; then
    echo "🔌 Testando conexão SMB com rpcclient..."
    echo "   Host: $SMB_HOST"
    echo "   User: $SMB_USER"
    echo ""
    
    # Lista impressoras usando rpcclient
    docker exec $CONTAINER_NAME rpcclient -U "$SMB_USER%$SMB_PASS" "//$SMB_HOST" -c "enumprinters" 2>&1 | head -20
    
    if [ $? -eq 0 ]; then
      echo ""
      echo "✅ rpcclient funcionando corretamente!"
    else
      echo ""
      echo "⚠️  rpcclient instalado, mas falhou ao conectar"
      echo "    Verifique credenciais no .env"
    fi
  else
    echo "⚠️  Variáveis SMB não configuradas no .env"
    echo "    Configure SMB_HOST, SMB_USER e SMB_PASS para testar conexão"
  fi
else
  echo "⚠️  Arquivo .env não encontrado"
fi

echo ""
echo "=========================================="
echo "💡 Comandos úteis:"
echo ""
echo "# Entrar no container"
echo "docker exec -it $CONTAINER_NAME bash"
echo ""
echo "# Testar rpcclient manualmente"
echo "docker exec -it $CONTAINER_NAME rpcclient -U user%pass //servidor -c 'enumprinters'"
echo ""
echo "# Ver logs da API"
echo "docker logs -f $CONTAINER_NAME"
echo ""
echo "# Rebuild do container"
echo "docker-compose up -d --build"
