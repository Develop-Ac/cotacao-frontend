# Ambiente de Desenvolvimento (Environment Setup)

Este documento detalha como configurar o ambiente de desenvolvimento, variáveis de ambiente e scripts disponíveis.

## 1. Checklist de Setup

Para rodar o projeto localmente, você precisará de:

- **Node.js**: Versão **18.17** ou superior (Requisito do Next.js 15).
- **Gerenciador de Pacotes**: `npm` (padrão do projeto).
- **VS Code**: Recomendado com as extensões *ESLint*, *Prettier* e *Tailwind CSS IntelliSense*.

### Passo a Passo
1.  Clone o repositório.
2.  Copie o arquivo de exemplo de ambiente: `cp .env.example .env.local` (ou crie um novo).
3.  Instale as dependências:
    ```bash
    npm install
    ```
4.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```

---

## 2. Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto. NUNCA comite este arquivo (ele já está no `.gitignore`).

### Serviços (Backend)
URLs bases para os microserviços. Em dev, geralmente apontam para `localhost` ou para um ambiente de homologação acessível via VPN/Rede Local.

| Variável | Descrição | Exemplo (Dev) |
|---|---|---|
| `NEXT_PUBLIC_SISTEMA_SERVICE_BASE` | API do Sistema Principal | `http://sistema-service.acacessorios.local` |
| `NEXT_PUBLIC_COMPRAS_SERVICE_BASE` | API de Compras | `http://compras-service.acacessorios.local` |
| `NEXT_PUBLIC_ESTOQUE_SERVICE_BASE` | API de Estoque | `http://estoque-service.acacessorios.local/` |
| `NEXT_PUBLIC_FEED_SERVICE_BASE` | API do Feed | `http://feed-service.acacessorios.local` |
| `NEXT_PUBLIC_ANALISE_ESTOQUE_BASE` | API de Análise de Estoque | `http://analise-estoque-service.acacessorios.local` |
| `NEXT_PUBLIC_SAC_SERVICE_BASE` | API de SAC | `http://sac-service.acacessorios.local` |
| `NEXT_PUBLIC_OFICINA_SERVICE_BASE` | API de Oficina | `http://oficina-service.acacessorios.local` |
| `NEXT_PUBLIC_EXPEDICAO_SERVICE_BASE` | API de Expedição | `http://expedicao-service.acacessorios.local` |
| `NEXT_PUBLIC_METABASE_BASE` | URL Base do Metabase | `http://bi.acacessorios.local` |

### Integrações e Segredos

| Variável | Descrição | Exemplo |
|---|---|---|
| `METABASE_SITE_URL` | URL do site Metabase (para embed) | `http://bi.acacessorios.local` |
| `METABASE_SECRET_KEY` | Chave secreta para assinar JWT do embed | `sua_chave_secreta_aqui` |
| `NODE_TLS_REJECT_UNAUTHORIZED` | **Apenas Dev**: Aceitar certificados auto-assinados | `0` (Zero) |

---

## 3. Scripts Disponíveis

Os comandos mais utilizados no dia a dia:

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor local com Turbopack (rápido). Acesso em `http://localhost:3000`. |
| `npm run build` | Compila o projeto para produção. Gera a pasta `.next`. |
| `npm run start` | Inicia o servidor de produção localmente (precisa rodar `build` antes). |
| `npm run lint` | Verifica erros de linting e estilo. |
| `npm test` | Roda a suíte de testes (Jest). |
| `npm run test:watch` | Roda testes em modo interativo (re-roda ao salvar arquivos). |
| `npm run test:coverage` | Gera relatório de cobertura de testes. |

---

## 4. Diferenças entre Ambientes

### Desenvolvimento (Local)
- **SSL**: Certificados auto-assinados podem ser ignorados (`NODE_TLS_REJECT_UNAUTHORIZED=0`).
- **Logs**: Mais verbosos no console.
- **Performance**: Turbopack foca em rebuild rápido, não em otimização de bundle.

### Produção
- **SSL**: Obrigatório e verificado.
- **Otimização**: O `build` minifica JS/CSS e otimiza imagens.
- **Cookies**: Cookies de autenticação devem ter a flag `Secure` ativa (automático se acessado via HTTPS).
