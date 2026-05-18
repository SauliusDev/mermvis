import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

vi.mock('zustand')

const mockZoomIn = vi.fn()
const mockZoomOut = vi.fn()
const mockZoomTo = vi.fn()
const mockFitView = vi.fn()

// Module-level captured props (accessible from tests)
let capturedSnapToGrid: boolean | undefined
let capturedSnapGrid: [number, number] | undefined
let capturedPanOnDrag: boolean | undefined
let capturedPanOnScroll: boolean | undefined
let capturedZoomOnScroll: boolean | undefined
let capturedZoomOnPinch: boolean | undefined
let capturedSelectionOnDrag: boolean | undefined
let capturedMinZoom: number | undefined
let capturedMaxZoom: number | undefined
let capturedOnNodeDragStart: ((...args: unknown[]) => void) | undefined
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
    panOnDrag?: boolean
    panOnScroll?: boolean
    zoomOnScroll?: boolean
    zoomOnPinch?: boolean
    selectionOnDrag?: boolean
    minZoom?: number
    maxZoom?: number
    onNodeDragStart?: (...args: unknown[]) => void
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
    capturedPanOnDrag = props.panOnDrag
    capturedPanOnScroll = props.panOnScroll
    capturedZoomOnScroll = props.zoomOnScroll
    capturedZoomOnPinch = props.zoomOnPinch
    capturedSelectionOnDrag = props.selectionOnDrag
    capturedMinZoom = props.minZoom
    capturedMaxZoom = props.maxZoom
    capturedOnNodeDragStart = props.onNodeDragStart
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
  MiniMap: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'react-flow-minimap' }, children),
  BackgroundVariant: { Dots: 'dots', Lines: 'lines', Cross: 'cross' },
  SelectionMode: { Partial: 'partial', Full: 'full' },
  ConnectionMode: { Loose: 'loose', Strict: 'strict' },
  applyNodeChanges: vi.fn((_changes: unknown, nodes: unknown) => nodes),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  useReactFlow: vi.fn(() => ({
    screenToFlowPosition: vi.fn((pos: { x: number; y: number }) => pos),
    setViewport: vi.fn(),
    fitView: mockFitView,
    zoomIn: mockZoomIn,
    zoomOut: mockZoomOut,
    zoomTo: mockZoomTo,
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
    capturedPanOnDrag = undefined
    capturedPanOnScroll = undefined
    capturedZoomOnScroll = undefined
    capturedZoomOnPinch = undefined
    capturedSelectionOnDrag = undefined
    capturedMinZoom = undefined
    capturedMaxZoom = undefined
    capturedOnNodeDragStart = undefined
    capturedOnNodeDragStop = undefined
    _capturedOnNodesDelete = undefined
    capturedOnConnect = undefined
    capturedEdgeTypes = undefined
    capturedEdges = undefined
    capturedOnNodeClick = undefined
    capturedOnPaneClick = undefined
    mockZoomIn.mockClear()
    mockZoomOut.mockClear()
    mockZoomTo.mockClear()
    mockFitView.mockClear()
    useStore.setState({ isLocked: false, minimapOpen: false })
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

  it('dragover on canvas-container sets dropEffect to copy', () => {
    const { container } = render(<Canvas />)
    const canvasDiv = container.querySelector('.canvas-container')!
    const mockDT = { dropEffect: '' as string }
    act(() => {
      fireEvent.dragOver(canvasDiv, { dataTransfer: mockDT })
    })
    expect(mockDT.dropEffect).toBe('copy')
  })

  it('drop on canvas-container creates a node with the dragged shape', () => {
    const { container } = render(<Canvas />)
    const canvasDiv = container.querySelector('.canvas-container')!
    act(() => {
      fireEvent.drop(canvasDiv, {
        clientX: 120,
        clientY: 240,
        dataTransfer: { getData: (key: string) => key === 'application/reactflow-palette' ? 'circle' : '' },
      })
    })
    const nodes = useStore.getState().nodes
    expect(nodes).toHaveLength(1)
    expect(nodes[0].data.shape).toBe('circle')
    expect(nodes[0].data.label).toBe('New Node')
  })

  it('drop with subgraph shape calls addSubgraph instead of addNode', () => {
    const mockAddSubgraph = vi.fn()
    useStore.setState({ addSubgraph: mockAddSubgraph } as never)
    const { container } = render(<Canvas />)
    const canvasDiv = container.querySelector('.canvas-container')!
    act(() => {
      fireEvent.drop(canvasDiv, {
        clientX: 100,
        clientY: 100,
        dataTransfer: { getData: (key: string) => key === 'application/reactflow-palette' ? 'subgraph' : '' },
      })
    })
    expect(mockAddSubgraph).toHaveBeenCalled()
  })

  it('sets syncDirection to "canvas" on node drag start', () => {
    const mockSetSyncDirection = vi.fn()
    useStore.setState({ setSyncDirection: mockSetSyncDirection } as never)
    render(<Canvas />)
    act(() => {
      capturedOnNodeDragStart?.({}, {}, [])
    })
    expect(mockSetSyncDirection).toHaveBeenCalledWith('canvas')
  })

  it('clears syncDirection to null on node drag stop', () => {
    const node = makeNode('n1', { position: { x: 10, y: 10 } })
    useStore.setState({ nodes: [node], edges: [], setSyncDirection: vi.fn() } as never)
    render(<Canvas />)
    act(() => {
      capturedOnNodeDragStop?.({}, node, [node])
    })
    expect(useStore.getState().syncDirection).toBeNull()
  })

  it('passes panOnDrag=true to ReactFlow', () => {
    render(<Canvas />)
    expect(capturedPanOnDrag).toBe(true)
  })

  it('passes selectionOnDrag=false to ReactFlow', () => {
    render(<Canvas />)
    expect(capturedSelectionOnDrag).toBe(false)
  })

  it('passes minZoom=0.1 to ReactFlow', () => {
    render(<Canvas />)
    expect(capturedMinZoom).toBe(0.1)
  })

  it('passes maxZoom=4 to ReactFlow', () => {
    render(<Canvas />)
    expect(capturedMaxZoom).toBe(4)
  })

  it('Ctrl+0 zooms canvas to 100%', () => {
    render(<Canvas />)
    act(() => {
      fireEvent.keyDown(window, { key: '0', ctrlKey: true })
    })
    expect(mockZoomTo).toHaveBeenCalledWith(1, { duration: 200 })
  })

  it('Ctrl+= zooms in', () => {
    render(<Canvas />)
    act(() => {
      fireEvent.keyDown(window, { key: '=', ctrlKey: true })
    })
    expect(mockZoomIn).toHaveBeenCalledWith({ duration: 200 })
  })

  it('Ctrl+- zooms out', () => {
    render(<Canvas />)
    act(() => {
      fireEvent.keyDown(window, { key: '-', ctrlKey: true })
    })
    expect(mockZoomOut).toHaveBeenCalledWith({ duration: 200 })
  })

  it('Ctrl+Shift+F fits view with padding', () => {
    render(<Canvas />)
    act(() => {
      fireEvent.keyDown(window, { key: 'F', ctrlKey: true, shiftKey: true })
    })
    expect(mockFitView).toHaveBeenCalledWith({ padding: 0.1, duration: 200 })
  })

  it('Ctrl++ zooms in', () => {
    render(<Canvas />)
    act(() => {
      fireEvent.keyDown(window, { key: '+', ctrlKey: true })
    })
    expect(mockZoomIn).toHaveBeenCalledWith({ duration: 200 })
  })

  it('zoom shortcuts are blocked when input has focus', () => {
    render(<Canvas />)
    const input = document.createElement('input')
    document.body.appendChild(input)
    try {
      input.focus()
      act(() => {
        fireEvent.keyDown(window, { key: '=', ctrlKey: true })
      })
      expect(mockZoomIn).not.toHaveBeenCalled()
    } finally {
      document.body.removeChild(input)
    }
  })

  it('zoom shortcuts are blocked when textarea has focus', () => {
    render(<Canvas />)
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    try {
      textarea.focus()
      act(() => {
        fireEvent.keyDown(window, { key: '=', ctrlKey: true })
      })
      expect(mockZoomIn).not.toHaveBeenCalled()
    } finally {
      document.body.removeChild(textarea)
    }
  })

  it('panOnDrag=true when not locked', () => {
    useStore.setState({ isLocked: false })
    render(<Canvas />)
    expect(capturedPanOnDrag).toBe(true)
  })

  it('panOnDrag=false when isLocked=true', () => {
    useStore.setState({ isLocked: true })
    render(<Canvas />)
    expect(capturedPanOnDrag).toBe(false)
  })

  it('panOnScroll=true when not locked', () => {
    useStore.setState({ isLocked: false })
    render(<Canvas />)
    expect(capturedPanOnScroll).toBe(true)
  })

  it('panOnScroll=false when isLocked=true', () => {
    useStore.setState({ isLocked: true })
    render(<Canvas />)
    expect(capturedPanOnScroll).toBe(false)
  })

  it('MiniMap renders when minimapOpen=true', () => {
    useStore.setState({ minimapOpen: true })
    render(<Canvas />)
    expect(screen.getByTestId('react-flow-minimap')).toBeTruthy()
  })

  it('MiniMap not rendered when minimapOpen=false', () => {
    useStore.setState({ minimapOpen: false })
    render(<Canvas />)
    expect(screen.queryByTestId('react-flow-minimap')).toBeNull()
  })

  it('zoom shortcuts are blocked when canvas is locked', () => {
    useStore.setState({ isLocked: true })
    render(<Canvas />)
    act(() => {
      fireEvent.keyDown(window, { key: '=', ctrlKey: true })
    })
    expect(mockZoomIn).not.toHaveBeenCalled()
  })

  it('zoomOnScroll=true when not locked', () => {
    useStore.setState({ isLocked: false })
    render(<Canvas />)
    expect(capturedZoomOnScroll).toBe(true)
  })

  it('zoomOnScroll=false when isLocked=true', () => {
    useStore.setState({ isLocked: true })
    render(<Canvas />)
    expect(capturedZoomOnScroll).toBe(false)
  })

  it('zoomOnPinch=true when not locked', () => {
    useStore.setState({ isLocked: false })
    render(<Canvas />)
    expect(capturedZoomOnPinch).toBe(true)
  })

  it('zoomOnPinch=false when isLocked=true', () => {
    useStore.setState({ isLocked: true })
    render(<Canvas />)
    expect(capturedZoomOnPinch).toBe(false)
  })
})
