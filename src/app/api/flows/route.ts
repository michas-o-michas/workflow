/**
 * API Route: Flows
 * 
 * Rotas para operações em flows:
 * - GET: Lista todos os flows
 * - POST: Cria um novo flow
 * 
 * @module app/api/flows/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { flowService } from '@/features/flows'
import { ValidationError } from '@/shared/lib/errors'
import { logger } from '@/shared/lib/logger'

/**
 * Lista todos os flows
 * 
 * GET /api/flows
 */
export async function GET(request: NextRequest) {
  try {
    logger.debug('Buscando todos os flows')
    const flows = await flowService.findAll()
    
    logger.info(`Flows encontrados: ${flows.length}`)
    return NextResponse.json(flows)
  } catch (error) {
    logger.error('Erro ao buscar flows', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Cria um novo flow
 * 
 * POST /api/flows
 * 
 * Body esperado:
 * - name: string (obrigatório)
 * - nodes: Node[] (obrigatório)
 * - edges: Edge[] (obrigatório)
 * - active: boolean (opcional, padrão: false)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validação de campos obrigatórios
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      throw new ValidationError('Campo "name" é obrigatório e deve ser uma string não vazia', 'name')
    }
    
    if (!Array.isArray(body.nodes)) {
      throw new ValidationError('Campo "nodes" é obrigatório e deve ser um array', 'nodes')
    }
    
    if (!Array.isArray(body.edges)) {
      throw new ValidationError('Campo "edges" é obrigatório e deve ser um array', 'edges')
    }

    logger.info('Criando novo flow', {
      name: body.name,
      nodesCount: body.nodes.length,
      edgesCount: body.edges.length,
    })

    const flow = await flowService.create({
      name: body.name.trim(),
      active: body.active ?? false,
      nodes: body.nodes,
      edges: body.edges,
    })

    logger.info(`Flow criado com sucesso: ${flow.id}`)
    return NextResponse.json(flow, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message, field: error.field },
        { status: error.statusCode }
      )
    }
    
    logger.error('Erro ao criar flow', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
