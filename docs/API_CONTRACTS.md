# Contratos de API (Backend/Frontend)

Este documento define os contratos de interface entre o Frontend (Next.js) e os Microserviços (Backend), visando padronização e previsibilidade.

## 1. Configuração Geral

### Base URLs
As URLs base são gerenciadas em `lib/services.ts` e variáveis de ambiente.

| Serviço | Variável de Ambiente | URL Padrão (Dev) |
|---|---|---|
| **Sistema** | `NEXT_PUBLIC_SISTEMA_SERVICE_BASE` | `http://sistema-service.acacessorios.local` |
| **Compras** | `NEXT_PUBLIC_COMPRAS_SERVICE_BASE` | `http://compras-service.acacessorios.local` |
| **Estoque** | `NEXT_PUBLIC_ESTOQUE_SERVICE_BASE` | `http://estoque-service.acacessorios.local/` |
| **Feed** | `NEXT_PUBLIC_FEED_SERVICE_BASE` | `http://feed-service.acacessorios.local` |
| **Análise Estoque** | `NEXT_PUBLIC_ANALISE_ESTOQUE_BASE` | `http://analise-estoque-service.acacessorios.local` |

### Autenticação
- **Padrão Atual**: Bearer Token (JWT) enviado no Header `Authorization`.
- **Interceptors**: Atualmente as chamadas são feitas via `fetch` nativo ou `axios` (onde configurado).
- **Recomendação**: Centralizar chamadas http em um cliente (ex: `lib/api-client.ts`) para injetar o token automaticamente e tratar erros 401.

### Padronização de Erros
O backend deve retornar erros no seguinte formato JSON (RFC 7807 recomendado ou simples):

```json
{
  "success": false,
  "message": "Descrição amigável do erro",
  "error_code": "CODE_123", // Opcional
  "errors": { // Opcional, para validação de campos
    "campo_x": ["Erro 1", "Erro 2"]
  }
}
```

---

## 2. Módulo: Compras

### 2.1 Cotação (`compras-service`)

#### Consultar Pedido (OpenQuery)
- **GET** `/compras/openquery/pedido/{id}?empresa=3`
- **Response**:
    ```json
    {
      "itens": [
        {
          "PEDIDO_COTACAO": 123,
          "PRO_CODIGO": 456,
          "PRO_DESCRICAO": "Produto Exemplo",
          "QUANTIDADE": 10
        }
      ]
    }
    ```

#### Criar Cotação
- **POST** `/compras/pedidos-cotacao`
- **Payload**:
    ```json
    {
      "empresa": 3,
      "pedido_cotacao": 12345,
      "itens": [
        {
          "PEDIDO_COTACAO": 12345,
          "PRO_CODIGO": 1001,
          "QUANTIDADE": 50,
          "QTD_SUGERIDA": 10 // Opcional
        }
      ]
    }
    ```

#### Listar Cotações
- **GET** `/compras/pedidos-cotacao?page=1&pageSize=20`

### 2.2 Análise de Estoque (`analise-estoque-service`)

#### Listar Análise (Grid Principal)
- **GET** `/analise`
- **Query Params**: `page`, `limit`, `only_changes`, `critical`, `search`, `group_id`, `subgrupo`, `curve`, `coverage_days`, `grouped_view`.
- **Response**:
    ```json
    {
      "data": [
        {
          "id": 1,
          "pro_codigo": "123",
          "pro_descricao": "Produto X",
          "estoque_disponivel": 100,
          "curva_abc": "A",
          "group_id": "GRP_123", // Se agrupado
          "children": [] // Se agrupamento visual
        }
      ],
      "total": 100,
      "page": 1,
      "total_pages": 10
    }
    ```

#### Agrupar Produtos (Similares)
- **POST** `/similar/group`
- **Payload**: `{ "pro_codigos": ["1001", "1002"] }`

---

## 3. Módulo: Estoque (`estoque-service`)

### Contagem de Estoque

#### Listar Contagens (Histórico)
- **GET** `/estoque/contagem/lista`
- **Query Params**: `page`, `pageSize`, `empresa`, `data`, `piso`.

#### Salvar Contagem
- **POST** `/estoque/contagem`
- **Payload**:
    ```json
    {
      "contagem": 1, // 1, 2 ou 3
      "colaborador": "Nome Usuário",
      "contagem_cuid": "uuid-v4",
      "piso": "PISO_A",
      "tipo": 1,
      "produtos": [
        {
          "COD_PRODUTO": 123,
          "QTDE_SAIDA": 10, // Quantidade contada? (Nome do campo no payload atual é meio confuso, validar com backend se é QTDE_SAIDA ou QTDE_CONTADA) -> Código usa o objeto `produtosSelecionados` que vem de `itensFiltrados`.
          "LOCALIZACAO": "A01..."
        }
      ]
    }
    ```

#### Logs Agregados
- **GET** `/estoque/contagem/logs-agregados/{id}`
- **Response**: Retorna lista plana de logs de todas as contagens vinculadas àquele ID mestre.

---

## 4. Módulo: Feed (`feed-service`)

### Posts
- **GET** `/feed/posts`
- **Response**: Lista de posts com usuario, conteudo, likes e anexos.

- **POST** `/feed/posts`
- **Content-Type**: `multipart/form-data`
- **Payload**:
    - `conteudo`: string
    - `files`: File[] (Binário)

---

## 5. Módulo: RabbitMQ (Proxy)

O frontend utiliza rotas de proxy para comunicação assíncrona com filas.

- **DELETE** `/api/proxy/rabbitmq/{id}`
- **Uso**: Solicitar exclusão de cotação de forma assíncrona.
