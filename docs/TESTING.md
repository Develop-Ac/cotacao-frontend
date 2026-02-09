# Guia de Testes (Testing Standards)

Este documento define **COMO** escrevemos testes neste projeto, complementando o arquivo `TESTS.md` que descreve **O QUE** já está testado.

## 1. O Que Testar (Escopo)

Focamos em **testes de integração** e **unitários** que garantam a confiança no uso da aplicação.

### ✅ O Que Deve Ser Testado
1.  **UI Crítica**:
    - Fluxos principais (Login, Criar Cotação, Finalizar Pedido).
    - Mensagens de erro e sucesso (Feedback ao usuário).
    - Renderização condicional baseada em permissões ou estado.
2.  **Utils e Helpers**:
    - Funções de formatação (moeda, data).
    - Lógica de negócios isolada (cálculos de impostos, totais).
3.  **Hooks Customizados**:
    - Lógica de estado complexa extraída em hooks (`useAuth`, `useCarrinho`).

### ❌ O Que NÃO Testar
1.  **Detalhes de Estilização**:
    - Não testar se o botão é "bg-blue-500" ou tem margem X. Teste se ele é *visível* e *clicável*.
    - Evite `toHaveStyle` para classes do Tailwind.
2.  **Bibliotecas de Terceiros**:
    - Não testar se o `axios` funciona ou se o `react-hook-form` valida. Teste se o **seu** formulário exibe o erro configurado.
3.  **Tipagem Estática**:
    - O TypeScript já garante tipos. Não escreva testes para validar se uma função aceita string.

---

## 2. Padrão de Estrutura (AAA)

Todos os testes devem seguir o padrão **Arrange, Act, Assert**.

```tsx
test('deve exibir erro ao tentar login com senha vazia', async () => {
  // ARRANGE (Preparação)
  render(<LoginPage />);
  const botaoEntrar = screen.getByRole('button', { name: /entrar/i });

  // ACT (Ação)
  await userEvent.click(botaoEntrar);

  // ASSERT (Verificação)
  expect(await screen.findByText(/informe a senha/i)).toBeInTheDocument();
});
```

---

## 3. Mocks Padrão

Evite fazer chamadas de rede reais nos testes. Use mocks.

### Axios / Fetch
Utilize o `jest.spyOn(global, 'fetch')` ou mocks manuais do Axios se estiver usando.

```tsx
// Mock de sucesso
(global.fetch as jest.Mock).mockResolvedValueOnce({
  ok: true,
  json: async () => ({ success: true, token: '123' }),
});

// Mock de erro
(global.fetch as jest.Mock).mockResolvedValueOnce({
  ok: false,
  status: 401,
  json: async () => ({ message: 'Credenciais inválidas' }),
});
```

### Date-fns / Datas
Para testes que dependem de data/hora atual, congele o tempo.

```tsx
beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-01T12:00:00'));
});

afterAll(() => {
  jest.useRealTimers();
});
```

### Next.js (useRouter, usePathname)
Use o mock configurado em `jest.setup.js` ou sobrescreva no teste:

```tsx
const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));
```

---

## 4. Comandos e Metas

### Scripts
- `npm test`: Roda todos os testes.
- `npm run test:watch`: Roda em modo interativo (bom para desenvolvimento).
- `npm run test:coverage`: Gera relatório de cobertura.

### Cobertura Mínima Esperada
Não buscamos 100% de cobertura cegamente. Buscamos cobrir **fluxos críticos**.

| Métrica | Meta Atual | Meta Ideal |
|---|---|---|
| **Statements** | 60% | 80% |
| **Branches** | 50% | 75% |
| **Functions** | 60% | 80% |
| **Lines** | 60% | 80% |

> Se um componente é puramente visual (sem lógica), a cobertura pode ser menor. Se é uma função de cálculo financeiro, a cobertura deve ser **100%**.
