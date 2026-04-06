import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

vi.mock('zustand')

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'react-flow-mock' }, children),
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
})
