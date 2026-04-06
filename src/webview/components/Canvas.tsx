import React from 'react'
import { ReactFlow, Background, BackgroundVariant, applyNodeChanges } from '@xyflow/react'
import type { NodeChange } from '@xyflow/react'
import { useStore } from '@/lib/store'
import FlowNode from '@/components/FlowNode'
import CanvasSidebar from '@/components/CanvasSidebar'

// CRITICAL: nodeTypes must be at module scope — never inside the component.
// React Flow compares nodeTypes by reference on every render. If defined inside
// the component, it creates a new object each render, causing all nodes to
// remount and flicker. Module-scope definition = stable reference.
const nodeTypes = { flowNode: FlowNode }

export default function Canvas(): React.JSX.Element {
  const nodes = useStore(s => s.nodes)
  const edges = useStore(s => s.edges)
  const applyFlowChanges = useStore(s => s.applyFlowChanges)

  function handleNodesChange(changes: NodeChange[]): void {
    // applyNodeChanges returns NodeBase[] but our nodes are Node<FlowNodeData>[].
    // The cast is safe: applyNodeChanges only merges change geometry onto existing nodes.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applyFlowChanges(applyNodeChanges(changes, nodes) as any)
  }

  return (
    <div className="canvas-container">
      <CanvasSidebar />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
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
