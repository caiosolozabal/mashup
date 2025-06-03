# Guia de Uso e Documentação - Site da Agência de DJs (Versão sem Login)

## Visão Geral

Este site foi desenvolvido para gerenciar uma agência de DJs, permitindo o controle de eventos, agenda, financeiro e configurações administrativas. Esta versão não possui sistema de autenticação, conforme solicitado, para que você possa implementar seu próprio sistema de login posteriormente.

## Estrutura do Projeto

O site foi desenvolvido utilizando Next.js, uma moderna framework React, com as seguintes características:

- **Organização por Páginas**: Cada rota do site é uma página separada em `src/app/`
- **Componentes Reutilizáveis**: Elementos comuns como cabeçalho e rodapé em `src/components/`
- **Serviços de Dados**: Funções para interagir com o Firebase em `src/lib/`
- **Estilização**: Combinação de Tailwind CSS e estilos globais

## Páginas Principais

### Dashboard do DJ
- **Rota**: `/dashboard/dj`
- **Funcionalidades**:
  - Panorama semanal de eventos (semana atual e próxima)
  - Resumo financeiro do mês atual
  - Links para agenda e menu financeiro

### Agenda do DJ
- **Rota**: `/dashboard/dj/agenda`
- **Funcionalidades**:
  - Visualização em formato de planilha
  - Visualização em calendário interativo
  - Estrutura para adição de novos eventos

### Menu Financeiro do DJ
- **Rota**: `/dashboard/dj/financeiro`
- **Funcionalidades**:
  - Detalhamento dos eventos por mês
  - Cálculo do valor a receber com base no percentual aplicado
  - Visualização do status de pagamento

### Dashboard do Admin
- **Rota**: `/dashboard/admin`
- **Funcionalidades**:
  - Panorama semanal de todos os eventos da agência
  - Faturamento bruto e valor líquido para a agência
  - Gráfico de faturamento por DJ

### Configurações da Agência (Admin)
- **Rota**: `/dashboard/admin/settings`
- **Funcionalidades**:
  - Gerenciamento do percentual padrão da agência

### Gerenciamento de Status de Pagamento (Admin)
- **Rota**: `/dashboard/admin/manage-events`
- **Funcionalidades**:
  - Interface para atualizar o status de pagamento dos eventos

## Integração com Firebase

O site está configurado para usar o Firebase como banco de dados. As principais coleções utilizadas são:

- **eventos**: Armazena todos os eventos dos DJs
- **djs**: Informações sobre os DJs da agência
- **configuracoes**: Configurações gerais como percentual padrão da agência

Para conectar ao seu próprio Firebase, edite o arquivo `src/lib/firebaseConfig.ts` com suas credenciais.

## Como Testar Localmente

1. **Instalar Dependências**:
   ```bash
   pnpm install
   ```

2. **Iniciar o Servidor de Desenvolvimento**:
   ```bash
   pnpm dev
   ```

3. **Acessar o Site**:
   Abra `http://localhost:3000` no seu navegador

## Como Fazer o Deploy no Netlify

1. **Preparar o Projeto para Produção**:
   ```bash
   pnpm build
   ```

2. **Fazer Upload para o Netlify**:
   - Faça login no Netlify
   - Arraste a pasta `out` para o dashboard do Netlify
   - Ou configure o deploy automático a partir do seu repositório Git

## Implementando seu Próprio Sistema de Login

Para adicionar autenticação ao site, você precisará:

1. **Configurar Autenticação no Firebase**:
   - Ative os métodos de autenticação desejados no console do Firebase

2. **Criar Contexto de Autenticação**:
   - Implemente um contexto React para gerenciar o estado de autenticação
   - Adicione funções para login, cadastro e logout

3. **Proteger Rotas**:
   - Crie um componente para verificar se o usuário está autenticado
   - Redirecione para a página de login se não estiver

4. **Adicionar Verificação de Perfil**:
   - Implemente lógica para diferenciar entre DJs e Admins
   - Restrinja o acesso às páginas com base no perfil do usuário

## Personalizando o Site

### Cores e Estilos
- Edite `src/app/globals.css` para alterar estilos globais
- Modifique as classes do Tailwind nos componentes para ajustar cores e layout

### Adicionando Novas Páginas
1. Crie um novo arquivo em `src/app/[caminho]/page.tsx`
2. Implemente o componente React para a página
3. A página estará automaticamente disponível em `/[caminho]`

### Expandindo Funcionalidades
- Adicione novos serviços em `src/lib/` para interagir com o Firebase
- Crie novos componentes em `src/components/` para elementos reutilizáveis
- Expanda as interfaces existentes para incluir novos campos ou funcionalidades

## Suporte e Manutenção

Para manter o site funcionando corretamente:

1. **Atualize as Dependências Regularmente**:
   ```bash
   pnpm update
   ```

2. **Monitore o Uso do Firebase**:
   - Verifique o console do Firebase para limites de uso e erros

3. **Faça Backup dos Dados**:
   - Exporte regularmente os dados do Firestore para evitar perdas

## Conclusão

Este site fornece uma base sólida para o gerenciamento da sua agência de DJs. A versão sem login permite que você teste todas as funcionalidades e implemente seu próprio sistema de autenticação conforme necessário.

Para qualquer dúvida ou suporte adicional, entre em contato com a equipe de desenvolvimento.
