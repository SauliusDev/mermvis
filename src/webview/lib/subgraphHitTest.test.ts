import { describe, it, expect } from 'vitest'
import type { Node } from '@xyflow/react'
import type { FlowNodeData } from '@/lib/store'
import {
  findDropTargetSubgraph,
  isNodeOutsideParent,
  toRelativePosition,
  toAbsolutePosition,
} from '@/lib/subgraphHitTest'

function makeFlowNode(id: string, pos: { x: number; y: number }, measuredW = 80, measuredH = 40): Node<FlowNodeData> {
  return {
    id,
    position: pos,
    type: 'flowNode',
    data: { label: id, shape: 'rectangle' },
    measured: { width: measuredW, height: measuredH },
  } as Node<FlowNodeData>
}

function makeSubgraphNode(id: string, pos: { x: number; y: number }, w = 300, h = 200): Node<FlowNodeData> {
  return {
    id,
    position: pos,
    type: 'subgraphNode',
    width: w,
    height: h,
    data: { label: id, shape: 'subgraph', isSubgraph: true },
  } as Node<FlowNodeData>
}

describe('findDropTargetSubgraph', () => {
  it('returns subgraph ID when node center is inside', () => {
    const sg = makeSubgraphNode('SG1', { x: 0, y: 0 }, 300, 200)
    const node = makeFlowNode('A', { x: 100, y: 80 })  // center: (140, 100) — inside SG1
    expect(findDropTargetSubgraph(node, [sg, node])).toBe('SG1')
  })

  it('returns null when node center is outside all subgraphs', () => {
    const sg = makeSubgraphNode('SG1', { x: 0, y: 0 }, 300, 200)
    const node = makeFlowNode('A', { x: 400, y: 400 })  // outside
    expect(findDropTargetSubgraph(node, [sg, node])).toBeNull()
  })

  it('returns the smaller subgraph when two overlap (innermost)', () => {
    const large = makeSubgraphNode('LARGE', { x: 0, y: 0 }, 500, 500)
    const small = makeSubgraphNode('SMALL', { x: 100, y: 100 }, 200, 200)
    // Node center at (200, 200) — inside both; small has less area
    const node = makeFlowNode('A', { x: 160, y: 180 })  // center: (200, 200)
    expect(findDropTargetSubgraph(node, [large, small, node])).toBe('SMALL')
  })

  it('returns null when dragged node is itself a subgraph', () => {
    const sg = makeSubgraphNode('SG1', { x: 0, y: 0 }, 300, 200)
    const dragged = makeSubgraphNode('SG2', { x: 50, y: 50 }, 100, 100)
    expect(findDropTargetSubgraph(dragged, [sg, dragged])).toBeNull()
  })

  it("skips the node's current parent (no self-reassignment)", () => {
    const sg = makeSubgraphNode('SG1', { x: 0, y: 0 }, 300, 200)
    const child = { ...makeFlowNode('A', { x: 50, y: 50 }), parentId: 'SG1' }
    expect(findDropTargetSubgraph(child, [sg, child])).toBeNull()
  })
})

describe('isNodeOutsideParent', () => {
  const parent = makeSubgraphNode('SG', { x: 0, y: 0 }, 300, 200)

  it('returns false when node center is inside parent', () => {
    const child = makeFlowNode('A', { x: 100, y: 80 })  // center: (140, 100)
    expect(isNodeOutsideParent(child, parent)).toBe(false)
  })

  it('returns true when node center is to the left (x < 0)', () => {
    const child = makeFlowNode('A', { x: -100, y: 80 })  // center: (-60, 100)
    expect(isNodeOutsideParent(child, parent)).toBe(true)
  })

  it('returns true when node center is above (y < 0)', () => {
    const child = makeFlowNode('A', { x: 100, y: -60 })  // center: (140, -40)
    expect(isNodeOutsideParent(child, parent)).toBe(true)
  })
})

describe('coordinate conversion', () => {
  it('toRelativePosition subtracts parent position', () => {
    expect(toRelativePosition({ x: 200, y: 150 }, { x: 100, y: 100 })).toEqual({ x: 100, y: 50 })
  })

  it('toAbsolutePosition adds parent position', () => {
    expect(toAbsolutePosition({ x: 100, y: 50 }, { x: 100, y: 100 })).toEqual({ x: 200, y: 150 })
  })

  it('round-trip: absolute → relative → absolute is identity', () => {
    const abs = { x: 234, y: 178 }
    const parentPos = { x: 100, y: 80 }
    const rel = toRelativePosition(abs, parentPos)
    expect(toAbsolutePosition(rel, parentPos)).toEqual(abs)
  })
})
