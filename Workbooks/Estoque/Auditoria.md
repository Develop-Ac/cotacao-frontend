# Manual de Uso: Auditoria de Estoque

Este documento serve como guia para a utilização da tela de **Auditoria de Estoque**, onde são finalizadas as contagens e realizados os ajustes de inventário.

## 1. Visão Geral
A tela de Auditoria é a **etapa final** do processo de inventário. Após as contagens (1ª, 2ª e, se necessário, 3ª rodada), os itens com divergência aparecem nesta tela para que o auditor tome a decisão final: **Baixar** (perda), **Incluir** (sobra) ou considerar **Correto**.

## 2. Entendendo a Tela

### Filtros
No topo da tela, você encontra os filtros para localizar os itens a serem auditados:
- **Data da Contagem**: Selecione a data em que o inventário foi aberto. O sistema buscará todas as pendências iniciadas nesta data.
- **Piso (Autofiltro)**: Permite filtrar os itens por andar ou setor (ex: "Piso A", "Box").
- **Botão Buscar**: Carrega os itens com divergência pendentes de auditoria.
- **Ocultar Auditados/Corretos**: Checkbox para limpar a tela, exibindo apenas o que ainda requer atenção.

### Exportação
- **Excel / PDF**: Botões para gerar relatórios detalhados contendo o comparativo entre as 3 contagens, saldo do sistema e resultado da auditoria.

### Lista de Itens (Cards)
Cada item com divergência é apresentado em um "Card" individual contendo:
- **Identificação**: Código, Descrição e Locais onde o item foi contado.
- **Comparativo de Contagens**:
    - *Estoque (Contagem)*: Saldo que o sistema tinha no momento que o inventário abriu (Snapshot).
    - *1ª / 2ª / 3ª Cont.*: Diferenças encontradas em cada rodada.
        - **Verde**: Contagem bateu com o sistema.
        - **Vermelho**: Houve diferença (+ sobra, - falta).
- **Estoque (Atual)**: Saldo em tempo real no sistema (pode ter mudado desde a contagem se houve vendas/entradas).

### Destaques Visuais
- **Borda Vermelha**: Indica item pendente de auditoria com diferença.
- **Badge "Recorrência de Erro"**: Se um item teve ajustes de estoque (baixa ou inclusão) nas últimas 3 auditorias, ele aparecerá com um destaque vermelho pulsante e um alerta de recorrência. Isso sinaliza um produto problemático que exige investigação mais profunda.

## 3. Realizando a Auditoria
Para cada item, o auditor deve decidir a ação corretiva a ser tomada no sistema.

### Opções de Ação
1. **Baixa (Ajuste Negativo)**:
   - Use quando a contagem física é **menor** que o sistema.
   - O estoque será reduzido.
   - *Obrigatório informar Quantidade e Observação.*

2. **Inclusão (Ajuste Positivo)**:
   - Use quando a contagem física é **maior** que o sistema.
   - O estoque será aumentado.
   - *Obrigatório informar Quantidade e Observação.*

3. **Correto (Sem Ajuste)**:
   - Use quando, após verificação, conclui-se que o sistema estava certo ou que a diferença é desprezível/justificada sem necessidade de movimento.
   - Não gera movimentação de estoque.

### Histórico e Detalhes
- **Ver Detalhes das Contagens**: Expande o card para mostrar quem contou, quanto contou e onde contou em cada uma das rodadas.
- **Ver Histórico de Auditorias**: Abre uma janela mostrando todas as auditorias passadas desse produto, permitindo ver se (e porquê) ele foi ajustado anteriormente.

### Confirmando a Auditoria
Ao clicar em **Confirmar**:
1. O sistema registra a decisão.
2. Se for Baixa ou Inclusão, o movimento de estoque é gerado imediatamente.
3. O card muda de cor (para **Verde**) e exibe os dados salvos (Tipo, Quantidade e Observação).

---

## 4. Dicas de Uso
1. **Investigue a Recorrência**: Se o alerta de "Recorrência de Erro" aparecer, não apenas ajuste o estoque. Verifique processos de entrada, venda ou furto, pois o erro está sistemático.
2. **Consulte o Histórico**: Antes de decidir, veja as contagens detalhadas para entender se foi erro de contagem humana (ex: alguém contou errado na 1ª mas acertou na 2ª) ou se o item realmente não está lá.
3. **Observações Ricas**: Ao fazer ajustes, detalhe o motivo (ex: "Avaria encontrada", "Item em local incorreto", "Pacote com 10 contado como 1"). Isso alimenta o histórico futuro.
