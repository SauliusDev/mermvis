import React from 'react'
import { ReactFlow, Background, BackgroundVariant } from '@xyflow/react'
import { useStore } from '@/lib/store'
import FlowNode from '@/components/FlowNode'

// CRITICAL: nodeTypes must be at module scope — never inside the component.
// React Flow compares nodeTypes by reference on every render. If defined inside
// the component, it creates a new object each render, causing all nodes to
// remount and flicker. Module-scope definition = stable reference.
const nodeTypes = { flowNode: FlowNode }

export default function Canvas(): React.JSX.Element {
  const nodes = useStore(s => s.nodes)
  const edges = useStore(s => s.edges)

  return (
    <div className="canvas-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode="dark"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255,255,255,0.055)"
        />
      </ReactFlow>
    </div>
  )
}
