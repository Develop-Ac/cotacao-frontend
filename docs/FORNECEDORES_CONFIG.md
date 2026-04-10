# Tela de Fornecedores Config

## Rota
- /qualidade/fornecedores-config

## Funcionalidades
- Listagem de configuracoes por fornecedor.
- Busca por ERP id, nome, tipo de processo e instrucoes.
- Inclusao de cadastro.
- Edicao de cadastro.
- Copia de cadastro exigindo novo ERP fornecedor id.

## Regras no formulario
- processo_tipo portal: exige portal_link.
- processo_tipo formulario: exige upload de arquivo na criacao quando nao houver formulario_path.
- processo_tipo email e whatsapp: exige instrucoes.

## Integracao
A tela usa os endpoints do garantia-service em /api/fornecedores/config.
