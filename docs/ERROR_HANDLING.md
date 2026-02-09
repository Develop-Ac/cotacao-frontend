# Tratamento de Erros e Feedback (Error Handling)

Este documento padroniza a estratégia de captura, tratamento e feedback de erros no frontend.

## 1. Filosofia
O sistema deve **falhar graciosamente**. O usuário nunca deve ver uma tela branca ou um travamento silencioso. Sempre deve haver um feedback visual claro (Toasts, Mensagens Inline ou Modais) e, quando possível, uma ação de recuperação (botão "Tentar Novamente").

## 2. Categorias de Erro

### 2.1. Erros de API (Network/HTTP)
Ocorrem durante a comunicação com o backend (fetch/axios).
- **Tratamento**: Sempre usar blocos `try/catch` em funções assíncronas.
- **Feedback**:
  - **4xx (Client Error)**: Mostrar mensagem amigável explicativa (ex: "Produto não encontrado").
  - **5xx (Server Error)**: Mostrar mensagem genérica ("Erro no servidor, tente mais tarde") e logar o erro técnico no console.
  - **Sem Conexão**: Verificar `navigator.onLine` ou erros de `fetch` e avisar sobre a conexão.

### 2.2. Erros de Validação (Input)
Ocorrem antes do envio dos dados, quando o usuário insere informações inválidas.
- **Tratamento**: Validação local (zod/yup ou manual) antes do submit.
- **Feedback**: Mensagem de texto vermelha logo abaixo do campo inválido (`text-red-500 text-sm`).

### 2.3. Erros de UI (Renderização)
Ocorrem quando um componente falha ao renderizar (ex: acessar propriedade de `undefined`).
- **Tratamento**: Utilizar **Error Boundaries**.
- ****Padrão Futuro (Aprovado)****: Envolver partes críticas da aplicação (ou a aplicação inteira) em um componente `<ErrorBoundary>` que exibe uma UI de fallback em vez de quebrar a árvore de componentes inteira.

## 3. Padrões de Código

### Exemplo de Requisição (Fetch)

```tsx
import { useState } from 'react';
import { serviceUrl } from '@/lib/services';

export default function ExemploConexao() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState(null);

  const buscarDados = async () => {
    setCarregando(true);
    setErro(null); // Limpar erro anterior

    try {
      const resposta = await fetch(serviceUrl('produtos'));
      
      if (!resposta.ok) {
        // Tratamento específico de status
        if (resposta.status === 404) throw new Error('Dados não encontrados.');
        if (resposta.status === 403) throw new Error('Sem permissão de acesso.');
        throw new Error(`Erro na requisição: ${resposta.status}`);
      }

      const json = await resposta.json();
      setDados(json);

    } catch (err: any) {
      console.error("Erro detalhado:", err);
      // Feedback amigável para o usuário
      setErro(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div>
      {erro && <div className="p-4 bg-red-100 text-red-700 rounded">{erro}</div>}
      {carregando && <p>Carregando...</p>}
      {/* ... renderização ... */}
    </div>
  );
}
```

### Exemplo de Validação (Formulário)

```tsx
const handleSalvar = () => {
  if (!email.includes('@')) {
    setErroValidacao('E-mail inválido');
    return; // Interrompe o fluxo
  }
  // ... prosseguir com envio
};
```

## 4. Logging e Monitoramento

- **Desenvolvimento**: `console.error` é aceitável e encorajado para depuração.
- **Produção**: (Futuro) Integrar com ferramentas de monitoramento de erros (Sentry, Datadog) para capturar exceções não tratadas e falhas de API silenciosas.
