import React, { useMemo, useEffect, useCallback } from 'react'
import {
  ReactFlow, Background, BackgroundVariant, applyNodeChanges, SelectionMode, ConnectionMode,
  ReactFlowProvider, useReactFlow,
} from '@xyflow/react'
import type { NodeChange, Node, Connection, NodeMouseHandler } from '@xyflow/react'
import { useStore, useShallow, GRID_SNAP } from '@/lib/store'
import type { FlowNodeData } from '@/lib/store'
import FlowNode from '@/components/FlowNode'
import FlowEdge from '@/components/FlowEdge'
import CanvasSidebar from '@/components/CanvasSidebar'
import { computeDimmedNodeIds } from '@/lib/selection'

// CRITICAL: nodeTypes must be at module scope — never inside the component.
// React Flow compares nodeTypes by reference on every render. If defined inside
// the component, it creates a new object each render, causing all nodes to
// remount and flicker. Module-scope definition = stable reference.
const nodeTypes = { flowNode: FlowNode }
const edgeTypes = { default: FlowEdge }

function CanvasFlow(): React.JSX.Element {
  const { screenToFlowPosition } = useReactFlow()
  const nodes = useStore(s => s.nodes)
  const edges = useStore(s => s.edges)
  const applyFlowChanges = useStore(s => s.applyFlowChanges)
  const deselectAll = useStore(s => s.deselectAll)
  const moveNodes = useStore(s => s.moveNodes)
  const removeNodes = useStore(s => s.removeNodes)
  const { pendingConnect, setPendingConnect, spawnConnectedNode, addEdge } = useStore(
    useShallow(s => ({
      pendingConnect: s.pendingConnect,
      setPendingConnect: s.setPendingConnect,
      spawnConnectedNode: s.spawnConnectedNode,
      addEdge: s.addEdge,
    }))
  )

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

  function handleConnect(connection: Connection): void {
    if (!connection.source || !connection.target) return
    addEdge(connection as { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null })
  }

  function handleNodeDragStop(
    _event: React.MouseEvent,
    _node: Node<FlowNodeData>,
    draggedNodes: Node<FlowNodeData>[]
  ): void {
    moveNodes(draggedNodes.map(n => ({ id: n.id, position: n.position })))
  }

  function handleNodesChange(changes: NodeChange[]): void {
    // Exclude 'remove' changes — node deletion with undo history is implemented in Story 2.6.
    // Allowing remove changes here would delete nodes via applyFlowChanges (no history entry).
    const safeChanges = changes.filter(c => c.type !== 'remove')
    if (safeChanges.length === 0) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applyFlowChanges(applyNodeChanges(safeChanges, nodes) as any)
  }

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    if (!pendingConnect) return
    if (node.id === pendingConnect.sourceId) {
      setPendingConnect(null)
      return
    }
    addEdge({ source: pendingConnect.sourceId, target: node.id })
    setPendingConnect(null)
  }, [pendingConnect, setPendingConnect, addEdge])

  const handlePaneClick = useCallback((e: React.MouseEvent) => {
    if (!pendingConnect) return
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    spawnConnectedNode(pendingConnect.sourceId, position)
    setPendingConnect(null)
  }, [pendingConnect, setPendingConnect, spawnConnectedNode, screenToFlowPosition])

  // Escape key deselects all nodes and clears pendingConnect; Delete/Backspace removes selected nodes
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      const activeTag = (document.activeElement as HTMLElement)?.tagName
      if (e.key === 'Escape') {
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          deselectAll()
          setPendingConnect(null)
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return
        const selectedIds = useStore.getState().nodes
          .filter(n => n.selected)
          .map(n => n.id)
        if (selectedIds.length > 0) {
          removeNodes(selectedIds)
          setPendingConnect(null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deselectAll, removeNodes, setPendingConnect])

  return (
    <div className={`canvas-container${pendingConnect ? ' canvas--pending-connect' : ''}`}>
      <CanvasSidebar />
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onConnect={handleConnect}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        connectionMode={ConnectionMode.Loose}
        snapToGrid={true}
        snapGrid={[GRID_SNAP, GRID_SNAP] as [number, number]}
        colorMode="dark"
        multiSelectionKeyCode="Shift"
        selectionOnDrag={true}
        panOnDrag={false}
        panOnScroll={true}
        selectionMode={SelectionMode.Partial}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={GRID_SNAP}
          size={1}
          color="rgba(255,255,255,0.055)"
        />
      </ReactFlow>
    </div>
  )
}

export default function Canvas(): React.JSX.Element {
  return (
    <ReactFlowProvider>
      <CanvasFlow />
    </ReactFlowProvider>
  )
}
