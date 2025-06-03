# Checklist de Correções e Melhorias - Site DJ

## Pendências

- [X] **Dashboard DJ:** Implementar somatório de eventos (Total, Bruto, Custos, Líquido DJ) no dashboard.
- [X] **Financeiro DJ (Página e Resumo):** Corrigir cálculo do "Valor DJ" e centralizar a lógica no backend (djService/adminService).
- [X] **Excluir Evento (Admin e DJ):** Corrigir funcionalidade de exclusão, adicionar confirmação (`confirm()`) e tratamento de erros (`try/catch`).
- [X] **Página Inicial Admin:** Remover aba "Início" e definir Dashboard Admin (financeiro) como página inicial.

## Sugestões Técnicas

- [X] **Centralização:** Mover todas as funções de cálculo financeiro para `djService.ts` e `adminService.ts`.
- [X] **Tratamento de Erros e Loaders:** Adicionar tratamento de erros e indicadores de carregamento (loaders) em todas as funções assíncronas.
- [X] **Feedback Visual:** Melhorar mensagens de sucesso, erro e carregamento para o usuário.
- [X] **Otimização de Buscas:** Refatorar funções de busca de dados (`useEffect`, dependências).
- [X] **Revisão Firebase:** Conferir uso do Firebase e regras de segurança.
