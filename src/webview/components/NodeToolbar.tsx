import React from 'react'
import { NodeToolbar as RFNodeToolbar, Position } from '@xyflow/react'

interface NodeToolbarProps {
  isVisible?: boolean
}

// Placeholder toolbar — Epic 5 (Story 5.3) adds: edit, shape, duplicate, lock, delete
export default function NodeToolbar({ isVisible }: NodeToolbarProps): React.JSX.Element {
  return (
    <RFNodeToolbar isVisible={isVisible} position={Position.Top}>
      {/* Epic 5 (Story 5.3): toolbar actions go here */}
    </RFNodeToolbar>
  )
}
