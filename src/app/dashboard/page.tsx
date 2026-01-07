'use client'

import Link from 'next/link'
import { Card, Button } from '@/shared/ui'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <h2 className="text-xl font-semibold mb-4">Flows</h2>
          <p className="text-gray-600 mb-4">
            Gerencie seus flows de automação
          </p>
          <Link href="/flows">
            <Button className="w-full">Ver Flows</Button>
          </Link>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold mb-4">Webhooks</h2>
          <p className="text-gray-600 mb-4">
            Visualize webhooks recebidos
          </p>
          <Link href="/webhooks">
            <Button className="w-full">Ver Webhooks</Button>
          </Link>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold mb-4">Criar Flow</h2>
          <p className="text-gray-600 mb-4">
            Crie um novo flow de automação
          </p>
          <Link href="/flows/builder">
            <Button className="w-full">Criar Flow</Button>
          </Link>
        </Card>
      </div>
    </div>
  )
}

