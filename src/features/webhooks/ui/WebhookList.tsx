'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Textarea, Label, Separator } from '@/shared/ui'
import type { WebhookEvent } from '@/entities/webhook'
import { format } from 'date-fns'
import { Webhook, Send, CheckCircle2, Clock, Copy, ChevronDown, ChevronUp, PlayCircle, XCircle, Loader2, ArrowRight, Timer, ListChecks } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface WebhookListProps {
  onTestWebhook?: () => void
}

export function WebhookList({ onTestWebhook }: WebhookListProps) {
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false)
  const [testPayload, setTestPayload] = useState<string>('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  useEffect(() => {
    fetchWebhooks()
    const interval = setInterval(fetchWebhooks, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchWebhooks = async () => {
    try {
      const response = await fetch('/api/webhooks?limit=50')
      const data = await response.json()
      setWebhooks(data)
    } catch (error) {
      console.error('Error fetching webhooks:', error)
    } finally {
      setLoading(false)
    }
  }

  // Payload padrão para teste
  const defaultTestPayload = {
    event: 'lead.converted',
    version: '1.0',
    occurredAt: new Date().toISOString(),
    data: {
      lead: {
        id: 'lead_123',
        name: 'Maria Silva',
        phone: '+5511999999999',
        source: 'whatsapp',
        age: 32,
        campaign: 'instagram_ads',
      },
    },
  }

  // Inicializa o payload quando o dialog abre
  const openTestDialog = () => {
    setTestPayload(JSON.stringify(defaultTestPayload, null, 2))
    setJsonError(null)
    setIsTestDialogOpen(true)
  }

  const handleTestWebhook = async () => {
    setJsonError(null)
    
    // Valida JSON
    let parsedPayload: any
    try {
      parsedPayload = JSON.parse(testPayload)
    } catch (error) {
      setJsonError('JSON inválido. Verifique a sintaxe.')
      return
    }

    // Valida estrutura mínima
    if (!parsedPayload.event || typeof parsedPayload.event !== 'string') {
      setJsonError('Campo "event" é obrigatório e deve ser uma string')
      return
    }

    if (!parsedPayload.data || typeof parsedPayload.data !== 'object') {
      setJsonError('Campo "data" é obrigatório e deve ser um objeto')
      return
    }

    try {
      await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedPayload),
      })

      setIsTestDialogOpen(false)
      fetchWebhooks()
    } catch (error) {
      console.error('Error sending test webhook:', error)
      setJsonError('Erro ao enviar webhook. Verifique a conexão.')
    }
  }

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="text-muted-foreground">Carregando webhooks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground mt-1">
            Eventos recebidos e processados
          </p>
        </div>
        <Button onClick={openTestDialog} size="lg">
          <Send className="mr-2 h-4 w-4" />
          Testar Webhook
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum webhook recebido</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Os webhooks recebidos aparecerão aqui automaticamente
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => {
            const isExpanded = expandedIds.has(webhook.id)
            return (
              <Card key={webhook.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Webhook className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{webhook.event}</CardTitle>
                        <Badge variant={webhook.processed ? "default" : "secondary"}>
                          {webhook.processed ? (
                            <><CheckCircle2 className="mr-1 h-3 w-3" /> Processado</>
                          ) : (
                            <><Clock className="mr-1 h-3 w-3" /> Pendente</>
                          )}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {format(new Date(webhook.occurredAt), 'dd/MM/yyyy HH:mm:ss')}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(JSON.stringify(webhook.data, null, 2))}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleExpand(webhook.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="space-y-4">
                    {/* Flows Executados */}
                    {webhook.executedFlows && webhook.executedFlows.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <PlayCircle className="h-4 w-4 text-primary" />
                            Flows Executados
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {webhook.executedFlows.length} {webhook.executedFlows.length === 1 ? 'flow' : 'flows'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          {webhook.executedFlows.map((flow, index) => {
                            const isFirst = index === 0
                            const isLast = index === webhook.executedFlows!.length - 1
                            const executionTime = flow.executionTimeMs 
                              ? flow.executionTimeMs < 1000 
                                ? `${flow.executionTimeMs}ms`
                                : `${(flow.executionTimeMs / 1000).toFixed(2)}s`
                              : null
                            
                            return (
                              <div key={flow.flowId} className="relative">
                                {/* Linha conectora entre flows */}
                                {!isLast && (
                                  <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border" />
                                )}
                                
                                <div className={cn(
                                  "rounded-lg border-2 p-4 bg-card relative",
                                  flow.status === 'success' && "border-green-500/20 bg-green-50/50 dark:bg-green-950/10",
                                  flow.status === 'error' && "border-red-500/20 bg-red-50/50 dark:bg-red-950/10",
                                  flow.status === 'running' && "border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/10"
                                )}>
                                  {/* Número da ordem */}
                                  <div className={cn(
                                    "absolute -left-3 top-4 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2",
                                    flow.status === 'success' && "bg-green-500 text-white border-green-600",
                                    flow.status === 'error' && "bg-red-500 text-white border-red-600",
                                    flow.status === 'running' && "bg-blue-500 text-white border-blue-600"
                                  )}>
                                    {flow.executionOrder || index + 1}
                                  </div>
                                  
                                  {/* Header do Flow */}
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 ml-4">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h5 className="font-semibold text-base">{flow.flowName}</h5>
                                        <Badge
                                          variant={
                                            flow.status === 'success'
                                              ? 'default'
                                              : flow.status === 'error'
                                              ? 'destructive'
                                              : 'secondary'
                                          }
                                          className="text-xs"
                                        >
                                          {flow.status === 'success' && (
                                            <><CheckCircle2 className="mr-1 h-3 w-3" /> Sucesso</>
                                          )}
                                          {flow.status === 'error' && (
                                            <><XCircle className="mr-1 h-3 w-3" /> Erro</>
                                          )}
                                          {flow.status === 'running' && (
                                            <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Executando</>
                                          )}
                                        </Badge>
                                      </div>
                                      
                                      {/* Informações principais */}
                                      <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="flex items-center gap-2 text-sm">
                                          <ListChecks className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-muted-foreground">Nós executados:</span>
                                          <span className="font-medium">{flow.executedNodesCount}</span>
                                        </div>
                                        
                                        {executionTime && (
                                          <div className="flex items-center gap-2 text-sm">
                                            <Timer className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Tempo:</span>
                                            <span className="font-medium">{executionTime}</span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Timestamps */}
                                      <div className="space-y-1.5 text-xs text-muted-foreground">
                                        {flow.startedAt && (
                                          <div className="flex items-center gap-2">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span>
                                              <span className="font-medium">Iniciado:</span>{' '}
                                              {format(new Date(flow.startedAt), 'dd/MM/yyyy HH:mm:ss.SSS')}
                                            </span>
                                          </div>
                                        )}
                                        {flow.completedAt && (
                                          <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            <span>
                                              <span className="font-medium">Concluído:</span>{' '}
                                              {format(new Date(flow.completedAt), 'dd/MM/yyyy HH:mm:ss.SSS')}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Erro */}
                                      {flow.error && (
                                        <div className="mt-3 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                                          <p className="text-xs text-destructive font-semibold mb-1">⚠️ Erro durante execução:</p>
                                          <p className="text-xs text-destructive/90 font-mono bg-destructive/5 p-2 rounded">
                                            {flow.error}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Seta indicando próximo flow */}
                                  {!isLast && (
                                    <div className="flex justify-center mt-2">
                                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Payload do Webhook */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Payload do Webhook</h4>
                      <div className="rounded-lg bg-muted p-4">
                        <pre className="text-xs overflow-auto max-h-96 font-mono">
                          {JSON.stringify(webhook.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog para editar e enviar webhook de teste */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Testar Webhook</DialogTitle>
            <DialogDescription>
              Edite o JSON abaixo e clique em "Enviar" para testar o webhook
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payload do Webhook (JSON)</Label>
              <Textarea
                value={testPayload}
                onChange={(e) => {
                  setTestPayload(e.target.value)
                  setJsonError(null)
                }}
                className={cn(
                  "font-mono text-sm min-h-[400px]",
                  jsonError && "border-destructive"
                )}
                placeholder='{\n  "event": "lead.converted",\n  "data": { ... }\n}'
              />
              {jsonError && (
                <p className="text-sm text-destructive">{jsonError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                💡 Campos obrigatórios: <code className="bg-muted px-1 rounded">event</code> (string) e <code className="bg-muted px-1 rounded">data</code> (object)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTestDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleTestWebhook}>
              <Send className="mr-2 h-4 w-4" />
              Enviar Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
