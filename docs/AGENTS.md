# Contexto do Projeto: Intranet

Este arquivo define os critérios operacionais e diretrizes para agentes de IA atuarem neste projeto.

> [!IMPORTANT]
> **Atenção:** Para obter a visão técnica completa, estrutura de pastas e decisões arquiteturais, consulte o arquivo **[ARCHITECTURE.md](./ARCHITECTURE.md)**. O arquivo atual foca exclusivamente nas regras de conduta do agente.

## 🚨 GUARDRAILS ESTRITOS (LEITURA OBRIGATÓRIA) 🚨

Antes de qualquer ação, o agente **DEVE** consultar e respeitar integralmente os seguintes documentos:

1.  **[NEVER_DO.md](./NEVER_DO.md)**: Ações que são **estritamente proibidas** sob qualquer circunstância.
2.  **[DANGEROUS_ACTIONS.md](./DANGEROUS_ACTIONS.md)**: Ações de alto risco que exigem **aprovação explícita** e planejamento detalhado.

**Ignorar estes arquivos resultará em violação grave das diretrizes do projeto.**

## 1. Critérios de Uso Obrigatórios (Regras de Ouro)

1.  **Planejamento e Aprovação (Mandatório)**:
    - Antes de qualquer alteração de código, **você deve criar um plano de implementação detalhado**.
    - **Aguarde a aprovação explícita do usuário** sobre o plano antes de executar qualquer escrita de código.
    - Se houver dúvidas ou riscos, pergunte antes de planejar.

2.  **Consulta à Arquitetura**:
    - Antes de sugerir soluções, leia o `ARCHITECTURE.md` para garantir que sua abordagem segue os padrões estabelecidos (ex: uso de proxies, serviços centralizados em `lib/`, componentes UI, etc.).

3.  **Análise Prévia e Contexto**:
    - Nunca presuma o estado do arquivo. Leia o conteúdo atual antes de propor edições.
    - Respeite as convenções de código existentes (ver abaixo).

4.  **Segurança e Boas Práticas**:
    - **Nunca** inclua credenciais (API Keys, senhas) no código.
    - Use variáveis de ambiente (`.env.local`).
    - Trabalhe de forma incremental e segura.

5.  **Idioma e Documentação**:
    - **Sempre** responda e crie documentos em **Português**.

## 2. Padrões de Código Resumidos
*(Detalhes completos em `ARCHITECTURE.md`)*

- **TypeScript**: Tipagem estrita, evite `any`.
- **Componentes**: Funcionais, pequenos, `use client` apenas se necessário.
- **Estilização**: Tailwind CSS v4 (classes utilitárias).
- **Testes**: Mantenha ou adicione testes unitários para novas lógicas críticas (`npm run test`).

## 3. Comandos Operacionais

- **Instalar Dependências**: `npm install`
- **Rodar Desenvolvimento**: `npm run dev`
- **Build de Produção**: `npm run build`
- **Lint/Verificação**: `npm run lint`
- **Rodar Testes**: `npm run test`
