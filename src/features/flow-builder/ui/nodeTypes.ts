/**
 * Node Types - Mapeamento de tipos de nós para componentes
 * 
 * @module features/flow-builder/ui/nodeTypes
 */

import { TriggerNode } from './TriggerNode'
import { ConditionNode } from './ConditionNode'
import { ActionNode } from './ActionNode'
import { EndNode } from './EndNode'
import { NODE_TYPES } from '@/shared/lib/constants'

/**
 * Mapeamento de tipos de nós para seus componentes React Flow
 */
export const nodeTypes = {
  [NODE_TYPES.TRIGGER]: TriggerNode,
  [NODE_TYPES.CONDITION]: ConditionNode,
  [NODE_TYPES.ACTION]: ActionNode,
  [NODE_TYPES.END]: EndNode,
}
