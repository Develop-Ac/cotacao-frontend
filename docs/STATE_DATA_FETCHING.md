# Gerenciamento de Estado e Data Fetching

Este documento define a estratégia para obter, armazenar e atualizar dados na aplicação.

## 1. Princípios Gerais

1.  **Server State > Client State**: Se o dado já existe no banco, não o duplique em `useState` ou Redux. Use cache (SWR/React Query).
2.  **Server Components First**: Em Next.js 15, prefira buscar dados iniciais no Servidor (RSC) e passá-los como props ou hydrations para o cliente.
3.  **Single Source of Truth**: Evite sincronizar estados manualmente (`useEffect` para copiar prop p/ state).

---

## 2. Estratégias de Data Fetching

### A. Client-Side Fetching (Padrão Atual)
Utilizamos **SWR** (`swr`) para buscar dados no lado do cliente.

**Quando usar:**
- Dados que mudam com frequência (polling).
- Dados dependentes da iteração do usuário (filtros, paginação na mesma tela).
- Dashboards e listas dinâmicas.

**Padrão de Hook Customizado:**
Encapsule a chave e o fetcher em um hook reutilizável.

```tsx
// hooks/useProdutos.ts
import useSWR from 'swr';
import { serviceUrl } from '@/lib/services';

const produtosFetcher = (url: string) => fetch(url).then(r => r.json());

export function useProdutos(page: number, filters: any) {
  // Key deve ser array para serialização automática de args
  const key = [serviceUrl('compras', '/produtos'), page, filters];
  
  const { data, error, isLoading, mutate } = useSWR(key, ([url]) => {
     // Construir querystring com page/filters
     return produtosFetcher(`${url}?page=${page}...`);
  });

  return {
    produtos: data?.items || [],
    total: data?.total || 0,
    isLoading,
    isError: error,
    mutate // Expor mutate para atualizar a lista após ações
  };
}
```

### B. Server-Side Fetching (Recomendado para Migração)
Para páginas públicas ou dados estáticos, use Server Components diretamente.

```tsx
// app/produtos/page.tsx (Server Component)
export default async function ProdutosPage() {
  const data = await fetch('http://api...').then(res => res.json());
  return <ProdutosList initialData={data} />;
}
```

---

## 3. Mutations (Atualizações de Dados)

### Client Mutations (Padrão Atual)
Para criar/editar/deletar, use `fetch` direto ou funções auxiliares, e então invalide o cache do SWR.

```tsx
const { mutate } = useProdutos();

const handleSave = async (novoProduto) => {
  setIsSaving(true);
  try {
     await fetch('/api/produtos', { method: 'POST', body: ... });
     // Revalida a lista para mostrar o novo item
     mutate(); 
     toast.success('Salvo!');
  } catch (err) {
     toast.error('Erro');
  } finally {
     setIsSaving(false);
  }
};
```

### Server Actions (Futuro)
O projeto está preparado para Next.js 15. Considere migrar mutations para **Server Actions** (`use server`) para reduzir javascript no cliente e simplificar formulários.

---

## 4. Estado Local vs Global

### ✅ Local State (`useState`, `useReducer`)
Use para:
- Controle de inputs de formulário (antes do submit).
- Estado de abertura de Modais/Menus/Dropdowns.
- Filtros ativos na tela (se não estiverem na URL).

### 🌍 Global State (`Context API`)
Use **com moderação** para:
- **AuthContext**: Usuário logado e permissões (já implementado via SWR + Context).
- **ThemeContext**: Dark/Light mode.
- **SidebarContext**: Estado de UI global.

❌ **Não use Context para**:
- Cache de dados do servidor (Use SWR).
- Estados complexos de formulário (Use bibliotecas ou composição).

---

## 5. Cache e Revalidação

O SWR gerencia o cache "Stale-While-Revalidate".
- **Focus Refetch**: Ativado (`revalidateOnFocus: true`) para manter dados frescos ao trocar de aba.
- **Deduplicação**: Requests iguais simultâneos são unidos em um só.

**Regra de Ouro**: Nunca atualize manualmente a lista de produtos no `useState` após um POST. Chame `mutate()` e deixe o SWR buscar a verdade atualizada do servidor.
