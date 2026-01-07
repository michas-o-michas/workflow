/**
 * Flow Repository - Acesso a dados de flows
 * 
 * Repository singleton responsável por operações CRUD em flows e logs de execução.
 * Preserva campos JSONB (nodes e edges) sem conversão de case.
 * 
 * @module shared/api/repositories/flow.repository
 */

import { BaseRepository } from './base/base.repository'
import { supabase } from '@/shared/api/supabase'
import { convertToCamelCase, convertToSnakeCase } from '@/shared/lib/case-converter'
import type { Flow, FlowExecutionLog } from '@/entities/flow'
import { logger } from '@/shared/lib/logger'
import { NODE_TYPES } from '@/shared/lib/constants'

/**
 * Repository para flows
 */
class FlowRepository extends BaseRepository<Flow> {
  constructor() {
    super('flows')
  }

  /**
   * Busca flows ativos que escutam um evento específico
   * 
   * @param event - Nome do evento
   * @returns Lista de flows ativos com trigger para o evento
   */
  async findActiveByEvent(event: string): Promise<Flow[]> {
    try {
      // Busca flows ativos (Supabase não suporta busca profunda em JSONB facilmente)
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('active', true)

      if (error) {
        logger.error(`Erro ao buscar flows ativos por evento: ${event}`, error)
        throw error
      }
      
      // Converte e filtra flows que têm trigger para este evento
      const flows = (data || []).map(this.convertFlowFromDb) as Flow[]
      const relevantFlows = flows.filter((flow: Flow) => {
        const nodes = flow.nodes || []
        const triggerNode = nodes.find((node: any) => node.type === NODE_TYPES.TRIGGER)
        if (!triggerNode) return false
        const triggerData = triggerNode.data as { event: string }
        return triggerData.event === event
      })

      logger.debug(`Flows ativos encontrados para evento ${event}`, {
        total: flows.length,
        relevant: relevantFlows.length,
      })

      return relevantFlows
    } catch (error) {
      logger.error(`Erro em findActiveByEvent: ${event}`, error)
      throw error
    }
  }

  /**
   * Busca todos os flows ativos
   * 
   * @returns Lista de flows ativos ordenados por data de atualização
   */
  async findActive(): Promise<Flow[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('active', true)
        .order('updated_at', { ascending: false })

      if (error) {
        logger.error('Erro ao buscar flows ativos', error)
        throw error
      }

      return (data || []).map(this.convertFlowFromDb) as Flow[]
    } catch (error) {
      logger.error('Erro em findActive', error)
      throw error
    }
  }

  /**
   * Busca todos os flows
   * 
   * Preserva campos JSONB (nodes e edges) sem conversão de case.
   * 
   * @returns Lista de flows ordenados por data de criação
   */
  async findAll(): Promise<Flow[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('Erro ao buscar todos os flows', error)
        throw error
      }

      return ((data || []) as any[]).map(this.convertFlowFromDb) as Flow[]
    } catch (error) {
      logger.error('Erro em findAll', error)
      throw error
    }
  }

  /**
   * Busca um flow por ID
   * 
   * Preserva campos JSONB (nodes e edges) sem conversão de case.
   * 
   * @param id - ID do flow
   * @returns Flow encontrado ou null se não existir
   */
  async findById(id: string): Promise<Flow | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        // Código PGRST116 = registro não encontrado
        if (error.code === 'PGRST116') {
          return null
        }
        logger.error(`Erro ao buscar flow: ${id}`, error)
        throw error
      }
      
      return this.convertFlowFromDb(data) as Flow
    } catch (error) {
      logger.error(`Erro em findById: ${id}`, error)
      throw error
    }
  }

  /**
   * Converte um flow do banco de dados preservando campos JSONB
   * 
   * @param data - Dados do banco (snake_case)
   * @returns Flow convertido (camelCase, exceto nodes e edges)
   */
  private convertFlowFromDb(data: any): Flow {
    // Converte apenas os campos não-JSONB para camelCase
    const { nodes, edges, ...otherFields } = data
    const convertedOtherFields = convertToCamelCase(otherFields)
    
    // Preserva nodes e edges como estão (sem conversão)
    return {
      ...convertedOtherFields,
      nodes: nodes || [],
      edges: edges || [],
    } as Flow
  }

  /**
   * Atualiza um flow
   * 
   * Preserva campos JSONB (nodes e edges) sem conversão de case.
   * 
   * @param id - ID do flow
   * @param payload - Dados parciais do flow
   * @returns Flow atualizado
   */
  async update(id: string, payload: Partial<Flow>): Promise<Flow> {
    try {
      // Separa campos JSONB dos outros campos
      const { nodes, edges, ...otherFields } = payload
      
      // Converte apenas os campos não-JSONB para snake_case
      const snakeOtherFields = convertToSnakeCase(otherFields)
      
      // Prepara o payload final preservando nodes e edges como JSONB
      const finalPayload: any = { ...snakeOtherFields }
      if (nodes !== undefined) {
        finalPayload.nodes = nodes // Preserva como está (JSONB)
      }
      if (edges !== undefined) {
        finalPayload.edges = edges // Preserva como está (JSONB)
      }
      
      logger.debug(`Atualizando flow: ${id}`, {
        hasNodes: nodes !== undefined,
        hasEdges: edges !== undefined,
        nodesCount: nodes?.length || 0,
        edgesCount: edges?.length || 0,
      })
      
      const { data, error } = await supabase
        .from(this.tableName)
        .update(finalPayload)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        logger.error(`Erro ao atualizar flow: ${id}`, error)
        throw error
      }
      
      const result = this.convertFlowFromDb(data)
      logger.debug(`Flow atualizado: ${id}`, {
        nodesCount: result.nodes?.length || 0,
        edgesCount: result.edges?.length || 0,
      })
      
      return result
    } catch (error) {
      logger.error(`Erro em update: ${id}`, error, { payload })
      throw error
    }
  }

  /**
   * Cria um novo flow
   * 
   * Preserva campos JSONB (nodes e edges) sem conversão de case.
   * 
   * @param payload - Dados do flow
   * @returns Flow criado
   */
  async create(payload: Partial<Flow>): Promise<Flow> {
    try {
      // Separa campos JSONB dos outros campos
      const { nodes, edges, ...otherFields } = payload
      
      // Converte apenas os campos não-JSONB para snake_case
      const snakeOtherFields = convertToSnakeCase(otherFields)
      
      // Prepara o payload final preservando nodes e edges como JSONB
      const finalPayload: any = { ...snakeOtherFields }
      if (nodes !== undefined) {
        finalPayload.nodes = nodes // Preserva como está (JSONB)
      }
      if (edges !== undefined) {
        finalPayload.edges = edges // Preserva como está (JSONB)
      }
      
      logger.debug('Criando flow', {
        hasNodes: nodes !== undefined,
        hasEdges: edges !== undefined,
        nodesCount: nodes?.length || 0,
        edgesCount: edges?.length || 0,
      })
      
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(finalPayload)
        .select()
        .single()

      if (error) {
        logger.error('Erro ao criar flow', error)
        throw error
      }

      return this.convertFlowFromDb(data) as Flow
    } catch (error) {
      logger.error('Erro em create', error, { payload })
      throw error
    }
  }
}

/**
 * Repository para logs de execução de flows
 */
class FlowExecutionLogRepository extends BaseRepository<FlowExecutionLog> {
  constructor() {
    super('flow_execution_logs')
  }

  /**
   * Busca logs de execução por flow
   * 
   * @param flowId - ID do flow
   * @returns Lista de logs ordenados por data (mais recentes primeiro)
   */
  async findByFlowId(flowId: string): Promise<FlowExecutionLog[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('flow_id', flowId)
        .order('started_at', { ascending: false })
        .limit(50)

      if (error) {
        logger.error(`Erro ao buscar logs do flow: ${flowId}`, error)
        throw error
      }

      return (data || []).map(convertToCamelCase) as FlowExecutionLog[]
    } catch (error) {
      logger.error(`Erro em findByFlowId: ${flowId}`, error)
      throw error
    }
  }

  /**
   * Busca logs de execução por evento de webhook
   * 
   * @param webhookEventId - ID do evento de webhook
   * @returns Lista de logs ordenados por data
   */
  async findByWebhookEventId(webhookEventId: string): Promise<FlowExecutionLog[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('webhook_event_id', webhookEventId)
        .order('started_at', { ascending: false })

      if (error) {
        logger.error(`Erro ao buscar logs do webhook: ${webhookEventId}`, error)
        throw error
      }

      return (data || []).map(convertToCamelCase) as FlowExecutionLog[]
    } catch (error) {
      logger.error(`Erro em findByWebhookEventId: ${webhookEventId}`, error)
      throw error
    }
  }
}

/**
 * Instâncias singleton dos repositories
 */
export const flowRepository = new FlowRepository()
export const flowExecutionLogRepository = new FlowExecutionLogRepository()
