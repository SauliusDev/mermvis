import React from 'react'
import { useStore } from '@/lib/store'
import type { Node } from '@xyflow/react'
import type { FlowNodeData } from '@/lib/store'

export default function CanvasSidebar(): React.JSX.Element {
  const nodes = useStore(s => s.nodes)
  const addNode = useStore(s => s.addNode)
  const addSubgraph = useStore(s => s.addSubgraph)

  function handleAddNode(): void {
    const position = { x: 50 + nodes.length * 30, y: 50 + nodes.length * 30 }
    const node: Node<FlowNodeData> = {
      id: crypto.randomUUID(),
      type: 'flowNode',
      position,
      data: { label: 'New Node', shape: 'rectangle' },
    }
    addNode(node)
  }

  return (
    <div className="canvas-sidebar">
      <button className="canvas-sidebar__btn" onClick={handleAddNode} title="Add Node">
        +
      </button>
      <button className="canvas-sidebar__btn" onClick={addSubgraph} title="Add Subgraph">
        ⊞
      </button>
    </div>
  )
}
