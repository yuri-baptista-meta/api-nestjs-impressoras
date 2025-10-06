# Scripts de Teste

Scripts auxiliares para testar e validar a aplicação.

---

## 📜 Scripts Disponíveis

### 🔨 rebuild-and-test.sh

Reconstrói o container Docker e executa testes básicos.

**Uso:**
```bash
cd docs/scripts
./rebuild-and-test.sh
```

**O que faz:**
1. Para containers existentes
2. Reconstrói a imagem Docker
3. Inicia os serviços
4. Executa testes de health check
5. Testa endpoints principais

---

### ⚡ test-cache-system.sh

Testa o sistema de cache e performance.

**Uso:**
```bash
cd docs/scripts
./test-cache-system.sh
```

**O que faz:**
1. Testa cache de listagem de impressoras
2. Compara performance (primeira vs segunda chamada)
3. Testa refresh manual do cache
4. Valida TTL e expiração

**Resultados esperados:**
- Primeira chamada: ~200ms (busca do SMB)
- Segunda chamada: ~5ms (cache) ⚡
- Melhoria: ~97.5%

---

### 🐳 test-rpcclient-docker.sh

Testa a conectividade do rpcclient no container Docker.

**Uso:**
```bash
cd docs/scripts
./test-rpcclient-docker.sh
```

**O que faz:**
1. Verifica se o container está rodando
2. Testa conexão com servidor SMB
3. Lista impressoras via rpcclient
4. Valida credenciais e configuração

**Pré-requisitos:**
- Docker e docker-compose instalados
- Arquivo `.env` configurado com credenciais SMB
- Servidor SMB acessível

---

## 🚀 Execução Rápida

### Todos os testes em sequência

```bash
cd docs/scripts

# Dá permissão de execução
chmod +x *.sh

# Executa todos
./rebuild-and-test.sh && \
./test-cache-system.sh && \
./test-rpcclient-docker.sh
```

---

### Teste específico

```bash
# Apenas cache
./test-cache-system.sh

# Apenas Docker/rpcclient
./test-rpcclient-docker.sh

# Rebuild completo
./rebuild-and-test.sh
```

---

## 📋 Pré-requisitos Gerais

### Ambiente

- **Docker & Docker Compose:** Para containers
- **curl:** Para requisições HTTP
- **jq:** Para processar JSON (opcional)
- **bash:** Shell Unix

### Instalação (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y docker.io docker-compose curl jq
```

### Configuração

1. **Arquivo `.env` na raiz do projeto:**
```bash
SMB_HOST=192.168.1.100
SMB_USER=usuario
SMB_PASS=senha
SMB_DOMAIN=WORKGROUP
```

2. **Permissões:**
```bash
chmod +x docs/scripts/*.sh
```

---

## 🔍 Troubleshooting

### Script não executa

```bash
# Dá permissão
chmod +x docs/scripts/*.sh

# Verifica se tem linha CRLF (Windows)
dos2unix docs/scripts/*.sh
```

### Container não inicia

```bash
# Logs do container
docker-compose logs -f

# Verifica variáveis de ambiente
cat .env
```

### Erro de conexão SMB

```bash
# Testa conectividade
ping $SMB_HOST

# Testa rpcclient manualmente
docker-compose exec app rpcclient -U "$SMB_USER%$SMB_PASS" //$SMB_HOST
```

---

## 📚 Mais Informações

- **[Guia de Testes de API](../api-testing.md)** - Exemplos detalhados com cURL
- **[Setup Docker](../docker-setup.md)** - Configuração do ambiente Docker
- **[Sistema de Cache](../cache-system.md)** - Como funciona o cache

---

## 💡 Desenvolvimento de Novos Scripts

### Template Básico

```bash
#!/bin/bash
set -e  # Para na primeira falha

API_URL="http://localhost:3000"

echo "🧪 Teste: [NOME DO TESTE]"

# Seu código aqui

echo "✅ Teste concluído!"
```

### Boas Práticas

- ✅ Use `set -e` para parar em erros
- ✅ Adicione mensagens descritivas
- ✅ Valide pré-requisitos no início
- ✅ Use variáveis de ambiente quando possível
- ✅ Documente o script neste README

---

**Última atualização:** 6 de outubro de 2025
