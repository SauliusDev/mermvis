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
  applyFlowChanges: (nodes: Node<FlowNodeData>[]) => void
  updateNodeLabel: (id: string, label: string) => void
  moveNodes: (updates: Array<{ id: string; position: XYPosition }>) => void
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

  removeNode: (id) => {
    const { nodes, edges } = get()
    const nextNodes = nodes.filter(n => n.id !== id)
    if (nextNodes.length === nodes.length) return  // id not found — no-op
    const nextEdges = edges.filter(e => e.source !== id && e.target !== id)
    withHistory(get, set, { nodes: nextNodes, edges: nextEdges })
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
