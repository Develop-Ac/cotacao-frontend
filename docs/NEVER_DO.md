# NEVER_DO — Proibições Absolutas para Agentes de IA

Este arquivo define ações que a IA **NUNCA** deve executar, sugerir como padrão, ou aplicar sem solicitação explícita do usuário.

## 1) Segurança e Segredos
- NUNCA hardcode credenciais, tokens, senhas, chaves, secrets, API keys.
- NUNCA logar tokens/cookies/headers de autenticação em console ou logs.
- NUNCA sugerir armazenar token em `localStorage` como padrão (preferir HttpOnly cookies ou gestão segura de sessão).
- NUNCA expor variáveis `.env` em código client-side (Next.js) a menos que explicitamente prefixadas com `NEXT_PUBLIC_`.
- NUNCA criar endpoints, queries ou telas que permitam acesso sem autenticação quando o dado for interno.

## 2) Banco de Dados e Dados
- NUNCA rodar `DELETE`/`UPDATE` sem `WHERE`.
- NUNCA gerar migrações destrutivas sem plano (ex.: drop column/table) e sem backup.
- NUNCA criar scripts de "fix" que alterem produção sem rollback.
- NUNCA copiar dados reais (clientes, pedidos, notas) para exemplos, mocks ou commits.

## 3) Produção e Infra
- NUNCA aplicar alterações em produção (deploy, env, infra) sem orientação explícita.
- NUNCA desligar firewall, autenticação, WAF, rate-limit para “testar”.
- NUNCA abrir CORS como `*` em produção.
- NUNCA desativar validações TLS/SSL (`rejectUnauthorized=false`) em produção.

## 4) Código e Arquitetura (Cotacao-Frontend)
- **Framework**: NUNCA misturar paradigmas do Pages Router (`getStaticProps`, `getServerSideProps`) no App Router (`app/`).
- **Estado**: NUNCA introduzir bibliotecas de estado global complexas (Redux, MobX, Zustand) sem aprovação, já que o projeto utiliza Hooks/Context e SWR.
- **Estilização**: NUNCA criar novos arquivos CSS/SCSS/Modules. Use exclusivamente **Tailwind CSS** e as classes utilitárias.
- **Componentes**: NUNCA instalar bibliotecas de UI conflitantes (Bootstrap, MUI, Chakra) se o projeto já utiliza **Shadcn UI** e Tailwind.
- **Imports**: NUNCA utilizar caminhos relativos longos (ex: `../../../components`); use sempre os aliases configurados (`@/`).
- **Tipagem**: NUNCA utilizar `any` no TypeScript a menos que seja estritamente necessário e documentado.
- **Dependências**: NUNCA adicionar dependências novas sem justificar (motivo, alternativa nativa, impacto no bundle).

## 5) UX e Integridade Funcional
- NUNCA remover validações para “passar”.
- NUNCA esconder erros críticos (ex.: engolir `catch` sem feedback/log).
- NUNCA alterar regras de negócio sem evidência no documento de requisitos.
- NUNCA deixar interfaces quebradas ou sem responsividade básica ao adicionar novas features.

## 6) Compliance e Auditoria Interna
- NUNCA remover trilhas de auditoria, logs essenciais ou rastreabilidade sem aprovação.
- NUNCA mascarar comportamento inseguro com mensagens genéricas.

## 7) Testes e Qualidade
- NUNCA “corrigir teste” enfraquecendo a asserção só pra passar.
- NUNCA pular testes críticos quando a mudança afeta auth, permissões, upload/download, financeiro.

## Exceções
Somente permitido se o usuário solicitar explicitamente **e** houver plano + riscos + rollback documentados.
