# CHECKLIST OBJETIVO DE IMPLANTACAO POR PR

## Escopo

Este checklist organiza a migracao do frontend para o novo email-service em 5 PRs, com risco controlado e rollback por etapa.

## Ordem obrigatoria de execucao

1. PR1 - Navegacao e coexistencia de rota
2. PR2 - Sistema > E-mail (administracao da conta)
3. PR3 - Camada HTTP desacoplada
4. PR4 - Qualidade > Caixa (operacao da inbox)
5. PR5 - Hardening e retirada gradual do legado

## PR1 - Navegacao e coexistencia de rota (/usuario + /sistema)

### Objetivo

Introduzir /sistema como rota oficial nova, mantendo /usuario temporariamente para evitar regressao.

### Implementar

- Criar /sistema.
- Manter /usuario convivendo temporariamente.
- Atualizar menu/submenu com Sistema.
- Definir explicitamente no frontend:
  - rota oficial nova;
  - quando usar redirect;
  - quando manter os dois caminhos.

### Criterios de aceite

- Quem tinha acesso a /usuario acessa /sistema.
- /usuario segue funcional nesta fase.
- Sem quebra de breadcrumbs e links internos.

### Rollback

- Ocultar /sistema por flag e manter apenas fluxo legado.

## PR2 - Sistema > E-mail (cadastro/administracao)

### Objetivo

Separar administracao de conta de e-mail da operacao da inbox.

### Implementar

- Criar tela Sistema > E-mail.
- Incluir cadastro/listagem de conta vinculada a caixa (fase inicial: QUALIDADE).
- Exibir na listagem:
  - status (Ativo/Inativo);
  - caixa (QUALIDADE);
  - indicador de ja recebeu mensagem;
  - acoes disponiveis (Editar/Inativar).

### Regras obrigatorias

- Apenas 1 e-mail ativo por caixa.
- Apos primeiro e-mail recebido, nao pode excluir; apenas inativar.
- Inativar libera novo cadastro para a mesma caixa.

### Criterios de aceite

- Nao permite segundo ativo na mesma caixa.
- Estado visual deixa claro por que exclusao nao esta disponivel.
- Tela nao vira inbox: apenas administracao.

### Rollback

- Bloquear criacao/edicao e manter consulta ate ajuste.

## PR3 - Camada HTTP desacoplada de Qualidade

### Objetivo

Evitar acoplamento da integracao com email-service ao modulo Qualidade.

### Implementar

Criar clients dedicados:

- mailAccountsClient
- mailThreadsClient
- mailMessagesClient
- mailOutboundClient

Migrar consumo da UI para esses clients.

### Criterios de aceite

- Sem dependencia conceitual de Qualidade na camada API.
- Endpoints de email-service centralizados e reutilizaveis.

### Rollback

- Manter adapter de compatibilidade temporario apontando para clients novos.

## PR4 - Qualidade > Caixa (operacao da inbox no backend novo)

### Objetivo

Migrar operacao da caixa para o email-service com contrato visual Gmail-like fechado.

### Contrato visual obrigatorio

- Coluna 1: lista de threads/mensagens.
- Coluna 2: leitura da thread.
- Coluna 3 ou drawer/modal: composer.
- Acoes fixas:
  - novo e-mail;
  - responder;
  - responder a todos;
  - reencaminhar.

### Implementar

- Migrar listagem, leitura e composicao para consumo do backend novo.
- Garantir que Qualidade > Caixa seja somente operacao (sem administracao de conta).

### Criterios de aceite

- Fluxo completo de leitura + envio + reencaminhamento funcional.
- Layout aderente ao contrato visual.

### Rollback

- Feature flag para retornar temporariamente ao fluxo anterior.

## PR5 - Hardening e retirada gradual do legado

### Objetivo

Estabilizar, monitorar e remover legado com seguranca.

### Implementar

- Ajustar tratamento de erro/loading/retry.
- Monitorar uso de /usuario.
- Aplicar redirect progressivo /usuario -> /sistema.
- Remover legado somente apos janela de estabilidade.

### Criterios de aceite

- Sem regressao critica na janela acordada.
- Uso residual de /usuario controlado antes da remocao.

### Rollback

- Desativar redirect e reabrir convivencia temporaria.

## Gates obrigatorios entre PRs

- Aprovacao funcional no fim de cada PR.
- Validacao de permissao por perfil.
- Plano de rollback preenchido no PR.
- Evidencia de testes anexada.
- Documentacao atualizada quando houver mudanca de regra.
