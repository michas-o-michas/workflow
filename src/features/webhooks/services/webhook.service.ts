/**
 * Webhook Service - Lógica de negócio para webhooks
 * 
 * Service singleton responsável por receber webhooks, processar flows
 * e gerenciar eventos de webhook.
 * 
 * @module features/webhooks/services/webhook.service
 */

import { 
  webhookRepository, 
  flowRepository, 
  flowExecutionLogRepository 
} from '@/shared/api/repositories'
import { flowEngine } from '@/shared/lib/flow-engine'
import type { WebhookEvent, WebhookPayload } from '@/entities/webhook'
import type { Flow } from '@/entities/flow'
import { logger } from '@/shared/lib/logger'
import { EXECUTION_STATUS, NODE_TYPES } from '@/shared/lib/constants'

/**
 * Service para gerenciamento de webhooks
 */
class WebhookService {
  /**
   * Recebe e processa um webhook
   * 
   * Salva o evento no banco e processa flows em background (não bloqueia a resposta).
   * 
   * @param payload - Payload do webhook recebido
   * @returns Evento de webhook salvo
   * 
   * @example
   * ```typescript
   * const event = await webhookService.receiveWebhook({
   *   event: 'lead.converted',
   *   version: '1.0',
   *   occurredAt: new Date().toISOString(),
   *   data: { lead: { id: '123' } }
   * })
   * ```
   */
  async receiveWebhook(payload: WebhookPayload): Promise<WebhookEvent> {
    try {
      logger.info(`Recebendo webhook: ${payload.event}`)
      
      // Salva o evento (id será gerado pelo banco)
      const webhookEvent: Omit<WebhookEvent, 'id' | 'createdAt'> = {
        event: payload.event,
        version: payload.version,
        occurredAt: payload.occurredAt,
        data: payload.data,
        processed: false,
      }

      const savedEvent = await webhookRepository.create(webhookEvent as any)
      logger.info(`Webhook salvo: ${savedEvent.id}`)

      // Processa flows em background (não bloqueia a resposta)
      this.processWebhookFlows(savedEvent).catch((error) => {
        logger.error('Erro ao processar flows do webhook', error, {
          webhookEventId: savedEvent.id,
        })
      })

      return savedEvent
    } catch (error) {
      logger.error('Erro ao receber webhook', error, { event: payload.event })
      throw error
    }
  }

  /**
   * Processa flows ativos que escutam o evento do webhook
   * 
   * Executado em background após receber o webhook.
   * 
   * @param webhookEvent - Evento de webhook salvo
   */
  private async processWebhookFlows(webhookEvent: WebhookEvent): Promise<void> {
    try {
      logger.info(`Processando flows para evento: ${webhookEvent.event}`, {
        webhookEventId: webhookEvent.id,
      })

      // Busca flows ativos
      const flows = await flowRepository.findActive()
      
      // Filtra flows que têm trigger para este evento
      const relevantFlows = flows.filter((flow) => {
        const triggerNode = flow.nodes.find((node) => node.type === NODE_TYPES.TRIGGER)
        if (!triggerNode) return false
        const triggerData = triggerNode.data as { event: string }
        return triggerData.event === webhookEvent.event
      })

      logger.info(`Flows relevantes encontrados: ${relevantFlows.length}`, {
        webhookEventId: webhookEvent.id,
        event: webhookEvent.event,
      })

      // Executa cada flow
      for (const flow of relevantFlows) {
        await this.executeFlowForWebhook(flow, webhookEvent)
      }

      // Marca evento como processado
      await webhookRepository.markAsProcessed(webhookEvent.id)
      logger.info(`Webhook processado: ${webhookEvent.id}`)
    } catch (error) {
      logger.error('Erro ao processar flows do webhook', error, {
        webhookEventId: webhookEvent.id,
      })
      throw error
    }
  }

  /**
   * Executa um flow específico para um evento de webhook
   * 
   * @param flow - Flow a ser executado
   * @param webhookEvent - Evento de webhook
   */
  private async executeFlowForWebhook(
    flow: Flow,
    webhookEvent: WebhookEvent
  ): Promise<void> {
    let logId: string | null = null
    
    try {
      logger.info(`Executando flow: ${flow.name}`, {
        flowId: flow.id,
        webhookEventId: webhookEvent.id,
      })

      // Cria log de execução
      const log = await flowExecutionLogRepository.create({
        flowId: flow.id,
        webhookEventId: webhookEvent.id,
        status: EXECUTION_STATUS.RUNNING,
        executedNodes: [],
        startedAt: new Date().toISOString(),
      } as any)
      
      logId = log.id

      // Executa o flow
      const result = await flowEngine.executeFlow(flow, webhookEvent)

      // Atualiza log com resultado
      await flowExecutionLogRepository.update(logId, {
        status: result.success ? EXECUTION_STATUS.SUCCESS : EXECUTION_STATUS.ERROR,
        executedNodes: result.executedNodes,
        error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
        completedAt: new Date().toISOString(),
      } as any)

      logger.info(`Flow executado: ${flow.name}`, {
        flowId: flow.id,
        success: result.success,
        executedNodesCount: result.executedNodes.length,
        errorsCount: result.errors.length,
      })
    } catch (error) {
      logger.error(`Erro ao executar flow: ${flow.name}`, error, {
        flowId: flow.id,
        webhookEventId: webhookEvent.id,
      })

      // Atualiza log com erro (se o log foi criado)
      if (logId) {
        try {
          await flowExecutionLogRepository.update(logId, {
            status: EXECUTION_STATUS.ERROR,
            error: error instanceof Error ? error.message : String(error),
            completedAt: new Date().toISOString(),
          } as any)
        } catch (updateError) {
          logger.error('Erro ao atualizar log de execução', updateError, {
            logId,
            flowId: flow.id,
          })
        }
      }
    }
  }

  /**
   * Busca webhooks recentes
   * 
   * @param limit - Número máximo de webhooks a retornar (padrão: 50)
   * @param includeFlows - Se true, inclui informações sobre flows executados (padrão: true)
   * @returns Lista de webhooks ordenados por data (mais recentes primeiro)
   */
  async getRecentWebhooks(limit: number = 50, includeFlows: boolean = true): Promise<WebhookEvent[]> {
    try {
      const webhooks = await webhookRepository.findRecent(limit)
      
      if (includeFlows) {
        // Busca informações dos flows executados para cada webhook
        const webhooksWithFlows = await Promise.all(
          webhooks.map(async (webhook) => {
            const executedFlows = await this.getExecutedFlowsForWebhook(webhook.id)
            return {
              ...webhook,
              executedFlows,
            }
          })
        )
        return webhooksWithFlows
      }
      
      return webhooks
    } catch (error) {
      logger.error(`Erro ao buscar webhooks recentes (limit: ${limit})`, error)
      throw error
    }
  }

  /**
   * Busca informações sobre flows executados para um webhook
   * 
   * @param webhookEventId - ID do evento de webhook
   * @returns Lista de flows executados com seus status, ordenados por ordem de execução
   */
  private async getExecutedFlowsForWebhook(webhookEventId: string) {
    try {
      // Busca logs de execução para este webhook
      const logs = await flowExecutionLogRepository.findByWebhookEventId(webhookEventId)
      
      // Ordena por ordem de execução (startedAt)
      const sortedLogs = [...logs].sort((a, b) => 
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
      )
      
      // Busca informações dos flows
      const flowsInfo = await Promise.all(
        sortedLogs.map(async (log, index) => {
          const flow = await flowRepository.findById(log.flowId)
          
          // Calcula tempo de execução em milissegundos
          const executionTime = log.completedAt && log.startedAt
            ? new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()
            : null
          
          return {
            flowId: log.flowId,
            flowName: flow?.name || 'Flow não encontrado',
            status: log.status,
            executedNodesCount: log.executedNodes?.length || 0,
            executedNodes: log.executedNodes || [],
            error: log.error || undefined,
            startedAt: log.startedAt,
            completedAt: log.completedAt || undefined,
            executionTimeMs: executionTime,
            executionOrder: index + 1, // Ordem de execução (1, 2, 3...)
          }
        })
      )
      
      return flowsInfo
    } catch (error) {
      logger.error(`Erro ao buscar flows executados para webhook: ${webhookEventId}`, error)
      return []
    }
  }

  /**
   * Busca um webhook por ID
   * 
   * @param id - ID do webhook
   * @returns Webhook encontrado ou null se não existir
   */
  async getWebhookById(id: string): Promise<WebhookEvent | null> {
    try {
      return await webhookRepository.findById(id)
    } catch (error) {
      logger.error(`Erro ao buscar webhook: ${id}`, error)
      throw error
    }
  }
}

/**
 * Instância singleton do WebhookService
 */
export const webhookService = new WebhookService()
