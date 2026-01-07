'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ReactFlowProvider } from 'reactflow'
import { FlowBuilder } from '@/features/flow-builder'
import { Input, Button } from '@/shared/ui'
import { Node, Edge } from 'reactflow'
import type { Flow, FlowNodeData } from '@/entities/flow'

export default function EditFlowBuilderPage() {
  const router = useRouter()
  const params = useParams()
  const flowId = params.id as string

  const [flow, setFlow] = useState<Flow | null>(null)
  const [flowName, setFlowName] = useState('')
  const [nodes, setNodes] = useState<Node<FlowNodeData>[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (flowId) {
      fetchFlow()
    }
  }, [flowId])

  const fetchFlow = async () => {
    try {
      const response = await fetch(`/api/flows/${flowId}?t=${Date.now()}`, {
        cache: 'no-store',
      })
      
      if (response.ok) {
        const data = await response.json()
        setFlow(data)
        setFlowName(data.name || '')
        setNodes(data.nodes || [])
        setEdges(data.edges || [])
      } else {
        alert('Erro ao carregar flow')
      }
    } catch (error) {
      console.error('Error fetching flow:', error)
      alert('Erro ao carregar flow')
    } finally {
      setLoading(false)
    }
  }

  const saveFlowToDatabase = async (updatedNodes: Node<FlowNodeData>[], updatedEdges: Edge[]) => {
    if (!flow || !flowId) {
      throw new Error('Flow não encontrado')
    }

    // Normaliza edges de condition nodes
    const normalizedEdges = updatedEdges.map((edge) => {
      const sourceNode = updatedNodes.find((n) => n.id === edge.source)
      if (sourceNode?.type === 'condition' && !edge.sourceHandle) {
        return { ...edge, sourceHandle: 'yes' }
      }
      return edge
    })

    const payload = {
      name: flowName,
      nodes: updatedNodes,
      edges: normalizedEdges,
      active: flow.active,
    }

    const response = await fetch(`/api/flows/${flowId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: errorText || 'Erro desconhecido' }
      }
      throw new Error(errorData.error || 'Erro ao salvar flow')
    }

    const updatedFlow = await response.json()
    setFlow(updatedFlow)
    setNodes(updatedFlow.nodes || [])
    setEdges(updatedFlow.edges || [])
    
    return updatedFlow
  }

  const handleSave = async (updatedNodes: Node<FlowNodeData>[], updatedEdges: Edge[]) => {
    setSaving(true)
    try {
      console.log('[PAGE] Salvando flow completo:', {
        flowId,
        nodesCount: updatedNodes.length,
        edgesCount: updatedEdges.length,
      })

      await saveFlowToDatabase(updatedNodes, updatedEdges)
      alert('✅ Flow salvo com sucesso!')
    } catch (error) {
      console.error('Error saving flow:', error)
      alert(`❌ Erro ao salvar: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setSaving(false)
    }
  }

  const handleNodeSave = async (updatedNodes: Node<FlowNodeData>[], updatedEdges: Edge[]) => {
    try {
      console.log('[PAGE] Salvando node individual:', {
        flowId,
        nodesCount: updatedNodes.length,
        edgesCount: updatedEdges.length,
      })

      await saveFlowToDatabase(updatedNodes, updatedEdges)
      console.log('[PAGE] Node salvo no banco com sucesso!')
    } catch (error) {
      console.error('Error saving node:', error)
      throw error // Re-lança o erro para o FlowBuilder tratar
    }
  }

  const handleTest = async () => {
    const triggerNode = nodes.find((n) => n.type === 'trigger')
    const event = (triggerNode?.data as { event?: string })?.event || 'lead.converted'
    
    const testPayload = {
      event,
      version: '1.0',
      occurredAt: new Date().toISOString(),
      data: {
        lead: {
          id: 'lead_test_123',
          name: 'Teste',
          source: 'whatsapp',
          age: 16,
        },
      },
    }

    try {
      await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      })
      alert('Webhook de teste enviado! Verifique os logs.')
    } catch (error) {
      console.error('Error sending test webhook:', error)
      alert('Erro ao enviar webhook de teste')
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    )
  }

  if (!flow) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Flow não encontrado</p>
      </div>
    )
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
        <span
          className={`px-2 py-1 rounded text-xs ${
            flow.active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {flow.active ? 'Ativo' : 'Inativo'}
        </span>
        <Button onClick={() => router.push('/flows')} variant="ghost">
          Voltar
        </Button>
        {saving && <span className="text-sm text-gray-500">Salvando...</span>}
      </div>
      <ReactFlowProvider>
        <FlowBuilder
          initialNodes={nodes}
          initialEdges={edges}
          onSave={handleSave}
          onNodeSave={handleNodeSave}
          onTest={handleTest}
        />
      </ReactFlowProvider>
    </div>
  )
}
