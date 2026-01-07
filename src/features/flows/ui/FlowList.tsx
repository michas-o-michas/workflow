'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Button, Badge } from '@/shared/ui'
import type { Flow } from '@/entities/flow'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { 
  Play, 
  Pause, 
  Trash2, 
  Edit, 
  Plus, 
  Workflow,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react'

export function FlowList() {
  const [flows, setFlows] = useState<Flow[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchFlows()
  }, [])

  const fetchFlows = async () => {
    try {
      const response = await fetch('/api/flows')
      const data = await response.json()
      setFlows(data)
    } catch (error) {
      console.error('Error fetching flows:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (id: string) => {
    try {
      await fetch(`/api/flows/${id}/toggle`, { method: 'POST' })
      fetchFlows()
    } catch (error) {
      console.error('Error toggling flow:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este flow?')) return

    try {
      await fetch(`/api/flows/${id}`, { method: 'DELETE' })
      fetchFlows()
    } catch (error) {
      console.error('Error deleting flow:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="text-muted-foreground">Carregando flows...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Flows</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus flows de automação
          </p>
        </div>
        <Button onClick={() => router.push('/flows/builder')} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Novo Flow
        </Button>
      </div>

        {flows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Workflow className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum flow criado</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Crie seu primeiro flow de automação para começar a automatizar seus processos
            </p>
            <Button onClick={() => router.push('/flows/builder')}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Flow
            </Button>
          </CardContent>
          </Card>
        ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {flows.map((flow) => (
            <Card key={flow.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Workflow className="h-5 w-5 text-primary" />
                      {flow.name}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {flow.nodes.length} nós • {flow.edges.length} conexões
                    </CardDescription>
                  </div>
                  <Badge variant={flow.active ? "default" : "secondary"}>
                    {flow.active ? (
                      <><CheckCircle2 className="mr-1 h-3 w-3" /> Ativo</>
                    ) : (
                      <><XCircle className="mr-1 h-3 w-3" /> Inativo</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(new Date(flow.updatedAt), 'dd/MM/yyyy')}
                  </div>
              </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/flows/builder/${flow.id}`)}
                  className="flex-1"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant={flow.active ? "secondary" : "default"}
                  size="sm"
                  onClick={() => handleToggleActive(flow.id)}
                >
                  {flow.active ? (
                    <><Pause className="h-4 w-4" /></>
                  ) : (
                    <><Play className="h-4 w-4" /></>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(flow.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        )}
    </div>
  )
}
