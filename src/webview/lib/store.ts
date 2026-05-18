import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import type { Node, Edge, XYPosition } from '@xyflow/react'
import type { ParseSuccess } from './parser'

// ── Types ──────────────────────────────────────────────────────────────────────

export type SyncDirection = 'canvas' | 'code' | null

export type NodeShape =
  | 'rectangle'   // [label]     — Mermaid default rectangle
  | 'rounded'     // (label)     — rounded rectangle
  | 'pill'        // ([label])   — stadium/pill
  | 'diamond'     // {label}     — rhombus decision
  | 'circle'      // ((label))   — circle
  | 'hexagon'     // {{label}}   — preparation hexagon
  | 'cylinder'    // [(label)]   — database cylinder
  | 'subgraph'    // subgraph    — container (separate component in Story 4)

export type EdgeStyle =
  | 'arrow'       // -->   solid arrow
  | 'dotted'      // -.->  dotted arrow
  | 'thick'       // ==>   thick arrow
  | 'open'        // ---   no arrowhead

// React Flow requires custom data types to extend Record<string, unknown>
export interface FlowNodeData extends Record<string, unknown> {
  label: string
  shape: NodeShape
  isSubgraph?: boolean
  fillColor?: string
  strokeColor?: string
  textColor?: string
}

export interface FlowEdgeData extends Record<string, unknown> {
  label?: string
  style?: EdgeStyle
}

export interface CanvasSnapshot {
  nodes: Node<FlowNodeData>[]
  edges: Edge<FlowEdgeData>[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const MAX_HISTORY = 100
export const GRID_SNAP = 24

// ── Internal helpers ──────────────────────────────────────────────────────────

interface StoreState {
  nodes: Node<FlowNodeData>[]
  edges: Edge<FlowEdgeData>[]
  history: {
    past: CanvasSnapshot[]
    future: CanvasSnapshot[]
  }
  isDirty: boolean
  clearDirty: () => void
  fitViewRequested: boolean
  requestFitView: () => void
  clearFitViewRequest: () => void
  filename: string
  setFilename: (filename: string) => void
  syncDirection: SyncDirection
  setSyncDirection: (dir: SyncDirection) => void
  pendingConnect: { sourceId: string } | null
  addNode: (node: Node<FlowNodeData>) => void
  addSubgraph: () => void
  removeNode: (id: string) => void
  removeNodes: (ids: string[]) => void
  applyFlowChanges: (nodes: Node<FlowNodeData>[]) => void
  deselectAll: () => void
  updateNodeLabel: (id: string, label: string) => void
  moveNodes: (updates: Array<{ id: string; position: XYPosition }>) => void
  resizeNode: (id: string, dimensions: { width: number; height: number }, position?: XYPosition) => void
  removeEdge: (id: string) => void
  removeEdges: (ids: string[]) => void
  updateEdgeLabel: (id: string, label: string) => void
  addEdge: (connection: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }) => void
  setEdgeStyle: (id: string, style: EdgeStyle) => void
  assignToSubgraph: (nodeId: string, subgraphId: string, relativePosition: XYPosition) => void
  removeFromSubgraph: (nodeId: string, absolutePosition: XYPosition) => void
  setPendingConnect: (sourceId: string | null) => void
  spawnConnectedNode: (sourceId: string, position: { x: number; y: number }) => void
  updateNodeShape: (id: string, shape: NodeShape) => void
  duplicateNode: (id: string) => void
  toggleNodeLock: (id: string) => void
  updateNodeColors: (id: string, colors: { fillColor?: string; strokeColor?: string; textColor?: string }) => void
  viewport: { x: number; y: number; zoom: number }
  viewportToRestore: { x: number; y: number; zoom: number } | null
  setViewport: (vp: { x: number; y: number; zoom: number }) => void
  requestViewportRestore: (vp: { x: number; y: number; zoom: number }) => void
  clearViewportRestore: () => void
  undo: () => void
  redo: () => void
  importFromCode: (result: ParseSuccess) => void
}

// withHistory is called imperatively inside each store action.
// It is NOT a HOF wrapper — each action calls it directly with the precomputed next snapshot.
//
// No-op guard: if next.nodes and next.edges are the same references as current state,
// the action produced no change and no history entry is created.
//
// Immutability contract: each action MUST return original array references (state.nodes,
// state.edges) when nothing changed — never run Array.map() and throw away the result.
// Reference equality IS the no-op signal.
function withHistory(
  get: () => StoreState,
  set: (fn: (state: StoreState) => StoreState) => void,
  next: CanvasSnapshot
): void {
  const current = get()
  if (next.nodes === current.nodes && next.edges === current.edges) return
  set(state => ({
    ...state,
    nodes: next.nodes,
    edges: next.edges,
    isDirty: true,
    history: {
      // Cap past at MAX_HISTORY — slice before appending to avoid off-by-one
      past: [
        ...state.history.past.slice(-(MAX_HISTORY - 1)),
        { nodes: state.nodes, edges: state.edges },
      ],
      future: [],
    },
  }))
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useStore = create<StoreState>()((set, get) => ({
  nodes: [],
  edges: [],
  history: { past: [], future: [] },
  isDirty: false,
  clearDirty: () => set(s => ({ ...s, isDirty: false })),
  fitViewRequested: false,
  requestFitView: () => set(s => ({ ...s, fitViewRequested: true })),
  clearFitViewRequest: () => set(s => ({ ...s, fitViewRequested: false })),
  filename: 'untitled.mmd',
  setFilename: (filename) => set({ filename }),
  syncDirection: null,
  setSyncDirection: (dir) => set(s => ({ ...s, syncDirection: dir })),
  pendingConnect: null,
  viewport: { x: 0, y: 0, zoom: 1 },
  viewportToRestore: null,
  setViewport: (vp) => set(s => ({ ...s, viewport: vp })),
  requestViewportRestore: (vp) => set(s => ({ ...s, viewportToRestore: vp })),
  clearViewportRestore: () => set(s => ({ ...s, viewportToRestore: null })),

  addNode: (node) => {
    const { nodes, edges } = get()
    // addNode is never a no-op — always appends
    withHistory(get, set, { nodes: [...nodes, node], edges })
  },

  addSubgraph: () => {
    const { nodes, edges } = get()
    const id = crypto.randomUUID()
    const newNode: Node<FlowNodeData> = {
      id,
      position: { x: 60 + nodes.length * 20, y: 60 },
      type: 'subgraphNode',
      width: 300,
      height: 200,
      data: { label: 'Group', shape: 'subgraph', isSubgraph: true },
    }
    withHistory(get, set, { nodes: [...nodes, newNode], edges })
  },

  removeNodes: (ids) => {
    const { nodes, edges } = get()
    const idSet = new Set(ids)
    const nextNodes = nodes.filter(n => !idSet.has(n.id))
    if (nextNodes.length === nodes.length) return  // none matched — no-op

    // Promote direct children of deleted subgraphs to top-level
    const deletedSubgraphIds = nodes
      .filter(n => idSet.has(n.id) && n.data.isSubgraph)
      .map(n => n.id)

    let result = nextNodes
    if (deletedSubgraphIds.length > 0) {
      const deletedSgSet = new Set(deletedSubgraphIds)
      result = nextNodes.map(n => {
        if (!n.parentId || !deletedSgSet.has(n.parentId)) return n
        const sg = nodes.find(p => p.id === n.parentId)!
        const { parentId: _p, extent: _e, ...rest } = n
        return {
          ...rest,
          position: { x: n.position.x + sg.position.x, y: n.position.y + sg.position.y },
        }
      })
    }

    const nextEdges = edges.filter(e => !idSet.has(e.source) && !idSet.has(e.target))
    withHistory(get, set, { nodes: result, edges: nextEdges })
  },

  removeNode: (id) => {
    get().removeNodes([id])
  },

  removeEdges: (ids) => {
    const { nodes, edges } = get()
    const idSet = new Set(ids)
    const nextEdges = edges.filter(e => !idSet.has(e.id))
    if (nextEdges.length === edges.length) return
    withHistory(get, set, { nodes, edges: nextEdges })
  },

  removeEdge: (id) => {
    get().removeEdges([id])
  },

  updateEdgeLabel: (id, label) => {
    const { nodes, edges } = get()
    const edge = edges.find(e => e.id === id)
    if (!edge) return
    const trimmed = label.trim()
    const nextLabel: string | undefined = trimmed === '' ? undefined : trimmed
    if (edge.data?.label === nextLabel) return
    withHistory(get, set, {
      nodes,
      edges: edges.map(e =>
        e.id === id ? { ...e, data: { ...e.data, label: nextLabel } } : e
      ),
    })
  },

  setEdgeStyle: (id, style) => {
    const { nodes, edges } = get()
    const edge = edges.find(e => e.id === id)
    if (!edge) return
    if (edge.data?.style === style) return
    withHistory(get, set, {
      nodes,
      edges: edges.map(e =>
        e.id === id ? { ...e, data: { ...e.data, style } } : e
      ),
    })
  },

  addEdge: ({ source, target, sourceHandle, targetHandle }) => {
    const { nodes, edges } = get()
    if (source === target) return
    if (edges.some(e => e.source === source && e.target === target)) return
    const newEdge: Edge<FlowEdgeData> = {
      id: `e-${source}-${target}`,
      source,
      target,
      ...(sourceHandle ? { sourceHandle } : {}),
      ...(targetHandle ? { targetHandle } : {}),
      data: { style: 'arrow' },
      type: 'default',
    }
    withHistory(get, set, { nodes, edges: [...edges, newEdge] })
  },

  updateNodeLabel: (id, label) => {
    const { nodes, edges } = get()
    const target = nodes.find(n => n.id === id)
    if (!target || target.data.label === label) return  // not found or same label — no-op
    withHistory(get, set, {
      nodes: nodes.map(n => n.id === id ? { ...n, data: { ...n.data, label } } : n),
      edges,
    })
  },

  applyFlowChanges: (nodes) => {
    set(state => ({ ...state, nodes }))
  },

  deselectAll: () => {
    const { nodes } = get()
    if (!nodes.some(n => n.selected)) return
    set(state => ({
      ...state,
      nodes: state.nodes.map(n => n.selected ? { ...n, selected: false } : n),
    }))
  },

  moveNodes: (updates) => {
    const { nodes, edges } = get()
    let anyMoved = false
    const nextNodes = nodes.map(n => {
      const upd = updates.find(u => u.id === n.id)
      // Return same reference if no update or position unchanged — critical for no-op guard
      if (!upd || (upd.position.x === n.position.x && upd.position.y === n.position.y)) return n
      anyMoved = true
      return { ...n, position: upd.position }
    })
    if (!anyMoved) return  // all positions unchanged — no-op
    withHistory(get, set, { nodes: nextNodes, edges })
  },

  resizeNode: (id, dimensions, position) => {
    const { nodes, edges } = get()
    const target = nodes.find(n => n.id === id)
    if (!target) return  // id not found — no-op
    const sameSize = target.width === dimensions.width && target.height === dimensions.height
    const samePos = !position || (target.position.x === position.x && target.position.y === position.y)
    if (sameSize && samePos) return  // no-op guard — no history entry
    const nextNode = {
      ...target,
      width: dimensions.width,
      height: dimensions.height,
      ...(position ? { position } : {}),
    }
    withHistory(get, set, { nodes: nodes.map(n => n.id === id ? nextNode : n), edges })
  },

  assignToSubgraph: (nodeId, subgraphId, relativePosition) => {
    const { nodes, edges } = get()
    const node = nodes.find(n => n.id === nodeId)
    if (!node || node.parentId === subgraphId) return
    const updatedNode: Node<FlowNodeData> = {
      ...node,
      parentId: subgraphId,
      position: relativePosition,
      extent: 'parent' as const,
    }
    // React Flow requires parent to appear before its children in the array.
    const otherNodes = nodes.filter(n => n.id !== nodeId)
    const sgIndex = otherNodes.findIndex(n => n.id === subgraphId)
    if (sgIndex === -1) return
    const nextNodes = [
      ...otherNodes.slice(0, sgIndex + 1),
      updatedNode,
      ...otherNodes.slice(sgIndex + 1),
    ]
    withHistory(get, set, { nodes: nextNodes, edges })
  },

  removeFromSubgraph: (nodeId, absolutePosition) => {
    const { nodes, edges } = get()
    const node = nodes.find(n => n.id === nodeId)
    if (!node || !node.parentId) return
    const { parentId: _p, extent: _e, ...rest } = node
    const updatedNode: Node<FlowNodeData> = {
      ...rest,
      position: absolutePosition,
    }
    withHistory(get, set, {
      nodes: nodes.map(n => n.id === nodeId ? updatedNode : n),
      edges,
    })
  },

  setPendingConnect: (sourceId) => {
    set({ pendingConnect: sourceId ? { sourceId } : null })
  },

  spawnConnectedNode: (sourceId, position) => {
    const { nodes, edges } = get()
    const sourceNode = nodes.find(n => n.id === sourceId)
    if (!sourceNode) return
    const newId = crypto.randomUUID()
    const newNode: Node<FlowNodeData> = {
      id: newId,
      position,
      type: 'flowNode',
      data: { label: 'Node', shape: sourceNode.data.shape },
    }
    const newEdge: Edge<FlowEdgeData> = {
      id: `e-${sourceId}-${newId}`,
      source: sourceId,
      target: newId,
      data: { style: 'arrow' },
      type: 'default',
    }
    withHistory(get, set, {
      nodes: [...nodes, newNode],
      edges: [...edges, newEdge],
    })
  },

  updateNodeShape: (id, shape) => {
    const { nodes, edges } = get()
    const node = nodes.find(n => n.id === id)
    if (!node || node.data.shape === shape) return
    withHistory(get, set, {
      nodes: nodes.map(n => n.id === id ? { ...n, data: { ...n.data, shape } } : n),
      edges,
    })
  },

  duplicateNode: (id) => {
    const { nodes, edges } = get()
    const node = nodes.find(n => n.id === id)
    if (!node) return
    const newNode = {
      ...node,
      id: crypto.randomUUID(),
      position: { x: node.position.x + GRID_SNAP, y: node.position.y + GRID_SNAP },
      selected: true,
    }
    const nextNodes = nodes.map(n => n.id === id ? { ...n, selected: false } : n)
    withHistory(get, set, { nodes: [...nextNodes, newNode], edges })
  },

  toggleNodeLock: (id) => {
    const { nodes, edges } = get()
    const node = nodes.find(n => n.id === id)
    if (!node) return
    const wasLocked = node.draggable === false
    withHistory(get, set, {
      nodes: nodes.map(n => n.id === id ? { ...n, draggable: wasLocked } : n),
      edges,
    })
  },

  updateNodeColors: (id, colors) => {
    const { nodes, edges } = get()
    const node = nodes.find(n => n.id === id)
    if (!node) return
    const d = node.data
    if (d.fillColor === colors.fillColor && d.strokeColor === colors.strokeColor && d.textColor === colors.textColor) return
    withHistory(get, set, {
      nodes: nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...colors } } : n),
      edges,
    })
  },

  undo: () => {
    const { history } = get()
    if (history.past.length === 0) return
    const prev = history.past[history.past.length - 1]
    set(state => ({
      ...state,
      nodes: prev.nodes,
      edges: prev.edges,
      history: {
        past: state.history.past.slice(0, -1),
        future: [{ nodes: state.nodes, edges: state.edges }, ...state.history.future],
      },
    }))
  },

  redo: () => {
    const { history } = get()
    if (history.future.length === 0) return
    const next = history.future[0]
    set(state => ({
      ...state,
      nodes: next.nodes,
      edges: next.edges,
      history: {
        past: [...state.history.past, { nodes: state.nodes, edges: state.edges }],
        future: state.history.future.slice(1),
      },
    }))
  },

  importFromCode: (result) => {
    const { nodes, edges } = get()
    const currentNodeMap = new Map(nodes.map(n => [n.id, n]))

    const mergedNodes = result.nodes.map(parsedNode => {
      const current = currentNodeMap.get(parsedNode.id)
      if (!current) return parsedNode
      return {
        ...parsedNode,
        position: current.position,
        selected: current.selected,
        data: {
          ...parsedNode.data,
          fillColor: current.data.fillColor,
          strokeColor: current.data.strokeColor,
          textColor: current.data.textColor,
        },
      }
    })

    const isNoOp =
      mergedNodes.length === nodes.length &&
      result.edges.length === edges.length &&
      mergedNodes.every(n => {
        const c = currentNodeMap.get(n.id)
        return (
          c !== undefined &&
          c.data.label === n.data.label &&
          c.data.shape === n.data.shape &&
          c.parentId === n.parentId
        )
      }) &&
      result.edges.every(e =>
        edges.some(
          o =>
            o.source === e.source &&
            o.target === e.target &&
            o.data?.label === e.data?.label &&
            o.data?.style === e.data?.style
        )
      )

    if (isNoOp) return

    withHistory(get, set, { nodes: mergedNodes, edges: result.edges })
  },
}))

export { useShallow }
