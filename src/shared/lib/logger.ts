/**
 * Sistema de logging padronizado
 * 
 * Níveis de log:
 * - DEBUG: Informações detalhadas para debug
 * - INFO: Informações gerais
 * - WARN: Avisos que não impedem execução
 * - ERROR: Erros que impedem execução
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  /**
   * Log de debug (apenas em desenvolvimento)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, context ? JSON.stringify(context, null, 2) : '')
    }
  }

  /**
   * Log de informação
   */
  info(message: string, context?: LogContext): void {
    console.log(`[INFO] ${message}`, context ? JSON.stringify(context, null, 2) : '')
  }

  /**
   * Log de aviso
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context ? JSON.stringify(context, null, 2) : '')
  }

  /**
   * Log de erro
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error

    console.error(`[ERROR] ${message}`, {
      ...context,
      error: errorDetails,
    })
  }

  /**
   * Log específico para Flow Engine
   */
  flow(message: string, context?: LogContext): void {
    console.log(`[FLOW ENGINE] ${message}`, context ? JSON.stringify(context, null, 2) : '')
  }

  /**
   * Log específico para Condition (sempre visível para acompanhamento)
   */
  condition(message: string, context?: LogContext): void {
    console.log(`[CONDITION] ${message}`, context ? JSON.stringify(context, null, 2) : '')
  }

  /**
   * Log específico para Action
   */
  action(message: string, context?: LogContext): void {
    console.log(`[ACTION] ${message}`, context ? JSON.stringify(context, null, 2) : '')
  }
}

// Singleton
export const logger = new Logger()

