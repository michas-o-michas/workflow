/**
 * Types e interfaces para a entidade Flow
 * 
 * @module entities/flow/types/flow.types
 */

import { Node, Edge } from 'reactflow'

/**
 * Tipos de nós disponíveis no flow
 */
export type NodeType = 'trigger' | 'condition' | 'action' | 'end'

/**
 * Dados de um nó do tipo Trigger
 */
export interface TriggerNodeData {
  /** Nome do evento que dispara o trigger (ex: "lead.converted") */
  event: string
}

/**
 * Operadores de condição disponíveis
 */
export type ConditionOperator = 
  | 'EQUALS' 
  | 'CONTAINS' 
  | 'GREATER_THAN' 
  | 'LESS_THAN' 
  | 'NOT_EQUALS'

/**
 * Tipo de condição
 */
export type ConditionType = 'FIELD' | 'HTTP_REQUEST'

/**
 * Configuração de uma condição HTTP
 */
export interface HttpConditionConfig {
  /** URL da requisição (pode conter variáveis {{path}}) */
  url: string
  /** Método HTTP */
  method?: HttpMethod
  /** Headers customizados */
  headers?: Record<string, string>
  /** Body da requisição (pode conter variáveis {{path}}) */
  body?: Record<string, unknown>
  /** Caminho do campo na resposta HTTP para avaliar (ex: "status" ou "data.active") */
  responseField: string
  /** Operador de comparação */
  operator: ConditionOperator
  /** Valor esperado para comparação */
  value: string | number
}

/**
 * Dados de um nó do tipo Condition
 */
export interface ConditionNodeData {
  /** Tipo de condição: FIELD (campo do payload) ou HTTP_REQUEST (request HTTP) */
  conditionType?: ConditionType
  /** Caminho do campo no payload (ex: "lead.age" ou "lead.source") - usado quando conditionType é FIELD */
  field?: string
  /** Operador de comparação - usado quando conditionType é FIELD */
  operator?: ConditionOperator
  /** Valor esperado para comparação - usado quando conditionType é FIELD */
  value?: string | number
  /** Configuração de condição HTTP - usado quando conditionType é HTTP_REQUEST */
  httpConfig?: HttpConditionConfig
}

/**
 * Tipos de ações disponíveis
 */
export type ActionType = 'LOG' | 'HTTP_REQUEST' | 'SEND_EMAIL' | 'CALL_FLOW'

/**
 * Métodos HTTP suportados
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

/**
 * Configuração de uma ação HTTP
 */
export interface HttpActionConfig {
  /** URL da requisição */
  url: string
  /** Método HTTP */
  method?: HttpMethod
  /** Headers customizados */
  headers?: Record<string, string>
  /** Body da requisição (pode conter variáveis {{path}}) */
  body?: Record<string, unknown>
}

/**
 * Configuração de uma ação de email
 */
export interface EmailActionConfig {
  /** Email do destinatário */
  email: string
  /** Assunto do email */
  subject?: string
  /** Mensagem do email (pode conter variáveis {{path}}) */
  message?: string
}

/**
 * Configuração de uma ação de log
 */
export interface LogActionConfig {
  /** Mensagem a ser logada (pode conter variáveis {{path}}) */
  message?: string
}

/**
 * Configuração de uma ação de chamada de flow
 */
export interface CallFlowActionConfig {
  /** ID do flow a ser chamado */
  flowId: string
  /** Dados adicionais a serem passados para o flow (opcional) */
  data?: Record<string, unknown>
}

/**
 * Configuração de uma ação (union type)
 */
export type ActionConfig = 
  | LogActionConfig 
  | HttpActionConfig 
  | EmailActionConfig
  | CallFlowActionConfig

/**
 * Dados de um nó do tipo Action
 */
export interface ActionNodeData {
  /** Tipo da ação */
  type: ActionType
  /** Configuração específica da ação */
  config: ActionConfig
}

/**
 * Dados de um nó do tipo End
 * Nó de fim não precisa de dados
 */
export interface EndNodeData {
  // Vazio - nó de fim não requer configuração
}

/**
 * Union type para dados de qualquer tipo de nó
 */
export type FlowNodeData = 
  | TriggerNodeData 
  | ConditionNodeData 
  | ActionNodeData 
  | EndNodeData

/**
 * Status de execução de um flow
 */
export type ExecutionStatus = 'running' | 'success' | 'error'

/**
 * Flow completo
 */
export interface Flow {
  /** ID único do flow */
  id: string
  /** Nome do flow */
  name: string
  /** Indica se o flow está ativo */
  active: boolean
  /** Nós do flow (grafo) */
  nodes: Node<FlowNodeData>[]
  /** Conexões entre nós (edges) */
  edges: Edge[]
  /** Data de criação */
  createdAt: string
  /** Data da última atualização */
  updatedAt: string
}

/**
 * Log de execução de um flow
 */
export interface FlowExecutionLog {
  /** ID único do log */
  id: string
  /** ID do flow executado */
  flowId: string
  /** ID do evento de webhook que disparou a execução */
  webhookEventId: string
  /** Status da execução */
  status: ExecutionStatus
  /** IDs dos nós executados (em ordem) */
  executedNodes: string[]
  /** Mensagem de erro (se houver) */
  error?: string
  /** Data/hora de início da execução */
  startedAt: string
  /** Data/hora de conclusão da execução */
  completedAt?: string
}
