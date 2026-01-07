/**
 * Condition Node - Componente visual de nó de condição
 * 
 * Exibe um nó de condição com handles "yes" (verde) e "no" (vermelho).
 * 
 * @module features/flow-builder/ui/ConditionNode
 */

import { Handle, Position, NodeProps } from 'reactflow'
import { GitBranch } from 'lucide-react'
import type { ConditionNodeData } from '@/entities/flow'
import { CONDITION_HANDLES } from '@/shared/lib/constants'

/**
 * Componente visual de nó de condição
 */
export function ConditionNode({ data }: NodeProps<ConditionNodeData>) {
  const hasField = data.field && data.field.trim() !== ''
  const displayText = hasField 
    ? `${data.field} ${data.operator} ${String(data.value)}`
    : 'Configure a condição'

  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-yellow-500 text-white min-w-[180px] relative">
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4" />
        <div className="font-bold text-sm">Condition</div>
      </div>
      <div className={`mt-2 text-xs ${!hasField ? 'italic opacity-75' : ''}`}>
        {displayText}
      </div>
      
      {/* Container para handles e labels */}
      <div className="relative mt-3 pb-6">
        {/* Handle YES (esquerda) - React Flow gerencia o posicionamento */}
        <Handle
          type="source"
          position={Position.Bottom}
          id={CONDITION_HANDLES.YES}
          className="w-4 h-4 bg-green-500 border-2 border-white hover:bg-green-400"
          style={{ left: '30%' }}
        />
        {/* Label YES */}
        <div 
          className="absolute left-[30%] top-5 transform -translate-x-1/2 pointer-events-none"
          style={{ marginTop: '4px' }}
        >
          <span className="text-[10px] font-bold bg-green-600 px-2 py-0.5 rounded text-white shadow-md whitespace-nowrap">
            YES
          </span>
        </div>
        
        {/* Handle NO (direita) - React Flow gerencia o posicionamento */}
        <Handle
          type="source"
          position={Position.Bottom}
          id={CONDITION_HANDLES.NO}
          className="w-4 h-4 bg-red-500 border-2 border-white hover:bg-red-400"
          style={{ left: '70%' }}
        />
        {/* Label NO */}
        <div 
          className="absolute left-[70%] top-5 transform -translate-x-1/2 pointer-events-none"
          style={{ marginTop: '4px' }}
        >
          <span className="text-[10px] font-bold bg-red-600 px-2 py-0.5 rounded text-white shadow-md whitespace-nowrap">
            NO
          </span>
        </div>
      </div>
      
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
    </div>
  )
}
