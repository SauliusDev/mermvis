import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Canvas from './Canvas'
import { mockReactFlow } from '../setupTests'

mockReactFlow()

// vi.mock() is hoisted to the top of the file by Vitest's transform pipeline.
// This mock MUST be at the top level — not inside a function or beforeEach.
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'react-flow-mock' }, children),
  Background: () => React.createElement('div', { 'data-testid': 'rf-background-mock' }),
  BackgroundVariant: { Dots: 'dots', Lines: 'lines', Cross: 'cross' },
}))

describe('Canvas', () => {
  it('renders canvas-container div', () => {
    const { container } = render(<Canvas />)
    const canvasDiv = container.querySelector('.canvas-container')
    expect(canvasDiv).toBeTruthy()
  })

  it('renders mocked ReactFlow', () => {
    render(<Canvas />)
    expect(screen.getByTestId('react-flow-mock')).toBeTruthy()
  })
})
