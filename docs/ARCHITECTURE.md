# Arquitetura do Projeto: Cotacao Frontend

Este documento descreve a arquitetura de alto nível, os padrões de design e as decisões técnicas do projeto `cotacao-frontend`.

## 1. Visão Geral
O projeto é uma aplicação web **frontend** desenvolvida em **Next.js 15 (App Router)** que atua como interface para diversos serviços de backend (Microserviços/APIs). A aplicação consome dados de APIs RESTful para gerenciar cotações, compras e outros fluxos de intranet.

### Principais Tecnologias
- **Framework**: Next.js 15.3.2
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS v4
- **Ícones**: React Icons (`fa` - FontAwesome)
- **HTTP Client**: Fetch API nativa (com wrappers/helpers em `lib/`)

## 2. Estrutura do Projeto

### `/app`
Utiliza o **App Router** do Next.js.
- **`/(private)`**: Rotas protegidas ou internas do sistema. A estrutura de pastas reflete a URL (ex: `/compras/cotacao`).
- **`api/`**: Rotas de API do Next.js (Route Handlers), frequentemente usadas como **Proxy** para serviços backend para lidar com autenticação ou CORS.

### `/components`
Componentes de UI reutilizáveis (Botões, Modais, Inputs, Breadcrumbs). Devem ser puros e desacoplados de lógica de negócio complexa sempre que possível.

### `/lib`
Camada de utilitários e infraestrutura.
- **`services.ts`**: Centraliza a configuração de URLs dos serviços de backend (ex: Compras, Feed). Padrão Factory ou Mapa de URLs.
- **`db.ts`**: Configuração de banco de dados (se aplicável para rotas de API server-side).

### `/hooks`
Custom Hooks do React para abstrair lógica de estado complexa ou reutilizável (ex: `usePermissions`).

## 3. Padrões de Comunicação de Dados (Data Fetching)

### Client-Side Fetching
A maior parte da interação com dados ocorre no lado do cliente (`use client`), utilizando `useEffect` e `fetch`.
- **Padrão**: Os componentes de página (`page.tsx`) geralmente orquestram a busca de dados e passam para componentes filhos.
- **Helpers**: Utiliza `serviceUrl` (`@/lib/services`) para resolver o endpoint correto.

### Proxies (`/api/proxy`)
Para comunicações sensíveis ou que requerem tratamento especial (como interações com RabbitMQ ou serviços legados), o Next.js atua como um proxy intermediário.

## 4. Estilização e UI (Design System)

- **Framework**: Tailwind CSS v4.
- **Tema**: Suporte a **Dark Mode** (`dark:` classes) e responsividade (`sm:`, `md:`, `lg:`).
- **Componentes Visuais**:
    - Cards com sombras e bordas (`rounded-xl`, `shadow-md`).
    - Tabelas responsivas (`overflow-x-auto`).
    - Feedback visual de carregamento (`Loading`, `animate-pulse`).

## 5. Fluxo de Execução Típico (Cotação de Compra)

1.  **Carregamento**: O usuário acessa `/compras/cotacao`.
2.  **Fetch Inicial**: `useEffect` dispara chamadas para a API de Compras usando URL resolvida por `lib/services`.
3.  **Visualização**: Dados são armazenados em `useState` e renderizados em Cards (`PedidoCard`).
4.  **Interação**:
    - O usuário clica em "Nova Cotação".
    - `buscarCotacao` consulta API de Compras e API de Sugestões (`sugestao-compras-service-go`).
    - Logica de merge de dados no frontend (ex: combinar itens da cotação com sugestões de compra).
5.  **Persistência**: `criarCotacao` envia payload JSON para o backend via `POST`.

## 6. Decisões Arquiteturais Importantes
- **Lógica no Frontend**: Algumas regras de agregação de dados (ex: merge de sugestão com item) estão sendo feitas no frontend (`page.tsx`). *Observação: Considerar mover para Backend for Frontend (BFF) se a complexidade aumentar.*
- **Componentes Locais**: Componentes específicos de uma página (ex: `PedidoCard` dentro de `page.tsx`) são mantidos no mesmo arquivo para agilidade, a menos que precisem ser reutilizados.
- **Tratamento de Erros**: Blocos `try/catch` em funções assíncronas com feedback visual via estados de mensagem (`msgCot`, `msgPedidos`).

## 7. Critérios para Evolução
- Ao criar novas funcionalidades, preferir extrair componentes complexos para `/components`.
- Centralizar tipos compartilhados em `/types` em vez de duplicar em cada arquivo.
- Utilizar `lib/services.ts` para todas as URLs externas.
