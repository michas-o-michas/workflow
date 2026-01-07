/**
 * API Route: Webhook Receiver
 * 
 * Recebe webhooks externos e processa flows automaticamente.
 * 
 * POST /api/webhook
 * 
 * Body esperado:
 * - event: string (obrigatório) - Nome do evento
 * - data: object (obrigatório) - Dados do evento
 * - version: string (opcional) - Versão do webhook
 * - occurredAt: string (opcional) - Data/hora do evento
 * 
 * Headers:
 * - x-webhook-signature: string (opcional) - Assinatura HMAC para validação
 * 
 * @module app/api/webhook/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { webhookService } from '@/features/webhooks'
import { env } from '@/shared/config/env'
import { WebhookError, ValidationError } from '@/shared/lib/errors'
import { logger } from '@/shared/lib/logger'
import crypto from 'crypto'

/**
 * Recebe e processa um webhook
 * 
 * POST /api/webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const signature = request.headers.get('x-webhook-signature')

    logger.info('Webhook recebido', { 
      event: body.event,
      hasSignature: !!signature,
    })

    // Validação HMAC (opcional)
    if (env.webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', env.webhookSecret)
        .update(JSON.stringify(body))
        .digest('hex')

      if (signature !== expectedSignature) {
        logger.warn('Assinatura HMAC inválida', { 
          event: body.event,
        })
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
      
      logger.debug('Assinatura HMAC validada com sucesso')
    }

    // Validação básica do payload
    if (!body.event || typeof body.event !== 'string') {
      throw new ValidationError('Campo "event" é obrigatório e deve ser uma string', 'event')
    }
    
    if (!body.data || typeof body.data !== 'object') {
      throw new ValidationError('Campo "data" é obrigatório e deve ser um objeto', 'data')
    }

    // Recebe e processa o webhook
    const webhookEvent = await webhookService.receiveWebhook({
      event: body.event,
      version: body.version || '1.0',
      occurredAt: body.occurredAt || new Date().toISOString(),
      data: body.data,
    })

    logger.info(`Webhook processado: ${webhookEvent.id}`)

    return NextResponse.json(
      { 
        success: true, 
        id: webhookEvent.id,
        message: 'Webhook received and queued for processing' 
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message, field: error.field },
        { status: error.statusCode }
      )
    }
    
    if (error instanceof WebhookError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    
    logger.error('Erro ao processar webhook', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
