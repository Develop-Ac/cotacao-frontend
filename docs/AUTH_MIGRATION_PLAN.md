# Plano de Migração de Autenticação (LocalStorage -> HttpOnly Cookies)

Este documento detalha as etapas para migrar o sistema de autenticação atual (vulnerável a XSS via LocalStorage) para um modelo seguro baseado em cookies HttpOnly, utilizando o Next.js como BFF (Backend for Frontend).

## 1. Arquitetura Proposta (BFF Pattern)
Em vez do frontend (`use client`) falar diretamente com as APIs de serviço para login, ele falará com uma rota de API do Next.js (`/api/auth/login`).

- **Fluxo de Login**:
    1.  Cliente envia credenciais para `POST /api/auth/login`.
    2.  Next.js (Server) valida credenciais com o serviço de backend (`sistema-service`).
    3.  Next.js recebe o JWT.
    4.  Next.js define um cookie `HttpOnly`, `Secure`, `SameSite=Strict` contendo o JWT.
    5.  Next.js retorna sucesso para o cliente (sem o token no corpo).

- **Fluxo de Requisição Protegida**:
    1.  Cliente chama API do Next.js (`/api/proxy/...`) ou Server Actions.
    2.  Next.js lê o cookie (automático).
    3.  Next.js encaminha o token no header `Authorization: Bearer ...` para os microserviços.

## 2. Etapas de Implementação

### Fase 1: API Routes de Autenticação (Next.js)
- [ ] Criar `app/api/auth/login/route.ts`:
    - Recebe `{ codigo, senha }`.
    - Chama backend real.
    - Define cookie usando `cookies().set(...)` do `next/headers`.
- [ ] Criar `app/api/auth/logout/route.ts`:
    - Remove o cookie.
- [ ] Criar `app/api/auth/me/route.ts`:
    - Retorna dados do usuário (perfil/permissões) lendo o token do cookie (decodificando JWT server-side ou chamando endpoint `/me` do backend).

### Fase 2: Middleware de Proteção
- [ ] Criar/Atualizar `middleware.ts`:
    - Interceptar rotas protegidas (`/app/*`).
    - Verificar existência/validade do cookie.
    - Redirecionar para `/login` se inválido.

### Fase 3: Roteamento de Chamadas (Proxy)
- [ ] Atualizar `lib/services.ts` ou criar `lib/api-client.ts` para chamadas server-side (Server Components) que anexam o cookie automaticamente.
- [ ] Para chamadas Client-Side (`use client`), usar rotas de Proxy (`/api/proxy/...`) que repassam a requisição ao backend anexando o token (o navegador envia o cookie para o Next.js, o Next.js pega o cookie e põe no header para o backend).

### Fase 4: Refatoração do Frontend
- [ ] Atualizar `app/login/page.tsx`:
    - Remover `localStorage.setItem`.
    - Usar a nova rota `/api/auth/login`.
- [ ] Remover `app/lib/user.ts` (lógica de localStorage).
- [ ] Atualizar `AbilityProvider` para buscar permissões de `/api/auth/me` via SWR ou React Query.

## 3. Considerações de Backend (Serviços)
- Os serviços de backend (Go/Python/Node) **não precisam mudar** se eles já aceitam Bearer Token. O Next.js fará o papel de "cliente seguro" que segura o token.
- Se os serviços esperam cookies diretamente, eles precisariam de ajuste de CORS (Credentials: true), o que é mais complexo. O modelo Proxy é recomendado.

## 4. Plano de Rollback
- Manter o suporte a `localStorage` por um curto período (feature flag) ou versionamento de API se necessário, mas idealmente é uma troca "big bang" por ser segurança crítica.
