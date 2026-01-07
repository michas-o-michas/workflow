import { Handle, Position, NodeProps } from 'reactflow'
import { Circle } from 'lucide-react'
import type { EndNodeData } from '@/entities/flow'

export function EndNode({ data }: NodeProps<EndNodeData>) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-red-500 text-white min-w-[150px]">
      <div className="flex items-center gap-2">
        <Circle className="w-4 h-4" />
        <div className="font-bold text-sm">End</div>
      </div>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
    </div>
  )
}

