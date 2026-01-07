'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ReactFlowProvider } from 'reactflow'
import { FlowBuilder } from '@/features/flow-builder'
import { Input, Button } from '@/shared/ui'
import { Node, Edge } from 'reactflow'
import type { FlowNodeData } from '@/entities/flow'

export default function FlowBuilderPage() {
  const router = useRouter()
  const [flowName, setFlowName] = useState('')
  const [nodes, setNodes] = useState<Node<FlowNodeData>[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [saving, setSaving] = useState(false)

  const handleSave = async (updatedNodes: Node<FlowNodeData>[], updatedEdges: Edge[]) => {
    if (!flowName.trim()) {
      alert('Por favor, informe um nome para o flow')
      return
    }

    // Valida e normaliza edges - garante que edges de condition nodes tenham sourceHandle
    const normalizedEdges = updatedEdges.map((edge) => {
      const sourceNode = updatedNodes.find((n) => n.id === edge.source)
      
      // Se o nó de origem é uma condição, garante que sourceHandle existe
      if (sourceNode?.type === 'condition') {
        if (!edge.sourceHandle || (edge.sourceHandle !== 'yes' && edge.sourceHandle !== 'no')) {
          console.warn(`[SAVE FLOW] Edge ${edge.id} de condition node ${edge.source} sem sourceHandle válido. Tentando inferir...`)
          edge.sourceHandle = 'yes' // Fallback
        }
      }
      
      return edge
    })

    setSaving(true)
    try {
      const response = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: flowName,
          nodes: updatedNodes,
          edges: normalizedEdges, // Usa edges normalizadas
          active: false,
        }),
      })

      if (response.ok) {
        const flow = await response.json()
        router.push(`/flows/builder/${flow.id}`)
      } else {
        alert('Erro ao salvar flow')
      }
    } catch (error) {
      console.error('Error saving flow:', error)
      alert('Erro ao salvar flow')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-4">
        <Input
          placeholder="Nome do Flow"
          value={flowName}
          onChange={(e) => setFlowName(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={() => router.push('/flows')} variant="ghost">
          Voltar
        </Button>
      </div>
      <ReactFlowProvider>
        <FlowBuilder
          initialNodes={nodes}
          initialEdges={edges}
          onSave={handleSave}
        />
      </ReactFlowProvider>
    </div>
  )
}

