import React, { useMemo, useEffect, useCallback, useState } from 'react'
import {
  ReactFlow, Background, BackgroundVariant, applyNodeChanges, SelectionMode, ConnectionMode,
  ReactFlowProvider, useReactFlow, MiniMap,
} from '@xyflow/react'
import type { NodeChange, Node, Connection, NodeMouseHandler, XYPosition } from '@xyflow/react'
import { useStore, useShallow, GRID_SNAP } from '@/lib/store'
import type { FlowNodeData, NodeShape } from '@/lib/store'
import { findDropTargetSubgraph, isNodeOutsideParent, toRelativePosition, toAbsolutePosition } from '@/lib/subgraphHitTest'
import FlowNode from '@/components/FlowNode'
import SubgraphNode from '@/components/SubgraphNode'
import FlowEdge from '@/components/FlowEdge'
import CanvasSidebar from '@/components/CanvasSidebar'
import ZoomBar from '@/components/ZoomBar'
import { computeDimmedNodeIds, computeConnectedEdgeIds } from '@/lib/selection'

// CRITICAL: nodeTypes must be at module scope — never inside the component.
// React Flow compares nodeTypes by reference on every render. If defined inside
// the component, it creates a new object each render, causing all nodes to
// remount and flicker. Module-scope definition = stable reference.
const nodeTypes = { flowNode: FlowNode, subgraphNode: SubgraphNode }
const edgeTypes = { default: FlowEdge }
const VALID_PALETTE_SHAPES = new Set<string>(['rectangle', 'rounded', 'pill', 'diamond', 'circle', 'hexagon', 'cylinder', 'subgraph'])

function CanvasFlow(): React.JSX.Element {
  const { screenToFlowPosition, setViewport: rfSetViewport, fitView, zoomIn, zoomOut, zoomTo } = useReactFlow()
  const nodes = useStore(s => s.nodes)
  const edges = useStore(s => s.edges)
  const applyFlowChanges = useStore(s => s.applyFlowChanges)
  const deselectAll = useStore(s => s.deselectAll)
  const setViewport = useStore(s => s.setViewport)
  const viewportToRestore = useStore(s => s.viewportToRestore)
  const clearViewportRestore = useStore(s => s.clearViewportRestore)
  const fitViewRequested = useStore(s => s.fitViewRequested)
  const clearFitViewRequest = useStore(s => s.clearFitViewRequest)
  const moveNodes = useStore(s => s.moveNodes)
  const removeNodes = useStore(s => s.removeNodes)
  const removeEdges = useStore(s => s.removeEdges)
  const assignToSubgraph = useStore(s => s.assignToSubgraph)
  const removeFromSubgraph = useStore(s => s.removeFromSubgraph)
  const { pendingConnect, setPendingConnect, spawnConnectedNode, addEdge } = useStore(
    useShallow(s => ({
      pendingConnect: s.pendingConnect,
      setPendingConnect: s.setPendingConnect,
      spawnConnectedNode: s.spawnConnectedNode,
      addEdge: s.addEdge,
    }))
  )
  const addNode = useStore(s => s.addNode)
  const addSubgraph = useStore(s => s.addSubgraph)
  const pendingAddNode = useStore(s => s.pendingAddNode)
  const clearPendingAddNode = useStore(s => s.clearPendingAddNode)
  const pendingZoomAction = useStore(s => s.pendingZoomAction)
  const clearPendingZoomAction = useStore(s => s.clearPendingZoomAction)
  const setSyncDirection = useStore(s => s.setSyncDirection)
  const minimapOpen = useStore(s => s.minimapOpen)
  const isLocked = useStore(s => s.isLocked)

  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  // Compute dimmed node IDs — pure derivation, not stored
  const dimmedNodeIds = useMemo(
    () => computeDimmedNodeIds(nodes, edges),
    [nodes, edges]
  )

  // Build display nodes: apply className='dimmed' and/or 'drop-target' where needed.
  // Uses original `nodes` reference when nothing to dim (avoids unnecessary re-render).
  const displayNodes = useMemo(() => {
    let result = dimmedNodeIds.size > 0
      ? nodes.map(n => dimmedNodeIds.has(n.id) ? { ...n, className: 'dimmed' } : n)
      : nodes
    if (dropTargetId) {
      result = result.map(n =>
        n.id === dropTargetId
          ? { ...n, className: [n.className, 'drop-target'].filter(Boolean).join(' ') }
          : n
      )
    }
    return result
  }, [nodes, dimmedNodeIds, dropTargetId])

  const connectedEdgeIds = useMemo(
    () => computeConnectedEdgeIds(nodes, edges),
    [nodes, edges]
  )

  const displayEdges = useMemo(
    () =>
      connectedEdgeIds.size > 0
        ? edges.map(e => connectedEdgeIds.has(e.id) ? { ...e, className: 'flow-edge--connected' } : e)
        : edges,
    [edges, connectedEdgeIds]
  )

  function handleConnect(connection: Connection): void {
    if (!connection.source || !connection.target) return
    addEdge(connection as { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null })
  }

  function handleNodeDragStart(): void {
    setSyncDirection('canvas')
  }

  function handleNodeDrag(
    _event: React.MouseEvent,
    draggedNode: Node<FlowNodeData>,
  ): void {
    if (draggedNode.parentId) { setDropTargetId(null); return }
    const allNodes = useStore.getState().nodes
    setDropTargetId(findDropTargetSubgraph(draggedNode, allNodes))
  }

  function handleNodeDragStop(
    _event: React.MouseEvent,
    _node: Node<FlowNodeData>,
    draggedNodes: Node<FlowNodeData>[]
  ): void {
    setDropTargetId(null)
    const allNodes = useStore.getState().nodes
    const toMove: Array<{ id: string; position: XYPosition }> = []
    for (const draggedNode of draggedNodes) {
      if (draggedNode.parentId) {
        const parent = allNodes.find(n => n.id === draggedNode.parentId)
        if (parent && isNodeOutsideParent(draggedNode, parent)) {
          const absPos = toAbsolutePosition(draggedNode.position, parent.position)
          removeFromSubgraph(draggedNode.id, absPos)
        } else if (parent) {
          toMove.push({ id: draggedNode.id, position: draggedNode.position })
        }
        // if !parent: parentId is stale (parent deleted); skip to avoid pushing relative coords as absolute
      } else {
        const targetId = findDropTargetSubgraph(draggedNode, allNodes)
        if (targetId) {
          const sg = allNodes.find(n => n.id === targetId)!
          const relPos = toRelativePosition(draggedNode.position, sg.position)
          assignToSubgraph(draggedNode.id, targetId, relPos)
        } else {
          toMove.push({ id: draggedNode.id, position: draggedNode.position })
        }
      }
    }
    if (toMove.length > 0) moveNodes(toMove)
    useStore.getState().setSyncDirection(null)
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

  function handleCanvasDragOver(e: React.DragEvent): void {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function handleCanvasDrop(e: React.DragEvent): void {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/reactflow-palette')
    if (!raw || !VALID_PALETTE_SHAPES.has(raw)) return
    const shape = raw as NodeShape
    const rawPos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const position = {
      x: Math.round(rawPos.x / GRID_SNAP) * GRID_SNAP,
      y: Math.round(rawPos.y / GRID_SNAP) * GRID_SNAP,
    }
    if (shape === 'subgraph') {
      addSubgraph()
    } else {
      addNode({
        id: crypto.randomUUID(),
        type: 'flowNode',
        position,
        data: { label: 'New Node', shape },
      })
    }
  }

  useEffect(() => {
    if (!viewportToRestore) return
    clearViewportRestore()
    rfSetViewport(viewportToRestore)
  }, [viewportToRestore, clearViewportRestore, rfSetViewport])

  useEffect(() => {
    if (!fitViewRequested) return
    clearFitViewRequest()
    fitView({ padding: 0.1, duration: 0 })
  }, [fitViewRequested, clearFitViewRequest, fitView])

  // Flush any stale signals that accumulated while this component was unmounted (Canvas panel hidden)
  useEffect(() => {
    clearPendingAddNode()
    clearPendingZoomAction()
  }, [clearPendingAddNode, clearPendingZoomAction])

  useEffect(() => {
    if (!pendingAddNode) return
    const { shape } = pendingAddNode
    clearPendingAddNode()
    const el = document.querySelector('.react-flow')
    const rect = el?.getBoundingClientRect()
    const screenCenter = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const rawPos = screenToFlowPosition(screenCenter)
    const position = {
      x: Math.round(rawPos.x / GRID_SNAP) * GRID_SNAP,
      y: Math.round(rawPos.y / GRID_SNAP) * GRID_SNAP,
    }
    if (shape === 'subgraph') {
      addSubgraph()
    } else {
      addNode({
        id: crypto.randomUUID(),
        type: 'flowNode',
        position,
        data: { label: 'New Node', shape },
      })
    }
  }, [pendingAddNode, clearPendingAddNode, screenToFlowPosition, addNode, addSubgraph])

  useEffect(() => {
    if (!pendingZoomAction) return
    clearPendingZoomAction()
    switch (pendingZoomAction) {
      case 'in': zoomIn({ duration: 200 }); break
      case 'out': zoomOut({ duration: 200 }); break
      case 'reset': zoomTo(1, { duration: 200 }); break
      case 'fit': fitView({ padding: 0.1, duration: 200 }); break
    }
  }, [pendingZoomAction, clearPendingZoomAction, zoomIn, zoomOut, zoomTo, fitView])

  // Escape key deselects all nodes and clears pendingConnect; Delete/Backspace removes selected nodes
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      const activeTag = (document.activeElement as HTMLElement)?.tagName
      const isEditableActive = activeTag === 'INPUT' || activeTag === 'TEXTAREA'
        || !!(document.activeElement as HTMLElement)?.isContentEditable

      if (e.key === 'Escape') {
        if (!isEditableActive) {
          deselectAll()
          setPendingConnect(null)
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isEditableActive) return
        const selectedNodeIds = useStore.getState().nodes
          .filter(n => n.selected)
          .map(n => n.id)
        const selectedEdgeIds = useStore.getState().edges
          .filter(e => e.selected)
          .map(e => e.id)
        if (selectedNodeIds.length > 0) {
          removeNodes(selectedNodeIds)
          setPendingConnect(null)
        } else if (selectedEdgeIds.length > 0) {
          removeEdges(selectedEdgeIds)
        }
      }

      // Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (isEditableActive) return
        e.preventDefault()
        useStore.getState().undo()
        return
      }

      // Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        if (isEditableActive) return
        e.preventDefault()
        useStore.getState().redo()
        return
      }

      // Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        if (isEditableActive) return
        e.preventDefault()
        useStore.getState().selectAll()
        return
      }

      // Duplicate selected nodes
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        if (isEditableActive) return
        e.preventDefault()
        const selectedIds = useStore.getState().nodes
          .filter(n => n.selected)
          .map(n => n.id)
        if (selectedIds.length > 0) {
          useStore.getState().duplicateNodes(selectedIds)
        }
        return
      }

      // Block zoom + arrow nudge when canvas is locked
      if (useStore.getState().isLocked) return

      // Arrow key nudge — moves selected top-level non-subgraph nodes by GRID_SNAP
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
          && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (isEditableActive) return
        const nudgeable = useStore.getState().nodes
          .filter(n => n.selected && !n.parentId && !n.data.isSubgraph)
        if (nudgeable.length === 0) return
        e.preventDefault()
        const deltas: Record<string, { x: number; y: number }> = {
          ArrowUp:    { x: 0,          y: -GRID_SNAP },
          ArrowDown:  { x: 0,          y:  GRID_SNAP },
          ArrowLeft:  { x: -GRID_SNAP, y: 0 },
          ArrowRight: { x:  GRID_SNAP, y: 0 },
        }
        const delta = deltas[e.key]
        useStore.getState().moveNodes(
          nudgeable.map(n => ({
            id: n.id,
            position: { x: n.position.x + delta.x, y: n.position.y + delta.y },
          }))
        )
        return
      }

      // Zoom shortcuts
      if (e.ctrlKey) {
        if (isEditableActive) return
        if (e.key === '0' && !e.shiftKey) {
          e.preventDefault()
          zoomTo(1, { duration: 200 })
          return
        }
        if ((e.key === '=' || e.key === '+') && !e.shiftKey) {
          e.preventDefault()
          zoomIn({ duration: 200 })
          return
        }
        if (e.key === '-' && !e.shiftKey) {
          e.preventDefault()
          zoomOut({ duration: 200 })
          return
        }
        if (e.key === 'F' && e.shiftKey) {
          e.preventDefault()
          fitView({ padding: 0.1, duration: 200 })
          return
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deselectAll, removeNodes, removeEdges, setPendingConnect, zoomIn, zoomOut, zoomTo, fitView])

  return (
    <div
      className={`canvas-container${pendingConnect ? ' canvas--pending-connect' : ''}`}
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
    >
      <CanvasSidebar />
      <ZoomBar />
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onConnect={handleConnect}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onViewportChange={(vp) => setViewport(vp)}
        connectionMode={ConnectionMode.Loose}
        snapToGrid={true}
        snapGrid={[GRID_SNAP, GRID_SNAP] as [number, number]}
        colorMode="dark"
        multiSelectionKeyCode="Shift"
        selectionOnDrag={false}
        panOnDrag={!isLocked}
        panOnScroll={!isLocked}
        zoomOnScroll={!isLocked}
        zoomOnPinch={!isLocked}
        minZoom={0.1}
        maxZoom={4}
        selectionMode={SelectionMode.Partial}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={GRID_SNAP}
          size={1}
          color="rgba(255,255,255,0.055)"
        />
        {minimapOpen && <MiniMap />}
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
