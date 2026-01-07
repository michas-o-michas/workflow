'use client'

import { useState, useEffect, useRef } from 'react'
import { Node } from 'reactflow'
import { Input, Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Separator, Badge, Textarea, Label } from '@/shared/ui'
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from '@/shared/ui'
import type {
  TriggerNodeData,
  ConditionNodeData,
  ActionNodeData,
  FlowNodeData,
  Flow,
} from '@/entities/flow'

interface NodeEditorProps {
  node: Node<FlowNodeData> | null
  onUpdate: (nodeId: string, data: FlowNodeData) => void
  onDelete: (nodeId: string) => void
}

export function NodeEditor({ node, onUpdate, onDelete }: NodeEditorProps) {
  const [formData, setFormData] = useState<any>({})
  const [flows, setFlows] = useState<Flow[]>([])
  const [loadingFlows, setLoadingFlows] = useState(false)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const lastNodeDataRef = useRef<string>('')
  const lastNodeIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!node) {
      setFormData({})
      lastNodeDataRef.current = ''
      lastNodeIdRef.current = null
      return
    }

    // Serializa os dados do node para comparação
    const nodeDataStr = JSON.stringify(node.data)
    const isNewNode = node.id !== lastNodeIdRef.current
    const isDataChanged = nodeDataStr !== lastNodeDataRef.current

    // Só atualiza se for um novo node OU se os dados mudaram externamente
    if (isNewNode || isDataChanged) {
      console.log('[NODE EDITOR] Node atualizado:', {
        isNewNode,
        isDataChanged,
        nodeId: node.id,
        nodeType: node.type,
      })

      lastNodeIdRef.current = node.id
      lastNodeDataRef.current = nodeDataStr

      // Normaliza os dados baseado no tipo
      let nodeData: any = { ...node.data }
      
      if (node.type === 'condition') {
        const conditionType = nodeData.conditionType || 'FIELD'
        if (conditionType === 'HTTP_REQUEST') {
          nodeData = {
            conditionType: 'HTTP_REQUEST',
            httpConfig: {
              url: nodeData.httpConfig?.url || '',
              method: nodeData.httpConfig?.method || 'GET',
              headers: nodeData.httpConfig?.headers || {},
              body: nodeData.httpConfig?.body || undefined,
              responseField: nodeData.httpConfig?.responseField || '',
              operator: nodeData.httpConfig?.operator || 'EQUALS',
              value: nodeData.httpConfig?.value || '',
            },
          }
        } else {
          nodeData = {
            conditionType: 'FIELD',
            field: nodeData.field || '',
            operator: nodeData.operator || 'EQUALS',
            value: nodeData.value || '',
          }
        }
      } else if (node.type === 'action') {
        // Inicializa config baseado no tipo de ação
        const actionType = nodeData.type || 'LOG'
        let defaultConfig: any = {}
        
        if (actionType === 'CALL_FLOW') {
          defaultConfig = { flowId: '', data: undefined }
        } else if (actionType === 'HTTP_REQUEST') {
          defaultConfig = { url: '', method: 'POST' }
        } else if (actionType === 'SEND_EMAIL') {
          defaultConfig = { email: '', subject: '', message: '' }
        } else if (actionType === 'LOG') {
          defaultConfig = { message: '' }
        }
        
        nodeData = {
          type: actionType,
          config: { ...defaultConfig, ...(nodeData.config || {}) },
        }
      } else if (node.type === 'trigger') {
        nodeData = {
          event: nodeData.event || '',
        }
      }
      
      setFormData(nodeData)
      console.log('[NODE EDITOR] formData atualizado:', nodeData)
    }
  }, [node])

  // Busca flows quando o tipo de ação é CALL_FLOW
  useEffect(() => {
    if (node?.type === 'action' && formData.type === 'CALL_FLOW' && flows.length === 0 && !loadingFlows) {
      fetchFlows()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id, formData.type])

  const fetchFlows = async () => {
    if (loadingFlows) return // Evita múltiplas chamadas simultâneas
    
    setLoadingFlows(true)
    try {
      const response = await fetch('/api/flows')
      const data = await response.json()
      setFlows(data || [])
    } catch (error) {
      console.error('Erro ao buscar flows:', error)
    } finally {
      setLoadingFlows(false)
    }
  }

  if (!node) {
    return (
      <div className="w-80 p-4 border-l border-gray-200 bg-gray-50">
        <p className="text-gray-500 text-sm">Selecione um nó para editar</p>
      </div>
    )
  }

  const handleSave = () => {
    if (!node) return

    let dataToSave: FlowNodeData
    
    if (node.type === 'condition') {
      const conditionType = formData.conditionType || 'FIELD'
      if (conditionType === 'HTTP_REQUEST') {
        dataToSave = {
          conditionType: 'HTTP_REQUEST',
          httpConfig: {
            url: formData.httpConfig?.url || '',
            method: formData.httpConfig?.method || 'GET',
            headers: formData.httpConfig?.headers || {},
            body: formData.httpConfig?.body || undefined,
            responseField: formData.httpConfig?.responseField || '',
            operator: formData.httpConfig?.operator || 'EQUALS',
            value: formData.httpConfig?.value || '',
          },
        } as ConditionNodeData
      } else {
        dataToSave = {
          conditionType: 'FIELD',
          field: formData.field || '',
          operator: formData.operator || 'EQUALS',
          value: formData.value || '',
        } as ConditionNodeData
      }
    } else if (node.type === 'action') {
      dataToSave = {
        type: formData.type || 'LOG',
        config: formData.config || {},
      } as ActionNodeData
    } else if (node.type === 'trigger') {
      dataToSave = {
        event: formData.event || '',
      } as TriggerNodeData
    } else {
      dataToSave = formData
    }
    
    console.log('[NODE EDITOR] Salvando nó:', { 
      nodeId: node.id, 
      nodeType: node.type,
      data: dataToSave,
      formData 
    })
    
    // Atualiza a referência do último dado salvo ANTES de chamar onUpdate
    lastNodeDataRef.current = JSON.stringify(dataToSave)
    
    // Chama onUpdate para atualizar o node no FlowBuilder
    try {
      onUpdate(node.id, dataToSave)
      console.log('[NODE EDITOR] onUpdate chamado com sucesso')
    } catch (error) {
      console.error('[NODE EDITOR] Erro ao chamar onUpdate:', error)
      alert('Erro ao salvar nó: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleDelete = () => {
    if (node && confirm('Tem certeza que deseja deletar este nó?')) {
      onDelete(node.id)
    }
  }

  const renderEditor = () => {
    switch (node.type) {
      case 'trigger':
        return (
          <div className="space-y-4">
            <Input
              label="Evento"
              value={formData.event || ''}
              onChange={(e) => setFormData({ ...formData, event: e.target.value })}
              placeholder="ex: lead.converted"
            />
          </div>
        )

      case 'condition':
        const conditionType = formData.conditionType || 'FIELD'
        const isFieldEmpty = conditionType === 'FIELD' && (!formData.field || formData.field.trim() === '')
        const isHttpConfigEmpty = conditionType === 'HTTP_REQUEST' && (
          !formData.httpConfig?.url || formData.httpConfig.url.trim() === '' ||
          !formData.httpConfig?.responseField || formData.httpConfig.responseField.trim() === ''
        )
        
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Condição</Label>
              <Select
                value={conditionType}
                onValueChange={(value) => {
                  // Reseta dados quando muda o tipo
                  if (value === 'HTTP_REQUEST') {
                    setFormData({
                      conditionType: 'HTTP_REQUEST',
                      httpConfig: {
                        url: '',
                        method: 'GET',
                        headers: {},
                        body: undefined,
                        responseField: '',
                        operator: 'EQUALS',
                        value: '',
                      },
                    })
                  } else {
                    setFormData({
                      conditionType: 'FIELD',
                      field: '',
                      operator: 'EQUALS',
                      value: '',
                    })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIELD">Campo do Payload</SelectItem>
                  <SelectItem value="HTTP_REQUEST">Request HTTP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {conditionType === 'FIELD' ? (
              <>
                <div>
                  <Input
                    label="Campo do Payload"
                    value={formData.field || ''}
                    onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                    placeholder="ex: lead.age ou lead.source"
                    className={isFieldEmpty ? 'border-red-300' : ''}
                  />
                  {isFieldEmpty && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ Campo obrigatório!
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Operador</Label>
                  <Select
                    value={formData.operator || 'EQUALS'}
                    onValueChange={(value) => setFormData({ ...formData, operator: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um operador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EQUALS">Igual a (EQUALS)</SelectItem>
                      <SelectItem value="NOT_EQUALS">Diferente de (NOT_EQUALS)</SelectItem>
                      <SelectItem value="CONTAINS">Contém (CONTAINS)</SelectItem>
                      <SelectItem value="GREATER_THAN">Maior que (GREATER_THAN)</SelectItem>
                      <SelectItem value="LESS_THAN">Menor que (LESS_THAN)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  label="Valor"
                  value={String(formData.value || '')}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="Valor esperado"
                />
              </>
            ) : (
              <>
                <div>
                  <Input
                    label="URL"
                    value={formData.httpConfig?.url || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        httpConfig: {
                          ...formData.httpConfig,
                          url: e.target.value,
                          method: formData.httpConfig?.method || 'GET',
                          headers: formData.httpConfig?.headers || {},
                          body: formData.httpConfig?.body,
                          responseField: formData.httpConfig?.responseField || '',
                          operator: formData.httpConfig?.operator || 'EQUALS',
                          value: formData.httpConfig?.value || '',
                        },
                      })
                    }
                    placeholder="https://api.example.com/leads/{{data.lead.id}}"
                    className={!formData.httpConfig?.url || formData.httpConfig.url.trim() === '' ? 'border-red-300' : ''}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use variáveis como <code>{'{{data.lead.id}}'}</code> para interpolar dados do webhook
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Método HTTP</Label>
                  <Select
                    value={formData.httpConfig?.method || 'GET'}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        httpConfig: {
                          ...formData.httpConfig,
                          method: value,
                          url: formData.httpConfig?.url || '',
                          headers: formData.httpConfig?.headers || {},
                          body: formData.httpConfig?.body,
                          responseField: formData.httpConfig?.responseField || '',
                          operator: formData.httpConfig?.operator || 'EQUALS',
                          value: formData.httpConfig?.value || '',
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Input
                    label="Campo da Resposta para Avaliar"
                    value={formData.httpConfig?.responseField || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        httpConfig: {
                          ...formData.httpConfig,
                          responseField: e.target.value,
                          url: formData.httpConfig?.url || '',
                          method: formData.httpConfig?.method || 'GET',
                          headers: formData.httpConfig?.headers || {},
                          body: formData.httpConfig?.body,
                          operator: formData.httpConfig?.operator || 'EQUALS',
                          value: formData.httpConfig?.value || '',
                        },
                      })
                    }
                    placeholder="ex: status ou data.active"
                    className={!formData.httpConfig?.responseField || formData.httpConfig.responseField.trim() === '' ? 'border-red-300' : ''}
                  />
                  {(!formData.httpConfig?.responseField || formData.httpConfig.responseField.trim() === '') && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ Campo obrigatório!
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Caminho do campo na resposta JSON (ex: "status" ou "data.active")
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Operador</Label>
                  <Select
                    value={formData.httpConfig?.operator || 'EQUALS'}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        httpConfig: {
                          ...formData.httpConfig,
                          operator: value,
                          url: formData.httpConfig?.url || '',
                          method: formData.httpConfig?.method || 'GET',
                          headers: formData.httpConfig?.headers || {},
                          body: formData.httpConfig?.body,
                          responseField: formData.httpConfig?.responseField || '',
                          value: formData.httpConfig?.value || '',
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um operador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EQUALS">Igual a (EQUALS)</SelectItem>
                      <SelectItem value="NOT_EQUALS">Diferente de (NOT_EQUALS)</SelectItem>
                      <SelectItem value="CONTAINS">Contém (CONTAINS)</SelectItem>
                      <SelectItem value="GREATER_THAN">Maior que (GREATER_THAN)</SelectItem>
                      <SelectItem value="LESS_THAN">Menor que (LESS_THAN)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  label="Valor Esperado"
                  value={String(formData.httpConfig?.value || '')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      httpConfig: {
                        ...formData.httpConfig,
                        value: e.target.value,
                        url: formData.httpConfig?.url || '',
                        method: formData.httpConfig?.method || 'GET',
                        headers: formData.httpConfig?.headers || {},
                        body: formData.httpConfig?.body,
                        responseField: formData.httpConfig?.responseField || '',
                        operator: formData.httpConfig?.operator || 'EQUALS',
                      },
                    })
                  }
                  placeholder="Valor esperado na resposta"
                />
                {isHttpConfigEmpty && (
                  <p className="text-xs text-red-600">
                    ⚠️ Configure URL e Campo da Resposta!
                  </p>
                )}
              </>
            )}
          </div>
        )

      case 'action':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Ação</Label>
              <Select
                value={formData.type || 'LOG'}
                onValueChange={(newType) => {
                  // Reseta config quando muda o tipo (exceto se já tiver dados)
                  const newConfig = newType === formData.type ? formData.config : {}
                  setFormData({ ...formData, type: newType, config: newConfig })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOG">Log (Console)</SelectItem>
                  <SelectItem value="HTTP_REQUEST">HTTP Request</SelectItem>
                  <SelectItem value="SEND_EMAIL">Enviar Email</SelectItem>
                  <SelectItem value="CALL_FLOW">Chamar Flow</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type === 'LOG' && (
              <Input
                label="Mensagem"
                value={formData.config?.message || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, message: e.target.value },
                  })
                }
                placeholder="Mensagem para log"
              />
            )}

            {formData.type === 'HTTP_REQUEST' && (
              <>
                <Input
                  label="URL"
                  value={formData.config?.url || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, url: e.target.value },
                    })
                  }
                  placeholder="https://api.example.com/webhook"
                />
                <div className="space-y-2">
                  <Label>Método</Label>
                  <Select
                    value={formData.config?.method || 'POST'}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, method: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {formData.type === 'SEND_EMAIL' && (
              <>
                <Input
                  label="Email"
                  type="email"
                  value={formData.config?.email || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, email: e.target.value },
                    })
                  }
                  placeholder="destinatario@example.com"
                />
                <Input
                  label="Assunto"
                  value={formData.config?.subject || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, subject: e.target.value },
                    })
                  }
                  placeholder="Assunto do email"
                />
              </>
            )}

            {formData.type === 'CALL_FLOW' && (
              <>
                <div className="space-y-2">
                  <Label>Flow para Chamar</Label>
                  <Select
                    value={formData.config?.flowId || ''}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, flowId: value },
                      })
                    }
                    disabled={loadingFlows}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um flow..." />
                    </SelectTrigger>
                    <SelectContent>
                      {flows.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Nenhum flow disponível
                        </div>
                      ) : (
                        flows.map((flow) => (
                          <SelectItem key={flow.id} value={flow.id}>
                            {flow.name} {flow.active ? '✓' : '(inativo)'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {loadingFlows && (
                  <p className="text-xs text-gray-500">Carregando flows...</p>
                )}
                {!loadingFlows && flows.length === 0 && (
                  <p className="text-xs text-yellow-600">
                    ⚠️ Nenhum flow disponível. Crie flows primeiro.
                  </p>
                )}
                {formData.config?.flowId && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                    <p className="text-gray-600">
                      💡 <strong>Dica:</strong> O flow chamado receberá os mesmos dados do webhook
                      original. Você pode passar dados adicionais abaixo (opcional).
                    </p>
                  </div>
                )}
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dados Adicionais (JSON opcional)
                  </label>
                  <textarea
                    className={`w-full px-3 py-2 border rounded-md text-sm font-mono ${
                      jsonError ? 'border-red-300' : 'border-gray-300'
                    }`}
                    rows={4}
                    value={
                      formData.config?.data
                        ? JSON.stringify(formData.config.data, null, 2)
                        : ''
                    }
                    onChange={(e) => {
                      const value = e.target.value.trim()
                      setJsonError(null)
                      
                      if (!value) {
                        setFormData({
                          ...formData,
                          config: {
                            ...formData.config,
                            data: undefined,
                          },
                        })
                        return
                      }
                      
                      try {
                        const parsed = JSON.parse(value)
                        setFormData({
                          ...formData,
                          config: {
                            ...formData.config,
                            data: parsed,
                          },
                        })
                      } catch (error) {
                        setJsonError('JSON inválido. Verifique a sintaxe.')
                        // Mantém o valor no textarea para o usuário corrigir
                      }
                    }}
                    placeholder='{\n  "customField": "{{data.lead.name}}"\n}'
                  />
                  {jsonError && (
                    <p className="text-xs text-red-600 mt-1">{jsonError}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Use variáveis como <code>{'{{data.lead.name}}'}</code> para interpolar dados do
                    webhook
                  </p>
                </div>
              </>
            )}
          </div>
        )

      case 'end':
        return <p className="text-gray-500 text-sm">Nó de fim não requer configuração</p>

      default:
        return null
    }
  }

  const nodeTypeLabels = {
    trigger: 'Trigger',
    condition: 'Condition',
    action: 'Action',
    end: 'End',
  }

  const nodeTypeDescriptions = {
    trigger: 'Início do flow, escuta um evento específico',
    condition: 'Avalia condições baseadas no payload',
    action: 'Executa uma ação (HTTP, Email, Log, etc)',
    end: 'Finaliza a execução do flow',
  }

  return (
    <div className="w-96 h-full overflow-y-auto border-l bg-background">
      <Card className="border-0 rounded-none h-full flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">
                {nodeTypeLabels[node.type as keyof typeof nodeTypeLabels]}
              </CardTitle>
              <CardDescription className="mt-1">
                {nodeTypeDescriptions[node.type as keyof typeof nodeTypeDescriptions]}
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {node.id.slice(0, 8)}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 pt-6">
          {renderEditor()}
        </CardContent>

        <div className="border-t p-4 space-y-2">
          <Button onClick={handleSave} className="w-full" size="lg">
            Salvar Alterações
          </Button>
          <Button 
            onClick={handleDelete} 
            variant="destructive" 
            className="w-full"
            size="sm"
          >
            Deletar Nó
          </Button>
        </div>
      </Card>
    </div>
  )
}
