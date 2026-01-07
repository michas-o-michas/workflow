'use client'

import { WebhookList } from '@/features/webhooks'
import { AppLayout } from '@/widgets/layout'

export default function WebhooksPage() {
  return (
    <AppLayout>
      <WebhookList />
    </AppLayout>
  )
}

