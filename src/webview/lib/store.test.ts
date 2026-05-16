import { describe, it, expect, vi } from 'vitest'
import type { Edge, Node } from '@xyflow/react'

// vi.mock() is hoisted by Vitest — must appear before source imports.
// This activates src/webview/__mocks__/zustand.ts which resets ALL stores in afterEach.
vi.mock('zustand')

import { useStore, MAX_HISTORY, GRID_SNAP } from './store'
import type { FlowEdgeData, FlowNodeData } from './store'
import { makeEdge } from '@/test/store-helpers'

function makeNode(id: string, overrides: Partial<Node<FlowNodeData>> = {}): Node<FlowNodeData> {
  return {
    id,
    position: { x: 0, y: 0 },
    data: { label: `Node ${id}`, shape: 'rectangle' },
    type: 'default',
    ...overrides,
  }
}

describe('useStore', () => {
  describe('addNode', () => {
    it('appends a node to nodes array', () => {
      useStore.getState().addNode(makeNode('a'))
      expect(useStore.getState().nodes).toHaveLength(1)
      expect(useStore.getState().nodes[0].id).toBe('a')
    })

    it('creates one history entry', () => {
      useStore.getState().addNode(makeNode('a'))
      expect(useStore.getState().history.past).toHaveLength(1)
    })
  })

  describe('removeNode', () => {
    it('removes the node with the given id', () => {
      useStore.getState().addNode(makeNode('a'))
      useStore.getState().removeNode('a')
      expect(useStore.getState().nodes).toHaveLength(0)
    })

    it('removes edges connected to the deleted node', () => {
      useStore.getState().addNode(makeNode('a'))
      useStore.getState().addNode(makeNode('b'))
      // Set edges directly — no addEdge action yet (Story 3.x)
      useStore.setState({
        edges: [{ id: 'e1', source: 'a', target: 'b' }] as Edge<FlowEdgeData>[],
      })
      useStore.getState().removeNode('a')
      expect(useStore.getState().edges).toHaveLength(0)
    })

    it('does not create a history entry when id is not found', () => {
      const before = useStore.getState().history.past.length
      useStore.getState().removeNode('nonexistent')
      expect(useStore.getState().history.past.length).toBe(before)
    })
  })

  describe('removeNodes', () => {
    it('removes multiple nodes matching ids', () => {
      useStore.getState().addNode(makeNode('a'))
      useStore.getState().addNode(makeNode('b'))
      useStore.getState().removeNodes(['a', 'b'])
      expect(useStore.getState().nodes).toHaveLength(0)
    })

    it('removes only specified nodes, keeps others', () => {
      useStore.getState().addNode(makeNode('a'))
      useStore.getState().addNode(makeNode('b'))
      useStore.getState().addNode(makeNode('c'))
      useStore.getState().removeNodes(['a'])
      expect(useStore.getState().nodes).toHaveLength(2)
      expect(useStore.getState().nodes.every(n => n.id !== 'a')).toBe(true)
    })

    it('removes edges connected to any deleted node', () => {
      useStore.getState().addNode(makeNode('a'))
      useStore.getState().addNode(makeNode('b'))
      useStore.setState({
        edges: [{ id: 'e1', source: 'a', target: 'b' }] as Edge<FlowEdgeData>[],
      })
      useStore.getState().removeNodes(['a'])
      expect(useStore.getState().edges).toHaveLength(0)
    })

    it('creates exactly one history entry for multi-node deletion', () => {
      useStore.getState().addNode(makeNode('a'))
      useStore.getState().addNode(makeNode('b'))
      const before = useStore.getState().history.past.length
      useStore.getState().removeNodes(['a', 'b'])
      expect(useStore.getState().history.past.length).toBe(before + 1)
    })

    it('no-op when no ids match', () => {
      useStore.getState().addNode(makeNode('a'))
      const before = useStore.getState().history.past.length
      useStore.getState().removeNodes(['z'])
      expect(useStore.getState().history.past.length).toBe(before)
      expect(useStore.getState().nodes).toHaveLength(1)
    })

    it('undo restores deleted nodes and edges', () => {
      useStore.getState().addNode(makeNode('a'))
      useStore.getState().addNode(makeNode('b'))
      useStore.setState({
        edges: [{ id: 'e1', source: 'a', target: 'b' }] as Edge<FlowEdgeData>[],
      })
      useStore.getState().removeNodes(['a', 'b'])
      useStore.getState().undo()
      expect(useStore.getState().nodes).toHaveLength(2)
      expect(useStore.getState().edges).toHaveLength(1)
    })
  })

  describe('updateNodeLabel', () => {
    it('updates the label for the matching node', () => {
      useStore.getState().addNode(makeNode('a'))
      useStore.getState().updateNodeLabel('a', 'Updated')
      expect(useStore.getState().nodes[0].data.label).toBe('Updated')
    })

    it('does not create a history entry when label is unchanged', () => {
      useStore.getState().addNode(makeNode('a'))  // label is 'Node a'
      const before = useStore.getState().history.past.length
      useStore.getState().updateNodeLabel('a', 'Node a')  // same label
      expect(useStore.getState().history.past.length).toBe(before)
    })
  })

  describe('moveNodes', () => {
    it('updates positions for matching nodes', () => {
      useStore.getState().addNode(makeNode('a'))
      useStore.getState().moveNodes([{ id: 'a', position: { x: 100, y: 200 } }])
      expect(useStore.getState().nodes[0].position).toEqual({ x: 100, y: 200 })
    })

    it('does not create a history entry when positions are unchanged', () => {
      useStore.getState().addNode(makeNode('a'))  // position { x: 0, y: 0 }
      const before = useStore.getState().history.past.length
      useStore.getState().moveNodes([{ id: 'a', position: { x: 0, y: 0 } }])
      expect(useStore.getState().history.past.length).toBe(before)
    })
  })

  describe('undo', () => {
    it('restores the previous state', () => {
      useStore.getState().addNode(makeNode('a'))
      useStore.getState().undo()
      expect(useStore.getState().nodes).toHaveLength(0)
    })

    it('moves the current state to history.future', () => {
      useStore.getState().addNode(makeNode('a'))
      useStore.getState().undo()
      expect(useStore.getState().history.future).toHaveLength(1)
    })

    it('does nothing when history.past is empty', () => {
      useStore.getState().undo()
      expect(useStore.getState().nodes).toHaveLength(0)
      expect(useStore.getState().history.past).toHaveLength(0)
    })
  })

  describe('redo', () => {
    it('re-applies the undone state', () => {
      useStore.getState().addNode(makeNode('a'))
      useStore.getState().undo()
      useStore.getState().redo()
      expect(useStore.getState().nodes).toHaveLength(1)
    })

    it('clears the re-applied snapshot from history.future', () => {
      useStore.getState().addNode(makeNode('a'))
      useStore.getState().undo()
      useStore.getState().redo()
      expect(useStore.getState().history.future).toHaveLength(0)
    })

    it('does nothing when history.future is empty', () => {
      useStore.getState().addNode(makeNode('a'))
      useStore.getState().redo()
      expect(useStore.getState().nodes).toHaveLength(1)
      expect(useStore.getState().history.future).toHaveLength(0)
    })
  })

  describe('resizeNode', () => {
    it('updates width and height for matching node', () => {
      useStore.getState().addNode(makeNode('a'))
      useStore.getState().resizeNode('a', { width: 200, height: 80 })
      expect(useStore.getState().nodes[0].width).toBe(200)
      expect(useStore.getState().nodes[0].height).toBe(80)
    })

    it('updates position when position argument provided', () => {
      useStore.getState().addNode(makeNode('a'))
      useStore.getState().resizeNode('a', { width: 200, height: 80 }, { x: 10, y: 20 })
      expect(useStore.getState().nodes[0].position).toEqual({ x: 10, y: 20 })
    })

    it('creates a history entry', () => {
      useStore.getState().addNode(makeNode('a'))
      const before = useStore.getState().history.past.length
      useStore.getState().resizeNode('a', { width: 200, height: 80 })
      expect(useStore.getState().history.past.length).toBe(before + 1)
    })

    it('does not create a history entry when id not found', () => {
      const before = useStore.getState().history.past.length
      useStore.getState().resizeNode('nonexistent', { width: 200, height: 80 })
      expect(useStore.getState().history.past.length).toBe(before)
    })

    it('does not create a history entry when dimensions are unchanged', () => {
      useStore.getState().addNode(makeNode('a'))
      useStore.getState().resizeNode('a', { width: 200, height: 80 })
      const before = useStore.getState().history.past.length
      useStore.getState().resizeNode('a', { width: 200, height: 80 })
      expect(useStore.getState().history.past.length).toBe(before)
    })

    it('creates a history entry when only position changes', () => {
      useStore.getState().addNode(makeNode('a'))
      useStore.getState().resizeNode('a', { width: 200, height: 80 })
      const before = useStore.getState().history.past.length
      useStore.getState().resizeNode('a', { width: 200, height: 80 }, { x: 10, y: 20 })
      expect(useStore.getState().history.past.length).toBe(before + 1)
    })
  })

  describe('GRID_SNAP constant', () => {
    it('equals 24 (matches Background dot grid gap)', () => {
      expect(GRID_SNAP).toBe(24)
    })
  })

  describe('MAX_HISTORY cap', () => {
    it('history.past never exceeds MAX_HISTORY entries', () => {
      for (let i = 0; i < 105; i++) {
        useStore.getState().addNode(makeNode(`n${i}`))
      }
      expect(useStore.getState().history.past.length).toBeLessThanOrEqual(MAX_HISTORY)
    })
  })

  describe('deselectAll', () => {
    it('clears selected state on all selected nodes', () => {
      useStore.getState().addNode(makeNode('a'))
      useStore.setState({ nodes: [{ ...useStore.getState().nodes[0], selected: true }] })
      useStore.getState().deselectAll()
      expect(useStore.getState().nodes[0].selected).toBeFalsy()
    })

    it('is a no-op when no nodes are selected', () => {
      useStore.getState().addNode(makeNode('a'))
      const nodesBefore = useStore.getState().nodes
      useStore.getState().deselectAll()
      expect(useStore.getState().nodes).toBe(nodesBefore)
    })

    it('does not create a history entry', () => {
      useStore.getState().addNode(makeNode('a'))
      useStore.setState({ nodes: [{ ...useStore.getState().nodes[0], selected: true }] })
      const historyLengthBefore = useStore.getState().history.past.length
      useStore.getState().deselectAll()
      expect(useStore.getState().history.past.length).toBe(historyLengthBefore)
    })
  })

  describe('addEdge', () => {
    it('creates an edge with correct source, target, id, and style', () => {
      useStore.getState().addEdge({ source: 'a', target: 'b' })
      const edges = useStore.getState().edges
      expect(edges).toHaveLength(1)
      expect(edges[0].id).toBe('e-a-b')
      expect(edges[0].source).toBe('a')
      expect(edges[0].target).toBe('b')
      expect(edges[0].data?.style).toBe('arrow')
    })

    it('creates exactly one history entry', () => {
      const before = useStore.getState().history.past.length
      useStore.getState().addEdge({ source: 'a', target: 'b' })
      expect(useStore.getState().history.past.length).toBe(before + 1)
    })

    it('undo removes the created edge', () => {
      useStore.getState().addEdge({ source: 'a', target: 'b' })
      useStore.getState().undo()
      expect(useStore.getState().edges).toHaveLength(0)
    })

    it('does not create a duplicate when called twice with same source/target', () => {
      useStore.getState().addEdge({ source: 'a', target: 'b' })
      useStore.getState().addEdge({ source: 'a', target: 'b' })
      expect(useStore.getState().edges).toHaveLength(1)
      expect(useStore.getState().history.past.length).toBe(1)
    })

    it('prevents self-loops (source === target)', () => {
      const before = useStore.getState().history.past.length
      useStore.getState().addEdge({ source: 'a', target: 'a' })
      expect(useStore.getState().edges).toHaveLength(0)
      expect(useStore.getState().history.past.length).toBe(before)
    })
  })

  describe('pendingConnect / setPendingConnect', () => {
    it('setPendingConnect sets sourceId', () => {
      useStore.setState({ pendingConnect: null, history: { past: [], future: [] } })
      useStore.getState().setPendingConnect('node-1')
      expect(useStore.getState().pendingConnect?.sourceId).toBe('node-1')
    })

    it('setPendingConnect(null) clears pendingConnect', () => {
      useStore.setState({ pendingConnect: { sourceId: 'node-1' }, history: { past: [], future: [] } })
      useStore.getState().setPendingConnect(null)
      expect(useStore.getState().pendingConnect).toBeNull()
    })

    it('setPendingConnect does NOT create a history entry', () => {
      useStore.setState({ pendingConnect: null, history: { past: [], future: [] } })
      useStore.getState().setPendingConnect('node-1')
      expect(useStore.getState().history.past).toHaveLength(0)
    })
  })

  describe('spawnConnectedNode', () => {
    it('creates a new node with the same shape as the source node', () => {
      useStore.setState({
        nodes: [makeNode('src', { data: { label: 'Src', shape: 'diamond' } })],
        edges: [],
        history: { past: [], future: [] },
      })
      useStore.getState().spawnConnectedNode('src', { x: 200, y: 300 })
      const { nodes } = useStore.getState()
      const newNode = nodes.find(n => n.id !== 'src')!
      expect(newNode.data.shape).toBe('diamond')
      expect(newNode.data.label).toBe('Node')
      expect(newNode.position).toEqual({ x: 200, y: 300 })
      expect(newNode.type).toBe('flowNode')
    })

    it('creates an edge from source to new node with style arrow', () => {
      useStore.setState({
        nodes: [makeNode('src')],
        edges: [],
        history: { past: [], future: [] },
      })
      useStore.getState().spawnConnectedNode('src', { x: 100, y: 100 })
      const { edges, nodes } = useStore.getState()
      const newNodeId = nodes.find(n => n.id !== 'src')!.id
      expect(edges).toHaveLength(1)
      expect(edges[0].source).toBe('src')
      expect(edges[0].target).toBe(newNodeId)
      expect(edges[0].data?.style).toBe('arrow')
    })

    it('creates exactly ONE history entry (node + edge atomic)', () => {
      useStore.setState({
        nodes: [makeNode('src')],
        edges: [],
        history: { past: [], future: [] },
      })
      useStore.getState().spawnConnectedNode('src', { x: 100, y: 100 })
      expect(useStore.getState().history.past).toHaveLength(1)
    })

    it('undo() removes both the spawned node and edge', () => {
      useStore.setState({
        nodes: [makeNode('src')],
        edges: [],
        history: { past: [], future: [] },
      })
      useStore.getState().spawnConnectedNode('src', { x: 100, y: 100 })
      useStore.getState().undo()
      expect(useStore.getState().nodes).toHaveLength(1)
      expect(useStore.getState().edges).toHaveLength(0)
    })

    it('non-existent sourceId is a no-op — no history entry', () => {
      useStore.setState({ nodes: [], edges: [], history: { past: [], future: [] } })
      useStore.getState().spawnConnectedNode('nonexistent', { x: 0, y: 0 })
      expect(useStore.getState().history.past).toHaveLength(0)
    })
  })

  describe('setEdgeStyle', () => {
    it('changes edge style and records one history entry', () => {
      useStore.setState({
        nodes: [],
        edges: [makeEdge('e1', 'A', 'B')],
        history: { past: [], future: [] },
      })
      useStore.getState().setEdgeStyle('e1', 'dotted')
      expect(useStore.getState().edges[0].data?.style).toBe('dotted')
      expect(useStore.getState().history.past).toHaveLength(1)
    })

    it('undo() after setEdgeStyle reverts to previous style', () => {
      useStore.setState({
        nodes: [],
        edges: [makeEdge('e1', 'A', 'B')],
        history: { past: [], future: [] },
      })
      useStore.getState().setEdgeStyle('e1', 'thick')
      useStore.getState().undo()
      expect(useStore.getState().edges[0].data?.style).toBe('arrow')
    })

    it('setting same style is a no-op — no history entry created', () => {
      useStore.setState({
        nodes: [],
        edges: [makeEdge('e1', 'A', 'B')],
        history: { past: [], future: [] },
      })
      useStore.getState().setEdgeStyle('e1', 'arrow')
      expect(useStore.getState().history.past).toHaveLength(0)
    })

    it('non-existent edge id is a no-op — no history entry created', () => {
      useStore.setState({ nodes: [], edges: [], history: { past: [], future: [] } })
      useStore.getState().setEdgeStyle('nonexistent', 'dotted')
      expect(useStore.getState().history.past).toHaveLength(0)
    })
  })
})
