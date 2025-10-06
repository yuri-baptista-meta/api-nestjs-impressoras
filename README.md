<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center"><b>Backend base para aplicações server-side escaláveis e eficientes</b></p>

---

# 📚 Descrição

Este projeto é um backend robusto feito em [NestJS](https://github.com/nestjs/nest) com TypeScript, pronto para servir como base para aplicações modernas. Ele inclui:

- CRUD completo de autenticação e usuários (admin-side)
- Envio de e-mails
- Upload de arquivos
- Integração com banco de dados MySQL
- Sistema de segurança baseado em papéis (roles)
- Controle de tokens JWT, refresh token e reset de senha
- Limite de requisições (throttling)

---

# 🚀 Setup do Projeto

1. **Clone o repositório e instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure o banco de dados:**
   - Copie `.env.example` para `.env` e ajuste as variáveis conforme seu ambiente.

3. **Execute as migrations para criar as tabelas:**
   ```bash
   npm run migrate:up
   ```
   > As migrations criam e atualizam as tabelas do banco conforme as entidades do projeto.

---

# ⚙️ Variáveis de Ambiente

No arquivo `.env`:

| Variável      | Descrição                                 |
|---------------|-------------------------------------------|
| ENV           | Ambiente de execução (`development`, etc.)|
| JWT_SECRET    | Segredo para geração dos tokens JWT       |
| DB_HOST       | Host do banco de dados MySQL              |
| DB_PORT       | Porta do banco de dados                   |
| DB_USERNAME   | Usuário do banco de dados                 |
| DB_PASSWORD   | Senha do banco de dados                   |
| DB_DATABASE   | Nome do banco de dados                    |

---

# 🗃️ Migrations

- As migrations são scripts que criam e atualizam as tabelas do banco de dados conforme as entidades TypeORM.
- Sempre que alterar ou criar entidades, gere uma nova migration:
  ```bash
  npm run migrate:create
  # Edite a migration conforme necessário
  npm run migrate:up
  ```
- Para desfazer a última migration:
  ```bash
  npm run migrate:down
  ```

---

# 🔑 Autenticação e Refresh Token

- A autenticação é baseada em JWT.
- Após login ou registro, o token JWT (access token) e um refresh token são retornados.
- Para acessar rotas protegidas, envie o token no header:
  ```http
  Authorization: Bearer <seu_token>
  ```
- O sistema controla tokens ativos por usuário, permitindo apenas 1 token válido por vez.
- Quando o access token expira, utilize o endpoint `POST /auth/refresh` enviando o refresh token para obter um novo access token (e, se necessário, um novo refresh token).
- O refresh token é reutilizado enquanto estiver válido, e um novo é gerado automaticamente quando expirar.

---

# 📦 Upload de Arquivos

- Endpoint: `POST /auth/photo`
- Aceita upload de arquivos PNG de até 5MB.
- O arquivo é salvo em `storage/photos/photo-<userId>.png`.

---

# 🚦 Throttling (Limite de Requisições)

- O projeto utiliza o `ThrottlerModule` do NestJS para limitar requisições.
- Padrão: 50 requisições por minuto por IP.
- Para alterar, edite o bloco `ThrottlerModule.forRoot` em [`src/app.module.ts`](src/app.module.ts).

---

# 📑 Endpoints Principais

| Método | Rota           | Descrição                        | Protegido |
|--------|----------------|----------------------------------|-----------|
| POST   | /auth/login    | Login do usuário                 | Não       |
| POST   | /auth/register | Registro de usuário              | Não       |
| POST   | /auth/forget   | Envia e-mail de reset de senha   | Não       |
| POST   | /auth/reset    | Redefine a senha                 | Não       |
| POST   | /auth/refresh  | Renova o access token via refresh token | Não |
| POST   | /auth/me       | Retorna dados do usuário logado  | Sim       |
| POST   | /auth/photo    | Upload de foto de perfil         | Sim       |
| GET    | /users         | Lista todos os usuários          | Sim (ADMIN)|
| GET    | /users/:id     | Detalhes de um usuário           | Sim (ADMIN)|
| POST   | /users         | Cria novo usuário                | Sim (ADMIN)|
| PUT    | /users/:id     | Atualiza usuário                 | Sim (ADMIN)|
| PATCH  | /users/:id     | Atualiza parcialmente usuário    | Sim (ADMIN)|
| DELETE | /users/:id     | Remove usuário                   | Sim (ADMIN)|

---

# 🏭 Produção

1. **Configure o `.env` com as variáveis do ambiente de produção.**
2. **Execute as migrations antes do build:**
   ```bash
   npm run migrate:up
   ```
3. **Gere o build e rode o projeto:**
_O build é automatizado via script, basta digitar o comando de `run prod`_
   ```bash
   npm run prod
   ```

---

# 🧪 Testes

> ⚠️ Não há testes automatizados neste projeto no momento.

---

# 👨‍💻 Contato

- Autor: [Yuri Garcia](https://www.linkedin.com/in/ogarciia/)
- Linkedin: [ogarciia](https://www.linkedin.com/in/ogarciia/)
- Instagram: [@yuri.garciia](https://www.instagram.com/yuri.garciia?igsh=bmtiN2dlbG02cDNv)