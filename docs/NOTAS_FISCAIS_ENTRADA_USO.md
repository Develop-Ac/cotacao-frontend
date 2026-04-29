# Guia de Utilizacao - Tela de Notas Fiscais de Entrada

## 1. Objetivo
Este documento descreve como utilizar a tela de Notas Fiscais de Entrada para:
- consultar notas recebidas;
- analisar impostos;
- validar cadastro de produtos;
- anexar, baixar e remover guia complementar quando aplicavel.

## 2. Rotas da funcionalidade
- Listagem: /compras/notaFiscal/notaFiscal
- Detalhe da nota: /compras/notaFiscal/notaFiscal/[chaveNfe]

## 3. Tela de listagem

### 3.1 O que voce encontra
- Lista de notas fiscais de entrada.
- Filtros por numero, emitente, imposto, estado e modelo.
- Status da analise de imposto/guia.
- Status da conferencia de produtos (OK, Com Erro, Sem Relacionamento, Pendente).

### 3.2 Acoes principais
- Abrir detalhes da NF.
- Atualizar dados da listagem.
- Filtrar para encontrar rapidamente uma nota especifica.

### 3.3 Observacoes
- O estado de filtros e paginacao e persistido durante a navegacao.
- Ao voltar do detalhe, a tela tenta manter o contexto anterior da consulta.

## 4. Tela de detalhe da NF

### 4.1 Informacoes exibidas
- Dados principais da NF (chave, numero, serie, emitente, data e valor).
- Produtos da nota com NCM, CFOP e tributos do XML.
- Status e dados da analise de imposto.
- Status da conferencia de produtos.
- Secao de Guia da NF (somente quando o status indicar "Tem Guia Complementar").
- Pre-visualizacao e download do DANFE.

### 4.2 Acoes disponiveis
- Calcular Imposto.
- Abrir Verificacao do Produto.
- Gerar Relatorio de Erros (PDF).
- Atualizar PDF da nota.
- Download do DANFE.

## 5. Fluxo de calculo de imposto
1. Abrir a nota no detalhe.
2. Clicar em Calcular Imposto.
3. Revisar a pre-avaliacao por item.
4. Confirmar a selecao.
5. Salvar o resultado da analise.

### Regras importantes
- Se ja existir guia anexada para a NF, o recalculo fica bloqueado.
- Se ja existir analise anterior, o sistema pede confirmacao para substituir.

## 6. Fluxo de verificacao do produto
1. Clicar em Verificacao do Produto.
2. Selecionar os itens a conferir.
3. Definir a destinacao por item:
   - COMERCIALIZACAO
   - USO_CONSUMO
4. Executar Verificar Cadastro.

### Resultado da conferencia
- Cada item mostra:
  - item e codigo do fornecedor;
  - imposto considerado;
  - codigo do produto (quando houver);
  - conferencia do produto com mensagens amigaveis.

### Padrao visual das mensagens
- Verde: validacao correta.
- Vermelho: ajuste necessario.

### Regras de validacao em destaque
- Situacao Tributaria para ICMS ST: esperado ST0-X.
- Situacao Tributaria para Tributado: esperado TR0-X.
- PIS e COFINS conforme regra da destinacao e natureza do item.
- Sem Relacionamento: indica falta de vinculo do produto do fornecedor com codigo interno.

## 7. Guia complementar da NF

### 7.1 Quando aparece
A secao Guia da NF e exibida somente quando o status da nota for "Tem Guia Complementar".

### 7.2 Acoes da guia
- Anexar guia em PDF.
- Download da guia anexada.
- Remover guia anexada (com confirmacao).

### 7.3 Validacoes
- Apenas PDF e aceito.
- O numero NFE/CTE extraido da guia deve corresponder a chave da nota.
- Em caso de divergencia, o upload e bloqueado com mensagem de aviso.

## 8. Relatorio de erros da conferencia
- Disponivel apos executar a verificacao do produto.
- Gera um PDF para impressao com os itens divergentes e seus ajustes.
- Itens sem divergencia nao entram no relatorio de erros.

## 9. Status de conferencia de produtos
- OK: itens conferidos sem divergencias.
- Com Erro: existe ao menos uma divergencia de cadastro/regra fiscal.
- Sem Relacionamento: produto do fornecedor sem vinculo interno.
- Pendente: conferencia ainda nao executada para a nota.

## 10. Boas praticas de uso
- Sempre executar verificacao de produto antes de concluir a analise fiscal.
- Revisar mensagens vermelhas e ajustar cadastro antes de salvar decisao final.
- Reexecutar a conferencia quando houver ajuste de cadastro para atualizar status.
- Anexar guia somente quando os dados da NF estiverem confirmados.

## 11. Solucao de problemas comuns
- Nao consigo recalcular imposto:
  - Verifique se existe guia anexada para a nota.
- Nao aparece secao de guia:
  - Confirme se o status da nota e "Tem Guia Complementar".
- Mensagem de divergencia NFE/CTE na guia:
  - Validar se a guia pertence a mesma nota (chave NFe).
- So aparece Sit. Tributaria quando esta OK:
  - Reexecute a verificacao para atualizar conformidades persistidas de PIS/COFINS no resultado atual.

## 12. Referencias tecnicas
- Tela de listagem: app/(private)/compras/notaFiscal/notaFiscal/page.tsx
- Tela de detalhe: app/(private)/compras/notaFiscal/notaFiscal/[chaveNfe]/page.tsx
- Servico de regras fiscais: calculadora-st-service/src/icms/icms.service.ts

---
Documento criado para uso operacional da equipe de Compras/Fiscal na rotina de Notas Fiscais de Entrada.
