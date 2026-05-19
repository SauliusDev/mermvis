import { describe, it, expect, vi } from 'vitest'
import type { Edge, Node } from '@xyflow/react'

// vi.mock() is hoisted by Vitest — must appear before source imports.
// This activates src/webview/__mocks__/zustand.ts which resets ALL stores in afterEach.
vi.mock('zustand')

import { useStore, MAX_HISTORY, GRID_SNAP } from './store'
import type { FlowEdgeData, FlowNodeData } from './store'
import type { CanvasJson } from './export'
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

  describe('removeEdge / removeEdges', () => {
    it('removeEdge removes the edge by id and records one history entry', () => {
      useStore.setState({
        nodes: [],
        edges: [makeEdge('e1', 'A', 'B')],
        history: { past: [], future: [] },
      })
      useStore.getState().removeEdge('e1')
      expect(useStore.getState().edges).toHaveLength(0)
      expect(useStore.getState().history.past).toHaveLength(1)
    })

    it('undo() after removeEdge restores the edge', () => {
      useStore.setState({
        nodes: [],
        edges: [makeEdge('e1', 'A', 'B')],
        history: { past: [], future: [] },
      })
      useStore.getState().removeEdge('e1')
      useStore.getState().undo()
      expect(useStore.getState().edges).toHaveLength(1)
      expect(useStore.getState().edges[0].id).toBe('e1')
    })

    it('removeEdge with non-existent id is a no-op — no history entry', () => {
      useStore.setState({ nodes: [], edges: [], history: { past: [], future: [] } })
      useStore.getState().removeEdge('nonexistent')
      expect(useStore.getState().history.past).toHaveLength(0)
    })

    it('removeEdges removes multiple edges in a single history entry', () => {
      useStore.setState({
        nodes: [],
        edges: [makeEdge('e1', 'A', 'B'), makeEdge('e2', 'B', 'C')],
        history: { past: [], future: [] },
      })
      useStore.getState().removeEdges(['e1', 'e2'])
      expect(useStore.getState().edges).toHaveLength(0)
      expect(useStore.getState().history.past).toHaveLength(1)
    })

    it('removeEdges with empty ids array is a no-op', () => {
      useStore.setState({
        nodes: [],
        edges: [makeEdge('e1', 'A', 'B')],
        history: { past: [], future: [] },
      })
      useStore.getState().removeEdges([])
      expect(useStore.getState().history.past).toHaveLength(0)
    })
  })

  describe('updateEdgeLabel', () => {
    it('sets label on edge and creates one history entry', () => {
      useStore.setState({
        nodes: [],
        edges: [makeEdge('e1', 'A', 'B')],
        history: { past: [], future: [] },
      })
      useStore.getState().updateEdgeLabel('e1', 'yes')
      expect(useStore.getState().edges[0].data?.label).toBe('yes')
      expect(useStore.getState().history.past).toHaveLength(1)
    })

    it('undo() after updateEdgeLabel restores previous label', () => {
      useStore.setState({
        nodes: [],
        edges: [makeEdge('e1', 'A', 'B', { data: { style: 'arrow', label: 'old' } })],
        history: { past: [], future: [] },
      })
      useStore.getState().updateEdgeLabel('e1', 'new')
      useStore.getState().undo()
      expect(useStore.getState().edges[0].data?.label).toBe('old')
    })

    it('same label is a no-op — no history entry', () => {
      useStore.setState({
        nodes: [],
        edges: [makeEdge('e1', 'A', 'B', { data: { style: 'arrow', label: 'text' } })],
        history: { past: [], future: [] },
      })
      useStore.getState().updateEdgeLabel('e1', 'text')
      expect(useStore.getState().history.past).toHaveLength(0)
    })

    it('empty string stores undefined and creates one history entry when previous was set', () => {
      useStore.setState({
        nodes: [],
        edges: [makeEdge('e1', 'A', 'B', { data: { style: 'arrow', label: 'text' } })],
        history: { past: [], future: [] },
      })
      useStore.getState().updateEdgeLabel('e1', '')
      expect(useStore.getState().edges[0].data?.label).toBeUndefined()
      expect(useStore.getState().history.past).toHaveLength(1)
    })

    it('empty string on edge with no label is a no-op', () => {
      useStore.setState({
        nodes: [],
        edges: [makeEdge('e1', 'A', 'B')],
        history: { past: [], future: [] },
      })
      useStore.getState().updateEdgeLabel('e1', '  ')
      expect(useStore.getState().history.past).toHaveLength(0)
    })

    it('non-existent id is a no-op', () => {
      useStore.setState({ nodes: [], edges: [], history: { past: [], future: [] } })
      useStore.getState().updateEdgeLabel('nonexistent', 'text')
      expect(useStore.getState().history.past).toHaveLength(0)
    })
  })

  describe('addSubgraph', () => {
    it('creates a node with shape subgraph, type subgraphNode, isSubgraph true', () => {
      useStore.setState({ nodes: [], edges: [], history: { past: [], future: [] } })
      useStore.getState().addSubgraph()
      const { nodes } = useStore.getState()
      expect(nodes).toHaveLength(1)
      expect(nodes[0].type).toBe('subgraphNode')
      expect(nodes[0].data.shape).toBe('subgraph')
      expect(nodes[0].data.isSubgraph).toBe(true)
    })

    it('creates node with default dimensions width=300 height=200', () => {
      useStore.setState({ nodes: [], edges: [], history: { past: [], future: [] } })
      useStore.getState().addSubgraph()
      const node = useStore.getState().nodes[0]
      expect(node.width).toBe(300)
      expect(node.height).toBe(200)
    })

    it('creates exactly one history entry', () => {
      useStore.setState({ nodes: [], edges: [], history: { past: [], future: [] } })
      useStore.getState().addSubgraph()
      expect(useStore.getState().history.past).toHaveLength(1)
    })

    it('undo removes the created subgraph', () => {
      useStore.setState({ nodes: [], edges: [], history: { past: [], future: [] } })
      useStore.getState().addSubgraph()
      useStore.getState().undo()
      expect(useStore.getState().nodes).toHaveLength(0)
      expect(useStore.getState().history.past).toHaveLength(0)
    })
  })

  describe('assignToSubgraph', () => {
    const makeSubgraph = (id: string, pos = { x: 100, y: 100 }) =>
      makeNode(id, {
        type: 'subgraphNode',
        data: { label: 'Group', shape: 'subgraph', isSubgraph: true },
        position: pos,
        width: 300,
        height: 200,
      })

    it('sets parentId on the node', () => {
      const sg = makeSubgraph('SG1')
      const node = makeNode('A', { position: { x: 150, y: 150 } })
      useStore.setState({ nodes: [sg, node], edges: [], history: { past: [], future: [] } })
      useStore.getState().assignToSubgraph('A', 'SG1', { x: 50, y: 50 })
      const updated = useStore.getState().nodes.find(n => n.id === 'A')
      expect(updated?.parentId).toBe('SG1')
    })

    it('sets position to provided relative coords', () => {
      const sg = makeSubgraph('SG1')
      const node = makeNode('A')
      useStore.setState({ nodes: [sg, node], edges: [], history: { past: [], future: [] } })
      useStore.getState().assignToSubgraph('A', 'SG1', { x: 50, y: 50 })
      const updated = useStore.getState().nodes.find(n => n.id === 'A')
      expect(updated?.position).toEqual({ x: 50, y: 50 })
    })

    it('sets extent: "parent" for containment', () => {
      const sg = makeSubgraph('SG1')
      const node = makeNode('A')
      useStore.setState({ nodes: [sg, node], edges: [], history: { past: [], future: [] } })
      useStore.getState().assignToSubgraph('A', 'SG1', { x: 50, y: 50 })
      const updated = useStore.getState().nodes.find(n => n.id === 'A')
      expect(updated?.extent).toBe('parent')
    })

    it('parent subgraph appears before child in nodes array', () => {
      const sg = makeSubgraph('SG1')
      const node = makeNode('A')
      useStore.setState({ nodes: [sg, node], edges: [], history: { past: [], future: [] } })
      useStore.getState().assignToSubgraph('A', 'SG1', { x: 50, y: 50 })
      const { nodes } = useStore.getState()
      const sgIdx = nodes.findIndex(n => n.id === 'SG1')
      const nodeIdx = nodes.findIndex(n => n.id === 'A')
      expect(sgIdx).toBeLessThan(nodeIdx)
    })

    it('no-op when node already has same parentId (no history entry)', () => {
      const sg = makeSubgraph('SG1')
      const node = { ...makeNode('A'), parentId: 'SG1' }
      useStore.setState({ nodes: [sg, node], edges: [], history: { past: [], future: [] } })
      useStore.getState().assignToSubgraph('A', 'SG1', { x: 50, y: 50 })
      expect(useStore.getState().history.past).toHaveLength(0)
    })
  })

  describe('removeFromSubgraph', () => {
    it('clears parentId from the node', () => {
      const sg = makeNode('SG1', {
        type: 'subgraphNode',
        data: { label: 'Group', shape: 'subgraph', isSubgraph: true },
        position: { x: 100, y: 100 },
      })
      const child = { ...makeNode('A', { position: { x: 50, y: 50 } }), parentId: 'SG1' }
      useStore.setState({ nodes: [sg, child], edges: [], history: { past: [], future: [] } })
      useStore.getState().removeFromSubgraph('A', { x: 150, y: 150 })
      const updated = useStore.getState().nodes.find(n => n.id === 'A')
      expect(updated?.parentId).toBeUndefined()
    })

    it('sets absolute position to provided coords', () => {
      const sg = makeNode('SG1', { data: { label: 'G', shape: 'subgraph', isSubgraph: true }, position: { x: 100, y: 100 } })
      const child = { ...makeNode('A', { position: { x: 50, y: 50 } }), parentId: 'SG1' }
      useStore.setState({ nodes: [sg, child], edges: [], history: { past: [], future: [] } })
      useStore.getState().removeFromSubgraph('A', { x: 200, y: 180 })
      const updated = useStore.getState().nodes.find(n => n.id === 'A')
      expect(updated?.position).toEqual({ x: 200, y: 180 })
    })

    it('creates exactly one history entry', () => {
      const sg = makeNode('SG1', { data: { label: 'G', shape: 'subgraph', isSubgraph: true }, position: { x: 0, y: 0 } })
      const child = { ...makeNode('A'), parentId: 'SG1' }
      useStore.setState({ nodes: [sg, child], edges: [], history: { past: [], future: [] } })
      useStore.getState().removeFromSubgraph('A', { x: 0, y: 0 })
      expect(useStore.getState().history.past).toHaveLength(1)
    })

    it('no-op when node has no parentId (no history entry)', () => {
      const node = makeNode('A')
      useStore.setState({ nodes: [node], edges: [], history: { past: [], future: [] } })
      useStore.getState().removeFromSubgraph('A', { x: 0, y: 0 })
      expect(useStore.getState().history.past).toHaveLength(0)
    })
  })

  describe('removeNodes — subgraph deletion with child promotion', () => {
    function makeSubgraph(id: string, pos = { x: 100, y: 100 }): Node<FlowNodeData> {
      return makeNode(id, {
        type: 'subgraphNode',
        data: { label: 'Group', shape: 'subgraph', isSubgraph: true },
        position: pos,
        width: 300,
        height: 200,
      })
    }

    function makeChild(id: string, parentId: string, pos = { x: 50, y: 50 }): Node<FlowNodeData> {
      return { ...makeNode(id, { position: pos }), parentId, extent: 'parent' as const }
    }

    it('deleting subgraph promotes child regular node to top-level (parentId cleared)', () => {
      const sg = makeSubgraph('SG1', { x: 100, y: 100 })
      const child = makeChild('A', 'SG1', { x: 50, y: 50 })
      useStore.setState({ nodes: [sg, child], edges: [], history: { past: [], future: [] } })
      useStore.getState().removeNodes(['SG1'])
      const promoted = useStore.getState().nodes.find(n => n.id === 'A')
      expect(promoted?.parentId).toBeUndefined()
    })

    it('promoted child position is absolute (parent.pos + child.pos)', () => {
      const sg = makeSubgraph('SG1', { x: 100, y: 100 })
      const child = makeChild('A', 'SG1', { x: 50, y: 60 })
      useStore.setState({ nodes: [sg, child], edges: [], history: { past: [], future: [] } })
      useStore.getState().removeNodes(['SG1'])
      const promoted = useStore.getState().nodes.find(n => n.id === 'A')
      expect(promoted?.position).toEqual({ x: 150, y: 160 })
    })

    it('promoted child has extent cleared', () => {
      const sg = makeSubgraph('SG1', { x: 0, y: 0 })
      const child = makeChild('A', 'SG1', { x: 20, y: 20 })
      useStore.setState({ nodes: [sg, child], edges: [], history: { past: [], future: [] } })
      useStore.getState().removeNodes(['SG1'])
      const promoted = useStore.getState().nodes.find(n => n.id === 'A')
      expect(promoted?.extent).toBeUndefined()
    })

    it('deleting subgraph that contains a nested subgraph promotes the nested subgraph to top-level', () => {
      const outer = makeSubgraph('OUTER', { x: 0, y: 0 })
      const inner = { ...makeSubgraph('INNER', { x: 10, y: 10 }), parentId: 'OUTER', extent: 'parent' as const }
      useStore.setState({ nodes: [outer, inner], edges: [], history: { past: [], future: [] } })
      useStore.getState().removeNodes(['OUTER'])
      const promotedInner = useStore.getState().nodes.find(n => n.id === 'INNER')
      expect(promotedInner).toBeDefined()
      expect(promotedInner?.parentId).toBeUndefined()
    })

    it('deletion + promotion creates exactly one undo-able history entry', () => {
      const sg = makeSubgraph('SG1', { x: 0, y: 0 })
      const child = makeChild('A', 'SG1', { x: 20, y: 20 })
      useStore.setState({ nodes: [sg, child], edges: [], history: { past: [], future: [] } })
      const before = useStore.getState().history.past.length
      useStore.getState().removeNodes(['SG1'])
      expect(useStore.getState().history.past.length).toBe(before + 1)
      useStore.getState().undo()
      expect(useStore.getState().nodes.find(n => n.id === 'SG1')).toBeDefined()
      expect(useStore.getState().nodes.find(n => n.id === 'A')?.parentId).toBe('SG1')
    })

    it('edges connected to deleted subgraph are removed but edges between promoted children are preserved', () => {
      const sg = makeSubgraph('SG1', { x: 0, y: 0 })
      const childA = makeChild('A', 'SG1', { x: 20, y: 20 })
      const childB = makeChild('B', 'SG1', { x: 60, y: 20 })
      useStore.setState({
        nodes: [sg, childA, childB],
        edges: [
          makeEdge('e-sg-a', 'SG1', 'A'),
          makeEdge('e-a-b', 'A', 'B'),
        ],
        history: { past: [], future: [] },
      })
      useStore.getState().removeNodes(['SG1'])
      const { edges } = useStore.getState()
      expect(edges.find(e => e.id === 'e-sg-a')).toBeUndefined()
      expect(edges.find(e => e.id === 'e-a-b')).toBeDefined()
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

  describe('updateNodeShape', () => {
    it('changes the node shape and creates a history entry', () => {
      useStore.setState({ nodes: [makeNode('a')], edges: [], history: { past: [], future: [] } })
      useStore.getState().updateNodeShape('a', 'diamond')
      expect(useStore.getState().nodes[0].data.shape).toBe('diamond')
      expect(useStore.getState().history.past).toHaveLength(1)
    })

    it('is a no-op when shape is unchanged (same shape reference)', () => {
      useStore.setState({ nodes: [makeNode('a')], edges: [], history: { past: [], future: [] } })
      const before = useStore.getState().history.past.length
      useStore.getState().updateNodeShape('a', 'rectangle')
      expect(useStore.getState().history.past.length).toBe(before)
    })
  })

  describe('duplicateNode', () => {
    it('creates a new node at GRID_SNAP offset from original', () => {
      useStore.setState({
        nodes: [makeNode('a', { position: { x: 100, y: 200 } })],
        edges: [],
        history: { past: [], future: [] },
      })
      useStore.getState().duplicateNode('a')
      const { nodes } = useStore.getState()
      const copy = nodes.find(n => n.id !== 'a')!
      expect(copy.position).toEqual({ x: 100 + GRID_SNAP, y: 200 + GRID_SNAP })
    })

    it('new node has a different id from original', () => {
      useStore.setState({ nodes: [makeNode('a')], edges: [], history: { past: [], future: [] } })
      useStore.getState().duplicateNode('a')
      const { nodes } = useStore.getState()
      expect(nodes).toHaveLength(2)
      expect(nodes[0].id).toBe('a')
      expect(nodes[1].id).not.toBe('a')
    })

    it('duplicated node is selected, original is deselected', () => {
      useStore.setState({
        nodes: [makeNode('a', { selected: true })],
        edges: [],
        history: { past: [], future: [] },
      })
      useStore.getState().duplicateNode('a')
      const { nodes } = useStore.getState()
      const original = nodes.find(n => n.id === 'a')!
      const copy = nodes.find(n => n.id !== 'a')!
      expect(original.selected).toBe(false)
      expect(copy.selected).toBe(true)
    })

    it('is a no-op for unknown node id', () => {
      useStore.setState({ nodes: [], edges: [], history: { past: [], future: [] } })
      useStore.getState().duplicateNode('nonexistent')
      expect(useStore.getState().history.past).toHaveLength(0)
    })

    it('creates one history entry', () => {
      useStore.setState({ nodes: [makeNode('a')], edges: [], history: { past: [], future: [] } })
      useStore.getState().duplicateNode('a')
      expect(useStore.getState().history.past).toHaveLength(1)
    })
  })

  describe('updateNodeColors', () => {
    it('updates fillColor and creates a history entry', () => {
      useStore.setState({ nodes: [makeNode('a')], edges: [], history: { past: [], future: [] } })
      useStore.getState().updateNodeColors('a', { fillColor: '#1e2a3a' })
      expect(useStore.getState().nodes[0].data.fillColor).toBe('#1e2a3a')
      expect(useStore.getState().history.past).toHaveLength(1)
    })

    it('updates strokeColor and creates a history entry', () => {
      useStore.setState({ nodes: [makeNode('a')], edges: [], history: { past: [], future: [] } })
      useStore.getState().updateNodeColors('a', { strokeColor: '#3a6a8a' })
      expect(useStore.getState().nodes[0].data.strokeColor).toBe('#3a6a8a')
      expect(useStore.getState().history.past).toHaveLength(1)
    })

    it('updates textColor and creates a history entry', () => {
      useStore.setState({ nodes: [makeNode('a')], edges: [], history: { past: [], future: [] } })
      useStore.getState().updateNodeColors('a', { textColor: '#79b3d3' })
      expect(useStore.getState().nodes[0].data.textColor).toBe('#79b3d3')
      expect(useStore.getState().history.past).toHaveLength(1)
    })

    it('reset (all undefined) clears color overrides', () => {
      useStore.setState({
        nodes: [makeNode('a', { data: { label: 'Node a', shape: 'rectangle', fillColor: '#1e2a3a', strokeColor: '#3a6a8a', textColor: '#79b3d3' } })],
        edges: [],
        history: { past: [], future: [] },
      })
      useStore.getState().updateNodeColors('a', { fillColor: undefined, strokeColor: undefined, textColor: undefined })
      const d = useStore.getState().nodes[0].data
      expect(d.fillColor).toBeUndefined()
      expect(d.strokeColor).toBeUndefined()
      expect(d.textColor).toBeUndefined()
      expect(useStore.getState().history.past).toHaveLength(1)
    })

    it('is a no-op when colors are unchanged', () => {
      useStore.setState({
        nodes: [makeNode('a', { data: { label: 'Node a', shape: 'rectangle', fillColor: '#1e2a3a' } })],
        edges: [],
        history: { past: [], future: [] },
      })
      const before = useStore.getState().history.past.length
      useStore.getState().updateNodeColors('a', { fillColor: '#1e2a3a' })
      expect(useStore.getState().history.past.length).toBe(before)
    })

    it('is a no-op for unknown node id', () => {
      useStore.setState({ nodes: [], edges: [], history: { past: [], future: [] } })
      useStore.getState().updateNodeColors('nonexistent', { fillColor: '#1e2a3a' })
      expect(useStore.getState().history.past).toHaveLength(0)
    })
  })

  describe('toggleNodeLock', () => {
    it('sets draggable to false when node is draggable (unlocked)', () => {
      useStore.setState({ nodes: [makeNode('a')], edges: [], history: { past: [], future: [] } })
      useStore.getState().toggleNodeLock('a')
      expect(useStore.getState().nodes[0].draggable).toBe(false)
    })

    it('sets draggable to true when node is locked (draggable: false)', () => {
      useStore.setState({
        nodes: [makeNode('a', { draggable: false })],
        edges: [],
        history: { past: [], future: [] },
      })
      useStore.getState().toggleNodeLock('a')
      expect(useStore.getState().nodes[0].draggable).toBe(true)
    })

    it('creates one history entry per toggle', () => {
      useStore.setState({ nodes: [makeNode('a')], edges: [], history: { past: [], future: [] } })
      useStore.getState().toggleNodeLock('a')
      expect(useStore.getState().history.past).toHaveLength(1)
      useStore.getState().toggleNodeLock('a')
      expect(useStore.getState().history.past).toHaveLength(2)
    })
  })

  describe('setFilename', () => {
    it('updates filename in the store', () => {
      useStore.getState().setFilename('my-diagram.mmd')
      expect(useStore.getState().filename).toBe('my-diagram.mmd')
    })

    it('does not create a history entry when filename is set', () => {
      const before = useStore.getState().history.past.length
      useStore.getState().setFilename('another.mmd')
      expect(useStore.getState().history.past.length).toBe(before)
    })
  })

  describe('setSyncDirection', () => {
    it('sets syncDirection to "canvas"', () => {
      useStore.getState().setSyncDirection('canvas')
      expect(useStore.getState().syncDirection).toBe('canvas')
    })

    it('does not create a history entry', () => {
      const historyBefore = useStore.getState().history.past.length
      useStore.getState().setSyncDirection('canvas')
      expect(useStore.getState().history.past.length).toBe(historyBefore)
    })
  })

  describe('importFromCode', () => {
    function makeParsedNode(id: string, label = id) {
      return {
        id,
        type: 'flowNode' as const,
        position: { x: 0, y: 0 },
        data: { label, shape: 'rectangle' as const },
      }
    }

    it('adds new nodes from parsed result', () => {
      useStore.setState({ nodes: [], edges: [], history: { past: [], future: [] } })
      useStore.getState().importFromCode({
        nodes: [makeParsedNode('A'), makeParsedNode('B')],
        edges: [],
        passthroughLines: [],
      })
      expect(useStore.getState().nodes).toHaveLength(2)
    })

    it('preserves positions of existing nodes by ID', () => {
      const existing = makeNode('A', { position: { x: 100, y: 200 } })
      useStore.setState({ nodes: [existing], edges: [], history: { past: [], future: [] } })
      useStore.getState().importFromCode({
        nodes: [makeParsedNode('A')],
        edges: [],
        passthroughLines: [],
      })
      expect(useStore.getState().nodes[0].position).toEqual({ x: 100, y: 200 })
    })

    it('preserves fill/stroke/textColor of existing nodes', () => {
      const existing = makeNode('A', {
        data: { label: 'A', shape: 'rectangle', fillColor: '#111', strokeColor: '#222', textColor: '#333' },
      })
      useStore.setState({ nodes: [existing], edges: [], history: { past: [], future: [] } })
      useStore.getState().importFromCode({
        nodes: [makeParsedNode('A')],
        edges: [],
        passthroughLines: [],
      })
      const updated = useStore.getState().nodes[0]
      expect(updated.data.fillColor).toBe('#111')
      expect(updated.data.strokeColor).toBe('#222')
      expect(updated.data.textColor).toBe('#333')
    })

    it('replaces edges with parsed edges', () => {
      useStore.setState({
        nodes: [makeNode('A'), makeNode('B')],
        edges: [makeEdge('e-old', 'A', 'B')],
        history: { past: [], future: [] },
      })
      useStore.getState().importFromCode({
        nodes: [makeParsedNode('A'), makeParsedNode('B')],
        edges: [{ id: 'e-new', source: 'A', target: 'B', type: 'default', data: { style: 'arrow' as const } }],
        passthroughLines: [],
      })
      expect(useStore.getState().edges).toHaveLength(1)
      expect(useStore.getState().edges[0].id).toBe('e-new')
    })

    it('is a no-op when nodes and edges are semantically unchanged — no history entry', () => {
      const existing = makeNode('A', { data: { label: 'A', shape: 'rectangle' } })
      useStore.setState({ nodes: [existing], edges: [], history: { past: [], future: [] } })
      const before = useStore.getState().history.past.length
      useStore.getState().importFromCode({
        nodes: [makeParsedNode('A', 'A')],
        edges: [],
        passthroughLines: [],
      })
      expect(useStore.getState().history.past.length).toBe(before)
    })
  })

  describe('isDirty', () => {
    it('defaults to false', () => {
      expect(useStore.getState().isDirty).toBe(false)
    })

    it('is set to true after any withHistory() mutation (e.g. addNode)', () => {
      useStore.getState().addNode(makeNode('a'))
      expect(useStore.getState().isDirty).toBe(true)
    })

    it('clearDirty() resets isDirty to false', () => {
      useStore.getState().addNode(makeNode('a'))
      useStore.getState().clearDirty()
      expect(useStore.getState().isDirty).toBe(false)
    })
  })

  describe('fitViewRequested', () => {
    it('defaults to false', () => {
      expect(useStore.getState().fitViewRequested).toBe(false)
    })

    it('requestFitView() sets fitViewRequested to true', () => {
      useStore.getState().requestFitView()
      expect(useStore.getState().fitViewRequested).toBe(true)
    })

    it('clearFitViewRequest() sets fitViewRequested to false', () => {
      useStore.getState().requestFitView()
      useStore.getState().clearFitViewRequest()
      expect(useStore.getState().fitViewRequested).toBe(false)
    })
  })

  describe('importFromJson', () => {
    function makeCanvasJson(overrides: Partial<CanvasJson> = {}): CanvasJson {
      return {
        version: 1,
        exportedAt: '2026-05-19T00:00:00.000Z',
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        ...overrides,
      }
    }

    it('replaces nodes and edges with the loaded JSON state', () => {
      useStore.setState({ nodes: [makeNode('old')], edges: [], history: { past: [], future: [] } })
      const json = makeCanvasJson({
        nodes: [makeNode('X'), makeNode('Y')],
        edges: [makeEdge('e1', 'X', 'Y')],
      })
      useStore.getState().importFromJson(json)
      expect(useStore.getState().nodes).toHaveLength(2)
      expect(useStore.getState().nodes[0].id).toBe('X')
      expect(useStore.getState().edges).toHaveLength(1)
    })

    it('creates a single undo-able history entry', () => {
      useStore.setState({ nodes: [makeNode('old')], edges: [], history: { past: [], future: [] } })
      const json = makeCanvasJson({ nodes: [makeNode('new')], edges: [] })
      useStore.getState().importFromJson(json)
      expect(useStore.getState().history.past).toHaveLength(1)
      useStore.getState().undo()
      expect(useStore.getState().nodes).toHaveLength(1)
      expect(useStore.getState().nodes[0].id).toBe('old')
    })

    it('calls requestViewportRestore with the loaded viewport', () => {
      useStore.setState({ nodes: [], edges: [], viewportToRestore: null, history: { past: [], future: [] } })
      const viewport = { x: -50, y: 20, zoom: 1.5 }
      const json = makeCanvasJson({ nodes: [makeNode('A')], edges: [], viewport })
      useStore.getState().importFromJson(json)
      expect(useStore.getState().viewportToRestore).toEqual(viewport)
    })
  })
})
