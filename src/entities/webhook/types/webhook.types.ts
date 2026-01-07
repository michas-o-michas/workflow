/**
 * Types e interfaces para a entidade Webhook
 * 
 * @module entities/webhook/types/webhook.types
 */

/**
 * Informações sobre um flow executado para um webhook
 */
export interface WebhookExecutedFlow {
  /** ID do flow executado */
  flowId: string
  /** Nome do flow */
  flowName: string
  /** Status da execução */
  status: 'running' | 'success' | 'error'
  /** Número de nós executados */
  executedNodesCount: number
  /** IDs dos nós executados */
  executedNodes?: string[]
  /** Mensagem de erro (se houver) */
  error?: string
  /** Data/hora de início da execução */
  startedAt: string
  /** Data/hora de conclusão da execução */
  completedAt?: string
  /** Tempo de execução em milissegundos */
  executionTimeMs?: number | null
  /** Ordem de execução (1 = primeiro, 2 = segundo, etc) */
  executionOrder?: number
}

/**
 * Evento de webhook salvo no banco de dados
 */
export interface WebhookEvent {
  /** ID único do evento */
  id: string
  /** Nome do evento (ex: "lead.converted") */
  event: string
  /** Versão do webhook */
  version: string
  /** Data/hora em que o evento ocorreu */
  occurredAt: string
  /** Dados do evento (payload) */
  data: Record<string, unknown>
  /** Indica se o evento foi processado */
  processed: boolean
  /** Data de criação do registro */
  createdAt: string
  /** Flows executados para este webhook (opcional, preenchido quando solicitado) */
  executedFlows?: WebhookExecutedFlow[]
}

/**
 * Payload de webhook recebido via API
 */
export interface WebhookPayload {
  /** Nome do evento */
  event: string
  /** Versão do webhook */
  version: string
  /** Data/hora em que o evento ocorreu */
  occurredAt: string
  /** Dados do evento */
  data: Record<string, unknown>
}
