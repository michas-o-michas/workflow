import { NextRequest, NextResponse } from 'next/server'
import { flowService } from '@/features/flows'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const flow = await flowService.toggleActive(params.id)
    return NextResponse.json(flow)
  } catch (error) {
    console.error('Error toggling flow:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

