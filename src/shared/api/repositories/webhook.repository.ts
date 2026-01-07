/**
 * Webhook Repository - Acesso a dados de webhooks
 * 
 * Repository singleton responsável por operações CRUD em eventos de webhook.
 * 
 * @module shared/api/repositories/webhook.repository
 */

import { BaseRepository } from './base/base.repository'
import { supabase } from '@/shared/api/supabase'
import { convertToCamelCase } from '@/shared/lib/case-converter'
import type { WebhookEvent } from '@/entities/webhook'
import { logger } from '@/shared/lib/logger'

/**
 * Repository para eventos de webhook
 */
class WebhookRepository extends BaseRepository<WebhookEvent> {
  constructor() {
    super('webhook_events')
  }

  /**
   * Busca webhooks por evento
   * 
   * @param event - Nome do evento
   * @returns Lista de webhooks não processados para o evento
   */
  async findByEvent(event: string): Promise<WebhookEvent[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('event', event)
        .eq('processed', false)
        .order('created_at', { ascending: false })

      if (error) {
        logger.error(`Erro ao buscar webhooks por evento: ${event}`, error)
        throw error
      }

      return (data || []).map(convertToCamelCase) as WebhookEvent[]
    } catch (error) {
      logger.error(`Erro em findByEvent: ${event}`, error)
      throw error
    }
  }

  /**
   * Marca um webhook como processado
   * 
   * @param id - ID do webhook
   */
  async markAsProcessed(id: string): Promise<void> {
    try {
      logger.debug(`Marcando webhook como processado: ${id}`)
      
      const { error } = await supabase
        .from(this.tableName)
        .update({ processed: true })
        .eq('id', id)

      if (error) {
        logger.error(`Erro ao marcar webhook como processado: ${id}`, error)
        throw error
      }

      logger.debug(`Webhook marcado como processado: ${id}`)
    } catch (error) {
      logger.error(`Erro em markAsProcessed: ${id}`, error)
      throw error
    }
  }

  /**
   * Busca webhooks recentes
   * 
   * @param limit - Número máximo de webhooks a retornar (padrão: 50)
   * @returns Lista de webhooks ordenados por data (mais recentes primeiro)
   */
  async findRecent(limit: number = 50): Promise<WebhookEvent[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        logger.error(`Erro ao buscar webhooks recentes (limit: ${limit})`, error)
        throw error
      }

      return (data || []).map(convertToCamelCase) as WebhookEvent[]
    } catch (error) {
      logger.error(`Erro em findRecent (limit: ${limit})`, error)
      throw error
    }
  }
}

/**
 * Instância singleton do WebhookRepository
 */
export const webhookRepository = new WebhookRepository()
