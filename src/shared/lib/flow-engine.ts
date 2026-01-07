/**
 * Flow Engine - Motor de execução de flows
 * 
 * Responsável por executar flows de automação baseados em eventos de webhook.
 * Percorre o grafo de nós (trigger → condition → action → end) e executa
 * as ações conforme as condições avaliadas.
 * 
 * @module shared/lib/flow-engine
 */

import type {
  Flow,
  FlowNodeData,
  TriggerNodeData,
  ConditionNodeData,
  ActionNodeData,
} from '@/entities/flow'
import type { WebhookEvent } from '@/entities/webhook'
import { logger } from './logger'
import {
  CONDITION_HANDLES,
  NODE_TYPES,
  ACTION_TYPES,
  CONDITION_OPERATORS,
  HTTP_METHODS,
  DATA_PREFIX,
  VARIABLE_PATTERN,
  HTTP_TIMEOUT,
  MAX_FLOW_DEPTH,
  EXECUTION_STATUS,
} from './constants'
import { flowRepository, flowExecutionLogRepository } from '@/shared/api/repositories'
import { FlowExecutionError, ValidationError } from './errors'

/**
 * Contexto de execução de um flow
 */
interface ExecutionContext {
  /** Dados do webhook que disparou a execução */
  webhookData: WebhookEvent
  /** Set de IDs de nós já executados (para evitar loops) */
  executedNodes: Set<string>
  /** Lista de erros encontrados durante a execução */
  errors: string[]
  /** Stack de IDs de flows na cadeia de chamadas (para detectar loops) */
  flowCallStack: string[]
  /** Profundidade atual da cadeia de chamadas */
  depth: number
}

/**
 * Resultado da execução de um flow
 */
export interface FlowExecutionResult {
  /** Indica se a execução foi bem-sucedida */
  success: boolean
  /** IDs dos nós executados */
  executedNodes: string[]
  /** Lista de erros encontrados */
  errors: string[]
}

/**
 * Classe responsável por executar flows de automação
 */
export class FlowEngine {
  /**
   * Executa um flow com base em um evento de webhook
   * 
   * @param flow - Flow a ser executado
   * @param webhookEvent - Evento de webhook que disparou a execução
   * @param parentContext - Contexto do flow pai (opcional, para chamadas aninhadas)
   * @returns Resultado da execução com nós executados e erros
   * 
   * @example
   * ```typescript
   * const result = await flowEngine.executeFlow(flow, webhookEvent)
   * if (result.success) {
   *   console.log(`Flow executado: ${result.executedNodes.length} nós`)
   * }
   * ```
   */
  async executeFlow(
    flow: Flow, 
    webhookEvent: WebhookEvent,
    parentContext?: ExecutionContext
  ): Promise<FlowExecutionResult> {
    // Inicializa contexto (novo ou baseado no pai)
    const context: ExecutionContext = parentContext
      ? {
          webhookData: webhookEvent,
          executedNodes: new Set(),
          errors: [],
          flowCallStack: [...parentContext.flowCallStack, flow.id],
          depth: parentContext.depth + 1,
        }
      : {
          webhookData: webhookEvent,
          executedNodes: new Set(),
          errors: [],
          flowCallStack: [flow.id],
          depth: 0,
        }
    
    // Verifica limite de profundidade
    if (context.depth >= MAX_FLOW_DEPTH) {
      const errorMsg = `Limite de profundidade de chamadas atingido (${MAX_FLOW_DEPTH}). Stack: ${context.flowCallStack.join(' → ')}`
      context.errors.push(errorMsg)
      logger.error(errorMsg, undefined, { flowId: flow.id, depth: context.depth, stack: context.flowCallStack })
      return this.formatResult(context)
    }
    
    // Verifica loops (mesmo flow chamado duas vezes na cadeia)
    const flowCallCount = context.flowCallStack.filter(id => id === flow.id).length
    if (flowCallCount > 1) {
      const errorMsg = `Loop detectado: Flow ${flow.id} já foi chamado nesta cadeia. Stack: ${context.flowCallStack.join(' → ')}`
      context.errors.push(errorMsg)
      logger.error(errorMsg, undefined, { flowId: flow.id, stack: context.flowCallStack })
      return this.formatResult(context)
    }
    
    const depthIndicator = context.depth > 0 ? `[CHAMADO POR OUTRO FLOW - Profundidade: ${context.depth}]` : ''
    logger.flow(`\n${'='.repeat(60)}`, {})
    logger.flow(`🚀 INICIANDO FLOW: "${flow.name}" ${depthIndicator}`, {
      flowId: flow.id,
      flowName: flow.name,
      evento: webhookEvent.event,
      totalNos: flow.nodes.length,
      totalEdges: flow.edges.length,
      profundidade: context.depth,
      callStack: context.flowCallStack,
    })
    logger.flow(`${'='.repeat(60)}\n`, {})
    
    logger.debug('Payload do webhook', { data: webhookEvent.data })
    
    // Valida estrutura do flow antes de executar
    const validationErrors = this.validateFlow(flow)
    if (validationErrors.length > 0) {
      context.errors.push(...validationErrors)
      logger.error('Erros de validação do flow', undefined, { errors: validationErrors })
      return this.formatResult(context)
    }

    // Encontra o nó trigger
    const triggerNode = flow.nodes.find((node) => node.type === NODE_TYPES.TRIGGER)
    if (!triggerNode) {
      const errorMsg = 'Flow deve começar com um nó Trigger'
      context.errors.push(errorMsg)
      logger.error(errorMsg)
      return this.formatResult(context)
    }

    // Verifica se o evento corresponde ao trigger
    // IMPORTANTE: Quando um flow é chamado por outro flow (depth > 0), 
    // não validamos o evento do trigger, pois o flow está sendo executado programaticamente
    const triggerData = triggerNode.data as TriggerNodeData
    if (context.depth === 0 && triggerData.event !== webhookEvent.event) {
      // Apenas valida o evento quando o flow é executado diretamente por um webhook (depth === 0)
      const errorMsg = `Evento não corresponde: esperado "${triggerData.event}", recebido "${webhookEvent.event}"`
      context.errors.push(errorMsg)
      logger.warn(errorMsg)
      return this.formatResult(context)
    } else if (context.depth > 0 && triggerData.event !== webhookEvent.event) {
      // Quando chamado por outro flow, apenas loga (não bloqueia execução)
      logger.debug(`Flow chamado programaticamente: evento do trigger (${triggerData.event}) difere do evento recebido (${webhookEvent.event}). Executando mesmo assim.`, {
        flowId: flow.id,
        triggerEvent: triggerData.event,
        receivedEvent: webhookEvent.event,
        depth: context.depth
      })
    }

    logger.flow(`🎯 TRIGGER: Evento "${triggerData.event}" detectado`, {
      triggerId: triggerNode.id,
      evento: triggerData.event,
    })

    // Executa o flow a partir do trigger
    try {
      await this.executeNode(triggerNode.id, flow, context)
    } catch (error) {
      const errorMsg = `Erro fatal ao executar flow: ${error instanceof Error ? error.message : String(error)}`
      context.errors.push(errorMsg)
      logger.error(errorMsg, error, { flowId: flow.id })
    }

    const statusEmoji = context.errors.length > 0 ? '❌' : '✅'
    logger.flow(`\n${'='.repeat(60)}`, {})
    logger.flow(`${statusEmoji} FLOW FINALIZADO: "${flow.name}"`, {
      flowId: flow.id,
      flowName: flow.name,
      nosExecutados: context.executedNodes.size,
      totalErros: context.errors.length,
      status: context.errors.length > 0 ? 'COM ERROS' : 'SUCESSO',
      erros: context.errors.length > 0 ? context.errors : undefined,
    })
    logger.flow(`${'='.repeat(60)}\n`, {})

    return this.formatResult(context)
  }

  /**
   * Valida a estrutura do flow antes da execução
   * 
   * @param flow - Flow a ser validado
   * @returns Lista de erros de validação encontrados
   */
  private validateFlow(flow: Flow): string[] {
    const errors: string[] = []

    // Valida que há pelo menos um nó
    if (!flow.nodes || flow.nodes.length === 0) {
      errors.push('Flow não possui nós')
      return errors
    }

    // Valida que há um trigger
    const triggerNodes = flow.nodes.filter((n) => n.type === NODE_TYPES.TRIGGER)
    if (triggerNodes.length === 0) {
      errors.push('Flow deve ter pelo menos um nó Trigger')
    } else if (triggerNodes.length > 1) {
      errors.push('Flow não deve ter mais de um nó Trigger')
    }

    // Valida edges de condition nodes
    const conditionNodes = flow.nodes.filter((n) => n.type === NODE_TYPES.CONDITION)
    for (const conditionNode of conditionNodes) {
      const conditionEdges = flow.edges.filter((e) => e.source === conditionNode.id)
      
      // Verifica se há edges com sourceHandle 'yes' e 'no'
      const hasYesEdge = conditionEdges.some((e) => e.sourceHandle === CONDITION_HANDLES.YES)
      const hasNoEdge = conditionEdges.some((e) => e.sourceHandle === CONDITION_HANDLES.NO)
      
      // Validação removida: não é obrigatório ter ambas as conexões (yes/no)
      // Se não houver conexão para o caminho avaliado, o flow simplesmente encerra naquele ponto
      
      // Verifica se há edges sem sourceHandle
      const edgesWithoutHandle = conditionEdges.filter((e) => !e.sourceHandle)
      if (edgesWithoutHandle.length > 0) {
        errors.push(
          `Condition node ${conditionNode.id} tem ${edgesWithoutHandle.length} edge(s) sem sourceHandle. ` +
          `Todas as edges de condition nodes devem ter sourceHandle 'yes' ou 'no'`
        )
      }
    }

    return errors
  }

  /**
   * Executa um nó específico do flow
   * 
   * @param nodeId - ID do nó a ser executado
   * @param flow - Flow completo
   * @param context - Contexto de execução
   */
  private async executeNode(
    nodeId: string,
    flow: Flow,
    context: ExecutionContext
  ): Promise<void> {
    // Evita loops infinitos
    if (context.executedNodes.has(nodeId)) {
      logger.debug(`Nó ${nodeId} já foi executado, pulando...`)
      return
    }

    const node = flow.nodes.find((n) => n.id === nodeId)
    if (!node) {
      const errorMsg = `Nó ${nodeId} não encontrado no flow`
      context.errors.push(errorMsg)
      logger.error(errorMsg)
      return
    }

    logger.debug(`Executando nó: ${nodeId}`, { type: node.type })

    // Marca como executado ANTES de executar para evitar loops
    context.executedNodes.add(nodeId)

    try {
      switch (node.type) {
        case NODE_TYPES.TRIGGER:
          await this.executeTrigger(node, flow, context)
          break
        case NODE_TYPES.CONDITION:
          await this.executeCondition(node, flow, context)
          break
        case NODE_TYPES.ACTION:
          await this.executeAction(node, flow, context)
          break
        case NODE_TYPES.END:
          logger.flow(`🏁 NÓ END alcançado - Finalizando execução deste caminho`, {
            nodeId,
          })
          break
        default: {
          const errorMsg = `Tipo de nó desconhecido: ${node.type} no nó ${nodeId}`
          context.errors.push(errorMsg)
          logger.error(errorMsg)
        }
      }
    } catch (error) {
      const errorMsg = `Erro ao executar nó ${nodeId}: ${error instanceof Error ? error.message : String(error)}`
      context.errors.push(errorMsg)
      logger.error(errorMsg, error, { nodeId, nodeType: node.type })
      
      // Para condition nodes, não continua se houve erro (já que não sabemos qual caminho seguir)
      if (node.type === NODE_TYPES.CONDITION) {
        logger.error('Erro em condition node - parando execução deste caminho', error)
        return
      }
      
      // Para outros tipos, tentamos continuar se possível
      if (node.type !== NODE_TYPES.ACTION && node.type !== NODE_TYPES.CONDITION) {
        const nextNodes = this.getNextNodes(nodeId, flow)
        for (const nextNodeId of nextNodes) {
          await this.executeNode(nextNodeId, flow, context)
        }
      }
    }
  }

  /**
   * Executa um nó do tipo Trigger
   * 
   * @param node - Nó trigger
   * @param flow - Flow completo
   * @param context - Contexto de execução
   */
  private async executeTrigger(
    node: { id: string; data: FlowNodeData },
    flow: Flow,
    context: ExecutionContext
  ): Promise<void> {
    // Trigger sempre executa, então segue para os próximos nós
    const nextNodes = this.getNextNodes(node.id, flow)
    
    if (nextNodes.length === 0) {
      return
    }

    // Executa os próximos nós sequencialmente (não em paralelo)
    for (const nextNodeId of nextNodes) {
      await this.executeNode(nextNodeId, flow, context)
    }
  }

  /**
   * Executa um nó do tipo Condition
   * 
   * Avalia a condição e segue pelo caminho YES ou NO baseado no resultado.
   * 
   * @param node - Nó condition
   * @param flow - Flow completo
   * @param context - Contexto de execução
   */
  private async executeCondition(
    node: { id: string; data: FlowNodeData },
    flow: Flow,
    context: ExecutionContext
  ): Promise<void> {
    const conditionData = node.data as ConditionNodeData
    
    // Valida se o campo foi configurado
    if (!conditionData.field || conditionData.field.trim() === '') {
      const errorMsg = `Nó de condição ${node.id}: Campo do payload não configurado. Configure o campo no editor do nó.`
      context.errors.push(errorMsg)
      logger.error(errorMsg)
      return
    }
    
    // Avalia a condição
    const conditionMet = this.evaluateCondition(conditionData, context.webhookData.data)

    // Encontra todas as edges saindo deste nó
    const edges = flow.edges.filter((edge) => edge.source === node.id)

    // Busca TODAS as edges com sourceHandle EXATO baseado no resultado da condição
    const expectedHandle = conditionMet ? CONDITION_HANDLES.YES : CONDITION_HANDLES.NO
    const pathName = conditionMet ? 'YES ✅' : 'NO ❌'
    const targetEdges = edges.filter((edge) => edge.sourceHandle === expectedHandle)

    // Log principal da condição - sempre visível
    const operatorSymbol = {
      EQUALS: '==',
      NOT_EQUALS: '!=',
      CONTAINS: 'contém',
      GREATER_THAN: '>',
      LESS_THAN: '<',
    }[conditionData.operator] || conditionData.operator

    logger.condition(
      `🔀 CONDIÇÃO: "${conditionData.field}" ${operatorSymbol} "${conditionData.value}" → ${pathName}`,
      {
        campo: conditionData.field,
        operador: conditionData.operator,
        valorEsperado: conditionData.value,
        resultado: conditionMet ? 'TRUE' : 'FALSE',
        caminhoEscolhido: pathName,
        proximosNos: targetEdges.length,
      }
    )

    // Se não encontrou nenhuma edge correta, encerra o flow neste ponto (sem erro)
    if (targetEdges.length === 0) {
      logger.flow(`⚠️  Condição ${pathName}, mas não há conexão para este caminho. Flow encerrado.`, {
        nodeId: node.id,
        caminho: pathName,
        edgesDisponiveis: edges.map(e => e.sourceHandle || 'undefined'),
      })
      return
    }

    // Log dos próximos nós que serão executados
    const nextNodes = targetEdges.map(edge => {
      const targetNode = flow.nodes.find(n => n.id === edge.target)
      return {
        nodeId: edge.target,
        tipo: targetNode?.type || 'desconhecido',
      }
    })

    logger.condition(
      `  → Seguindo pelo caminho ${pathName}: ${targetEdges.length} nó(s) será(ão) executado(s)`,
      {
        caminho: pathName,
        quantidade: targetEdges.length,
        proximosNos: nextNodes,
      }
    )

    // Executa TODOS os nós conectados ao caminho correto (em paralelo)
    const executionPromises = targetEdges.map(async (targetEdge) => {
      const targetNode = flow.nodes.find(n => n.id === targetEdge.target)
      if (targetNode && targetNode.type) {
        const nodeTypeLabel: Record<string, string> = {
          action: '⚙️  ACTION',
          condition: '🔀 CONDITION',
          end: '🏁 END',
          trigger: '🚀 TRIGGER',
        }
        const label = nodeTypeLabel[targetNode.type] || targetNode.type.toUpperCase()

        logger.condition(`  → Executando ${label}: ${targetNode.type}`, {
          nodeId: targetEdge.target,
          tipo: targetNode.type,
        })
        await this.executeNode(targetEdge.target, flow, context)
      } else {
        const errorMsg = `Nó de condição ${node.id}: Nó de destino ${targetEdge.target} não encontrado no flow`
        context.errors.push(errorMsg)
        logger.error(errorMsg)
      }
    })

    // Aguarda todas as execuções em paralelo
    await Promise.all(executionPromises)
  }

  /**
   * Executa um nó do tipo Action
   * 
   * @param node - Nó action
   * @param flow - Flow completo
   * @param context - Contexto de execução
   */
  private async executeAction(
    node: { id: string; data: FlowNodeData },
    flow: Flow,
    context: ExecutionContext
  ): Promise<void> {
    const actionData = node.data as ActionNodeData
    
    // Valida se actionData existe e tem a estrutura correta
    if (!actionData || !actionData.type) {
      const errorMsg = `Nó de ação ${node.id}: Dados da ação inválidos ou não configurados`
      context.errors.push(errorMsg)
      
      // Mesmo com erro, tenta continuar o fluxo
      const nextNodes = this.getNextNodes(node.id, flow)
      for (const nextNode of nextNodes) {
        await this.executeNode(nextNode, flow, context)
      }
      return
    }

    try {
      switch (actionData.type) {
        case ACTION_TYPES.LOG:
          await this.executeLogAction(actionData, node.id)
          break

        case ACTION_TYPES.HTTP_REQUEST:
          await this.executeHttpRequestAction(actionData, node.id, context)
          break

        case ACTION_TYPES.SEND_EMAIL:
          await this.executeEmailAction(actionData, node.id)
          break

        case ACTION_TYPES.CALL_FLOW:
          await this.executeCallFlowAction(actionData, node.id, context)
          break

        default: {
          const errorMsg = `Nó de ação ${node.id}: Tipo de ação desconhecido: ${actionData.type}`
          context.errors.push(errorMsg)
          logger.error(errorMsg)
        }
      }
    } catch (error) {
      const errorMsg = `Erro inesperado ao executar ação ${node.id}: ${error instanceof Error ? error.message : String(error)}`
      context.errors.push(errorMsg)
      logger.error(errorMsg, error, { nodeId: node.id, actionType: actionData.type })
    }

    // SEMPRE continua para os próximos nós, mesmo se houve erro
    const nextNodes = this.getNextNodes(node.id, flow)
    for (const nextNodeId of nextNodes) {
      await this.executeNode(nextNodeId, flow, context)
    }
  }

  /**
   * Executa uma ação do tipo LOG
   */
  private async executeLogAction(actionData: ActionNodeData, nodeId: string): Promise<void> {
    const config = actionData.config as { message?: string }
    const message = config?.message || 'Log action executed'
    logger.action(`📝 LOG: ${message}`, { nodeId })
  }

  /**
   * Executa uma ação do tipo HTTP_REQUEST
   */
  private async executeHttpRequestAction(
    actionData: ActionNodeData,
    nodeId: string,
    context: ExecutionContext
  ): Promise<void> {
    const config = actionData.config as {
      url?: string
      method?: string
      headers?: Record<string, string>
      body?: Record<string, unknown>
    }

    if (!config?.url) {
      const errorMsg = `Nó de ação ${nodeId}: URL não configurada para HTTP_REQUEST`
      throw new ValidationError(errorMsg, 'url')
    }

    const method = (config.method as 'GET' | 'POST' | 'PUT' | 'DELETE') || HTTP_METHODS.POST
    const headers = {
      'Content-Type': 'application/json',
      ...(config.headers || {}),
    }
    
    // Substitui variáveis no body se necessário
    let body: string | undefined
    if (config.body) {
      body = this.interpolateVariables(
        JSON.stringify(config.body),
        context.webhookData.data
      )
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), HTTP_TIMEOUT)

      const response = await fetch(config.url, {
        method,
        headers,
        body,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Erro desconhecido')
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      logger.action(`🌐 HTTP ${method} → ${config.url} [Status: ${response.status}]`, {
        nodeId,
        method,
        url: config.url,
        status: response.status,
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Timeout ao executar HTTP_REQUEST (${HTTP_TIMEOUT}ms)`)
      }
      throw error
    }
  }

  /**
   * Executa uma ação do tipo SEND_EMAIL
   */
  private async executeEmailAction(actionData: ActionNodeData, nodeId: string): Promise<void> {
    const config = actionData.config as { email?: string }
    const email = config?.email
    
    if (!email) {
      const errorMsg = `Nó de ação ${nodeId}: Email não configurado para SEND_EMAIL`
      throw new ValidationError(errorMsg, 'email')
    }

    logger.action(`📧 EMAIL enviado para: ${email}`, { nodeId, email })
    // TODO: Implementar envio real de email
  }

  /**
   * Executa uma ação do tipo CALL_FLOW
   * 
   * Chama outro flow como parte da execução atual, com proteções contra loops.
   * 
   * @param actionData - Dados da ação
   * @param nodeId - ID do nó que está executando a ação
   * @param context - Contexto de execução atual
   */
  private async executeCallFlowAction(
    actionData: ActionNodeData,
    nodeId: string,
    context: ExecutionContext
  ): Promise<void> {
    const config = actionData.config as { flowId?: string; data?: Record<string, unknown> }
    
    if (!config?.flowId) {
      const errorMsg = `Nó de ação ${nodeId}: FlowId não configurado para CALL_FLOW`
      throw new ValidationError(errorMsg, 'flowId')
    }

    try {
      logger.action(`🔗 CHAMANDO FLOW: ${config.flowId}`, {
        nodeId,
        flowId: config.flowId,
        profundidade: context.depth,
        callStack: context.flowCallStack,
      })

      // Busca o flow a ser chamado
      const targetFlow = await flowRepository.findById(config.flowId)
      
      if (!targetFlow) {
        const errorMsg = `Nó de ação ${nodeId}: Flow ${config.flowId} não encontrado`
        throw new ValidationError(errorMsg, 'flowId')
      }

      if (!targetFlow.active) {
        const errorMsg = `Nó de ação ${nodeId}: Flow ${config.flowId} está inativo`
        logger.warn(errorMsg, { flowId: config.flowId })
        return // Não é erro crítico, apenas não executa
      }

      // Cria um novo webhook event com dados mesclados (dados originais + dados adicionais)
      const mergedData = {
        ...context.webhookData.data,
        ...(config.data || {}),
      }

      // O flow chamado precisa ter um trigger que corresponda ao evento original
      // OU podemos criar um evento sintético baseado no flowId
      const syntheticWebhookEvent: WebhookEvent = {
        ...context.webhookData,
        data: mergedData,
        // Mantém o evento original para que o flow chamado possa usar os dados
        // O flow chamado deve ter um trigger que aceite qualquer evento ou um evento específico
      }

      // Cria log de execução para o flow chamado (vinculado ao mesmo webhook)
      let callFlowLogId: string | null = null
      try {
        logger.debug(`Criando log de execução para flow chamado: ${targetFlow.name} (${targetFlow.id})`, {
          webhookEventId: context.webhookData.id,
          flowId: targetFlow.id,
        })
        
        const callFlowLog = await flowExecutionLogRepository.create({
          flowId: targetFlow.id,
          webhookEventId: context.webhookData.id, // Usa o mesmo webhook do flow pai
          status: EXECUTION_STATUS.RUNNING,
          executedNodes: [],
          startedAt: new Date().toISOString(),
        } as any)
        
        callFlowLogId = callFlowLog.id
        logger.debug(`Log de execução criado para flow chamado: ${callFlowLogId}`, {
          flowId: targetFlow.id,
          flowName: targetFlow.name,
          webhookEventId: context.webhookData.id,
        })
      } catch (logError) {
        // Se falhar ao criar log, apenas loga o erro mas continua a execução
        logger.error(`Erro ao criar log de execução para flow chamado: ${config.flowId}`, logError, {
          flowId: targetFlow.id,
          flowName: targetFlow.name,
          webhookEventId: context.webhookData.id,
        })
      }

      // Executa o flow chamado (passa o contexto atual para rastrear profundidade)
      const result = await this.executeFlow(targetFlow, syntheticWebhookEvent, context)

      // Atualiza log de execução com resultado
      if (callFlowLogId) {
        try {
          await flowExecutionLogRepository.update(callFlowLogId, {
            status: result.success ? EXECUTION_STATUS.SUCCESS : EXECUTION_STATUS.ERROR,
            executedNodes: result.executedNodes,
            error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
            completedAt: new Date().toISOString(),
          } as any)
        } catch (updateError) {
          logger.warn(`Erro ao atualizar log de execução do flow chamado: ${config.flowId}`, {
            error: updateError instanceof Error ? updateError.message : String(updateError),
          })
        }
      }

      if (!result.success) {
        logger.warn(`Flow chamado ${config.flowId} executado com erros`, {
          nodeId,
          errors: result.errors,
        })
        // Não propaga erros do flow filho para o pai (para não quebrar o flow principal)
        // Mas loga para debug
      } else {
        logger.action(`Flow chamado ${config.flowId} executado com sucesso`, {
          nodeId,
          executedNodes: result.executedNodes.length,
        })
      }
    } catch (error) {
      // Erros de validação ou busca são críticos
      if (error instanceof ValidationError) {
        throw error
      }
      
      const errorMsg = `Erro ao chamar flow ${config.flowId}: ${error instanceof Error ? error.message : String(error)}`
      logger.error(errorMsg, error, { nodeId, flowId: config.flowId })
      throw new Error(errorMsg)
    }
  }

  /**
   * Avalia uma condição baseada nos dados do webhook
   * 
   * @param condition - Dados da condição
   * @param data - Dados do webhook
   * @returns true se a condição foi atendida, false caso contrário
   */
  private evaluateCondition(
    condition: ConditionNodeData,
    data: Record<string, unknown>
  ): boolean {
    // Valida se o campo foi configurado
    if (!condition.field || condition.field.trim() === '') {
      logger.condition('Campo vazio → FALSE')
      return false
    }

    // Remove 'data.' do início do path se existir
    let fieldPath = condition.field.trim()
    if (fieldPath.startsWith(DATA_PREFIX)) {
      fieldPath = fieldPath.substring(DATA_PREFIX.length)
    }
    
    const fieldValue = this.getNestedValue(data, fieldPath)
    const conditionValue = condition.value

    // Se o valor não foi encontrado, retorna false
    if (fieldValue === undefined || fieldValue === null) {
      logger.condition(`Campo '${fieldPath}' não encontrado no payload → FALSE`)
      return false
    }

    // Avalia a condição com base no operador
    let result: boolean
    switch (condition.operator) {
      case CONDITION_OPERATORS.EQUALS:
        result = String(fieldValue) === String(conditionValue)
        break
      case CONDITION_OPERATORS.NOT_EQUALS:
        result = String(fieldValue) !== String(conditionValue)
        break
      case CONDITION_OPERATORS.CONTAINS:
        result = String(fieldValue).includes(String(conditionValue))
        break
      case CONDITION_OPERATORS.GREATER_THAN: {
        const numValue = Number(fieldValue)
        const numCondition = Number(conditionValue)
        result = !isNaN(numValue) && !isNaN(numCondition) && numValue > numCondition
        break
      }
      case CONDITION_OPERATORS.LESS_THAN: {
        const numValue = Number(fieldValue)
        const numCondition = Number(conditionValue)
        result = !isNaN(numValue) && !isNaN(numCondition) && numValue < numCondition
        break
      }
      default:
        logger.warn(`Operador desconhecido: ${condition.operator} → FALSE`)
        result = false
    }

    const operatorSymbol = {
      [CONDITION_OPERATORS.EQUALS]: '==',
      [CONDITION_OPERATORS.NOT_EQUALS]: '!=',
      [CONDITION_OPERATORS.CONTAINS]: 'contém',
      [CONDITION_OPERATORS.GREATER_THAN]: '>',
      [CONDITION_OPERATORS.LESS_THAN]: '<',
    }[condition.operator] || condition.operator

    logger.condition(`Avaliação: "${fieldPath}" ${operatorSymbol} "${conditionValue}"`, {
      valueFound: fieldValue,
      valueType: typeof fieldValue,
      result: result ? 'TRUE → segue pelo caminho YES' : 'FALSE → segue pelo caminho NO',
    })

    return result
  }

  /**
   * Obtém um valor aninhado de um objeto usando um path (ex: "user.name")
   * 
   * @param obj - Objeto a ser percorrido
   * @param path - Caminho do valor (ex: "user.name")
   * @returns Valor encontrado ou undefined
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    if (!path || !obj) {
      return undefined
    }
    
    try {
      const keys = path.split('.')
      let current: unknown = obj
      
      for (const key of keys) {
        if (current === null || current === undefined) {
          return undefined
        }
        if (typeof current !== 'object') {
          return undefined
        }
        current = (current as Record<string, unknown>)[key]
      }
      
      return current
    } catch (error) {
      logger.debug(`Erro ao obter valor aninhado: ${path}`, { error })
      return undefined
    }
  }

  /**
   * Obtém os próximos nós conectados a um nó específico
   * 
   * @param nodeId - ID do nó
   * @param flow - Flow completo
   * @returns Array de IDs dos próximos nós
   */
  private getNextNodes(nodeId: string, flow: Flow): string[] {
    const edges = flow.edges.filter((edge) => edge.source === nodeId)
    return edges.map((edge) => edge.target).filter(Boolean)
  }

  /**
   * Interpola variáveis no formato {{caminho}} com valores do webhook data
   * 
   * @param template - Template com variáveis (ex: "Olá {{user.name}}")
   * @param data - Dados do webhook
   * @returns String com variáveis substituídas
   * 
   * @example
   * ```typescript
   * interpolateVariables("Olá {{user.name}}", { user: { name: "João" } })
   * // Retorna: "Olá João"
   * ```
   */
  private interpolateVariables(template: string, data: Record<string, unknown>): string {
    if (!template || typeof template !== 'string') {
      return template
    }

    return template.replace(VARIABLE_PATTERN, (match, path) => {
      const trimmedPath = path.trim()
      const value = this.getNestedValue(data, trimmedPath)
      
      if (value === undefined || value === null) {
        return match // Mantém o placeholder se não encontrar
      }
      
      return String(value)
    })
  }

  /**
   * Formata o resultado da execução
   * 
   * @param context - Contexto de execução
   * @returns Resultado formatado
   */
  private formatResult(context: ExecutionContext): FlowExecutionResult {
    return {
      success: context.errors.length === 0,
      executedNodes: Array.from(context.executedNodes),
      errors: context.errors,
    }
  }
}

/**
 * Instância singleton do FlowEngine
 */
export const flowEngine = new FlowEngine()
