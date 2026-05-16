import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

vi.mock('zustand')

// Module-level captured props (accessible from tests)
let capturedSnapToGrid: boolean | undefined
let capturedSnapGrid: [number, number] | undefined
let capturedOnNodeDragStop: ((...args: unknown[]) => void) | undefined
let _capturedOnNodesDelete: ((...args: unknown[]) => void) | undefined
let capturedOnConnect: ((connection: unknown) => void) | undefined
let capturedEdgeTypes: unknown
let capturedOnNodeClick: ((e: unknown, node: { id: string }) => void) | undefined
let capturedOnPaneClick: ((e: React.MouseEvent) => void) | undefined
let capturedEdges: unknown[] | undefined

vi.mock('@xyflow/react', () => ({
  ReactFlow: (props: {
    snapToGrid?: boolean
    snapGrid?: [number, number]
    onNodeDragStop?: (...args: unknown[]) => void
    onNodesDelete?: (...args: unknown[]) => void
    onConnect?: (connection: unknown) => void
    edgeTypes?: unknown
    edges?: unknown[]
    onNodeClick?: (e: unknown, node: { id: string }) => void
    onPaneClick?: (e: React.MouseEvent) => void
    children?: React.ReactNode
  }) => {
    capturedSnapToGrid = props.snapToGrid
    capturedSnapGrid = props.snapGrid
    capturedOnNodeDragStop = props.onNodeDragStop
    _capturedOnNodesDelete = props.onNodesDelete
    capturedOnConnect = props.onConnect
    capturedEdgeTypes = props.edgeTypes
    capturedEdges = props.edges
    capturedOnNodeClick = props.onNodeClick
    capturedOnPaneClick = props.onPaneClick
    return React.createElement('div', { 'data-testid': 'react-flow-mock' }, props.children)
  },
  Background: () => React.createElement('div', { 'data-testid': 'rf-background-mock' }),
  BackgroundVariant: { Dots: 'dots', Lines: 'lines', Cross: 'cross' },
  SelectionMode: { Partial: 'partial', Full: 'full' },
  ConnectionMode: { Loose: 'loose', Strict: 'strict' },
  applyNodeChanges: vi.fn((_changes: unknown, nodes: unknown) => nodes),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  useReactFlow: vi.fn(() => ({
    screenToFlowPosition: vi.fn((pos: { x: number; y: number }) => pos),
  })),
}))

import Canvas from './Canvas'
import { useStore } from '@/lib/store'
import type { Node } from '@xyflow/react'
import type { FlowNodeData } from '@/lib/store'
import { mockReactFlow } from '../setupTests'
import { makeNode, makeEdge } from '@/test/store-helpers'

mockReactFlow()

describe('Canvas', () => {
  beforeEach(() => {
    capturedSnapToGrid = undefined
    capturedSnapGrid = undefined
    capturedOnNodeDragStop = undefined
    _capturedOnNodesDelete = undefined
    capturedOnConnect = undefined
    capturedEdgeTypes = undefined
    capturedEdges = undefined
    capturedOnNodeClick = undefined
    capturedOnPaneClick = undefined
  })

  it('renders canvas-container div', () => {
    const { container } = render(<Canvas />)
    expect(container.querySelector('.canvas-container')).toBeTruthy()
  })

  it('renders mocked ReactFlow', () => {
    render(<Canvas />)
    expect(screen.getByTestId('react-flow-mock')).toBeTruthy()
  })

  it('pressing Escape key deselects all selected nodes', () => {
    const node: Node<FlowNodeData> = {
      id: 'n1',
      position: { x: 0, y: 0 },
      data: { label: 'A', shape: 'rectangle' },
      type: 'flowNode',
      selected: true,
    }
    useStore.setState({ nodes: [node] })
    render(<Canvas />)

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })

    expect(useStore.getState().nodes[0].selected).toBeFalsy()
  })

  it('passes snapToGrid=true and snapGrid=[24,24] to ReactFlow', () => {
    render(<Canvas />)
    expect(capturedSnapToGrid).toBe(true)
    expect(capturedSnapGrid).toEqual([24, 24])
  })

  it('onNodeDragStop calls moveNodes with final node positions', () => {
    const node: Node<FlowNodeData> = {
      id: 'n1',
      position: { x: 0, y: 0 },
      data: { label: 'A', shape: 'rectangle' },
      type: 'flowNode',
    }
    useStore.setState({ nodes: [node] })
    render(<Canvas />)

    const draggedNode = { ...node, position: { x: 48, y: 72 } }
    act(() => {
      capturedOnNodeDragStop?.({}, draggedNode, [draggedNode])
    })

    expect(useStore.getState().nodes[0].position).toEqual({ x: 48, y: 72 })
  })

  it('pressing Delete with a selected node removes it from the store', () => {
    const node: Node<FlowNodeData> = {
      id: 'n1',
      position: { x: 0, y: 0 },
      data: { label: 'A', shape: 'rectangle' },
      type: 'flowNode',
      selected: true,
    }
    useStore.setState({ nodes: [node] })
    render(<Canvas />)

    act(() => {
      fireEvent.keyDown(window, { key: 'Delete' })
    })

    expect(useStore.getState().nodes).toHaveLength(0)
  })

  it('pressing Backspace with a selected node removes it from the store', () => {
    const node: Node<FlowNodeData> = {
      id: 'n1',
      position: { x: 0, y: 0 },
      data: { label: 'A', shape: 'rectangle' },
      type: 'flowNode',
      selected: true,
    }
    useStore.setState({ nodes: [node] })
    render(<Canvas />)

    act(() => {
      fireEvent.keyDown(window, { key: 'Backspace' })
    })

    expect(useStore.getState().nodes).toHaveLength(0)
  })

  it('pressing Delete while an input is focused does not remove selected nodes', () => {
    const node: Node<FlowNodeData> = {
      id: 'n1',
      position: { x: 0, y: 0 },
      data: { label: 'A', shape: 'rectangle' },
      type: 'flowNode',
      selected: true,
    }
    useStore.setState({ nodes: [node] })
    render(<Canvas />)

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    act(() => {
      fireEvent.keyDown(window, { key: 'Delete' })
    })

    expect(useStore.getState().nodes).toHaveLength(1)
    document.body.removeChild(input)
  })

  it('passes onConnect handler to ReactFlow', () => {
    render(<Canvas />)
    expect(capturedOnConnect).toBeTypeOf('function')
  })

  it('onConnect calls store addEdge with connection data', () => {
    const mockAddEdge = vi.fn()
    useStore.setState({ addEdge: mockAddEdge } as never)
    render(<Canvas />)

    act(() => {
      capturedOnConnect?.({ source: 'a', target: 'b', sourceHandle: null, targetHandle: null })
    })

    expect(mockAddEdge).toHaveBeenCalledWith({ source: 'a', target: 'b', sourceHandle: null, targetHandle: null })
  })

  it('edgeTypes prop registers FlowEdge as the default edge type', () => {
    render(<Canvas />)
    expect(capturedEdgeTypes).toHaveProperty('default')
  })

  it('onNodeClick with active pendingConnect creates an edge to target node', () => {
    const mockAddEdge = vi.fn()
    const mockSetPendingConnect = vi.fn()
    useStore.setState({
      nodes: [makeNode('src'), makeNode('tgt')],
      edges: [],
      pendingConnect: { sourceId: 'src' },
      addEdge: mockAddEdge,
      setPendingConnect: mockSetPendingConnect,
    } as never)
    render(<Canvas />)
    act(() => {
      capturedOnNodeClick?.({}, { id: 'tgt' })
    })
    expect(mockAddEdge).toHaveBeenCalledWith({ source: 'src', target: 'tgt' })
    expect(mockSetPendingConnect).toHaveBeenCalledWith(null)
  })

  it('onNodeClick on source node clears pendingConnect without creating edge', () => {
    const mockAddEdge = vi.fn()
    const mockSetPendingConnect = vi.fn()
    useStore.setState({
      nodes: [makeNode('src')],
      pendingConnect: { sourceId: 'src' },
      addEdge: mockAddEdge,
      setPendingConnect: mockSetPendingConnect,
    } as never)
    render(<Canvas />)
    act(() => {
      capturedOnNodeClick?.({}, { id: 'src' })
    })
    expect(mockAddEdge).not.toHaveBeenCalled()
    expect(mockSetPendingConnect).toHaveBeenCalledWith(null)
  })

  it('onPaneClick with active pendingConnect calls spawnConnectedNode', () => {
    const mockSpawn = vi.fn()
    const mockSetPendingConnect = vi.fn()
    useStore.setState({
      nodes: [makeNode('src')],
      pendingConnect: { sourceId: 'src' },
      spawnConnectedNode: mockSpawn,
      setPendingConnect: mockSetPendingConnect,
    } as never)
    render(<Canvas />)
    act(() => {
      capturedOnPaneClick?.({ clientX: 100, clientY: 200 } as React.MouseEvent)
    })
    expect(mockSpawn).toHaveBeenCalledWith('src', { x: 100, y: 200 })
    expect(mockSetPendingConnect).toHaveBeenCalledWith(null)
  })

  it('Escape key clears pendingConnect via setPendingConnect(null)', () => {
    const mockSetPendingConnect = vi.fn()
    useStore.setState({
      nodes: [makeNode('src')],
      pendingConnect: { sourceId: 'src' },
      setPendingConnect: mockSetPendingConnect,
    } as never)
    render(<Canvas />)
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })
    expect(mockSetPendingConnect).toHaveBeenCalledWith(null)
  })

  it('Delete key with selected edge calls removeEdges with edge id', () => {
    const mockRemoveEdges = vi.fn()
    useStore.setState({
      nodes: [],
      edges: [{ id: 'e1', source: 'A', target: 'B', selected: true, data: { style: 'arrow' } }],
      removeEdges: mockRemoveEdges,
      removeNodes: vi.fn(),
      setPendingConnect: vi.fn(),
    } as never)
    render(<Canvas />)
    act(() => { fireEvent.keyDown(window, { key: 'Delete' }) })
    expect(mockRemoveEdges).toHaveBeenCalledWith(['e1'])
  })

  it('Delete key with selected node does not call removeEdges', () => {
    const mockRemoveEdges = vi.fn()
    const mockRemoveNodes = vi.fn()
    useStore.setState({
      nodes: [{ id: 'n1', selected: true, position: { x: 0, y: 0 }, data: { label: 'N', shape: 'rectangle' }, type: 'flowNode' }],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', selected: false, data: { style: 'arrow' } }],
      removeEdges: mockRemoveEdges,
      removeNodes: mockRemoveNodes,
      setPendingConnect: vi.fn(),
    } as never)
    render(<Canvas />)
    act(() => { fireEvent.keyDown(window, { key: 'Delete' }) })
    expect(mockRemoveEdges).not.toHaveBeenCalled()
    expect(mockRemoveNodes).toHaveBeenCalledWith(['n1'])
  })

  it('edges connected to selected node have className flow-edge--connected in displayEdges', () => {
    useStore.setState({
      nodes: [
        makeNode('A', { selected: true }),
        makeNode('B'),
      ],
      edges: [
        makeEdge('e1', 'A', 'B'),
        makeEdge('e2', 'B', 'X'),
      ],
    } as never)
    render(<Canvas />)
    const edges = capturedEdges as Array<{ id: string; className?: string }>
    const e1 = edges.find(e => e.id === 'e1')
    const e2 = edges.find(e => e.id === 'e2')
    expect(e1?.className).toBe('flow-edge--connected')
    expect(e2?.className).toBeUndefined()
  })
})
