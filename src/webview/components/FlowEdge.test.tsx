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
    useStore.setState({ edges: [], nodes: [], history: { past: [], future: [] } })
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

  it('non-selected edge does not render EdgeLabelRenderer toolbar', () => {
    render(<FlowEdge {...baseProps} selected={false} />)
    expect(screen.queryByTestId('edge-label-renderer')).toBeNull()
  })

  it('selected edge renders EdgeLabelRenderer with exactly 4 style buttons', () => {
    render(<FlowEdge {...baseProps} selected={true} />)
    expect(screen.getByTestId('edge-label-renderer')).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(4)
  })

  it('clicking a style button calls setEdgeStyle with edge id and style', () => {
    const mockSetEdgeStyle = vi.fn()
    useStore.setState({ setEdgeStyle: mockSetEdgeStyle } as never)
    render(<FlowEdge {...baseProps} selected={true} />)
    act(() => { fireEvent.click(screen.getByTitle('Dotted arrow')) })
    expect(mockSetEdgeStyle).toHaveBeenCalledWith('e-A-B', 'dotted')
  })
})
