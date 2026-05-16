import { describe, it, expect } from 'vitest'
import type { Node, Edge } from '@xyflow/react'
import type { FlowNodeData, FlowEdgeData } from '@/lib/store'
import { parseMermaidFlowchart } from './parser'
import { serialize } from './serializer'

type NodeShape = FlowNodeData['shape']
type EdgeStyle = FlowEdgeData['style']

function makeNode(id: string, label: string, shape: NodeShape): Node<FlowNodeData> {
  return { id, type: 'default', position: { x: 0, y: 0 }, data: { label, shape } }
}

function makeEdge(source: string, target: string, style: EdgeStyle = 'arrow', label?: string): Edge<FlowEdgeData> {
  return { id: `e-${source}-${target}`, source, target, data: { style, ...(label !== undefined ? { label } : {}) } }
}

function asSuccess(result: ReturnType<typeof parseMermaidFlowchart>) {
  if ('error' in result) throw new Error(`Expected success but got error: ${result.error}`)
  return result
}

describe('parseMermaidFlowchart', () => {
  // All 8 bracket syntaxes map to correct shape values
  it.each([
    ['rectangle', 'A[Label]',     'Label'],
    ['rounded',   'A(Label)',     'Label'],
    ['pill',      'A([Label])',   'Label'],
    ['diamond',   'A{Label}',     'Label'],
    ['circle',    'A((Label))',   'Label'],
    ['hexagon',   'A{{Label}}',   'Label'],
    ['cylinder',  'A[(Label)]',   'Label'],
  ] as Array<[NodeShape, string, string]>)('bracket syntax for %s → correct shape and label', (shape, nodeDecl, expectedLabel) => {
    const result = asSuccess(parseMermaidFlowchart(`flowchart TD\n  ${nodeDecl}\n`))
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].data.shape).toBe(shape)
    expect(result.nodes[0].data.label).toBe(expectedLabel)
    expect(result.nodes[0].id).toBe('A')
  })

  it('subgraph block maps to shape subgraph', () => {
    const result = asSuccess(parseMermaidFlowchart('flowchart TD\n  subgraph H [MyGroup]\n  end\n'))
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].data.shape).toBe('subgraph')
    expect(result.nodes[0].data.label).toBe('MyGroup')
    expect(result.nodes[0].id).toBe('H')
  })

  // All 4 arrow syntaxes map to correct style values
  it.each([
    ['arrow',  'A --> B'],
    ['dotted', 'A -.-> B'],
    ['thick',  'A ==> B'],
    ['open',   'A --- B'],
  ] as Array<[EdgeStyle, string]>)('arrow %s → correct style', (style, edgeDecl) => {
    const result = asSuccess(parseMermaidFlowchart(`flowchart TD\n  ${edgeDecl}\n`))
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].data?.style).toBe(style)
    expect(result.edges[0].source).toBe('A')
    expect(result.edges[0].target).toBe('B')
  })

  it('pipe syntax populates edge data.label', () => {
    const result = asSuccess(parseMermaidFlowchart('flowchart TD\n  A -->|my label| B\n'))
    expect(result.edges[0].data?.label).toBe('my label')
  })

  it('edge without pipes has no data.label', () => {
    const result = asSuccess(parseMermaidFlowchart('flowchart TD\n  A --> B\n'))
    expect(result.edges[0].data?.label).toBeUndefined()
  })

  it('empty string returns { error }', () => {
    const result = parseMermaidFlowchart('')
    expect('error' in result).toBe(true)
  })

  it('non-flowchart text returns { error }', () => {
    const result = parseMermaidFlowchart('this is not a flowchart')
    expect('error' in result).toBe(true)
  })

  it('never throws — returns { error } on failure', () => {
    expect(() => parseMermaidFlowchart('')).not.toThrow()
    expect(() => parseMermaidFlowchart('garbage input ###')).not.toThrow()
  })

  it('click and classDef lines appear in passthroughLines', () => {
    const input = 'flowchart TD\n  A[Label]\n  click A href "example.com"\n  classDef foo fill:#f00\n'
    const result = asSuccess(parseMermaidFlowchart(input))
    expect(result.passthroughLines).toContain('click A href "example.com"')
    expect(result.passthroughLines).toContain('classDef foo fill:#f00')
    expect(result.nodes).toHaveLength(1)
  })

  it('nodes have position { x: 0, y: 0 } and type "flowNode"', () => {
    const result = asSuccess(parseMermaidFlowchart('flowchart TD\n  A[Label]\n'))
    expect(result.nodes[0].position).toEqual({ x: 0, y: 0 })
    expect(result.nodes[0].type).toBe('flowNode')
  })

  it('duplicate edges get unique ids with numeric suffix', () => {
    const input = 'flowchart TD\n  A --> B\n  A --> B\n'
    const result = asSuccess(parseMermaidFlowchart(input))
    expect(result.edges).toHaveLength(2)
    const ids = result.edges.map(e => e.id)
    expect(new Set(ids).size).toBe(2)
    expect(ids[0]).toBe('e-A-B')
    expect(ids[1]).toBe('e-A-B-1')
  })

  it('round-trip: serialize then parse preserves ids, shapes, labels, and styles', () => {
    const nodes: Node<FlowNodeData>[] = [
      makeNode('A', 'Start', 'rectangle'),
      makeNode('B', 'Process', 'rounded'),
      makeNode('C', 'Decision', 'diamond'),
      makeNode('H', 'Group', 'subgraph'),
    ]
    const edges: Edge<FlowEdgeData>[] = [
      makeEdge('A', 'B', 'arrow'),
      makeEdge('B', 'C', 'dotted', 'condition'),
    ]

    const result = asSuccess(parseMermaidFlowchart(serialize({ nodes, edges })))

    expect(result.nodes).toHaveLength(4)
    expect(result.edges).toHaveLength(2)

    const nodeA = result.nodes.find(n => n.id === 'A')
    expect(nodeA?.data.shape).toBe('rectangle')
    expect(nodeA?.data.label).toBe('Start')

    const nodeB = result.nodes.find(n => n.id === 'B')
    expect(nodeB?.data.shape).toBe('rounded')

    const nodeC = result.nodes.find(n => n.id === 'C')
    expect(nodeC?.data.shape).toBe('diamond')

    const nodeH = result.nodes.find(n => n.id === 'H')
    expect(nodeH?.data.shape).toBe('subgraph')
    expect(nodeH?.data.label).toBe('Group')

    const edgeAB = result.edges.find(e => e.source === 'A' && e.target === 'B')
    expect(edgeAB?.data?.style).toBe('arrow')
    expect(edgeAB?.data?.label).toBeUndefined()

    const edgeBC = result.edges.find(e => e.source === 'B' && e.target === 'C')
    expect(edgeBC?.data?.style).toBe('dotted')
    expect(edgeBC?.data?.label).toBe('condition')
  })

  it('round-trip with passthroughLines survives intact', () => {
    const passthrough = ['click A href "example.com"']
    const serialized = serialize({ nodes: [makeNode('A', 'Label', 'rectangle')], edges: [], passthroughLines: passthrough })
    const result = asSuccess(parseMermaidFlowchart(serialized))
    expect(result.passthroughLines).toContain('click A href "example.com"')
  })
})

describe('subgraph parsing with children', () => {
  it('subgraph block creates subgraphNode with isSubgraph true', () => {
    const result = parseMermaidFlowchart('flowchart TD\n  subgraph SG1 [My Group]\n  end\n')
    expect('error' in result).toBe(false)
    if ('error' in result) return
    const sg = result.nodes.find(n => n.id === 'SG1')
    expect(sg?.type).toBe('subgraphNode')
    expect(sg?.data.shape).toBe('subgraph')
    expect(sg?.data.isSubgraph).toBe(true)
  })

  it('child node inside subgraph block gets parentId and extent parent', () => {
    const mmd = 'flowchart TD\n  subgraph SG1 [Group]\n    A[Node A]\n  end\n'
    const result = parseMermaidFlowchart(mmd)
    expect('error' in result).toBe(false)
    if ('error' in result) return
    const child = result.nodes.find(n => n.id === 'A')
    expect(child?.type).toBe('flowNode')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((child as any).parentId).toBe('SG1')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((child as any).extent).toBe('parent')
    expect(child?.data.label).toBe('Node A')
  })

  it('regular node outside subgraph gets type flowNode', () => {
    const result = parseMermaidFlowchart('flowchart TD\n  A[Node A]\n')
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.nodes[0].type).toBe('flowNode')
  })

  it('edge inside subgraph block is added to edges array', () => {
    const mmd = 'flowchart TD\n  subgraph SG1 [Group]\n    A[Node A]\n    B[Node B]\n    A --> B\n  end\n'
    const result = parseMermaidFlowchart(mmd)
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.edges.length).toBeGreaterThan(0)
    const edge = result.edges.find(e => e.source === 'A' && e.target === 'B')
    expect(edge).toBeDefined()
  })
})
