# Workflow Automation System

Sistema de automação visual com webhooks e flow builder, inspirado em Zapier/n8n.

## 🚀 Tecnologias

- **Next.js 14+** (App Router) - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes UI profissionais
- **React Flow** - Editor visual de flows
- **Supabase** - Banco de dados PostgreSQL
- **Feature-Sliced Design** - Arquitetura modular

## 📦 Instalação

```bash
npm install
```

## 🔧 Configuração

1. Crie um arquivo `.env.local` com as variáveis do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
WEBHOOK_SECRET=your_webhook_secret
```

2. Execute as migrations do Supabase (veja `supabase/migrations/`)

3. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

## 📚 Estrutura

O projeto segue **Feature-Sliced Design (FSD)**:

```
src/
├── app/              # Configuração da aplicação (rotas, providers)
├── pages/            # Páginas (composição simples)
├── widgets/          # Componentes complexos
├── features/         # Funcionalidades de negócio
│   ├── flows/       # Feature de flows
│   ├── flow-builder/ # Feature de flow builder
│   └── webhooks/    # Feature de webhooks
├── entities/         # Entidades de domínio
│   ├── flow/        # Entidade Flow
│   └── webhook/     # Entidade Webhook
└── shared/           # Código compartilhado
    ├── api/         # Repositories e API
    ├── lib/         # Utilitários (flow-engine, logger, constants)
    ├── ui/          # Componentes UI reutilizáveis
    └── config/      # Configurações
```

## 🎯 Funcionalidades

- ✅ **Receber webhooks** via POST `/api/webhook`
- ✅ **Criar flows visuais** com drag-and-drop
- ✅ **Executar flows automaticamente** baseado em eventos
- ✅ **Condições inteligentes** com avaliação correta de caminhos
- ✅ **Dashboard** com logs e histórico
- ✅ **Testar flows** com payloads de exemplo
- ✅ **Salvar nodes individualmente** ou flow completo

## 📖 Documentação

- **[SETUP.md](./SETUP.md)** - Guia completo de configuração
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Arquitetura do sistema
- **[EXAMPLES.md](./EXAMPLES.md)** - Exemplos de uso e casos práticos
- **[CODING_STANDARDS.md](./CODING_STANDARDS.md)** - Padrões de código
- **[PRODUCTION_READY.md](./PRODUCTION_READY.md)** - Resumo das melhorias
- **[SHADCN_SETUP.md](./SHADCN_SETUP.md)** - Setup do shadcn/ui

## 🚀 Quick Start

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure o Supabase:**
   - Crie um projeto no [Supabase](https://supabase.com)
   - Execute o SQL em `supabase/migrations/001_initial_schema.sql`
   - Configure as variáveis de ambiente (veja `.env.example`)

3. **Inicie o servidor:**
   ```bash
   npm run dev
   ```

4. **Acesse:**
   - `http://localhost:3000` - Dashboard
   - `http://localhost:3000/flows` - Lista de flows
   - `http://localhost:3000/flows/builder` - Criar novo flow

## ✨ Características

- 🎨 **Interface moderna e profissional** com shadcn/ui e React Flow
- 🔄 **Execução em tempo real** de flows
- 📊 **Logs detalhados** de execução
- 🛡️ **Validação robusta** de dados
- 📝 **Código padronizado** e documentado
- 🚀 **Pronto para produção**
- 🎯 **UX otimizada** com layout profissional (sidebar, header, cards)

## 🏗️ Arquitetura

O projeto utiliza:
- **Feature-Sliced Design** para organização modular
- **Singleton Pattern** para repositories e services
- **Client-Side Rendering** (sem SSR)
- **TypeScript** para type safety
- **Padrões de código** consistentes
   - `http://localhost:3000/flows` - Lista de flows
   - `http://localhost:3000/flows/builder` - Criar novo flow
   - `http://localhost:3000/webhooks` - Webhooks recebidos

## 📝 Estrutura do Projeto

O projeto segue **Feature-Sliced Design (FSD)**:

```
src/
├── app/              # Configuração da aplicação (rotas, providers)
├── features/         # Funcionalidades de negócio
│   ├── flows/        # Feature de flows
│   ├── flow-builder/ # Feature de flow builder
│   └── webhooks/     # Feature de webhooks
├── entities/         # Entidades de domínio
│   ├── flow/         # Entidade Flow
│   └── webhook/      # Entidade Webhook
└── shared/           # Código compartilhado
    ├── api/          # Repositories (singleton)
    ├── lib/          # Utilitários e engines
    └── ui/           # Componentes UI reutilizáveis
```

## 🎨 Tecnologias Utilizadas

- **Next.js 14+** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **React Flow** - Flow builder visual
- **Supabase** - Banco de dados PostgreSQL
- **Feature-Sliced Design** - Arquitetura modular

