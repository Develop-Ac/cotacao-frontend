# Convenções de Código: Padrões e Nomeação

Este documento estabelece as diretrizes de estilo e nomeação para o projeto. O objetivo é reduzir conflitos em Pull Requests e facilitar a manutenção, mantendo um padrão consistente.

> [!IMPORTANT]
> **Regra Geral de Idioma**: Toda a nomeação de variáveis, funções, arquivos e pastas deve ser em **Português**.
> *Exceções*: Termos técnicos universais (ex: `id`, `url`, `api`, `fetch`, `useEffect`, arquivos padrão do Next.js como `page.tsx`).

## 1. Nomeação (Naming)

### Pastas e Estrutura de Rotas
- **Padrão**: `kebab-case` (tudo minúsculo, separado por hífen).
- **Idioma**: Português.
- **Exemplos**:
    - `app/(private)/compras/cotacao/` (Correto)
    - `components/botao-primario/` (Se for pasta de componente)
    - `app/utils/` -> `app/utilitarios/` ou `app/lib/` (Manter `lib` se for convenção técnica)

### Arquivos
- **Componentes React**: `PascalCase` (ex: `BotaoSalvar.tsx`, `ListaPedidos.tsx`).
- **Hooks**: `camelCase` começando com `use` (ex: `usePermissoes.ts`).
- **Utilitários/Funções**: `camelCase` (ex: `formatarData.ts`, `api.ts`).
- **Next.js Pages/Layouts**: Manter padrão do framework (`page.tsx`, `layout.tsx`, `loading.tsx`), mas as pastas pai devem ser em Português.

### Componentes e Funções
- **Componentes**: `PascalCase`. O nome da função deve corresponder ao nome do arquivo.
    ```tsx
    // Correto
    export default function ListaPedidos() { ... }
    ```
- **Funções (Não-Componentes)**: `camelCase`. Devem começar com um verbo indicando ação.
    - `buscarDados()`
    - `calcularTotal()`
    - `validarFormulario()`

### Tipos e Interfaces
- **Padrão**: `PascalCase`.
- **Não usar prefixos/sufixos como `I` ou `Type`**.
    - `Usuario` (Correto)
    - `IUsuario` (Incorreto)
    - `UsuarioType` (Incorreto)

### Variáveis e Constantes
- **Variáveis**: `camelCase` (ex: `listaProdutos`, `usuarioAtivo`).
- **Booleanos**: Prefixos `eh`, `tem`, `pode` (ex: `ehAdmin`, `temPermissao`, `estaCarregando`). A comunidade aceita manter `is/has` se for muito padrão, mas seguindo a regra de português: `ativo`, `visivel`, `modalAberto`.
    - No código existente vemos `loading`, `modalOpen`. **Para novos códigos**, prefira: `carregando`, `modalAberto`.
- **Constantes (Globais/Config)**: `UPPER_SNAKE_CASE` (ex: `LIMITE_ITENS_PAGINA`, `URL_API`).

## 2. Padrão de Exports/Imports

### Exports
- **Componentes de Página (`page.tsx`)**: `export default`.
- **Componentes Reutilizáveis**: Preferir `export default` se for o único componente do arquivo. `export` nomeado se houver vários.
- **Utilitários e Hooks**: Preferir `export` nomeado (Named Export) para facilitar refatoração e tree-shaking.
    ```ts
    // utilitarios.ts
    export const formatarMoeda = ...
    ```

### Imports
- Agrupar imports na seguinte ordem:
    1.  Bibliotecas externas (`react`, `next`, `axios`).
    2.  Caminhos absolutos/alias internos (`@/components`, `@/lib`).
    3.  Caminhos relativos (`./styles`, `../utils`).
    4.  Tipos (se importados separadamente).

## 3. Padrão de Props e Eventos

Utilize o padrão `on` para props de evento e `handle` para as funções tratadoras, mantendo o sufixo da ação em Português ou Inglês (mas consistente). **Recomendação: Manter `on[Acao]` e `handle[Acao]` com a ação em Português ou Inglês Técnico, mas evite misturar.**
*Considerando a regra de português*:

- **Props de Evento**: `on` + Ação (PascalCase).
    - `onSalvar`
    - `onCancelar`
    - `onAlterar` (para inputs)
- **Funções Tratadoras (Handlers)**: `handle` + Ação.
    - `handleSalvar`
    - `handleCancelar`
    - `handleChange` (tolerável se for padrão HTML) ou `handleAlteracao`.

> **Nota**: Se o evento for nativo do HTML (`onClick`, `onChange`), mantenha o padrão do React. Se for um evento customizado de um componente seu, use Português (`onSucesso`, `onErro`).

## 4. Padrão de Tipos (Type vs Interface)

- **Use `type`** para:
    - Definições de Props de componentes (`type BotaoProps = ...`).
    - Uniões (`type Status = 'ativo' | 'inativo'`).
    - Tipos simples ou objetos que não precisam ser estendidos.
- **Use `interface`** para:
    - Modelos de dados que podem ser estendidos (Herança).
    - Definições de API públicas (se houver).
- **Regra de Ouro**: Escolha um e seja consistente no arquivo. Não misture `type` e `interface` para a mesma finalidade no mesmo arquivo.

## 5. Padrão de Comentários

- **Quando comentar**:
    - **Por que** algo foi feito de tal maneira (decisões não óbvias).
    - Regras de negócio complexas.
    - Hacks ou workarounds temporários (marcar com `TODO` ou `FIXME`).
- **Como comentar**:
    - Use Português.
    - Evite comentar o óbvio (ex: `// Função que soma dois números`).
    - JSDoc é bem-vindo para funções utilitárias complexas, explicando parâmetros e retorno.

```ts
/**
 * Calcula o imposto baseado na regra XP-200.
 * @param valorBase Valor original do produto
 * @returns Valor com imposto
 */
function calcularImposto(valorBase: number): number { ... }
```
