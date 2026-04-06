import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

vi.mock('zustand')

// Module-level captured props (accessible from tests)
let capturedSnapToGrid: boolean | undefined
let capturedSnapGrid: [number, number] | undefined
let capturedOnNodeDragStop: ((...args: unknown[]) => void) | undefined

vi.mock('@xyflow/react', () => ({
  ReactFlow: (props: {
    snapToGrid?: boolean
    snapGrid?: [number, number]
    onNodeDragStop?: (...args: unknown[]) => void
    children?: React.ReactNode
  }) => {
    capturedSnapToGrid = props.snapToGrid
    capturedSnapGrid = props.snapGrid
    capturedOnNodeDragStop = props.onNodeDragStop
    return React.createElement('div', { 'data-testid': 'react-flow-mock' }, props.children)
  },
  Background: () => React.createElement('div', { 'data-testid': 'rf-background-mock' }),
  BackgroundVariant: { Dots: 'dots', Lines: 'lines', Cross: 'cross' },
  SelectionMode: { Partial: 'partial', Full: 'full' },
  applyNodeChanges: vi.fn((_changes: unknown, nodes: unknown) => nodes),
}))

import Canvas from './Canvas'
import { useStore } from '@/lib/store'
import type { Node } from '@xyflow/react'
import type { FlowNodeData } from '@/lib/store'
import { mockReactFlow } from '../setupTests'

mockReactFlow()

describe('Canvas', () => {
  beforeEach(() => {
    capturedSnapToGrid = undefined
    capturedSnapGrid = undefined
    capturedOnNodeDragStop = undefined
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
})
