/**
 * Flow Builder - Editor visual de flows
 * 
 * Componente principal para criação e edição de flows usando React Flow.
 * Permite adicionar, editar e conectar nós (trigger, condition, action, end).
 * 
 * @module features/flow-builder/ui/FlowBuilder
 */

'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Connection,
  useNodesState,
  useEdgesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { nodeTypes } from './nodeTypes'
import { NodeEditor } from './NodeEditor'
import { Button } from '@/shared/ui'
import type { FlowNodeData } from '@/entities/flow'
import { NODE_TYPES, CONDITION_HANDLES } from '@/shared/lib/constants'
import { logger } from '@/shared/lib/logger'
import { v4 as uuidv4 } from 'uuid'

/**
 * Props do FlowBuilder
 */
interface FlowBuilderProps {
  /** Nós iniciais do flow */
  initialNodes?: Node<FlowNodeData>[]
  /** Edges iniciais do flow */
  initialEdges?: Edge[]
  /** Callback chamado ao salvar o flow completo */
  onSave?: (nodes: Node<FlowNodeData>[], edges: Edge[]) => void
  /** Callback chamado ao salvar um nó individual (salva no banco) */
  onNodeSave?: (nodes: Node<FlowNodeData>[], edges: Edge[]) => Promise<void>
  /** Callback chamado ao testar o flow */
  onTest?: () => void
}

/**
 * Componente FlowBuilder
 * 
 * Editor visual de flows com drag-and-drop usando React Flow.
 */
export function FlowBuilder({
  initialNodes = [],
  initialEdges = [],
  onSave,
  onNodeSave,
  onTest,
}: FlowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node<FlowNodeData> | null>(null)
  
  // Refs para manter referência aos valores mais recentes
  const nodesRef = useRef<Node<FlowNodeData>[]>(initialNodes)
  const edgesRef = useRef<Edge[]>(initialEdges)

  // Atualiza refs quando nodes/edges mudam
  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  // Sincroniza com initialNodes/initialEdges quando mudam externamente
  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
    nodesRef.current = initialNodes
    edgesRef.current = initialEdges
  }, [initialNodes, initialEdges, setNodes, setEdges])

  /**
   * Handler para criar conexões entre nós
   */
  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodesRef.current.find((n) => n.id === params.source)
      
      // Valida conexões de condition nodes
      if (sourceNode?.type === NODE_TYPES.CONDITION) {
        if (!params.sourceHandle || 
            (params.sourceHandle !== CONDITION_HANDLES.YES && 
             params.sourceHandle !== CONDITION_HANDLES.NO)) {
          alert('Erro: Conexão de condition node deve ser feita pelos handles "yes" ou "no".')
          return
        }
      }
      
      const newEdge: Edge = {
        ...params,
        id: `edge-${params.source}-${params.target}-${params.sourceHandle || 'default'}-${Date.now()}`,
        sourceHandle: params.sourceHandle || undefined,
        targetHandle: params.targetHandle || undefined,
      }
      
      logger.debug('Nova edge criada', {
        edgeId: newEdge.id,
        source: newEdge.source,
        target: newEdge.target,
        sourceHandle: newEdge.sourceHandle,
      })
      
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges]
  )

  /**
   * Handler para seleção de nó
   */
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node<FlowNodeData>) => {
    setSelectedNode(node)
  }, [])

  /**
   * Handler para clique no canvas (desseleciona nó)
   */
  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  /**
   * Adiciona um novo nó ao flow
   */
  const addNode = useCallback((type: 'trigger' | 'condition' | 'action' | 'end') => {
    const newNode: Node<FlowNodeData> = {
      id: uuidv4(),
      type,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: getDefaultNodeData(type),
    }
    
    logger.debug('Adicionando novo nó', { nodeId: newNode.id, type })
    
    setNodes((nds) => [...nds, newNode])
  }, [setNodes])

  /**
   * Atualiza os dados de um nó
   * 
   * Se onNodeSave estiver disponível, salva automaticamente no banco.
   */
  const updateNode = useCallback(async (nodeId: string, data: FlowNodeData) => {
    logger.debug('Atualizando nó', { nodeId, data })
    
    const dataCopy = JSON.parse(JSON.stringify(data))
    
    // Atualiza o estado local primeiro
    setNodes((nds) => {
      const updated = nds.map((node) => {
        if (node.id === nodeId) {
          const updatedNode = { 
            ...node, 
            data: dataCopy
          }
          
          logger.debug('Nó atualizado no estado', {
            nodeId,
            nodeType: node.type,
          })
          
          return updatedNode
        }
        return node
      })
      
      // Atualiza o ref manualmente para ter os valores mais recentes
      nodesRef.current = updated
      
      // Atualiza selectedNode se for o mesmo nó
      setSelectedNode((currentSelected) => {
        if (currentSelected?.id === nodeId) {
          const updatedSelectedNode = updated.find(n => n.id === nodeId)
          if (updatedSelectedNode) {
            return updatedSelectedNode
          }
        }
        return currentSelected
      })
      
      // Se onNodeSave estiver disponível, salva no banco imediatamente
      if (onNodeSave) {
        // Usa setTimeout para garantir que o estado foi atualizado
        setTimeout(async () => {
          try {
            const currentNodes = nodesRef.current
            const currentEdges = edgesRef.current
            
            // Normaliza edges
            const normalizedEdges = currentEdges.map((edge) => {
              const sourceNode = currentNodes.find((n) => n.id === edge.source)
              if (sourceNode?.type === NODE_TYPES.CONDITION && !edge.sourceHandle) {
                return { ...edge, sourceHandle: CONDITION_HANDLES.YES }
              }
              return edge
            })
            
            logger.debug('Salvando nó individual no banco', {
              nodesCount: currentNodes.length,
              edgesCount: normalizedEdges.length,
            })
            
            await onNodeSave(currentNodes, normalizedEdges)
            logger.info('Nó salvo no banco com sucesso')
          } catch (error) {
            logger.error('Erro ao salvar nó no banco', error)
            alert('Erro ao salvar nó: ' + (error instanceof Error ? error.message : String(error)))
          }
        }, 50)
      }
      
      return updated
    })
  }, [setNodes, onNodeSave])

  /**
   * Deleta um nó do flow
   */
  const deleteNode = useCallback((nodeId: string) => {
    logger.debug('Deletando nó', { nodeId })
    
    setNodes((nds) => nds.filter((node) => node.id !== nodeId))
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
    
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null)
    }
  }, [setNodes, setEdges, selectedNode])

  /**
   * Handler para salvar o flow completo
   */
  const handleSave = useCallback(() => {
    if (!onSave) {
      alert('Erro: função de salvar não está configurada.')
      return
    }
    
    // Usa os valores mais recentes dos refs
    const currentNodes = nodesRef.current
    const currentEdges = edgesRef.current
    
    logger.info('Salvando flow completo', {
      nodesCount: currentNodes.length,
      edgesCount: currentEdges.length,
    })
    
    // Normaliza edges de condition nodes
    const normalizedEdges = currentEdges.map((edge) => {
      const sourceNode = currentNodes.find((n) => n.id === edge.source)
      if (sourceNode?.type === NODE_TYPES.CONDITION && !edge.sourceHandle) {
        return { ...edge, sourceHandle: CONDITION_HANDLES.YES } // Fallback
      }
      return edge
    })
    
    try {
      onSave(currentNodes, normalizedEdges)
      logger.info('Flow salvo com sucesso')
    } catch (error) {
      logger.error('Erro ao salvar flow', error)
      alert('Erro ao salvar: ' + (error instanceof Error ? error.message : String(error)))
    }
  }, [onSave])

  return (
    <div className="flex h-screen">
      {/* Sidebar com controles */}
      <div className="w-48 p-4 border-r border-gray-200 bg-white">
        <h3 className="font-semibold mb-4">Adicionar Nó</h3>
        <div className="space-y-2">
          <Button 
            onClick={() => addNode(NODE_TYPES.TRIGGER)} 
            variant="secondary" 
            size="sm" 
            className="w-full"
          >
            + Trigger
          </Button>
          <Button 
            onClick={() => addNode(NODE_TYPES.CONDITION)} 
            variant="secondary" 
            size="sm" 
            className="w-full"
          >
            + Condition
          </Button>
          <Button 
            onClick={() => addNode(NODE_TYPES.ACTION)} 
            variant="secondary" 
            size="sm" 
            className="w-full"
          >
            + Action
          </Button>
          <Button 
            onClick={() => addNode(NODE_TYPES.END)} 
            variant="secondary" 
            size="sm" 
            className="w-full"
          >
            + End
          </Button>
        </div>
        <div className="mt-6 space-y-2">
          <Button onClick={handleSave} className="w-full" type="button">
            Salvar Flow
          </Button>
          {onTest && (
            <Button onClick={onTest} variant="secondary" className="w-full" type="button">
              Testar Flow
            </Button>
          )}
        </div>
      </div>

      {/* Canvas do React Flow */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {/* Editor de nó */}
      <NodeEditor
        node={selectedNode}
        onUpdate={updateNode}
        onDelete={deleteNode}
      />
    </div>
  )
}

/**
 * Retorna dados padrão para um tipo de nó
 */
function getDefaultNodeData(type: string): FlowNodeData {
  switch (type) {
    case NODE_TYPES.TRIGGER:
      return { event: '' }
    case NODE_TYPES.CONDITION:
      return { field: '', operator: 'EQUALS', value: '' }
    case NODE_TYPES.ACTION:
      return { type: 'LOG', config: {} }
    case NODE_TYPES.END:
      return {}
    default:
      return {}
  }
}
