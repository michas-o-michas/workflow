import { NextRequest, NextResponse } from 'next/server'
import { webhookService } from '@/features/webhooks'

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')
    const webhooks = await webhookService.getRecentWebhooks(limit)
    return NextResponse.json(webhooks)
  } catch (error) {
    console.error('Error fetching webhooks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

