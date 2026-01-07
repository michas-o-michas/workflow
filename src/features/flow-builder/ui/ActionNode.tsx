import { Handle, Position, NodeProps } from 'reactflow'
import { Zap } from 'lucide-react'
import type { ActionNodeData } from '@/entities/flow'

export function ActionNode({ data }: NodeProps<ActionNodeData>) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-green-500 text-white min-w-[150px]">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4" />
        <div className="font-bold text-sm">Action</div>
      </div>
      <div className="mt-2 text-xs">
        {data.type}
      </div>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  )
}

