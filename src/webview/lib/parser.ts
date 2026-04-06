import type { Node, Edge } from '@xyflow/react'
import type { FlowNodeData, FlowEdgeData, NodeShape, EdgeStyle } from '@/lib/store'
import { shapeTemplates, edgeConnectors } from '@/lib/constants'

// ── Exported Types ─────────────────────────────────────────────────────────────

export interface ParseSuccess {
  nodes: Node<FlowNodeData>[]
  edges: Edge<FlowEdgeData>[]
  passthroughLines: string[]
}

export type ParseResult = ParseSuccess | { error: string }

// ── Module-level constants (computed once at load time) ───────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Shape detection order: longest open token first to avoid prefix conflicts.
// Subgraph is excluded — it uses special block syntax handled separately.
const SHAPE_DETECTION_ORDER = (
  Object.entries(shapeTemplates) as Array<[NodeShape, { open: string; close: string }]>
)
  .filter(([shape]) => shape !== 'subgraph')
  .sort((a, b) => b[1].open.length - a[1].open.length)

// Edge connector regex alternation: longest connector first (-.-> before -->)
const connectorAlt = Object.values(edgeConnectors)
  .sort((a, b) => b.length - a.length)
  .map(escapeRegex)
  .join('|')

// Two separate regexes for labeled vs unlabeled edges to avoid ambiguity
const LABELED_EDGE_RE = new RegExp(`^(\\S+)\\s+(${connectorAlt})\\|([^|]*)\\|\\s+(\\S+)$`)
const UNLABELED_EDGE_RE = new RegExp(`^(\\S+)\\s+(${connectorAlt})\\s+(\\S+)$`)

const SUBGRAPH_RE = /^subgraph\s+(\S+)\s+\[([^\]]*)\]$/

// ── Helpers ───────────────────────────────────────────────────────────────────

function getEdgeStyle(connector: string): EdgeStyle {
  const entry = Object.entries(edgeConnectors).find(([, v]) => v === connector)
  return (entry?.[0] ?? 'arrow') as EdgeStyle
}

function parseNodeLine(text: string): { id: string; shape: NodeShape; label: string } | null {
  const bracketStart = text.search(/[([{]/)
  if (bracketStart === -1) return null

  const id = text.slice(0, bracketStart)
  const rest = text.slice(bracketStart)

  for (const [shape, { open, close }] of SHAPE_DETECTION_ORDER) {
    if (!rest.startsWith(open)) continue
    const closeIdx = rest.lastIndexOf(close)
    if (closeIdx < open.length) continue
    const label = rest.slice(open.length, closeIdx)
    return { id, shape, label }
  }

  return null
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function parseMermaidFlowchart(input: string): ParseResult {
  try {
    if (!input.trim()) return { error: 'Empty input' }

    const rawLines = input.split('\n')
    if (!rawLines.some(l => l.trim().startsWith('flowchart'))) {
      return { error: 'Missing flowchart header' }
    }

    const nodes: Node<FlowNodeData>[] = []
    const edges: Edge<FlowEdgeData>[] = []
    const passthroughLines: string[] = []
    const edgeIds = new Set<string>()

    let i = 0
    while (i < rawLines.length) {
      const trimmed = rawLines[i].trim()
      i++

      if (!trimmed || trimmed.startsWith('flowchart')) continue

      // Subgraph block
      const subMatch = SUBGRAPH_RE.exec(trimmed)
      if (subMatch) {
        const [, id, label] = subMatch
        nodes.push({ id, type: 'default', position: { x: 0, y: 0 }, data: { label, shape: 'subgraph' } })
        if (i < rawLines.length && rawLines[i].trim() === 'end') i++
        continue
      }

      // Labeled edge
      const labeledMatch = LABELED_EDGE_RE.exec(trimmed)
      if (labeledMatch) {
        const [, source, connectorStr, label, target] = labeledMatch
        const id = makeEdgeId(source, target, edgeIds)
        edgeIds.add(id)
        edges.push({ id, source, target, data: { style: getEdgeStyle(connectorStr), label } })
        continue
      }

      // Unlabeled edge
      const unlabeledMatch = UNLABELED_EDGE_RE.exec(trimmed)
      if (unlabeledMatch) {
        const [, source, connectorStr, target] = unlabeledMatch
        const id = makeEdgeId(source, target, edgeIds)
        edgeIds.add(id)
        edges.push({ id, source, target, data: { style: getEdgeStyle(connectorStr) } })
        continue
      }

      // Node declaration
      const nodeResult = parseNodeLine(trimmed)
      if (nodeResult) {
        nodes.push({ id: nodeResult.id, type: 'default', position: { x: 0, y: 0 }, data: { label: nodeResult.label, shape: nodeResult.shape } })
        continue
      }

      // Passthrough
      passthroughLines.push(trimmed)
    }

    return { nodes, edges, passthroughLines }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

function makeEdgeId(source: string, target: string, existing: Set<string>): string {
  const base = `e-${source}-${target}`
  if (!existing.has(base)) return base
  let suffix = 1
  while (existing.has(`${base}-${suffix}`)) suffix++
  return `${base}-${suffix}`
}
