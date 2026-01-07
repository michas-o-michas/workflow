# Exemplos de Uso

## 📨 Exemplo 1: Webhook de Lead Convertido

### Payload do Webhook

```json
{
  "event": "lead.converted",
  "version": "1.0",
  "occurredAt": "2026-01-06T18:30:00Z",
  "data": {
    "lead": {
      "id": "lead_123",
      "name": "Maria Silva",
      "phone": "+5511999999999",
      "source": "whatsapp",
      "age": 32,
      "campaign": "instagram_ads"
    }
  }
}
```

### Flow Correspondente

**Objetivo**: Quando lead é convertido via WhatsApp, enviar notificação HTTP

**Estrutura**:
```
[Trigger: lead.converted]
    ↓
[Condition: data.lead.source EQUALS "whatsapp"]
    ↓ YES
[Action: HTTP_REQUEST]
    - URL: https://api.notification.com/webhook
    - Method: POST
    - Body: { "message": "Novo lead via WhatsApp: {{data.lead.name}}" }
    ↓
[End]
```

### Como Criar

1. Acesse `/flows/builder`
2. Adicione um nó **Trigger**
   - Evento: `lead.converted`
3. Adicione um nó **Condition**
   - Campo: `data.lead.source`
   - Operador: `EQUALS`
   - Valor: `whatsapp`
4. Adicione um nó **Action**
   - Tipo: `HTTP_REQUEST`
   - URL: `https://api.notification.com/webhook`
   - Method: `POST`
5. Adicione um nó **End**
6. Conecte os nós:
   - Trigger → Condition
   - Condition (YES) → Action
   - Action → End
7. Salve o flow
8. Ative o flow

## 📧 Exemplo 2: Enviar Email para Leads Premium

### Payload do Webhook

```json
{
  "event": "lead.created",
  "version": "1.0",
  "occurredAt": "2026-01-06T18:30:00Z",
  "data": {
    "lead": {
      "id": "lead_456",
      "name": "João Santos",
      "email": "joao@example.com",
      "value": 5000,
      "source": "website"
    }
  }
}
```

### Flow Correspondente

**Objetivo**: Quando lead premium (valor > 3000) é criado, enviar email

**Estrutura**:
```
[Trigger: lead.created]
    ↓
[Condition: data.lead.value GREATER_THAN 3000]
    ↓ YES
[Action: SEND_EMAIL]
    - Email: data.lead.email
    - Assunto: "Bem-vindo ao nosso programa premium!"
    - Mensagem: "Olá {{data.lead.name}}, obrigado pelo interesse!"
    ↓
[End]
```

## 🔔 Exemplo 3: Múltiplas Condições

### Payload do Webhook

```json
{
  "event": "deal.won",
  "version": "1.0",
  "occurredAt": "2026-01-06T18:30:00Z",
  "data": {
    "deal": {
      "id": "deal_789",
      "value": 10000,
      "salesperson": "Ana",
      "region": "south"
    }
  }
}
```

### Flow Correspondente

**Objetivo**: Quando deal grande (> 5000) é ganho na região sul, fazer log e enviar notificação

**Estrutura**:
```
[Trigger: deal.won]
    ↓
[Condition: data.deal.value GREATER_THAN 5000]
    ↓ YES
[Condition: data.deal.region EQUALS "south"]
    ↓ YES
[Action: LOG]
    - Mensagem: "Deal grande ganho na região sul: {{data.deal.value}}"
    ↓
[Action: HTTP_REQUEST]
    - URL: https://slack.com/api/webhook
    - Method: POST
    - Body: { "text": "🎉 Deal ganho: R$ {{data.deal.value}}" }
    ↓
[End]
```

## 🧪 Testando Flows

### Via Interface

1. Na página de edição do flow (`/flows/builder/[id]`)
2. Clique em "Testar Flow"
3. Isso enviará um webhook de teste automaticamente
4. Verifique os resultados em `/webhooks`

### Via cURL

```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "lead.converted",
    "version": "1.0",
    "occurredAt": "2026-01-06T18:30:00Z",
    "data": {
      "lead": {
        "id": "lead_test",
        "name": "Teste",
        "source": "whatsapp"
      }
    }
  }'
```

### Via JavaScript/TypeScript

```typescript
const testWebhook = async () => {
  const response = await fetch('http://localhost:3000/api/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event: 'lead.converted',
      version: '1.0',
      occurredAt: new Date().toISOString(),
      data: {
        lead: {
          id: 'lead_test',
          name: 'Teste',
          source: 'whatsapp',
        },
      },
    }),
  })

  const result = await response.json()
  console.log('Webhook enviado:', result)
}
```

## 🔍 Verificando Logs

### Via Interface

1. Acesse `/webhooks`
2. Veja a lista de webhooks recebidos
3. Cada webhook mostra:
   - Evento
   - Status (Processado/Pendente)
   - Data/hora
   - Payload completo

### Via API

```bash
curl http://localhost:3000/api/webhooks?limit=10
```

## 📊 Operadores de Condição

### EQUALS
Compara se o valor é igual (string ou número)
```
Campo: data.lead.source
Operador: EQUALS
Valor: "whatsapp"
```

### NOT_EQUALS
Compara se o valor é diferente
```
Campo: data.lead.status
Operador: NOT_EQUALS
Valor: "cancelled"
```

### CONTAINS
Verifica se o valor contém a string
```
Campo: data.lead.email
Operador: CONTAINS
Valor: "@gmail.com"
```

### GREATER_THAN
Verifica se o valor é maior que (números)
```
Campo: data.deal.value
Operador: GREATER_THAN
Valor: 5000
```

### LESS_THAN
Verifica se o valor é menor que (números)
```
Campo: data.lead.age
Operador: LESS_THAN
Valor: 18
```

## 🎯 Dicas

1. **Sempre comece com Trigger**: Todo flow precisa de um nó Trigger
2. **Teste antes de ativar**: Use o botão "Testar Flow" antes de ativar
3. **Valide condições**: Certifique-se de que os campos do payload existem
4. **Use logs**: A ação LOG ajuda a debugar flows
5. **Nomes descritivos**: Dê nomes claros aos flows
6. **Organize flows**: Crie flows específicos para cada cenário

## 🚨 Troubleshooting

### Flow não executa
- Verifique se está **ativo**
- Verifique se o evento do trigger corresponde
- Veja os logs em `/webhooks`

### Condição sempre falha
- Verifique o caminho do campo (ex: `data.lead.source`)
- Verifique o tipo do valor (string vs número)
- Use LOG para ver o payload completo

### Ação HTTP não funciona
- Verifique se a URL está correta
- Verifique se o método HTTP está correto
- Verifique se o servidor destino está acessível

