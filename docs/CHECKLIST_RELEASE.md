# CHECKLIST_RELEASE — Pré-Deploy / Pré-Release

Este checklist deve ser seguido antes de qualquer release do projeto **cotacao-frontend**.
Se algum item for "NÃO", registrar o motivo e o plano de correção/rollback.

---

## 0) Contexto do Release
- [ ] Objetivo do release (1–2 frases)
- [ ] Escopo (features/rotas afetadas — ex: Feed, Cotação, Profile)
- [ ] Lista de arquivos/pastas alterados (alto nível)
- [ ] Riscos conhecidos + mitigação
- [ ] Plano de rollback definido (reverter commit/tag no Git)

---

## 1) Build, Qualidade e CI
- [ ] `npm run lint` (`next lint`) executado sem erros
- [ ] `npm run test` (`jest`) executado sem falhas
- [ ] `npm run build` (`next build`) concluído com sucesso
- [ ] Sem warnings críticos no build (ex: hydration mismatch, props não serializáveis)
- [ ] Verificar se não há `console.log` de debug esquecidos (especialmente em `middleware.ts` ou loops)

---

## 2) Configuração de Ambiente (.env)
- [ ] **CRÍTICO:** Verificar se variáveis de ambiente de produção estão corretas
- [ ] Variáveis de serviço (`NEXT_PUBLIC_FEED_SERVICE_BASE`, etc.) apontam para as URLs corretas do ambiente
- [ ] `package-lock.json` atualizado e commitado
- [ ] Nenhuma dependência nova adicionada sem análise de licença/segurança

---

## 3) Segurança e Autenticação
- [ ] Cookie `auth_token` configurado:
  - [ ] `Secure: true` (HTTPS obrigatório em Prod)
  - [ ] `SameSite` adequado (Lax/Strict)
- [ ] Middleware (`middleware.ts`):
  - [ ] Rotas protegidas não estão vazando (teste de acesso anônimo)
  - [ ] Bypass de desenvolvimento desligado
- [ ] Tokens JWT não são logados no console ou enviados para serviços de monitoramento
- [ ] Upload de Arquivos (Feed/Anexos):
  - [ ] Tipos de arquivo restritos (validado no front e back)
  - [ ] Limite de tamanho respeitado

---

## 4) Contratos de API e Integração
- [ ] Alterações em contratos refletidas em `docs/API_CONTRACTS.md`
- [ ] Verificar endpoint base em `lib/services.ts` se houver novos serviços
- [ ] Tratamento de erros 401 (Redirecionar p/ Login) e 403 (Acesso Negado) funcionando
- [ ] Rotas de Proxy (se houver, ex: RabbitMQ) validadas quanto a permissões

---

## 5) Funcionalidades Críticas (Smoke Tests)
Testar manualmente após deploy em ambiente de staging:

- [ ] **Autenticação**: Login com sucesso e persistência do cookie `auth_token`
- [ ] **Logout**: Limpeza correta dos cookies e redirecionamento
- [ ] **Feed**:
  - [ ] Carregamento da lista de posts
  - [ ] Criação de post com anexo (se aplicável ao release)
- [ ] **Cotação/Compras**:
  - [ ] Visualização de pedidos (OpenQuery)
  - [ ] Acesso a detalhes de uma cotação
- [ ] **User Profile**: Edição de dados do usuário (se aplicável)
- [ ] **Navegação**: Sidebar e menus não quebram ao trocar de rota

---

## 6) Performance e UI
- [ ] Carregamento inicial (LCP) aceitável (sem telas brancas longas)
- [ ] Layout responsivo não quebrado em resoluções menores (Mobile/Tablet)
- [ ] Componentes pesados (ex: Tabelas grandes, Gráficos) carregam corretamente (Lazy loading se necessário)

---

## 7) Observabilidade
- [ ] Logs de erro globais (`error.tsx`) capturam falhas não tratadas
- [ ] Verificação final no console do navegador (DevTools) por erros vermelhos (Red Errors)

---

## 8) Registro do Release
- [ ] Tag git criada (ex: `v1.2.0`)
- [ ] Changelog atualizado
- [ ] Responsável pelo deploy: __________________
- [ ] Data/Hora: ___/___/___ __:__
