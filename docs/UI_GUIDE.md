# Guia de Interface (UI Guide)

Este guia estabelece os padrões visuais e comportamentais para a aplicação, garantindo consistência e acessibilidade.

## 1. Componentes Base e Quando Usar

A aplicação utiliza uma abordagem baseada em composição com Tailwind CSS. Evite criar estilos ad-hoc; use os componentes base sempre que possível.

### ✅ Componentes Globais (`src/components` ou `app/components`)
- **`Toast`**: Para notificações temporárias (sucesso, erro, info).
    - *Uso*: `const { success, error } = useToast(); success("Salvo!");`
- **`Alert`**: Para mensagens persistentes ou de destaque na página.
    - *Uso*: `<Alert type="warning" title="Atenção">Conteúdo</Alert>`
- **`Loading`**: Spinner padrão para estados de carregamento local.
- **`TableSkeleton`**: Placeholder animado para carregamento de tabelas.
- **`MultiSelect` / `Select`**: Para seleções complexas. Use-os em vez do `<select>` nativo para melhor UX.
- **`DatePicker`**: Para seleção de datas. Padronizado com `react-datepicker`.

---

## 2. Formulários

### Padrões Visuais
- **Labels**: Sempre acima do input, fonte `text-sm font-medium text-black dark:text-white`.
- **Inputs**:
    - Bordas: `border-stroke dark:border-strokedark`.
    - Focus: `focus:border-primary focus:ring-1 focus:ring-primary`.
    - Background: `bg-transparent` ou `bg-white dark:bg-form-input`.

### Validação e Feedback
1.  **Campos Obrigatórios**: Devem ter um indicador visual (ex: `*` vermelho ou texto "Obrigatório").
2.  **Mensagens de Erro**: Texto vermelho (`text-red-500 text-xs mt-1`) logo abaixo do campo afetado.
3.  **Botões**:
    - Desabilitar (`disabled opacity-50`) enquanto submete.
    - Mostrar spinner ou texto "Salvando..." durante a ação.

---

## 3. Tabelas

As tabelas são o coração dos sistemas administrativos. Siga este padrão:

### Estrutura
- **Container**: `rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark`.
- **Header**: `bg-gray-2 dark:bg-meta-4`. Texto `font-medium uppercase x-sm`.
- **Linhas**: Hover effect `hover:bg-gray-50 dark:hover:bg-meta-4`.
- **Células**: Padding confortável (`p-2.5` a `p-5`).

### Funcionalidades Padrão
1.  **Pagination**: Sempre que houver > 20 itens.
2.  **Empty State**: Exibir mensagem amigável ("Nenhum registro encontrado") quando a lista estiver vazia.
3.  **Loading**: Usar **Skeleton** (`<TableSkeleton />`) em vez de girar um spinner global. Isso mantém o layout estável.

---

## 4. Acessibilidade (a11y)

Não ignorar usuários que navegam por teclado ou leitor de tela.

### Requisitos Mínimos
- **Foco Visível**: Nunca remova o `outline` padrão sem fornecer um substituto visual (`ring`).
- **Navegação via Teclado**: Certifique-se de que todos os modais podem ser fechados com `ESC`.
- **Labels**: Todo input DEVE ter um `<label htmlFor="...">` ou `aria-label`.
- **Contraste**: Use as cores do tema (Tailwind), que já são otimizadas. Evite cinza claro em fundo branco.

---

## 5. Ícones e Animações

### Ícones (`react-icons`)
- Use **Fa** (FontAwesome 5) para consistência (`react-icons/fa`).
- Tamanho padrão: `size={18}` ou `size={20}` para ações; `size={14}` para metadados.
- Cores: Herdar do texto pai (`currentColor`) ou usar classes utilitárias (`text-primary`, `text-meta-3`).

### Animações (`framer-motion`)
Use animações para dar feedback e suavidade, mas sem exageros.

1.  **Entrada de Página**:
    ```tsx
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
    ```
2.  **Listas**: Use `AnimatePresence` para itens sendo removidos/adicionados.
3.  **Modais**: Fade-in + Scale-up.

---

## 6. Exemplo de Página Padrão

```tsx
export default function Page() {
  const { data, isLoading } = useSWR('/api/...');

  if (isLoading) return <TableSkeleton />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Breadcrumb pageName="Minha Página" />

      <div className="rounded-sm border ...">
        {/* Filtros */}
        <div className="p-4">
          <input type="text" placeholder="Buscar..." className="input-class" />
        </div>

        {/* Tabela */}
        <div className="max-w-full overflow-x-auto">
          <table className="w-full table-auto">
             {/* ... */}
          </table>
        </div>

        {/* Paginação */}
        <Pagination total={data.total} />
      </div>
    </motion.div>
  );
}
```
