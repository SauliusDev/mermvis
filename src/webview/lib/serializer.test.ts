import { describe, it, expect } from 'vitest'
import type { Node, Edge } from '@xyflow/react'
import type { FlowNodeData, FlowEdgeData } from '@/lib/store'
import { serialize } from './serializer'

type NodeShape = FlowNodeData['shape']
type EdgeStyle = FlowEdgeData['style']

function makeNode(id: string, labelOrOverrides: string | Partial<Node<FlowNodeData>>, shape?: NodeShape): Node<FlowNodeData> {
  if (typeof labelOrOverrides === 'string') {
    return { id, type: 'default', position: { x: 0, y: 0 }, data: { label: labelOrOverrides, shape: shape! } }
  }
  return { id, type: 'default', position: { x: 0, y: 0 }, data: { label: 'Node', shape: 'rectangle' }, ...labelOrOverrides }
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

describe('subgraph serialization', () => {
  it('subgraph with no children emits subgraph/end block with no child lines', () => {
    const subgraphNode = makeNode('SG1', {
      type: 'subgraphNode',
      data: { label: 'My Group', shape: 'subgraph', isSubgraph: true },
    })
    const result = serialize({ nodes: [subgraphNode], edges: [] })
    expect(result).toContain('subgraph SG1 [My Group]')
    expect(result).toContain('  end')
    const lines = result.split('\n').filter(Boolean)
    const sgIdx = lines.findIndex(l => l.includes('subgraph SG1'))
    const endIdx = lines.findIndex(l => l.trim() === 'end')
    expect(endIdx - sgIdx).toBe(1)
  })

  it('child node is emitted inside subgraph block with 4-space indent', () => {
    const subgraphNode = makeNode('SG1', {
      type: 'subgraphNode',
      data: { label: 'Group', shape: 'subgraph', isSubgraph: true },
    })
    const childNode: Node<FlowNodeData> = {
      id: 'A',
      type: 'flowNode',
      position: { x: 0, y: 0 },
      parentId: 'SG1',
      extent: 'parent',
      data: { label: 'Node A', shape: 'rectangle' },
    }
    const result = serialize({ nodes: [subgraphNode, childNode], edges: [] })
    expect(result).toContain('    A[Node A]')
  })

  it('child node with parentId is NOT emitted in the main node list', () => {
    const subgraphNode = makeNode('SG1', {
      type: 'subgraphNode',
      data: { label: 'Group', shape: 'subgraph', isSubgraph: true },
    })
    const childNode: Node<FlowNodeData> = {
      id: 'A',
      type: 'flowNode',
      position: { x: 0, y: 0 },
      parentId: 'SG1',
      extent: 'parent',
      data: { label: 'Node A', shape: 'rectangle' },
    }
    const result = serialize({ nodes: [subgraphNode, childNode], edges: [] })
    const occurrences = (result.match(/A\[Node A\]/g) ?? []).length
    expect(occurrences).toBe(1)
  })
})

describe('nested subgraph serialization', () => {
  it('nested subgraph produces outer block containing inner block', () => {
    const outer: Node<FlowNodeData> = {
      id: 'OUTER',
      type: 'subgraphNode',
      position: { x: 0, y: 0 },
      data: { label: 'Outer Group', shape: 'subgraph', isSubgraph: true },
    }
    const inner: Node<FlowNodeData> = {
      id: 'INNER',
      type: 'subgraphNode',
      position: { x: 10, y: 10 },
      parentId: 'OUTER',
      extent: 'parent',
      data: { label: 'Inner Group', shape: 'subgraph', isSubgraph: true },
    }
    const result = serialize({ nodes: [outer, inner], edges: [] })
    expect(result).toContain('  subgraph OUTER [Outer Group]')
    expect(result).toContain('    subgraph INNER [Inner Group]')
    expect(result).toContain('    end')
    expect(result).toContain('  end')
    const lines = result.split('\n')
    const outerIdx = lines.findIndex(l => l.includes('subgraph OUTER'))
    const innerIdx = lines.findIndex(l => l.includes('subgraph INNER'))
    const innerEndIdx = lines.findIndex((l, i) => i > innerIdx && l.trim() === 'end')
    const outerEndIdx = lines.findIndex((l, i) => i > innerEndIdx && l.trim() === 'end')
    expect(outerIdx).toBeLessThan(innerIdx)
    expect(innerEndIdx).toBeLessThan(outerEndIdx)
  })

  it('regular node inside nested subgraph emits with 6-space indent', () => {
    const outer: Node<FlowNodeData> = {
      id: 'OUTER',
      type: 'subgraphNode',
      position: { x: 0, y: 0 },
      data: { label: 'Outer', shape: 'subgraph', isSubgraph: true },
    }
    const inner: Node<FlowNodeData> = {
      id: 'INNER',
      type: 'subgraphNode',
      position: { x: 10, y: 10 },
      parentId: 'OUTER',
      extent: 'parent',
      data: { label: 'Inner', shape: 'subgraph', isSubgraph: true },
    }
    const deepChild: Node<FlowNodeData> = {
      id: 'N1',
      type: 'flowNode',
      position: { x: 5, y: 5 },
      parentId: 'INNER',
      extent: 'parent',
      data: { label: 'Deep Node', shape: 'rectangle' },
    }
    const result = serialize({ nodes: [outer, inner, deepChild], edges: [] })
    expect(result).toContain('      N1[Deep Node]')
  })
})
