# Segurança e Proteção de Dados

Este documento define as diretrizes de segurança para o desenvolvimento frontend, focando na prevenção de vulnerabilidades comuns e proteção de dados sensíveis.

## 1. Autenticação e Sessão

### Estado Atual (LocalStorage) - ⚠️ RISCO XSS
Atualmente, o token de autenticação é armazenado em `localStorage`.
- **Risco**: Qualquer script malicioso injetado na página (via `npm` package comprometido ou input não sanitizado) pode roubar o token.
- **Mitigação Obrigatória**: Rigorosa sanitização de inputs e Content Security Policy (CSP).

### Estado Futuro (Cookies HttpOnly) - ✅ SEGURO
A migração para Cookies HttpOnly está planejada.
- **Cookies**: Devem ser marcados como `HttpOnly` (inacessíveis via JS), `Secure` (apenas HTTPS) e `SameSite=Strict`.
- **CSRF**: O Next.js deve validar a origem das requisições.

> Consulte **[AUTH_MIGRATION_PLAN.md](./AUTH_MIGRATION_PLAN.md)** para o plano detalhado de migração.

## 2. Segredos e Credenciais

> [!CAUTION]
> **DADO SENSÍVEL**: NUNCA commite chaves de API, senhas, tokens ou segredos no código fonte.

- **Variáveis de Ambiente**:
  - Segredos de servidor (Banco, API Keys privadas) -> `.env.local` (apenas Server-Side).
  - Configurações públicas -> `NEXT_PUBLIC_` (ex: URL da API pública).
- **Hardcoding**: É terminantemente proibido. Ferramentas de CI/CD bloquearão commits com padrões de chaves conhecidos.

## 3. Sanitização de Dados (XSS)

- **Inputs de Usuário**:
  - O React/Next.js escapa automaticamente conteúdos no JSX (`{variavel}`).
  - **Cuidado**: Evite ao máximo `dangerouslySetInnerHTML`. Se necessário, use uma biblioteca de sanitização como `dompurify`.
- **Query Params**:
  - Valide sempre os parâmetros de URL antes de usá-los. Ex: Se espera um número `?id=123`, garanta que é um número antes de passar para a API.

## 4. Upload e Download de Arquivos

### Upload
- **Validação no Frontend**:
  - Verifique `file.type` (MIME type) e `file.name` (extensão) antes de enviar.
  - Limite o tamanho do arquivo (`file.size`).
- **Malware**: O frontend não consegue detectar vírus, mas não deve executar arquivos enviados pelo usuário.

### Download
- **Origem**: Baixe arquivos apenas de domínios confiáveis (whitelisted em `next.config.js`).
- **Conteúdo**: Evite renderizar HTML, SVG ou XML vindo de uploads de usuários diretamente no navegador (use `Content-Disposition: attachment`).

## 5. Políticas de Logging

- **O Que NÃO Logar**:
  - Tokens de autenticação completos.
  - Senhas (mesmo em hash).
  - Dados Pessoais Identificáveis (PII) sensíveis (CPF, Cartão de Crédito) em logs de erro.
- **O Que Logar**:
  - IDs de correlação (Trace ID).
  - Mensagens de erro técnicas (Stack Traces) *no console de desenvolvimento ou ferramenta de monitoramento segura*, nunca expostos ao usuário final.

## 6. Content Security Policy (CSP)
Recomenda-se configurar headers CSP no `next.config.js` ou middleware para restringir fontes de scripts, estilos e imagens, mitigando riscos de XSS.
