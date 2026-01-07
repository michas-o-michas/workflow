# Padrões de Código - Workflow Automation

Este documento descreve os padrões de código e boas práticas do projeto.

## 📋 Índice

- [Estrutura de Arquivos](#estrutura-de-arquivos)
- [Nomenclatura](#nomenclatura)
- [TypeScript](#typescript)
- [Documentação](#documentação)
- [Tratamento de Erros](#tratamento-de-erros)
- [Logging](#logging)
- [Imports](#imports)
- [Testes](#testes)

## 📁 Estrutura de Arquivos

### Feature-Sliced Design (FSD)

O projeto segue **Feature-Sliced Design v2**:

```
src/
├── app/              # Configuração da aplicação (rotas, providers)
├── pages/            # Páginas (composição simples)
├── widgets/          # Componentes complexos
├── features/         # Funcionalidades de negócio
├── entities/          # Entidades de domínio
└── shared/            # Código compartilhado
```

### Estrutura de Features

Toda feature deve seguir esta estrutura:

```
features/{feature-name}/
├── ui/               # Componentes de UI (públicos)
├── model/            # Hooks com lógica (opcional)
├── services/         # Services singleton (opcional)
├── types/            # Types compartilhados (opcional)
├── containers/       # Composição UI + Model (opcional)
└── index.tsx         # Public API
```

## 🏷️ Nomenclatura

### Arquivos

- **Componentes**: `PascalCase.tsx` (ex: `FlowBuilder.tsx`)
- **Hooks**: `camelCase.ts` com prefixo `use` (ex: `useFlowList.ts`)
- **Services**: `camelCase.service.ts` (ex: `flow.service.ts`)
- **Repositories**: `camelCase.repository.ts` (ex: `flow.repository.ts`)
- **Types**: `camelCase.types.ts` (ex: `flow.types.ts`)
- **Utils**: `camelCase.ts` (ex: `utils.ts`)

### Variáveis e Funções

- **Variáveis**: `camelCase` (ex: `flowName`, `isLoading`)
- **Funções**: `camelCase` (ex: `handleSave`, `fetchFlow`)
- **Constantes**: `UPPER_SNAKE_CASE` (ex: `MAX_NODES_PER_FLOW`)
- **Classes**: `PascalCase` (ex: `FlowEngine`, `BaseRepository`)
- **Interfaces/Types**: `PascalCase` (ex: `FlowNodeData`, `ExecutionContext`)

### Pastas

- **Features**: `kebab-case` (ex: `flow-builder/`, `webhooks/`)
- **Componentes**: `kebab-case` (ex: `flow-list/`, `node-editor/`)

## 📘 TypeScript

### Tipos vs Interfaces

- Use **interfaces** para objetos que podem ser estendidos
- Use **types** para unions, intersections e aliases

```typescript
// ✅ Interface para objetos
interface FlowNodeData {
  field: string
  operator: ConditionOperator
}

// ✅ Type para unions
type NodeType = 'trigger' | 'condition' | 'action' | 'end'
```

### Tipos de Retorno

Sempre especifique tipos de retorno explícitos:

```typescript
// ✅ Bom
async findById(id: string): Promise<Flow | null> {
  // ...
}

// ❌ Ruim
async findById(id: string) {
  // ...
}
```

### Validação de Tipos

Use type guards quando necessário:

```typescript
function isConditionNode(node: Node<FlowNodeData>): node is Node<ConditionNodeData> {
  return node.type === 'condition'
}
```

## 📝 Documentação

### JSDoc

Todos os arquivos públicos devem ter JSDoc:

```typescript
/**
 * Executa um flow com base em um evento de webhook
 * 
 * @param flow - Flow a ser executado
 * @param webhookEvent - Evento de webhook que disparou a execução
 * @returns Resultado da execução com nós executados e erros
 * 
 * @example
 * ```typescript
 * const result = await flowEngine.executeFlow(flow, webhookEvent)
 * ```
 */
async executeFlow(flow: Flow, webhookEvent: WebhookEvent): Promise<FlowExecutionResult>
```

### Comentários

- Use comentários para explicar **por quê**, não **o quê**
- Evite comentários óbvios
- Comentários complexos devem ser em português

```typescript
// ✅ Bom - explica o porquê
// Remove 'data.' do início do path se existir, pois já estamos passando o objeto data
if (fieldPath.startsWith(DATA_PREFIX)) {
  fieldPath = fieldPath.substring(DATA_PREFIX.length)
}

// ❌ Ruim - óbvio demais
// Incrementa o contador
counter++
```

## ⚠️ Tratamento de Erros

### Classes de Erro Customizadas

Use as classes de erro do sistema:

```typescript
import { FlowNotFoundError, ValidationError } from '@/shared/lib/errors'

// ✅ Bom
if (!flow) {
  throw new FlowNotFoundError(id)
}

// ❌ Ruim
if (!flow) {
  throw new Error('Flow não encontrado')
}
```

### Try-Catch

Sempre trate erros adequadamente:

```typescript
// ✅ Bom
try {
  const result = await flowService.findById(id)
  return result
} catch (error) {
  logger.error('Erro ao buscar flow', error, { id })
  throw error
}
```

## 📊 Logging

### Sistema de Logging

Use o logger padronizado:

```typescript
import { logger } from '@/shared/lib/logger'

// Debug (apenas em desenvolvimento)
logger.debug('Detalhes de debug', { context })

// Informação
logger.info('Operação concluída', { flowId })

// Aviso
logger.warn('Atenção: condição não configurada', { nodeId })

// Erro
logger.error('Erro ao executar flow', error, { flowId, nodeId })
```

### Níveis de Log

- **DEBUG**: Informações detalhadas (apenas em desenvolvimento)
- **INFO**: Informações gerais importantes
- **WARN**: Avisos que não impedem execução
- **ERROR**: Erros que impedem execução

## 📦 Imports

### Ordem de Imports

1. Imports externos (React, Next.js, etc.)
2. Imports de shared
3. Imports de entities
4. Imports de features
5. Imports relativos

```typescript
// 1. Externos
import { useState, useEffect } from 'react'
import { NextRequest, NextResponse } from 'next/server'

// 2. Shared
import { logger } from '@/shared/lib/logger'
import { flowEngine } from '@/shared/lib/flow-engine'

// 3. Entities
import type { Flow, FlowNodeData } from '@/entities/flow'

// 4. Features
import { flowService } from '@/features/flows'

// 5. Relativos
import { NodeEditor } from './NodeEditor'
```

### Imports Absolutos

Sempre use imports absolutos com `@/`:

```typescript
// ✅ Bom
import { flowService } from '@/features/flows'
import { logger } from '@/shared/lib/logger'

// ❌ Ruim
import { flowService } from '../../../features/flows'
```

## 🧪 Testes

### Estrutura de Testes

```typescript
describe('FlowEngine', () => {
  describe('executeFlow', () => {
    it('deve executar flow com sucesso', async () => {
      // Arrange
      const flow = createMockFlow()
      const webhookEvent = createMockWebhookEvent()
      
      // Act
      const result = await flowEngine.executeFlow(flow, webhookEvent)
      
      // Assert
      expect(result.success).toBe(true)
    })
  })
})
```

## 🔒 Segurança

### Validação de Input

Sempre valide inputs de usuário:

```typescript
if (!flowName || flowName.trim() === '') {
  throw new ValidationError('Nome do flow é obrigatório', 'name')
}
```

### Sanitização

Sanitize dados antes de salvar:

```typescript
const sanitizedName = flowName.trim().slice(0, 255)
```

## 🚀 Performance

### Lazy Loading

Use lazy loading para componentes pesados:

```typescript
const FlowBuilder = lazy(() => import('@/features/flow-builder'))
```

### Memoização

Use `useMemo` e `useCallback` quando apropriado:

```typescript
const memoizedNodes = useMemo(() => {
  return nodes.map(transformNode)
}, [nodes])
```

## 📚 Recursos

- [Feature-Sliced Design](https://feature-sliced.design/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Next.js Documentation](https://nextjs.org/docs)

