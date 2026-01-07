/**
 * Constantes globais do sistema
 */

/**
 * Handles das edges de condition nodes
 */
export const CONDITION_HANDLES = {
  YES: 'yes',
  NO: 'no',
} as const

/**
 * Tipos de nós disponíveis
 */
export const NODE_TYPES = {
  TRIGGER: 'trigger',
  CONDITION: 'condition',
  ACTION: 'action',
  END: 'end',
} as const

/**
 * Tipos de ações disponíveis
 */
export const ACTION_TYPES = {
  LOG: 'LOG',
  HTTP_REQUEST: 'HTTP_REQUEST',
  SEND_EMAIL: 'SEND_EMAIL',
  CALL_FLOW: 'CALL_FLOW',
} as const

/**
 * Limite máximo de profundidade de chamadas de flows (evita loops infinitos)
 */
export const MAX_FLOW_DEPTH = 5

/**
 * Operadores de condição disponíveis
 */
export const CONDITION_OPERATORS = {
  EQUALS: 'EQUALS',
  NOT_EQUALS: 'NOT_EQUALS',
  CONTAINS: 'CONTAINS',
  GREATER_THAN: 'GREATER_THAN',
  LESS_THAN: 'LESS_THAN',
} as const

/**
 * Métodos HTTP suportados
 */
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
} as const

/**
 * Status de execução de flow
 */
export const EXECUTION_STATUS = {
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error',
} as const

/**
 * Prefixo para remover do path de campos
 */
export const DATA_PREFIX = 'data.'

/**
 * Padrão de interpolação de variáveis
 */
export const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g

/**
 * Timeout padrão para requisições HTTP (em ms)
 */
export const HTTP_TIMEOUT = 30000

/**
 * Número máximo de nós em um flow
 */
export const MAX_NODES_PER_FLOW = 100

/**
 * Número máximo de edges em um flow
 */
export const MAX_EDGES_PER_FLOW = 200

