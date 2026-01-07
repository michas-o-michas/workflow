/**
 * Classes de erro customizadas para o sistema
 */

/**
 * Erro base para erros do sistema
 */
export class WorkflowError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message)
    this.name = 'WorkflowError'
    Object.setPrototypeOf(this, WorkflowError.prototype)
  }
}

/**
 * Erro de validação
 */
export class ValidationError extends WorkflowError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR', 400)
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

/**
 * Erro de flow não encontrado
 */
export class FlowNotFoundError extends WorkflowError {
  constructor(flowId: string) {
    super(`Flow não encontrado: ${flowId}`, 'FLOW_NOT_FOUND', 404)
    this.name = 'FlowNotFoundError'
    Object.setPrototypeOf(this, FlowNotFoundError.prototype)
  }
}

/**
 * Erro de execução de flow
 */
export class FlowExecutionError extends WorkflowError {
  constructor(
    message: string,
    public readonly flowId: string,
    public readonly nodeId?: string
  ) {
    super(message, 'FLOW_EXECUTION_ERROR', 500)
    this.name = 'FlowExecutionError'
    Object.setPrototypeOf(this, FlowExecutionError.prototype)
  }
}

/**
 * Erro de webhook inválido
 */
export class WebhookError extends WorkflowError {
  constructor(message: string, public readonly event?: string) {
    super(message, 'WEBHOOK_ERROR', 400)
    this.name = 'WebhookError'
    Object.setPrototypeOf(this, WebhookError.prototype)
  }
}

