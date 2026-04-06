import { describe, it, expect } from 'vitest'
import { computeDimmedNodeIds } from './selection'
import type { Node, Edge } from '@xyflow/react'
import type { FlowNodeData, FlowEdgeData } from './store'

function makeNode(id: string, selected = false): Node<FlowNodeData> {
  return {
    id,
    position: { x: 0, y: 0 },
    data: { label: id, shape: 'rectangle' },
    type: 'flowNode',
    selected,
  }
}

describe('computeDimmedNodeIds', () => {
  it('returns empty set when no nodes are selected', () => {
    const nodes = [makeNode('a'), makeNode('b')]
    expect(computeDimmedNodeIds(nodes, []).size).toBe(0)
  })

  it('returns empty set when multiple nodes are selected (multi-select, no dimming)', () => {
    const nodes = [makeNode('a', true), makeNode('b', true), makeNode('c')]
    expect(computeDimmedNodeIds(nodes, []).size).toBe(0)
  })

  it('returns all non-selected node IDs when single selection with no edges', () => {
    const nodes = [makeNode('a', true), makeNode('b'), makeNode('c')]
    const dimmed = computeDimmedNodeIds(nodes, [])
    expect(dimmed.has('b')).toBe(true)
    expect(dimmed.has('c')).toBe(true)
    expect(dimmed.has('a')).toBe(false)
  })

  it('excludes connected nodes from the dimmed set', () => {
    const nodes = [makeNode('a', true), makeNode('b'), makeNode('c')]
    const edges: Edge<FlowEdgeData>[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const dimmed = computeDimmedNodeIds(nodes, edges)
    expect(dimmed.has('b')).toBe(false)
    expect(dimmed.has('c')).toBe(true)
  })

  it('returns empty set when only one node exists and it is selected', () => {
    const nodes = [makeNode('a', true)]
    expect(computeDimmedNodeIds(nodes, []).size).toBe(0)
  })
})
