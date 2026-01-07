/**
 * API Route: Flows by ID
 * 
 * Rotas para operações CRUD em flows específicos:
 * - GET: Busca um flow por ID
 * - PUT: Atualiza um flow
 * - DELETE: Deleta um flow
 * 
 * @module app/api/flows/[id]/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { flowService } from '@/features/flows'
import { FlowNotFoundError, ValidationError } from '@/shared/lib/errors'
import { logger } from '@/shared/lib/logger'

/**
 * Busca um flow por ID
 * 
 * GET /api/flows/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const flow = await flowService.findById(params.id)
    
    if (!flow) {
      logger.warn(`Flow não encontrado: ${params.id}`)
      return NextResponse.json(
        { error: 'Flow not found' },
        { status: 404 }
      )
    }

    logger.debug(`Flow encontrado: ${params.id}`)
    return NextResponse.json(flow)
  } catch (error) {
    logger.error(`Erro ao buscar flow: ${params.id}`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Atualiza um flow
 * 
 * PUT /api/flows/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    logger.info(`Atualizando flow: ${params.id}`, {
      nodesCount: body.nodes?.length || 0,
      edgesCount: body.edges?.length || 0,
    })
    
    const flow = await flowService.update(params.id, body)
    
    logger.info(`Flow atualizado com sucesso: ${params.id}`)
    return NextResponse.json(flow)
  } catch (error) {
    if (error instanceof FlowNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message, field: error.field },
        { status: error.statusCode }
      )
    }
    
    logger.error(`Erro ao atualizar flow: ${params.id}`, error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
}

/**
 * Deleta um flow
 * 
 * DELETE /api/flows/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.info(`Deletando flow: ${params.id}`)
    await flowService.delete(params.id)
    
    logger.info(`Flow deletado com sucesso: ${params.id}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof FlowNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    
    logger.error(`Erro ao deletar flow: ${params.id}`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
