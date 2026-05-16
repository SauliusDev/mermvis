import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import type { Node, Edge, XYPosition } from '@xyflow/react'

// ── Types ──────────────────────────────────────────────────────────────────────

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
  addNode: (node: Node<FlowNodeData>) => void
  removeNode: (id: string) => void
  removeNodes: (ids: string[]) => void
  applyFlowChanges: (nodes: Node<FlowNodeData>[]) => void
  deselectAll: () => void
  updateNodeLabel: (id: string, label: string) => void
  moveNodes: (updates: Array<{ id: string; position: XYPosition }>) => void
  resizeNode: (id: string, dimensions: { width: number; height: number }, position?: XYPosition) => void
  addEdge: (connection: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }) => void
  undo: () => void
  redo: () => void
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

  addNode: (node) => {
    const { nodes, edges } = get()
    // addNode is never a no-op — always appends
    withHistory(get, set, { nodes: [...nodes, node], edges })
  },

  removeNodes: (ids) => {
    const { nodes, edges } = get()
    const idSet = new Set(ids)
    const nextNodes = nodes.filter(n => !idSet.has(n.id))
    if (nextNodes.length === nodes.length) return  // none matched — no-op
    const nextEdges = edges.filter(e => !idSet.has(e.source) && !idSet.has(e.target))
    withHistory(get, set, { nodes: nextNodes, edges: nextEdges })
  },

  removeNode: (id) => {
    get().removeNodes([id])
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
}))

export { useShallow }
