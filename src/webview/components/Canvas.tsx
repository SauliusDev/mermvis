import React, { useMemo, useEffect } from 'react'
import {
  ReactFlow, Background, BackgroundVariant, applyNodeChanges, SelectionMode,
} from '@xyflow/react'
import type { NodeChange } from '@xyflow/react'
import { useStore } from '@/lib/store'
import FlowNode from '@/components/FlowNode'
import CanvasSidebar from '@/components/CanvasSidebar'
import { computeDimmedNodeIds } from '@/lib/selection'

// CRITICAL: nodeTypes must be at module scope — never inside the component.
// React Flow compares nodeTypes by reference on every render. If defined inside
// the component, it creates a new object each render, causing all nodes to
// remount and flicker. Module-scope definition = stable reference.
const nodeTypes = { flowNode: FlowNode }

export default function Canvas(): React.JSX.Element {
  const nodes = useStore(s => s.nodes)
  const edges = useStore(s => s.edges)
  const applyFlowChanges = useStore(s => s.applyFlowChanges)
  const deselectAll = useStore(s => s.deselectAll)

  // Compute dimmed node IDs — pure derivation, not stored
  const dimmedNodeIds = useMemo(
    () => computeDimmedNodeIds(nodes, edges),
    [nodes, edges]
  )

  // Build display nodes: add className='dimmed' where needed.
  // Uses original `nodes` reference when nothing to dim (avoids unnecessary re-render).
  const displayNodes = useMemo(
    () =>
      dimmedNodeIds.size > 0
        ? nodes.map(n => dimmedNodeIds.has(n.id) ? { ...n, className: 'dimmed' } : n)
        : nodes,
    [nodes, dimmedNodeIds]
  )

  function handleNodesChange(changes: NodeChange[]): void {
    // Exclude 'remove' changes — node deletion with undo history is implemented in Story 2.6.
    // Allowing remove changes here would delete nodes via applyFlowChanges (no history entry).
    const safeChanges = changes.filter(c => c.type !== 'remove')
    if (safeChanges.length === 0) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applyFlowChanges(applyNodeChanges(safeChanges, nodes) as any)
  }

  // Escape key deselects all nodes
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') deselectAll()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deselectAll])

  return (
    <div className="canvas-container">
      <CanvasSidebar />
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        colorMode="dark"
        multiSelectionKeyCode="Shift"
        selectionOnDrag={true}
        panOnDrag={false}
        panOnScroll={true}
        selectionMode={SelectionMode.Partial}
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
