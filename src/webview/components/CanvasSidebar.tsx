import React from 'react'
import { useReactFlow } from '@xyflow/react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '@/lib/store'
import { applyDagreLayout } from '@/lib/layout'
import type { Node } from '@xyflow/react'
import type { FlowNodeData } from '@/lib/store'

export default function CanvasSidebar(): React.JSX.Element {
  const { fitView } = useReactFlow()

  const nodes = useStore(s => s.nodes)
  const edges = useStore(s => s.edges)
  const past = useStore(s => s.history.past)
  const future = useStore(s => s.history.future)

  const { addNode, addSubgraph, moveNodes, undo, redo, deselectAll } = useStore(
    useShallow(s => ({
      addNode: s.addNode,
      addSubgraph: s.addSubgraph,
      moveNodes: s.moveNodes,
      undo: s.undo,
      redo: s.redo,
      deselectAll: s.deselectAll,
    }))
  )

  const canUndo = past.length > 0
  const canRedo = future.length > 0

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

  function handleAutoLayout(): void {
    if (nodes.length === 0) return
    const laidOutNodes = applyDagreLayout(nodes, edges)
    const updates = laidOutNodes.map(n => ({ id: n.id, position: n.position }))
    moveNodes(updates)
    fitView({ padding: 0.1 })
  }

  function handleZoomToFit(): void {
    fitView({ padding: 0.1 })
  }

  return (
    <div className="canvas-sidebar" role="toolbar" aria-label="Canvas tools">
      <button className="canvas-sidebar__btn" aria-label="Select" onClick={deselectAll}>
        ↖
      </button>
      <button className="canvas-sidebar__btn" aria-label="Add Node" onClick={handleAddNode}>
        ＋
      </button>
      <button className="canvas-sidebar__btn" aria-label="Add Edge">
        ⌁
      </button>
      <button className="canvas-sidebar__btn" aria-label="Add Subgraph" onClick={addSubgraph}>
        ⊞
      </button>
      <div className="canvas-sidebar__divider" aria-hidden="true" />
      <button
        className="canvas-sidebar__btn"
        aria-label="Undo"
        disabled={!canUndo}
        onClick={undo}
      >
        ↩
      </button>
      <button
        className="canvas-sidebar__btn"
        aria-label="Redo"
        disabled={!canRedo}
        onClick={redo}
      >
        ↪
      </button>
      <div className="canvas-sidebar__divider" aria-hidden="true" />
      <button className="canvas-sidebar__btn" aria-label="Auto Layout" onClick={handleAutoLayout}>
        ⬡
      </button>
      <button className="canvas-sidebar__btn" aria-label="Zoom to Fit" onClick={handleZoomToFit}>
        ⤢
      </button>
    </div>
  )
}
