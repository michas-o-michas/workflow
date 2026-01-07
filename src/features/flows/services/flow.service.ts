/**
 * Flow Service - Lógica de negócio para flows
 * 
 * Service singleton responsável por gerenciar flows (CRUD) e logs de execução.
 * Consome repositories para acesso aos dados.
 * 
 * @module features/flows/services/flow.service
 */

import { flowRepository, flowExecutionLogRepository } from '@/shared/api/repositories'
import type { Flow, FlowExecutionLog } from '@/entities/flow'
import { FlowNotFoundError } from '@/shared/lib/errors'
import { logger } from '@/shared/lib/logger'
import { CONDITION_HANDLES, NODE_TYPES } from '@/shared/lib/constants'

/**
 * Service para gerenciamento de flows
 */
class FlowService {
  /**
   * Busca todos os flows
   * 
   * @returns Lista de flows ordenados por data de criação (mais recentes primeiro)
   */
  async findAll(): Promise<Flow[]> {
    try {
      return await flowRepository.findAll()
    } catch (error) {
      logger.error('Erro ao buscar flows', error)
      throw error
    }
  }

  /**
   * Busca um flow por ID
   * 
   * @param id - ID do flow
   * @returns Flow encontrado ou null se não existir
   */
  async findById(id: string): Promise<Flow | null> {
    try {
      return await flowRepository.findById(id)
    } catch (error) {
      logger.error(`Erro ao buscar flow ${id}`, error)
      throw error
    }
  }

  /**
   * Cria um novo flow
   * 
   * @param flow - Dados do flow (sem id, createdAt e updatedAt - gerados pelo banco)
   * @returns Flow criado
   */
  async create(flow: Omit<Flow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Flow> {
    try {
      logger.info(`Criando flow: ${flow.name}`)
      const created = await flowRepository.create(flow as any)
      logger.info(`Flow criado com sucesso: ${created.id}`)
      return created
    } catch (error) {
      logger.error(`Erro ao criar flow: ${flow.name}`, error)
      throw error
    }
  }

  /**
   * Atualiza um flow existente
   * 
   * @param id - ID do flow
   * @param flow - Dados parciais do flow para atualizar
   * @returns Flow atualizado
   * @throws {FlowNotFoundError} Se o flow não for encontrado
   */
  async update(id: string, flow: Partial<Flow>): Promise<Flow> {
    try {
      logger.info(`Atualizando flow: ${id}`)
      const updated = await flowRepository.update(id, {
        ...flow,
        updatedAt: new Date().toISOString(),
      } as any)
      logger.info(`Flow atualizado com sucesso: ${id}`)
      return updated
    } catch (error) {
      logger.error(`Erro ao atualizar flow: ${id}`, error)
      throw error
    }
  }

  /**
   * Deleta um flow
   * 
   * @param id - ID do flow
   * @throws {FlowNotFoundError} Se o flow não for encontrado
   */
  async delete(id: string): Promise<void> {
    try {
      logger.info(`Deletando flow: ${id}`)
      await flowRepository.delete(id)
      logger.info(`Flow deletado com sucesso: ${id}`)
    } catch (error) {
      logger.error(`Erro ao deletar flow: ${id}`, error)
      throw error
    }
  }

  /**
   * Alterna o status ativo/inativo de um flow
   * 
   * @param id - ID do flow
   * @returns Flow atualizado
   * @throws {FlowNotFoundError} Se o flow não for encontrado
   */
  async toggleActive(id: string): Promise<Flow> {
    const flow = await this.findById(id)
    if (!flow) {
      throw new FlowNotFoundError(id)
    }
    
    const newActiveStatus = !flow.active
    logger.info(`Alternando status do flow ${id}: ${flow.active} → ${newActiveStatus}`)
    
    return this.update(id, { active: newActiveStatus })
  }

  /**
   * Busca logs de execução de um flow
   * 
   * @param flowId - ID do flow
   * @returns Lista de logs de execução
   */
  async getExecutionLogs(flowId: string): Promise<FlowExecutionLog[]> {
    try {
      return await flowExecutionLogRepository.findByFlowId(flowId)
    } catch (error) {
      logger.error(`Erro ao buscar logs do flow: ${flowId}`, error)
      throw error
    }
  }

  /**
   * Busca logs de execução por evento de webhook
   * 
   * @param webhookEventId - ID do evento de webhook
   * @returns Lista de logs de execução
   */
  async getExecutionLogsByWebhook(webhookEventId: string): Promise<FlowExecutionLog[]> {
    try {
      return await flowExecutionLogRepository.findByWebhookEventId(webhookEventId)
    } catch (error) {
      logger.error(`Erro ao buscar logs do webhook: ${webhookEventId}`, error)
      throw error
    }
  }

  /**
   * Valida e corrige edges de condition nodes que não têm sourceHandle
   * 
   * Útil para migrar flows antigos que podem ter edges sem sourceHandle definido.
   * 
   * @param flowId - ID do flow
   * @returns Flow atualizado (se houver correções) ou flow original
   * @throws {FlowNotFoundError} Se o flow não for encontrado
   */
  async validateAndFixEdges(flowId: string): Promise<Flow> {
    const flow = await this.findById(flowId)
    if (!flow) {
      throw new FlowNotFoundError(flowId)
    }

    let needsUpdate = false
    const fixedEdges = flow.edges.map((edge) => {
      const sourceNode = flow.nodes.find((n) => n.id === edge.source)
      
      // Se o nó de origem é uma condição e não tem sourceHandle, tenta corrigir
      if (sourceNode?.type === NODE_TYPES.CONDITION && !edge.sourceHandle) {
        needsUpdate = true
        // Tenta inferir baseado em outras edges do mesmo nó
        const otherEdges = flow.edges.filter(
          (e) => e.source === edge.source && e.id !== edge.id
        )
        const hasYes = otherEdges.some((e) => e.sourceHandle === CONDITION_HANDLES.YES)
        
        // Se já existe uma edge 'yes', esta deve ser 'no', senão assume 'yes'
        edge.sourceHandle = hasYes ? CONDITION_HANDLES.NO : CONDITION_HANDLES.YES
        logger.info(`Edge ${edge.id} corrigida`, { 
          flowId, 
          sourceHandle: edge.sourceHandle 
        })
      }
      
      return edge
    })

    if (needsUpdate) {
      logger.info(`Corrigindo edges do flow: ${flowId}`)
      return this.update(flowId, { edges: fixedEdges })
    }

    return flow
  }
}

/**
 * Instância singleton do FlowService
 */
export const flowService = new FlowService()
