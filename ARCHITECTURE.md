# Arquitetura do Sistema

Este documento descreve a arquitetura do sistema de automação com webhooks e flow builder.

## 🏗️ Estrutura Feature-Sliced Design (FSD)

O projeto segue o padrão **Feature-Sliced Design** com as seguintes camadas:

```
src/
├── app/                    # Configuração da aplicação
│   ├── api/               # API Routes (Next.js)
│   ├── flows/             # Páginas de flows
│   ├── webhooks/          # Páginas de webhooks
│   ├── dashboard/         # Dashboard
│   ├── layout.tsx         # Layout raiz
│   └── globals.css        # Estilos globais
│
├── pages/                 # Páginas (composição simples)
│
├── widgets/               # Componentes complexos (não usado ainda)
│
├── features/               # Funcionalidades de negócio
│   ├── flows/             # Feature de flows
│   │   ├── services/      # Services singleton
│   │   └── ui/            # Componentes UI
│   ├── flow-builder/      # Feature de flow builder
│   │   └── ui/            # Componentes do builder
│   └── webhooks/          # Feature de webhooks
│       ├── services/      # Services singleton
│       └── ui/            # Componentes UI
│
├── entities/              # Entidades de domínio
│   ├── flow/              # Entidade Flow
│   │   └── types/         # Types do Flow
│   └── webhook/           # Entidade Webhook
│       └── types/         # Types do Webhook
│
└── shared/                # Código compartilhado
    ├── api/               # API e Repositories
    │   ├── repositories/  # Repositories singleton
    │   │   ├── base/      # BaseRepository
    │   │   ├── flow.repository.ts
    │   │   └── webhook.repository.ts
    │   └── supabase.ts    # Cliente Supabase
    ├── lib/               # Utilitários
    │   ├── flow-engine.ts # Engine de execução
    │   └── utils.ts       # Funções auxiliares
    ├── ui/                # Componentes UI reutilizáveis
    │   ├── button/
    │   ├── card/
    │   ├── input/
    │   └── select/
    └── config/            # Configurações
        └── env.ts         # Variáveis de ambiente
```

## 🔄 Fluxo de Dados

### 1. Recebimento de Webhook

```
POST /api/webhook
    ↓
webhookService.receiveWebhook()
    ↓
webhookRepository.create() → Supabase
    ↓
processWebhookFlows() (background)
    ↓
flowRepository.findActive() → Busca flows ativos
    ↓
flowEngine.executeFlow() → Executa cada flow
    ↓
flowExecutionLogRepository.create() → Registra logs
```

### 2. Criação de Flow

```
POST /api/flows
    ↓
flowService.create()
    ↓
flowRepository.create() → Supabase
```

### 3. Execução de Flow

```
flowEngine.executeFlow()
    ↓
Percorre nós do grafo:
    - Trigger: Valida evento
    - Condition: Avalia condições
    - Action: Executa ações
    - End: Finaliza
    ↓
Registra nós executados e erros
```

## 🗄️ Banco de Dados (Supabase)

### Tabelas

1. **webhook_events**
   - Armazena eventos recebidos
   - Campos: id, event, version, occurred_at, data (JSONB), processed, created_at

2. **flows**
   - Armazena flows criados
   - Campos: id, name, active, nodes (JSONB), edges (JSONB), created_at, updated_at

3. **flow_execution_logs**
   - Armazena logs de execução
   - Campos: id, flow_id, webhook_event_id, status, executed_nodes, error, started_at, completed_at

## 🔐 Padrão Singleton

### Repositories

Todos os repositories são **singleton**:

```typescript
// shared/api/repositories/webhook.repository.ts
class WebhookRepository extends BaseRepository<WebhookEvent> {
  // ...
}
export const webhookRepository = new WebhookRepository()
```

### Services

Todos os services são **singleton**:

```typescript
// features/webhooks/services/webhook.service.ts
class WebhookService {
  // ...
}
export const webhookService = new WebhookService()
```

## 🎨 Componentes UI

### Flow Builder

- **FlowBuilder**: Componente principal com React Flow
- **NodeEditor**: Painel lateral para editar nós
- **TriggerNode, ConditionNode, ActionNode, EndNode**: Componentes de nós customizados

### Shared UI

- **Button**: Botão reutilizável com variantes
- **Card**: Card container
- **Input**: Input com label e erro
- **Select**: Select com label e erro

## 🚀 API Routes

### Webhook
- `POST /api/webhook` - Recebe webhooks externos

### Flows
- `GET /api/flows` - Lista flows
- `POST /api/flows` - Cria flow
- `GET /api/flows/[id]` - Busca flow
- `PUT /api/flows/[id]` - Atualiza flow
- `DELETE /api/flows/[id]` - Deleta flow
- `POST /api/flows/[id]/toggle` - Ativa/desativa flow

### Webhooks
- `GET /api/webhooks` - Lista webhooks recebidos

## 🔧 Flow Engine

O `FlowEngine` é responsável por executar flows:

1. **Validação**: Verifica se há nó trigger e se o evento corresponde
2. **Execução**: Percorre o grafo de nós
3. **Condições**: Avalia condições usando dados do webhook
4. **Ações**: Executa ações (LOG, HTTP_REQUEST, SEND_EMAIL)
5. **Logs**: Registra nós executados e erros

## 📝 Convenções

### Nomenclatura
- **Repositories**: `{entity}Repository` (ex: `webhookRepository`)
- **Services**: `{entity}Service` (ex: `webhookService`)
- **Components**: `PascalCase` (ex: `FlowBuilder`)
- **Hooks**: `use{Name}` (ex: `useFlowList`)
- **Types**: `{entity}.types.ts`

### Imports
- Sempre use imports absolutos com `@/`
- Exemplo: `import { Button } from '@/shared/ui'`

### Regras FSD
- ✅ Features podem importar de `shared` e `entities`
- ❌ Features NÃO podem importar de outras features
- ✅ Pages podem importar de features, widgets, shared, entities
- ❌ Entities não podem importar de features

## 🔒 Segurança

- Validação HMAC opcional para webhooks (via `WEBHOOK_SECRET`)
- Service role key apenas no servidor (não exposta no cliente)
- Validação de payloads antes de processar

## 📈 Melhorias Futuras

- [ ] Autenticação e autorização
- [ ] Rate limiting
- [ ] Webhooks com retry
- [ ] Variáveis de ambiente para secrets
- [ ] Suporte a mais tipos de ações
- [ ] Visualização de logs de execução em tempo real
- [ ] Exportar/importar flows
- [ ] Templates de flows

