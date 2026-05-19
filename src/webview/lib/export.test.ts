import { describe, it, expect } from 'vitest'
import type { Node, Edge } from '@xyflow/react'
import type { FlowNodeData, FlowEdgeData } from './store'
import { exportCanvasToJson, importCanvasFromJson } from './export'

function makeNode(id: string, overrides: Partial<Node<FlowNodeData>> = {}): Node<FlowNodeData> {
  return {
    id,
    position: { x: 0, y: 0 },
    data: { label: `Node ${id}`, shape: 'rectangle' },
    type: 'flowNode',
    ...overrides,
  }
}

function makeEdge(id: string, source: string, target: string, overrides: Partial<Edge<FlowEdgeData>> = {}): Edge<FlowEdgeData> {
  return {
    id,
    source,
    target,
    data: { style: 'arrow' },
    type: 'default',
    ...overrides,
  }
}

const defaultViewport = { x: 0, y: 0, zoom: 1 }

describe('exportCanvasToJson', () => {
  it('produces valid CanvasJson structure', () => {
    const nodes = [makeNode('A')]
    const edges = [makeEdge('e1', 'A', 'B')]
    const result = exportCanvasToJson(nodes, edges, defaultViewport)
    const parsed = JSON.parse(result)
    expect(parsed.version).toBe(1)
    expect(Array.isArray(parsed.nodes)).toBe(true)
    expect(Array.isArray(parsed.edges)).toBe(true)
    expect(typeof parsed.viewport).toBe('object')
  })

  it('strips selected and dragging from nodes', () => {
    const node = makeNode('A', { selected: true, dragging: true })
    const result = exportCanvasToJson([node], [], defaultViewport)
    const parsed = JSON.parse(result)
    expect(parsed.nodes[0].selected).toBeUndefined()
    expect(parsed.nodes[0].dragging).toBeUndefined()
  })

  it('preserves parentId and extent for child nodes', () => {
    const node = makeNode('B', { parentId: 'sg1', extent: 'parent' })
    const result = exportCanvasToJson([node], [], defaultViewport)
    const parsed = JSON.parse(result)
    expect(parsed.nodes[0].parentId).toBe('sg1')
    expect(parsed.nodes[0].extent).toBe('parent')
  })

  it('preserves fillColor, strokeColor, textColor, isHandDrawn', () => {
    const node = makeNode('A', {
      data: {
        label: 'Node A',
        shape: 'rectangle',
        fillColor: '#ff6b6b',
        strokeColor: '#333',
        textColor: '#fff',
        isHandDrawn: true,
      },
    })
    const result = exportCanvasToJson([node], [], defaultViewport)
    const parsed = JSON.parse(result)
    expect(parsed.nodes[0].data.fillColor).toBe('#ff6b6b')
    expect(parsed.nodes[0].data.strokeColor).toBe('#333')
    expect(parsed.nodes[0].data.textColor).toBe('#fff')
    expect(parsed.nodes[0].data.isHandDrawn).toBe(true)
  })

  it('handles empty nodes and edges arrays', () => {
    const result = exportCanvasToJson([], [], defaultViewport)
    const parsed = JSON.parse(result)
    expect(parsed.nodes).toHaveLength(0)
    expect(parsed.edges).toHaveLength(0)
  })

  it('viewport is included verbatim', () => {
    const viewport = { x: -50.5, y: 20, zoom: 1.5 }
    const result = exportCanvasToJson([], [], viewport)
    const parsed = JSON.parse(result)
    expect(parsed.viewport).toEqual({ x: -50.5, y: 20, zoom: 1.5 })
  })
})

describe('importCanvasFromJson', () => {
  it('returns null for non-JSON string', () => {
    expect(importCanvasFromJson('not json')).toBeNull()
  })

  it('returns null for JSON with wrong version (version: 2)', () => {
    const json = JSON.stringify({ version: 2, exportedAt: '', nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } })
    expect(importCanvasFromJson(json)).toBeNull()
  })

  it('returns null for JSON missing nodes array', () => {
    const json = JSON.stringify({ version: 1, exportedAt: '', edges: [], viewport: { x: 0, y: 0, zoom: 1 } })
    expect(importCanvasFromJson(json)).toBeNull()
  })

  it('returns null for JSON missing edges array', () => {
    const json = JSON.stringify({ version: 1, exportedAt: '', nodes: [], viewport: { x: 0, y: 0, zoom: 1 } })
    expect(importCanvasFromJson(json)).toBeNull()
  })

  it('returns null for JSON missing viewport', () => {
    const json = JSON.stringify({ version: 1, exportedAt: '', nodes: [], edges: [] })
    expect(importCanvasFromJson(json)).toBeNull()
  })

  it('returns null for null viewport', () => {
    const json = JSON.stringify({ version: 1, exportedAt: '', nodes: [], edges: [], viewport: null })
    expect(importCanvasFromJson(json)).toBeNull()
  })

  it('returns null for viewport with non-numeric x', () => {
    const json = JSON.stringify({ version: 1, exportedAt: '', nodes: [], edges: [], viewport: { x: 'bad', y: 0, zoom: 1 } })
    expect(importCanvasFromJson(json)).toBeNull()
  })

  it('returns null for viewport with non-numeric zoom', () => {
    const json = JSON.stringify({ version: 1, exportedAt: '', nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: null } })
    expect(importCanvasFromJson(json)).toBeNull()
  })

  it('returns null for empty viewport object', () => {
    const json = JSON.stringify({ version: 1, exportedAt: '', nodes: [], edges: [], viewport: {} })
    expect(importCanvasFromJson(json)).toBeNull()
  })

  it('returns CanvasJson for minimal valid JSON', () => {
    const json = JSON.stringify({ version: 1, exportedAt: '2026-05-19T00:00:00.000Z', nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } })
    const result = importCanvasFromJson(json)
    expect(result).not.toBeNull()
    expect(result?.version).toBe(1)
    expect(result?.nodes).toHaveLength(0)
    expect(result?.edges).toHaveLength(0)
  })

  it('round-trip: export then import returns structurally equivalent state', () => {
    const nodes = [makeNode('A'), makeNode('B')]
    const edges = [makeEdge('e1', 'A', 'B')]
    const viewport = { x: -10, y: 5, zoom: 1.2 }
    const jsonString = exportCanvasToJson(nodes, edges, viewport)
    const result = importCanvasFromJson(jsonString)
    expect(result).not.toBeNull()
    expect(result?.nodes).toHaveLength(2)
    expect(result?.edges).toHaveLength(1)
    expect(result?.nodes[0].id).toBe('A')
    expect(result?.nodes[1].id).toBe('B')
    expect(result?.edges[0].source).toBe('A')
    expect(result?.edges[0].target).toBe('B')
    expect(result?.viewport).toEqual(viewport)
  })
})
