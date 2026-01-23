# Manual de Uso: Contagem de Estoque

Este documento serve como guia para a utilização da tela de **Contagem de Estoque**, onde são abertos os inventários e gerenciadas as contagens dos colaboradores.

## 1. Visão Geral
A tela de Contagem permite iniciar processos de inventário (gerar listas de contagem) e monitorar o progresso das contagens realizadas via aplicativo ou coletor.

## 2. Nova Contagem (Abertura de Inventário)

Para iniciar um novo processo, clique no botão **"Nova Contagem"**. Um formulário se abrirá:

### Parâmetros de Filtro
Defina quais produtos entrarão nesta contagem:
- **Datas (Início/Fim)**: Período de referência para buscar itens movimentados ou criados.
- **Filtro de Localização**: Permite segmentar por áreas macro (ex: "Piso A", "Box", "Vitrine").
- **Prateleira**: Digite o número da prateleira para ser específico (ex: "13" para itens da estante 13).

*Dica: Clique em "Buscar Produtos" após definir os filtros para ver a lista preliminar.*

### Seleção de Produtos
Na tabela de resultados, você pode:
- Selecionar itens individualmente.
- Usar a opção para marcar/desmarcar todos.
- Verificar o estoque atual e a localização de cada item antes de gerar a lista.

### Atribuição de Colaboradores
Defina quem será responsável por contar esses itens. O sistema permite configurar até 3 rodadas (conferências) simultâneas ou sequenciais:
- **Contagem 1**: Obrigatória. Selecione o colaborador responsável.
- **Contagem 2 e 3**: Opcionais. Defina se houver necessidade de recontagem cruzada.
- **Tipo de Contagem**: 
  - *Diária*: Contagem rotineira.
  - *Avulsa*: Contagem específica não-programada.

Ao clicar em **"Salvar Contagens"**, o sistema gera as listas e elas ficam disponíveis para os colaboradores preencherem (via App ou Coletor).

## 3. Gerenciamento de Contagens (Lista)

A parte inferior da tela exibe todos os inventários abertos ou recentes.

### Informações do Card
Cada bloco representa uma lista de contagem gerada:
- **ID da Contagem**: Número identificador único.
- **Responsável**: Nome do colaborador atribuído.
- **Data e Piso**: Referências de quando e onde.
- **Status**:
  - *Em Andamento*: Lista gerada, contagem ainda não finalizada.
  - *Concluído*: Todos os itens da lista foram contados.
  - *Não Iniciado*: Nenhum item contado ainda.

### Ações Disponíveis
- **Listar Produtos**: Abre uma janela detalhando o progresso item a item.
  - Veja o que já foi contado e o que falta.
  - Visualize os valores contados (cegos ou abertos, dependendo da configuração).
  - Exporte os logs dessa contagem para Excel.
- **Excluir**: Permite remover uma contagem (apenas se for a 1ª rodada e ainda não tiver sido iniciada ou consolidada em grupo), caso tenha sido gerada por engano.

## 4. Dicas de Uso
1. **Segmentação**: Evite gerar contagens monstruosas com milhares de itens. Segmente por Prateleira ou Piso para facilitar o trabalho do conferente.
2. **Monitoramento**: Use o botão "Atualizar" para acompanhar em tempo real o progresso dos colaboradores durante o inventário.
3. **Conferência**: Ao abrir "Listar Produtos", você pode ver as divergências parciais antes mesmo da auditoria final, identificando erros grossos de contagem rapidamente.
