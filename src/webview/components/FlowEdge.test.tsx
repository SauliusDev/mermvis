import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

vi.mock('zustand')

vi.mock('@xyflow/react', () => ({
  getBezierPath: vi.fn(() => ['M0,0 L100,100', 50, 50]),
  BaseEdge: (props: {
    path: string
    className?: string
    markerEnd?: string
    id?: string
  }) =>
    React.createElement('path', {
      'data-testid': 'base-edge',
      'data-class': props.className ?? '',
      'data-marker-end': props.markerEnd ?? '',
      d: props.path,
    }),
  EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'edge-label-renderer' }, children),
}))

import FlowEdge from './FlowEdge'
import { useStore } from '@/lib/store'
import type { Position } from '@xyflow/react'
import { mockReactFlow } from '../setupTests'

mockReactFlow()

const baseProps = {
  id: 'e-A-B',
  source: 'A',
  target: 'B',
  sourceX: 0,
  sourceY: 0,
  targetX: 100,
  targetY: 100,
  sourcePosition: 'right' as Position,
  targetPosition: 'left' as Position,
  data: { style: 'arrow' as const },
  selected: false,
}

describe('FlowEdge', () => {
  beforeEach(() => {
    useStore.setState({ edges: [], nodes: [], history: { past: [], future: [] }, updateEdgeLabel: vi.fn() } as never)
  })

  it('renders BaseEdge with flow-edge__path--arrow class for arrow style', () => {
    render(<FlowEdge {...baseProps} />)
    expect(screen.getByTestId('base-edge').getAttribute('data-class')).toContain('flow-edge__path--arrow')
  })

  it('renders flow-edge__path--dotted class for dotted style', () => {
    render(<FlowEdge {...baseProps} data={{ style: 'dotted' }} />)
    expect(screen.getByTestId('base-edge').getAttribute('data-class')).toContain('flow-edge__path--dotted')
  })

  it('renders flow-edge__path--thick class for thick style', () => {
    render(<FlowEdge {...baseProps} data={{ style: 'thick' }} />)
    expect(screen.getByTestId('base-edge').getAttribute('data-class')).toContain('flow-edge__path--thick')
  })

  it('open style: BaseEdge has no markerEnd', () => {
    render(<FlowEdge {...baseProps} data={{ style: 'open' }} />)
    expect(screen.getByTestId('base-edge').getAttribute('data-marker-end')).toBe('')
  })

  it('non-selected edge does not render style toolbar buttons', () => {
    render(<FlowEdge {...baseProps} selected={false} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('selected edge renders exactly 4 style buttons', () => {
    render(<FlowEdge {...baseProps} selected={true} />)
    expect(screen.getAllByRole('button')).toHaveLength(4)
  })

  it('clicking a style button calls setEdgeStyle with edge id and style', () => {
    const mockSetEdgeStyle = vi.fn()
    useStore.setState({ setEdgeStyle: mockSetEdgeStyle } as never)
    render(<FlowEdge {...baseProps} selected={true} />)
    act(() => { fireEvent.click(screen.getByTitle('Dotted arrow')) })
    expect(mockSetEdgeStyle).toHaveBeenCalledWith('e-A-B', 'dotted')
  })

  it('renders label text when data.label is set', () => {
    render(<FlowEdge {...baseProps} data={{ style: 'arrow', label: 'yes' }} />)
    expect(screen.getByText('yes')).toBeTruthy()
  })

  it('renders pencil affordance when selected=true and no label', () => {
    render(<FlowEdge {...baseProps} selected={true} data={{ style: 'arrow' }} />)
    expect(screen.getByText('✎')).toBeTruthy()
  })

  it('does not render pencil when not selected and no label', () => {
    render(<FlowEdge {...baseProps} selected={false} data={{ style: 'arrow' }} />)
    expect(screen.queryByText('✎')).toBeNull()
  })

  it('double-click on label area activates editing mode (input appears)', () => {
    render(<FlowEdge {...baseProps} data={{ style: 'arrow', label: 'old' }} />)
    const labelArea = screen.getByText('old').parentElement!
    fireEvent.doubleClick(labelArea)
    expect(screen.getByRole('textbox')).toBeTruthy()
  })

  it('Enter in input calls updateEdgeLabel and closes editing', () => {
    const mockUpdateEdgeLabel = vi.fn()
    useStore.setState({ updateEdgeLabel: mockUpdateEdgeLabel } as never)
    render(<FlowEdge {...baseProps} data={{ style: 'arrow', label: 'old' }} />)
    fireEvent.doubleClick(screen.getByText('old').parentElement!)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'new' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(mockUpdateEdgeLabel).toHaveBeenCalledWith('e-A-B', 'new')
  })

  it('Escape in input cancels without calling updateEdgeLabel', () => {
    const mockUpdateEdgeLabel = vi.fn()
    useStore.setState({ updateEdgeLabel: mockUpdateEdgeLabel } as never)
    render(<FlowEdge {...baseProps} data={{ style: 'arrow', label: 'old' }} />)
    fireEvent.doubleClick(screen.getByText('old').parentElement!)
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })
    expect(mockUpdateEdgeLabel).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('onBlur on input calls updateEdgeLabel', () => {
    const mockUpdateEdgeLabel = vi.fn()
    useStore.setState({ updateEdgeLabel: mockUpdateEdgeLabel } as never)
    render(<FlowEdge {...baseProps} data={{ style: 'arrow', label: 'old' }} />)
    fireEvent.doubleClick(screen.getByText('old').parentElement!)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'blurred' } })
    fireEvent.blur(input)
    expect(mockUpdateEdgeLabel).toHaveBeenCalledWith('e-A-B', 'blurred')
  })
})
