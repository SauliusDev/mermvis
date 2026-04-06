import { describe, it, expect } from 'vitest'
import type { Node, Edge } from '@xyflow/react'
import type { FlowNodeData, FlowEdgeData } from '@/lib/store'
import { serialize } from './serializer'

type NodeShape = FlowNodeData['shape']
type EdgeStyle = FlowEdgeData['style']

function makeNode(id: string, label: string, shape: NodeShape): Node<FlowNodeData> {
  return { id, type: 'default', position: { x: 0, y: 0 }, data: { label, shape } }
}

function makeEdge(id: string, source: string, target: string, style?: EdgeStyle, label?: string): Edge<FlowEdgeData> {
  return { id, source, target, data: { style, ...(label !== undefined ? { label } : {}) } }
}

describe('serialize', () => {
  it('empty input produces exactly "flowchart TD\\n"', () => {
    expect(serialize({ nodes: [], edges: [] })).toBe('flowchart TD\n')
  })

  it.each([
    ['rectangle', 'A[Label]'],
    ['rounded',   'A(Label)'],
    ['pill',      'A([Label])'],
    ['diamond',   'A{Label}'],
    ['circle',    'A((Label))'],
    ['hexagon',   'A{{Label}}'],
    ['cylinder',  'A[(Label)]'],
  ] as Array<[NodeShape, string]>)('shape %s emits correct bracket syntax', (shape, expected) => {
    const result = serialize({ nodes: [makeNode('A', 'Label', shape)], edges: [] })
    expect(result).toContain(`  ${expected}`)
  })

  it('subgraph node emits block format', () => {
    const result = serialize({ nodes: [makeNode('H', 'Subgraph Label', 'subgraph')], edges: [] })
    expect(result).toContain('  subgraph H [Subgraph Label]')
    expect(result).toContain('  end')
  })

  it.each([
    ['arrow',  '-->'],
    ['dotted', '-.->'],
    ['thick',  '==>'],
    ['open',   '---'],
  ] as Array<[EdgeStyle, string]>)('edge style %s emits correct arrow token', (style, connector) => {
    const nodes = [makeNode('A', 'A', 'rectangle'), makeNode('B', 'B', 'rectangle')]
    const result = serialize({ nodes, edges: [makeEdge('e1', 'A', 'B', style)] })
    expect(result).toContain(`  A ${connector} B`)
  })

  it('edge with label uses pipe syntax', () => {
    const nodes = [makeNode('A', 'A', 'rectangle'), makeNode('B', 'B', 'rectangle')]
    const result = serialize({ nodes, edges: [makeEdge('e1', 'A', 'B', 'arrow', 'my label')] })
    expect(result).toContain('  A -->|my label| B')
  })

  it('edge without label has no pipe characters', () => {
    const nodes = [makeNode('A', 'A', 'rectangle'), makeNode('B', 'B', 'rectangle')]
    const result = serialize({ nodes, edges: [makeEdge('e1', 'A', 'B', 'arrow')] })
    expect(result).not.toContain('|')
  })

  it('passthroughLines appear with two-space indent in output', () => {
    const result = serialize({ nodes: [], edges: [], passthroughLines: ['click A href "example.com"'] })
    expect(result).toContain('  click A href "example.com"')
  })

  it('edge without explicit style defaults to arrow connector', () => {
    const nodes = [makeNode('A', 'A', 'rectangle'), makeNode('B', 'B', 'rectangle')]
    const result = serialize({ nodes, edges: [{ id: 'e1', source: 'A', target: 'B', data: {} }] })
    expect(result).toContain('  A --> B')
  })

  it('does not mutate the input nodes or edges arrays', () => {
    const nodes = [makeNode('A', 'A', 'rectangle')]
    const edges = [makeEdge('e1', 'A', 'B', 'arrow')]
    const originalNodesRef = nodes
    const originalEdgesRef = edges
    serialize({ nodes, edges })
    expect(nodes).toBe(originalNodesRef)
    expect(edges).toBe(originalEdgesRef)
  })
})
