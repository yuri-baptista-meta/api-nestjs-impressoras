# 📚 Documentação da API de Impressão

Sistema de impressão em impressoras SMB com cache Redis e integração Kafka.

---

## 🎯 Documentação Principal

### **[📡 API-ENDPOINTS.md](./API-ENDPOINTS.md)**
Documentação completa de todos os endpoints HTTP REST.

**Conteúdo:**
- Health check e operações básicas
- Listagem de impressoras com cache
- Impressão de PDFs via HTTP
- Gerenciamento avançado (status, filas, pausar/retomar)
- Performance e métricas
- Modo DRY_RUN

**Quando usar:** Integrar com a API ou testar endpoints manualmente.

---

### **[⚡ KAFKA-INTEGRATION.md](./KAFKA-INTEGRATION.md)**
Sistema de impressão assíncrona via Apache Kafka 3.7.0 (KRaft mode).

**Conteúdo:**
- Arquitetura Kafka + NestJS hybrid
- Configuração completa (Docker + env vars)
- Consumer e producer examples
- Teste manual passo a passo
- Verificação de saúde do Kafka
- Proteção contra cache expirado

**Quando usar:** Implementar impressão assíncrona via mensageria.

---

### **[📦 REDIS-CACHE.md](./REDIS-CACHE.md)**
Cache perpétuo com estratégia stale-while-revalidate.

**Conteúdo:**
- Arquitetura do cache Redis
- Fluxo de funcionamento (diagramas visuais)
- Cenários detalhados (fresco, stale, vazio)
- Comportamento por idade do cache
- Proteção contra refresh duplicado
- Performance e métricas

**Quando usar:** Entender como funciona o cache e troubleshooting.

---

### **[🏗️ ARCHITECTURE.md](./ARCHITECTURE.md)**
Padrões de projeto e design da aplicação.

**Conteúdo:**
- Estrutura de módulos e pastas
- Padrões aplicados (Adapter, DI, Repository, SWR)
- SOLID principles
- Hybrid architecture (HTTP + Kafka)
- Testabilidade e extensibilidade
- Fluxo de dados

**Quando usar:** Entender decisões de arquitetura ou adicionar features.

---

### **[🧪 TESTING.md](./TESTING.md)**
Estratégias e guias de teste.

**Conteúdo:**
- Modo DRY_RUN para testes sem hardware
- Testes manuais (HTTP e Kafka)
- Verificações de infraestrutura
- Testes unitários (examples)
- Checklist de testes antes de deploy
- Scripts úteis

**Quando usar:** Testar o sistema ou configurar CI/CD.

---

## 🚀 Guia Rápido

### Novo no Projeto?

1. **Instalar e Rodar:**
   ```bash
   docker-compose up -d
   curl http://localhost:3000/printers
   ```

2. **Ler Documentação:**
   - [API-ENDPOINTS.md](./API-ENDPOINTS.md) - Para usar a API
   - [TESTING.md](./TESTING.md) - Para testar

3. **Entender Arquitetura:**
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - Padrões e estrutura
   - [REDIS-CACHE.md](./REDIS-CACHE.md) - Como funciona o cache

---

### Implementar Integração?

**HTTP:**
- Veja [API-ENDPOINTS.md](./API-ENDPOINTS.md)
- Exemplos com cURL, Node.js, etc.

**Kafka:**
- Veja [KAFKA-INTEGRATION.md](./KAFKA-INTEGRATION.md)
- Producer examples e formato de mensagem

---

### Troubleshooting?

**Erro 500 ou cache expirado:**
- Leia [REDIS-CACHE.md](./REDIS-CACHE.md) seção "Cenários Detalhados"

**Kafka não conecta:**
- Veja [KAFKA-INTEGRATION.md](./KAFKA-INTEGRATION.md) seção "Verificação de Saúde"

**Performance ruim:**
- Confira [API-ENDPOINTS.md](./API-ENDPOINTS.md) seção "Performance"

---

## 📁 Estrutura dos Documentos

```
docs/
├── README.md                  # Este arquivo (índice)
├── API-ENDPOINTS.md           # Documentação HTTP REST
├── KAFKA-INTEGRATION.md       # Integração Kafka
├── REDIS-CACHE.md             # Sistema de cache
├── ARCHITECTURE.md            # Padrões e arquitetura
├── TESTING.md                 # Testes e DRY_RUN
│
├── archived/                  # Documentos antigos (histórico)
│   ├── api-testing.md
│   ├── cache-system.md
│   ├── design-patterns.md
│   ├── module-architecture.md
│   └── ...
│
└── scripts/                   # Scripts bash de teste
    ├── README.md
    ├── rebuild-and-test.sh
    └── test-cache-system.sh
```

---

## 📊 Comparação: Antes vs Depois

### ❌ ANTES (11 arquivos)
- api-testing.md (335 linhas)
- printer-management.md (529 linhas)
- TESTE-KAFKA-MANUAL.md (210 linhas)
- design-patterns.md (483 linhas)
- module-architecture.md (600 linhas)
- cache-system.md (414 linhas)
- CACHE-FLUXO.md (233 linhas)
- docker-setup.md
- interface-improvements.md
- WIKI.md
- README.md (292 linhas)

**Problemas:**
- Informação duplicada
- Difícil encontrar conteúdo
- Verboso demais

---

### ✅ DEPOIS (5 arquivos + índice)
- **API-ENDPOINTS.md** - Todos endpoints HTTP
- **KAFKA-INTEGRATION.md** - Kafka completo
- **REDIS-CACHE.md** - Cache com diagramas visuais
- **ARCHITECTURE.md** - Padrões e estrutura
- **TESTING.md** - Testes e DRY_RUN

**Vantagens:**
- ✅ Conteúdo focado e objetivo
- ✅ Fácil navegação
- ✅ Diagramas visuais preservados
- ✅ Documentos antigos arquivados (não perdidos)

---

## 🎯 Como Contribuir

### Adicionar Nova Feature

1. Implementar código
2. Atualizar documentação relevante:
   - Novo endpoint? → [API-ENDPOINTS.md](./API-ENDPOINTS.md)
   - Mudança no cache? → [REDIS-CACHE.md](./REDIS-CACHE.md)
   - Novo padrão? → [ARCHITECTURE.md](./ARCHITECTURE.md)
3. Adicionar testes em [TESTING.md](./TESTING.md)

---

### Reportar Problema na Documentação

Abra issue ou PR com:
- Qual documento está incorreto
- O que deveria estar escrito
- Exemplo ou screenshot (se aplicável)


---

### docker-setup.md
**O que você encontra:**
- Quick start (build, up, logs)
- Verificação de instalação
- Testes de conectividade
- Configuração do .env
- Troubleshooting Docker
- Comandos rpcclient úteis

**Quando usar:**
- Setup inicial com Docker
- Problemas de conexão SMB
- Testes do rpcclient
- Erros de container

---

### api-testing.md
**O que você encontra:**
- Testes com cURL (básicos e avançados)
- Cliente Browser (JavaScript)
- Exemplos de integração
- Testes de performance (ab, wrk)
- Monitoramento e logs

**Quando usar:**
- Testar endpoints manualmente
- Implementar cliente
- Validação pós-deploy
- Benchmarking

---

### scripts/README.md
**O que você encontra:**
- `rebuild-and-test.sh` - Rebuild + testes
- `test-cache-system.sh` - Validação de cache
- `test-rpcclient-docker.sh` - Teste Docker/SMB
- Guia de execução e troubleshooting

**Quando usar:**
- Automação de testes
- CI/CD pipelines
- Validação rápida do sistema
- Debug de ambiente Docker

---

---

## 🛠️ Casos de Uso Comuns

### "Quero apenas imprimir PDFs"
1. **[README.md](../README.md)** - Setup básico
2. **[API Testing](./api-testing.md)** - Exemplo de impressão

### "Preciso gerenciar filas de impressão"
1. **[Printer Management](./printer-management.md)** - Capacidades do rpcclient
2. **[Docker Setup](./docker-setup.md)** - Instalar rpcclient
3. **[API Testing](./api-testing.md)** - Testar endpoints avançados

### "Cache não está funcionando"
1. **[Cache System](./cache-system.md)** - Troubleshooting
2. Verifique TTL e timestamps

### "Quero adicionar suporte a IPP"
1. **[Design Patterns](./design-patterns.md)** - Entender arquitetura
2. **[Interface Improvements](./interface-improvements.md)** - Implementar IPrinterAdapter
3. Criar `IppAdvancedAdapter` seguindo padrão do `SmbAdvancedAdapter`

### "Erro de permissão no servidor SMB"
1. **[Printer Management](./printer-management.md)** - Seção de permissões
2. **[Docker Setup](./docker-setup.md)** - Troubleshooting de erros NT_STATUS

---

## 📊 Estatísticas da Documentação

| Documento | Linhas | Tamanho | Foco |
|-----------|--------|---------|------|
| **cache-system.md** | 354 | 8.5 KB | Performance, Cache |
| **printer-management.md** | 528 | 11 KB | rpcclient, Gerenciamento |
| **design-patterns.md** | 482 | 13 KB | Arquitetura, SOLID |
| **interface-improvements.md** | 344 | 9.2 KB | Interfaces, Type-safety |
| **api-testing.md** | 362 | 7.7 KB | Testes, Exemplos |
| **docker-setup.md** | 159 | 3.0 KB | Docker, rpcclient |
| **module-architecture.md** | 400+ | 10 KB | NestJS, DI, Módulos |
| **scripts/README.md** | 200+ | 5.0 KB | Automação, Scripts |
| **TOTAL** | **2829+** | **67+ KB** | - |

**Nota:** Documentação cresceu de forma estruturada (scripts e arquitetura)

---

## 🎯 Melhorias Recentes

### ✅ Consolidação
- Mesclado `cache-comparison.md` em `cache-system.md`
- Removido conteúdo redundante
- Focado em informações úteis

### ✅ Organização
- Todos os docs na pasta `docs/`
- README principal mais conciso
- Links entre documentos

### ✅ Qualidade
- Exemplos práticos
- Troubleshooting em cada doc
- Casos de uso claros

---

## 📝 Convenções

### Estrutura dos Documentos
1. **Título e Visão Geral** - O que o documento cobre
2. **Conceitos Principais** - Explicações detalhadas
3. **Exemplos Práticos** - Código e comandos
4. **Troubleshooting** - Erros comuns e soluções
5. **Referências** - Links externos

### Formatação
- `código inline` - Comandos, variáveis, arquivos
- ```bash - Blocos de código com linguagem
- **Negrito** - Ênfase, títulos de seções
- ✅ ❌ ⚠️ - Indicadores visuais

---

## 🤝 Contribuindo com a Documentação

### Adicionando Novo Documento
1. Crie em `docs/novo-documento.md`
2. Atualize este README-DOCS.md
3. Adicione link no README.md principal

### Atualizando Existente
1. Mantenha estrutura consistente
2. Adicione exemplos práticos
3. Atualize troubleshooting se aplicável

### Boas Práticas
- Seja conciso mas completo
- Priorize exemplos sobre teoria
- Adicione casos de uso reais
- Mantenha código atualizado

---

## 📚 Recursos Externos

- [NestJS Documentation](https://docs.nestjs.com/)
- [Samba RPC Client](https://www.samba.org/samba/docs/current/man-html/rpcclient.1.html)
- [SMB Protocol](https://docs.microsoft.com/en-us/windows/win32/fileio/microsoft-smb-protocol-and-cifs-protocol-overview)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Última atualização:** 6 de outubro de 2025
**Total de documentos:** 7 (1 principal + 6 docs/)
**Tamanho total:** ~60 KB
