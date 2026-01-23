# Manual de Uso: Análise de Produtos

Este documento serve como guia para a utilização da tela de **Análise de Produtos** no módulo de Compras.

## 1. Visão Geral
A tela tem como objetivo auxiliar o comprador na tomada de decisão de reposição de estoque, analisando o comportamento de vendas (Curva ABC e Tendência) e sugerindo quantidades de compra baseadas em parâmetros estatísticos ou simulações de cobertura.

## 2. Entendendo a Tabela Principal

A tabela exibe os produtos e seus indicadores principais. Abaixo, o significado de cada coluna:

### Produto
Exibe Código, Descrição e Marca. 
- **Tag "Unificado"**: Indica que este produto pertence a um **Grupo de Similares**. A análise deste item considera o estoque e a venda somada de todos os itens do grupo.

### Curva ABC
Classificação do produto baseada na importância de venda/lucratividade.
- **A**: Itens de altíssima importância.
- **B**: Itens importantes.
- **C/D/E**: Itens de menor giro ou importância.

### Estoque
Mostra o saldo atual disponível.
- **Ícone de Grupo**: Se o produto for parte de um grupo, aparecerá o estoque total somado do grupo logo abaixo.
- **Ruptura**: Indica há quantos dias o produto está zerado, prejudicando a venda.

### Média/Dia
Demanda média diária calculada (ajustada para desconsiderar dias sem estoque).
- **Valor do Grupo**: Para itens agrupados, exibe a venda média diária somada de todos os similares.

### Tendência
Indica se a venda do produto está em ascensão, queda ou estável nos últimos períodos, influenciando a sugestão de compra (Fator Tendência).

### Sugestão (Min | Max)
Valores cadastrados ou calculados pelo sistema para controle de estoque:
- **Min (Ponto de Pedido)**: Quando o estoque ficar abaixo deste valor, é hora de comprar.
- **Max (Estoque Alvo)**: Quantidade ideal para se ter em estoque após a reposição.

### Sugestão Simulada (Coluna Azul)
Aparece apenas quando você preenche o campo **"Cob. (Dias)"** no topo da tela.
- Define quanto comprar para garantir o estoque pelo número de dias informado.
- *Exemplo*: Se você informar "30 dias", o sistema calcula quanto é necessário para cobrir 30 dias de vendas (considerando a média diária e tendência).

### Status
Indicador visual rápido da situação do item:
- **🔴 Crítico**: Estoque atual está abaixo do Mínimo. Precisa de compra urgente.
- **🟠 Excesso**: Estoque atual está acima do Máximo. Evitar compra.
- **🟢 Normal**: Estoque saudável.
- **Grp Crítico/Normal/Excesso**: Status considerando a soma do grupo (para itens unificados).

---

## 3. Funcionalidades e Ações

### Simulador de Cobertura
No topo da tela, o campo **"Cob. (Dias)"** permite simular cenários.
- Ao digitar um valor (ex: 45), toda a coluna de "Sugestão" e "Status" é recalculada dinamicamente para este cenário.
- Isso permite planejar compras para períodos específicos (ex: comprar para o Natal, comprar para 15 dias).

### Filtros
Utilize os filtros para focar sua análise:
- **Busca**: Código ou descrição do produto.
- **Curva**: Ex: Ver apenas produtos "A".
- **Status**: Ex: Ver apenas produtos "Críticos" (falta).
- **Marca**: Filtrar fornecedor/marca específica.

### Grupos de Similares
Produtos intercambiáveis (mesma função, marcas diferentes) podem ser agrupados para evitar compras desnecessárias se um similar tiver muito estoque.
- **Ação de Vincular**: Selecione 2 ou mais produtos usando a caixa de seleção na primeira coluna e clique em "Vincular".
- **Recalcular**: Após vincular, use o botão "Recalcular Valores" para atualizar as estatísticas do grupo no banco de dados.

### Memória de Cálculo (Detalhes)
Ao clicar no ícone **(i)** na coluna de sugestão (quando em modo simulação), abre-se uma janela detalhando a matemática:
- **Ajuste de Cobertura**: Como os dias informados afetaram o cálculo.
- **Sug. Original vs Cobertura**:
  - *Sug. Original*: Baseada no cadastro fixo do sistema.
  - *Cobertura*: Baseada na simulação atual.

### Histórico de Alterações
Se aparecer a tag "MUDOU" na coluna de Status, significa que houve mudança recente de classificação (ex: era Normal e virou Crítico). Clique na tag para ver o que mudou (ex: Média de venda aumentou, Estoque caiu).

---

## 4. Dicas de Uso
1. **Comece pelos Críticos da Curva A**: São os itens mais importantes faltando na prateleira.
2. **Use a Simulação**: Raramente o cadastro fixo atende a sazonalidade. Simule 30 ou 45 dias para ter sugestões mais reais.
3. **Analise o Grupo**: Antes de comprar um item em falta, verifique se o **Status do Grupo** não é "Excesso". Talvez você tenha muito estoque de um similar que possa suprir a demanda.
