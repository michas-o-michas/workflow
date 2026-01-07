# Guia de Configuração

## 1. Instalação de Dependências

```bash
npm install
```

## 2. Configuração do Supabase

### 2.1 Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Anote a URL e as chaves (anon key e service role key)

### 2.2 Executar Migrations

1. No dashboard do Supabase, vá em **SQL Editor**
2. Execute o conteúdo do arquivo `supabase/migrations/001_initial_schema.sql`
3. Isso criará as tabelas necessárias:
   - `webhook_events`
   - `flows`
   - `flow_execution_logs`

### 2.3 Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
WEBHOOK_SECRET=seu_secret_aqui
```

## 3. Executar o Projeto

```bash
npm run dev
```

Acesse `http://localhost:3000`

## 4. Estrutura de Rotas

- `/` - Redireciona para `/flows`
- `/flows` - Lista de flows
- `/flows/builder` - Criar novo flow
- `/flows/builder/[id]` - Editar flow existente
- `/webhooks` - Lista de webhooks recebidos
- `/dashboard` - Dashboard principal

## 5. API Endpoints

### Webhook Receiver
```
POST /api/webhook
Content-Type: application/json

{
  "event": "lead.converted",
  "version": "1.0",
  "occurredAt": "2026-01-06T18:30:00Z",
  "data": {
    "lead": {
      "id": "lead_123",
      "name": "Maria Silva",
      "source": "whatsapp"
    }
  }
}
```

### Flows CRUD
- `GET /api/flows` - Lista todos os flows
- `POST /api/flows` - Cria um novo flow
- `GET /api/flows/[id]` - Busca um flow
- `PUT /api/flows/[id]` - Atualiza um flow
- `DELETE /api/flows/[id]` - Deleta um flow
- `POST /api/flows/[id]/toggle` - Ativa/desativa um flow

### Webhooks
- `GET /api/webhooks?limit=50` - Lista webhooks recebidos

## 6. Como Usar

### Criar um Flow

1. Acesse `/flows/builder`
2. Adicione um nó **Trigger** e configure o evento (ex: `lead.converted`)
3. Adicione nós **Condition** para criar condições
4. Adicione nós **Action** para executar ações
5. Conecte os nós arrastando de uma porta para outra
6. Clique em um nó para editá-lo no painel direito
7. Clique em "Salvar Flow"

### Testar um Flow

1. Na página de edição do flow, clique em "Testar Flow"
2. Isso enviará um webhook de teste
3. Verifique os logs em `/webhooks`

### Receber Webhooks Externos

Envie um POST para `/api/webhook` com o payload no formato especificado acima.

O sistema automaticamente:
1. Salva o evento
2. Busca flows ativos que escutam aquele evento
3. Executa os flows correspondentes
4. Registra logs de execução

## 7. Tipos de Nós

### Trigger
- **Propósito**: Início do flow, escuta um evento específico
- **Configuração**: Nome do evento (ex: `lead.converted`)

### Condition
- **Propósito**: Avalia condições baseadas no payload do webhook
- **Configuração**:
  - Campo do payload (ex: `data.lead.source`)
  - Operador (EQUALS, CONTAINS, GREATER_THAN, etc)
  - Valor esperado
- **Saídas**: YES (verde) e NO (vermelho)

### Action
- **Propósito**: Executa uma ação
- **Tipos**:
  - **LOG**: Registra no console
  - **HTTP_REQUEST**: Faz uma requisição HTTP
  - **SEND_EMAIL**: Envia email (implementação simplificada)

### End
- **Propósito**: Finaliza o flow
- **Configuração**: Nenhuma

## 8. Exemplo de Flow

**Cenário**: "Quando lead é convertido via WhatsApp, enviar notificação"

**Estrutura**:
```
[Trigger: lead.converted]
    ↓
[Condition: data.lead.source EQUALS "whatsapp"]
    ↓ YES
[Action: HTTP_REQUEST → POST https://api.notification.com/webhook]
    ↓
[End]
```

## 9. Troubleshooting

### Erro ao conectar no Supabase
- Verifique se as variáveis de ambiente estão corretas
- Certifique-se de que o projeto Supabase está ativo

### Flows não executam
- Verifique se o flow está **ativo**
- Verifique se o evento do trigger corresponde ao evento recebido
- Veja os logs em `/webhooks` para mais detalhes

### Erro ao salvar flow
- Certifique-se de que o flow tem pelo menos um nó Trigger
- Verifique se todos os nós estão configurados corretamente

