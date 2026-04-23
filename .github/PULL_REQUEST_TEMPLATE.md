## Resumo da mudanca

- 

## Contexto

- Issue/Tarefa:
- Modulo afetado:
- Ambiente alvo:

## Tipo de PR

- [ ] PR1 - Navegacao e coexistencia de rota (/usuario + /sistema)
- [ ] PR2 - Sistema > E-mail (cadastro/administracao)
- [ ] PR3 - Camada HTTP desacoplada para email-service
- [ ] PR4 - Qualidade > Caixa (migracao operacional)
- [ ] PR5 - Hardening e retirada gradual do legado
- [ ] Outro

## Escopo implementado

- [ ] Frontend
- [ ] Integracao API
- [ ] Permissoes
- [ ] Feature flags
- [ ] Observabilidade
- [ ] Documentacao

## Regras de negocio validadas

- [ ] 1 e-mail ativo por caixa
- [ ] Apos primeiro e-mail recebido: nao permite excluir, apenas inativar
- [ ] Inativacao libera novo cadastro para a mesma caixa
- [ ] Sistema > E-mail apenas para administracao
- [ ] Qualidade > Caixa apenas para operacao de inbox/thread/composer

## Contrato visual (obrigatorio para caixa)

- [ ] Coluna 1: lista de threads/mensagens
- [ ] Coluna 2: leitura da thread
- [ ] Coluna 3 ou drawer/modal: composer
- [ ] Acoes fixas: novo e-mail, responder, responder a todos, reencaminhar

## Coexistencia de rota

- Rota nova oficial:
- Estado da rota legada /usuario: [ ] convivendo [ ] redirecionando [ ] removida
- Regra aplicada nesta PR:
  - [ ] Mostrar duas rotas temporariamente
  - [ ] Redirecionar /usuario -> /sistema
  - [ ] Remover rota legada

## Testes executados

- [ ] Teste manual principal
- [ ] Teste de permissao por perfil
- [ ] Teste de regressao de navegacao
- [ ] Teste de integracao com email-service

### Evidencias

- 

## Riscos conhecidos

- 

## Plano de rollback

- Flag/acao para rollback:
- Passos:
  1. 
  2. 

## Checklist final

- [ ] Sem quebra de navegacao
- [ ] Sem regressao de permissao
- [ ] Sem acoplamento indevido de Qualidade na camada API
- [ ] Documentacao atualizada em docs/EMAIL_SERVICE_MIGRATION_PR_CHECKLIST.md
