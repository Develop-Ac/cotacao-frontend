# Documentação de Testes - Intranet AC Acessórios

## 📋 Visão Geral

Este projeto possui uma suíte de testes abrangente implementada usando **Jest** e **React Testing Library** para garantir a qualidade e confiabilidade das telas da aplicação.

## 🛠️ Tecnologias Utilizadas

- **Jest**: Framework de testes JavaScript
- **React Testing Library**: Biblioteca para testes de componentes React
- **@testing-library/jest-dom**: Matchers customizados para DOM
- **@testing-library/user-event**: Simulação de eventos de usuário
- **TypeScript**: Tipagem estática para os testes

## 📦 Dependências Instaladas

```json
{
  "devDependencies": {
    "jest": "^29.x.x",
    "@testing-library/react": "^14.x.x",
    "@testing-library/jest-dom": "^6.x.x",
    "@testing-library/user-event": "^14.x.x",
    "jest-environment-jsdom": "^29.x.x",
    "@types/jest": "^29.x.x",
    "ts-jest": "^29.x.x"
  }
}
```

## 🏗️ Estrutura dos Testes

```
__tests__/
├── components/
│   └── PrivateRoute.test.tsx
├── login/
│   └── page.test.tsx
├── private/
│   └── page.test.tsx
├── compras/
│   └── cotacao/
│       ├── page.test.tsx
│       └── comparativo/
│           └── page.test.tsx
└── utils/
    ├── test-utils.tsx
    └── setup.d.ts
```

## ✅ Telas Testadas

### 1. **Tela de Login** (`app/login/page.tsx`)
**Arquivo de teste**: `__tests__/login/page.test.tsx`

**Funcionalidades testadas**:
- ✅ Renderização dos elementos da interface
- ✅ Interação com formulários (input de email e senha)
- ✅ Autenticação via API
- ✅ Redirecionamento após login bem-sucedido
- ✅ Tratamento de erros de login
- ✅ Funcionalidades auxiliares (lembrar senha, esqueceu senha)

**Total de testes**: 16

### 2. **Tela Dashboard/Home** (`app/(private)/page.tsx`)
**Arquivo de teste**: `__tests__/private/page.test.tsx`

**Funcionalidades testadas**:
- ✅ Renderização do título principal
- ✅ Aplicação correta de classes CSS
- ✅ Estrutura de layout responsivo
- ✅ Acessibilidade (heading elements)
- ✅ Hierarquia visual e design

**Total de testes**: 18

### 3. **Tela de Cotação** (`app/(private)/compras/cotacao/page.tsx`)
**Arquivo de teste**: `__tests__/compras/cotacao/page.test.tsx`

**Funcionalidades testadas**:
- ✅ Busca de itens de cotação
- ✅ Criação de novas cotações
- ✅ Exibição de lista de pedidos
- ✅ Modal de gerenciamento de fornecedores
- ✅ Controle de paginação
- ✅ Validação de formulários

**Total de testes**: ~25

### 4. **Tela Comparativo** (`app/(private)/compras/cotacao/comparativo/page.tsx`)
**Arquivo de teste**: `__tests__/compras/cotacao/comparativo/page.test.tsx`

**Funcionalidades testadas**:
- ✅ Busca de dados de comparativo
- ✅ Exibição de tabela comparativa
- ✅ Edição de preços via modal
- ✅ Gerenciamento de quantidades
- ✅ Modal de observações de fornecedores
- ✅ Formatação de valores em BRL

**Total de testes**: ~20

### 5. **Componente PrivateRoute** (`components/PrivateRoute.tsx`)
**Arquivo de teste**: `__tests__/components/PrivateRoute.test.tsx`

**Funcionalidades testadas**:
- ✅ Verificação de autenticação
- ✅ Redirecionamento para login quando não autenticado
- ✅ Renderização de children quando autenticado
- ✅ Tratamento de casos extremos (localStorage errors)
- ✅ Diferentes tipos de children (JSX, string, number)

**Total de testes**: 14

## 🚀 Como Executar os Testes

### Executar todos os testes
```bash
npm test
```

### Executar testes específicos
```bash
# Teste de uma tela específica
npm test -- __tests__/login/page.test.tsx

# Teste de um conjunto específico
npm test -- __tests__/login/ __tests__/private/

# Executar com coverage
npm run test:coverage
```

### Executar testes em modo watch
```bash
npm run test:watch
```

## 📊 Scripts Disponíveis

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## 🔧 Configuração

### Jest Configuration (`jest.config.js`)
- Configurado para trabalhar com Next.js
- Suporte completo para TypeScript
- Mapeamento de módulos com alias `@/`
- Ambiente de teste jsdom para simulação de DOM
- Configuração de coverage

### Setup de Testes (`jest.setup.js`)
- Mocks para Next.js (Image, Navigation)
- Mocks para React Icons
- Mock do localStorage
- Mock do fetch global
- Configuração de usuário padrão para testes

## 🧰 Utilitários de Teste

### `test-utils.tsx`
Contém funções auxiliares para testes:

- `renderWithProviders()`: Renderização com provedores customizados
- `mockFetchResponse()`: Mock para respostas de API
- `mockFetchError()`: Mock para erros de API
- `setupAuthenticatedUser()`: Configuração de usuário autenticado
- `setupUnauthenticatedUser()`: Configuração de usuário não autenticado
- `cleanupMocks()`: Limpeza de mocks entre testes

## 📈 Cobertura de Testes

Os testes cobrem:

- **Renderização de componentes**
- **Interações do usuário** (clicks, typing, formulários)
- **Chamadas de API** (fetch, tratamento de erros)
- **Navegação e roteamento**
- **Estados de loading e erro**
- **Validação de formulários**
- **Autenticação e autorização**
- **Responsive design e acessibilidade**

## 🐛 Debugging

Para debugar testes:

```bash
# Executar com logs detalhados
npm test -- --verbose

# Executar teste específico com watch
npm test -- --watch __tests__/login/page.test.tsx

# Ver output HTML do teste
screen.debug() // Adicionar no teste
```

## 📝 Boas Práticas Implementadas

1. **Testes isolados**: Cada teste é independente
2. **Mocks apropriados**: APIs e dependências externas são mockadas
3. **User-centric testing**: Testes focam na experiência do usuário
4. **Casos extremos**: Tratamento de erros e edge cases
5. **Acessibilidade**: Verificação de elementos semânticos
6. **Performance**: Testes otimizados para execução rápida

## 🔮 Próximos Passos

Para expandir a cobertura de testes, considera-se:

- Testes de integração end-to-end
- Testes de performance
- Testes de acessibilidade automatizados
- Snapshot testing para componentes estáveis
- Testes de regressão visual

## 📞 Suporte

Para dúvidas sobre os testes ou para reportar problemas:
1. Verificar a documentação dos testes existentes
2. Consultar a documentação do Jest e React Testing Library
3. Verificar os mocks e utilitários disponíveis

---

**Última atualização**: Novembro 2024  
**Responsável**: Equipe de Desenvolvimento AC Acessórios