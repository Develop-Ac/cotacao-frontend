# DANGEROUS_ACTIONS — Ações de Alto Risco (Exigem Aprovação)

Qualquer item abaixo exige:
1) Plano de Execução
2) Análise de Riscos e Impacto
3) Plano de Testes (Como validar?)
4) Plano de Rollback (Como desfazer?)
5) **Aprovação explícita do usuário antes de iniciar**

## Banco de Dados (Se aplicável no frontend ou BFF)
- Migrações destrutivas (`DROP`, `RENAME`, `ALTER COLUMN`).
- Backfill ou scripts de correção em tabelas com milhões de registros.
- Operações pesadas como `REINDEX`, `VACUUM` ou `REBUILD` em horário de pico.
- Acesso direto ao banco de produção para correções manuais ("hotfix").

## Segurança
- Mudanças nas configurações de **CORS**, **CSRF**, **Cookies** (`SameSite`, `Secure`, `HttpOnly`).
- Alterações no fluxo de **Autenticação** (Login, Logout, Refresh Token) ou **Autorização** (RBAC/ACL).
- Exposição ou alteração de *Secrets* e *API Keys*.
- Ajustes em storage de arquivos (Ex: tornar bucket público, alterar permissões de leitura/escrita).
- Implementação de fluxos que bypassam proteções de segurança (ex: "developer backdoor").

## Infraestrutura e Deploy
- Alteração ou adição de **Variáveis de Ambiente** (`.env`).
- Modificação de regras de **Proxy**, **CDN** (Cloudflare, Vercel Edge), **WAF** ou **Rate Limiting**.
- Alteração de configurações de DNS, domínios, subdomínios ou certificados HTTPS.
- Mudança na pipeline de CI/CD (GitHub Actions) ou scripts de build.

## Frontend e Código (Cotacao-Frontend)
- **Refatorações Globais**: "Find & Replace" em múltiplos arquivos que alterem lógica de negócio.
- **Atualização de Deps**: Upgrade de versão *major* de frameworks core (Next.js, React, Tailwind, SWR).
- **Hooks/Contextos Globais**: Alterações lógica em hooks ou contextos utilizados por toda a aplicação (ex: `useAuth`, `ThemeContext`).
- **Manipulação Direta do DOM**: Uso de `document.getElementById` ou similares que fujam do ciclo de vida do React.
- **Remoção de Código Morto**: Exclusão em massa de arquivos ou funções supostamente não utilizadas sem verificação profunda.
