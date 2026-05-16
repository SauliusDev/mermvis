import { describe, it, expect } from 'vitest'
import { computeDimmedNodeIds, computeConnectedEdgeIds } from './selection'
import type { Node, Edge } from '@xyflow/react'
import type { FlowNodeData, FlowEdgeData } from './store'

function makeNode(id: string, overrides: Partial<Node<FlowNodeData>> = {}): Node<FlowNodeData> {
  return {
    id,
    position: { x: 0, y: 0 },
    data: { label: id, shape: 'rectangle' },
    type: 'flowNode',
    ...overrides,
  }
}

function makeEdge(id: string, source: string, target: string): Edge<FlowEdgeData> {
  return { id, source, target, data: { style: 'arrow' } }
}

describe('computeDimmedNodeIds', () => {
  it('returns empty set when no nodes are selected', () => {
    const nodes = [makeNode('a'), makeNode('b')]
    expect(computeDimmedNodeIds(nodes, []).size).toBe(0)
  })

  it('returns empty set when multiple nodes are selected (multi-select, no dimming)', () => {
    const nodes = [makeNode('a', { selected: true }), makeNode('b', { selected: true }), makeNode('c')]
    expect(computeDimmedNodeIds(nodes, []).size).toBe(0)
  })

  it('returns all non-selected node IDs when single selection with no edges', () => {
    const nodes = [makeNode('a', { selected: true }), makeNode('b'), makeNode('c')]
    const dimmed = computeDimmedNodeIds(nodes, [])
    expect(dimmed.has('b')).toBe(true)
    expect(dimmed.has('c')).toBe(true)
    expect(dimmed.has('a')).toBe(false)
  })

  it('excludes connected nodes from the dimmed set', () => {
    const nodes = [makeNode('a', { selected: true }), makeNode('b'), makeNode('c')]
    const edges: Edge<FlowEdgeData>[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const dimmed = computeDimmedNodeIds(nodes, edges)
    expect(dimmed.has('b')).toBe(false)
    expect(dimmed.has('c')).toBe(true)
  })

  it('returns empty set when only one node exists and it is selected', () => {
    const nodes = [makeNode('a', { selected: true })]
    expect(computeDimmedNodeIds(nodes, []).size).toBe(0)
  })
})

describe('computeConnectedEdgeIds', () => {
  it('returns empty set when no node is selected', () => {
    const nodes = [makeNode('A'), makeNode('B')]
    const edges = [makeEdge('e1', 'A', 'B')]
    expect(computeConnectedEdgeIds(nodes, edges).size).toBe(0)
  })

  it('returns empty set when multiple nodes are selected', () => {
    const nodes = [
      makeNode('A', { selected: true }),
      makeNode('B', { selected: true }),
    ]
    const edges = [makeEdge('e1', 'A', 'B')]
    expect(computeConnectedEdgeIds(nodes, edges).size).toBe(0)
  })

  it('returns edge ids where source or target equals selected node', () => {
    const nodes = [makeNode('A', { selected: true }), makeNode('B'), makeNode('C')]
    const edges = [makeEdge('e1', 'A', 'B'), makeEdge('e2', 'C', 'A'), makeEdge('e3', 'B', 'C')]
    const result = computeConnectedEdgeIds(nodes, edges)
    expect(result.has('e1')).toBe(true)
    expect(result.has('e2')).toBe(true)
    expect(result.has('e3')).toBe(false)
  })
})
