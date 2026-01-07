'use client'

import { Bell, Search } from 'lucide-react'
import { Input } from '@/shared/ui'
import { Badge } from '@/shared/ui'

export function Header() {
  return (
    <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar flows, webhooks..."
            className="pl-9"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
          <Bell className="h-5 w-5" />
          <Badge 
            variant="destructive" 
            className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]"
          >
            3
          </Badge>
        </button>
      </div>
    </header>
  )
}

