# Plano de Migração: Unificação das Coleções de Usuários

## Objetivo
Unificar todas as informações de usuários (DJs e Admins) na coleção `users`, eliminando a coleção `djs` e garantindo que todos os campos necessários estejam disponíveis na estrutura unificada.

## Estrutura Atual

### Coleção `djs`
```
agencia → string
banco → string
conta → string
cpf → string
createdAt → timestamp
email → string
name → string
nome_completo → string
percentual → number
percentual_padrao → number
status → string
telefone → string
tipo_conta → string
updated_at → timestamp
```

### Coleção `users`
```
email → string
nome → string
role → string
```

## Nova Estrutura Unificada (Coleção `users`)

Todos os usuários (DJs e Admins) estarão na coleção `users` com a seguinte estrutura:

### Campos Comuns (para todos os usuários)
```
email → string
nome → string
role → string ("dj" ou "admin")
createdAt → timestamp
updated_at → timestamp
status → string ("ativo" ou "inativo")
```

### Campos Adicionais (apenas para usuários com role="dj")
```
agencia → string
banco → string
conta → string
cpf → string
percentual → number (percentual do DJ nos eventos)
percentual_padrao → number (percentual padrão para novos eventos)
telefone → string
tipo_conta → string ("corrente" ou "poupança")
```

## Estratégia de Migração

1. **Manter a coleção `users` como fonte única de verdade**
   - Todos os novos usuários serão criados diretamente na coleção `users`
   - A coleção `djs` não será mais utilizada

2. **Ajustar o AuthContext**
   - Já está parcialmente preparado para usar apenas `users`
   - Expandir o tipo `PerfilUsuario` para incluir todos os campos relevantes
   - Atualizar a lógica de carregamento do perfil para carregar os campos adicionais

3. **Refatorar Serviços**
   - Atualizar `djService.ts` para buscar informações do DJ da coleção `users`
   - Atualizar `adminService.ts` para gerenciar usuários na coleção `users`
   - Atualizar `eventService.ts` para buscar nomes de DJs da coleção `users`

4. **Criar Painel de Administração de Usuários**
   - Implementar interface para criar novos usuários (DJs e Admins)
   - Implementar interface para editar usuários existentes
   - Permitir a definição de todos os campos relevantes

## Mapeamento de Campos

| Campo Antigo (djs) | Campo Novo (users) | Tipo      | Descrição                           |
|--------------------|-------------------|-----------|-------------------------------------|
| email              | email             | string    | Email do usuário                    |
| name               | nome              | string    | Nome do usuário                     |
| -                  | role              | string    | Função: "dj" ou "admin"             |
| agencia            | agencia           | string    | Agência bancária (para DJs)         |
| banco              | banco             | string    | Nome do banco (para DJs)            |
| conta              | conta             | string    | Número da conta (para DJs)          |
| cpf                | cpf               | string    | CPF do DJ                           |
| createdAt          | createdAt         | timestamp | Data de criação do registro         |
| nome_completo      | -                 | -         | (Removido, usar apenas 'nome')      |
| percentual         | percentual        | number    | Percentual atual do DJ              |
| percentual_padrao  | percentual_padrao | number    | Percentual padrão para novos eventos|
| status             | status            | string    | Status do usuário: "ativo"/"inativo"|
| telefone           | telefone          | string    | Telefone de contato                 |
| tipo_conta         | tipo_conta        | string    | Tipo de conta: "corrente"/"poupança"|
| updated_at         | updated_at        | timestamp | Data da última atualização          |

## Impacto nas Interfaces e Componentes

1. **AuthContext.tsx**
   - Expandir o tipo `PerfilUsuario` para incluir todos os campos relevantes
   - Atualizar a lógica de carregamento do perfil

2. **Páginas de Perfil**
   - Atualizar para exibir e permitir edição de todos os campos relevantes

3. **Páginas de Eventos**
   - Atualizar para buscar informações do DJ da coleção `users`

4. **Painel de Administração**
   - Criar nova seção para gerenciamento de usuários
   - Implementar formulários para criação e edição de usuários

## Próximos Passos

1. Refatorar o `AuthContext.tsx` para usar a nova estrutura
2. Atualizar os serviços para trabalhar com a coleção `users`
3. Implementar o painel de administração de usuários
4. Testar todos os fluxos com dados reais
