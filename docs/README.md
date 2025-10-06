# Documentação da API

Índice completo da documentação do sistema de impressoras SMB.

---

## 📚 Documentos Disponíveis

### Visão Geral e Setup
- **[README.md](../README.md)** - Introdução, instalação e guia rápido
- **[Docker Setup](./docker-setup.md)** - Configuração Docker com rpcclient (159 linhas)

### Funcionalidades do Sistema
- **[Sistema de Cache](./cache-system.md)** - Cache inteligente com IDs únicos (354 linhas)
- **[Gerenciamento de Impressoras](./printer-management.md)** - Operações avançadas com rpcclient (528 linhas)

### Arquitetura e Código
- **[Arquitetura de Módulos](./module-architecture.md)** - Boas práticas NestJS, DI e organização (599 linhas)
- **[Padrões de Projeto](./design-patterns.md)** - SOLID, DI, Adapter Pattern (482 linhas)
- **[Interfaces e Adapters](./interface-improvements.md)** - Type-safety e implementações (344 linhas)

### Testes
- **[Testes de API](./api-testing.md)** - Exemplos com cURL, scripts e clientes (334 linhas)
- **[Scripts de Teste](./scripts/README.md)** - Scripts bash automatizados (.sh)

---

## 🚀 Por Onde Começar?

### 1. Novo no Projeto?
1. Leia o **[README.md](../README.md)** principal
2. Configure o ambiente com **[Docker Setup](./docker-setup.md)**
3. Teste as APIs com **[API Testing](./api-testing.md)**

### 2. Quer Entender o Cache?
- **[Sistema de Cache](./cache-system.md)** - Funcionamento, performance e troubleshooting

### 3. Precisa de Operações Avançadas?
- **[Gerenciamento de Impressoras](./printer-management.md)** - Status, filas, cancelamento

### 4. Quer Entender a Arquitetura?
- **[Padrões de Projeto](./design-patterns.md)** - Como o código está organizado
- **[Interfaces e Adapters](./interface-improvements.md)** - Flexibilidade e extensibilidade

---

## 📖 Resumo por Documento

### README.md (Principal)
**O que você encontra:**
- Características principais da API
- Pré-requisitos e instalação
- Comandos de execução (Docker, dev, prod)
- Endpoints disponíveis (básicos e avançados)
- Arquitetura do projeto
- Links para docs detalhados

**Quando usar:** Primeira leitura e referência rápida

---

### cache-system.md
**O que você encontra:**
- Como funciona o cache read-through
- IDs determinísticos (SHA256)
- Benefícios de performance (97.5% de ganho)
- TTL e expiração (5 minutos)
- Troubleshooting de erros de cache
- Customização e Redis

**Quando usar:** 
- Erros de "impressora não encontrada"
- Performance lenta
- Implementar cache distribuído

---

### printer-management.md
**O que você encontra:**
- Comparação smbclient vs rpcclient
- Operações avançadas (status, fila, cancelamento)
- Formato de output do rpcclient
- Exemplos práticos de cada operação
- Limitações e requisitos
- Permissões necessárias no servidor

**Quando usar:**
- Implementar gerenciamento de filas
- Verificar status de impressoras
- Cancelar/pausar jobs
- Troubleshooting de permissões

---

### design-patterns.md
**O que você encontra:**
- Problema original (acoplamento)
- Refatoração para SOLID
- Adapter Pattern
- Dependency Injection
- Comparação antes/depois
- Benefícios para testes e manutenção

**Quando usar:**
- Entender decisões arquiteturais
- Adicionar novo protocolo (IPP, LPD)
- Melhorar testabilidade
- Code review

---

### interface-improvements.md
**O que você encontra:**
- Interface IPrinterAdapter completa
- Tipos auxiliares (PrinterStatus, PrintJob)
- Implementações (Advanced, Basic, Mock)
- Matriz de suporte (quem implementa o quê)
- Type-safety e benefícios
- Erros informativos

**Quando usar:**
- Criar novo adapter
- Entender diferenças entre adapters
- Implementar mocks para testes
- Troubleshooting de type errors

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
