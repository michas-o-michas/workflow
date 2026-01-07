import { Handle, Position, NodeProps } from 'reactflow'
import { Radio } from 'lucide-react'
import type { TriggerNodeData } from '@/entities/flow'

export function TriggerNode({ data }: NodeProps<TriggerNodeData>) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-blue-500 text-white min-w-[150px]">
      <div className="flex items-center gap-2">
        <Radio className="w-4 h-4" />
        <div className="font-bold text-sm">Trigger</div>
      </div>
      <div className="mt-2 text-xs">
        {data.event || 'No event'}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  )
}

