## Solicitação

Criação de **usuário de serviço dedicado** para API de gerenciamento de impressoras SMB.

A API precisa de um usuário próprio para operação contínua, independente de contas pessoais.

## Especificações do Usuário

**Nome:** `svc_printers_api` ou `api_impressoras`  
**Tipo:** Service Account (usuário de serviço)  
**Configurações:**
- Senha forte, sem expiração
- Conta não expira
- Sem necessidade de login interativo/SSO
- **Obs:** Se o ambiente usa SSO/email corporativo para login nas VMs, solicito verificar se é necessário criar conta local ou de domínio específica para service accounts

## Permissões Necessárias

### 1. Adicionar ao Grupo: **Print Operators**
Caminho: `Computer Management > Groups > Print Operators`

### 2. Permissões nas Impressoras
Em cada impressora (`Print Management > Properties > Security`):
- Print
- Manage this printer  
- Manage documents

### 3. Portas de Rede (Firewall)
- `135` - RPC
- `139` - NetBIOS
- `445` - SMB