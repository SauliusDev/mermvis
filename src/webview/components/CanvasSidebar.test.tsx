import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// vi.mock() is hoisted to top of file by Vitest's transform pipeline.
// Must be at top level — not inside a function or beforeEach.
vi.mock('zustand')

const mockFitView = vi.fn()
vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({ fitView: mockFitView }),
}))

import CanvasSidebar from './CanvasSidebar'
import { useStore } from '@/lib/store'
import { mockReactFlow } from '../setupTests'

mockReactFlow()

describe('CanvasSidebar', () => {
  beforeEach(() => {
    mockFitView.mockClear()
  })

  it('renders button with aria-label="Select"', () => {
    render(<CanvasSidebar />)
    expect(screen.getByRole('button', { name: 'Select' })).toBeTruthy()
  })

  it('renders button with aria-label="Add Node"', () => {
    render(<CanvasSidebar />)
    expect(screen.getByRole('button', { name: 'Add Node' })).toBeTruthy()
  })

  it('renders button with aria-label="Add Edge"', () => {
    render(<CanvasSidebar />)
    expect(screen.getByRole('button', { name: 'Add Edge' })).toBeTruthy()
  })

  it('renders button with aria-label="Add Subgraph"', () => {
    render(<CanvasSidebar />)
    expect(screen.getByRole('button', { name: 'Add Subgraph' })).toBeTruthy()
  })

  it('renders button with aria-label="Undo"', () => {
    render(<CanvasSidebar />)
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy()
  })

  it('renders button with aria-label="Redo"', () => {
    render(<CanvasSidebar />)
    expect(screen.getByRole('button', { name: 'Redo' })).toBeTruthy()
  })

  it('renders button with aria-label="Auto Layout"', () => {
    render(<CanvasSidebar />)
    expect(screen.getByRole('button', { name: 'Auto Layout' })).toBeTruthy()
  })

  it('renders button with aria-label="Zoom to Fit"', () => {
    render(<CanvasSidebar />)
    expect(screen.getByRole('button', { name: 'Zoom to Fit' })).toBeTruthy()
  })

  it('undo button is disabled when history is empty (default)', () => {
    render(<CanvasSidebar />)
    const undoBtn = screen.getByRole('button', { name: 'Undo' }) as HTMLButtonElement
    expect(undoBtn.disabled).toBe(true)
  })

  it('redo button is disabled when history is empty (default)', () => {
    render(<CanvasSidebar />)
    const redoBtn = screen.getByRole('button', { name: 'Redo' }) as HTMLButtonElement
    expect(redoBtn.disabled).toBe(true)
  })

  it('undo button is enabled after a node is added', () => {
    render(<CanvasSidebar />)
    const undoBtn = screen.getByRole('button', { name: 'Undo' }) as HTMLButtonElement
    expect(undoBtn.disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Add Node' }))
    expect(undoBtn.disabled).toBe(false)
  })

  it('clicking undo button calls store.undo() and removes the added node', () => {
    render(<CanvasSidebar />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Node' }))
    expect(useStore.getState().nodes).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(useStore.getState().nodes).toHaveLength(0)
  })

  it('clicking add-subgraph button adds a subgraph to the store', () => {
    render(<CanvasSidebar />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Subgraph' }))
    expect(useStore.getState().nodes).toHaveLength(1)
    expect(useStore.getState().nodes[0].data.isSubgraph).toBe(true)
  })

  it('clicking add-node button adds a rectangle node to the store', () => {
    render(<CanvasSidebar />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Node' }))
    const node = useStore.getState().nodes[0]
    expect(node).toBeDefined()
    expect(node.data.shape).toBe('rectangle')
    expect(node.data.label).toBe('New Node')
  })

  it('clicking zoom-to-fit button calls fitView()', () => {
    render(<CanvasSidebar />)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom to Fit' }))
    expect(mockFitView).toHaveBeenCalledWith({ padding: 0.1 })
  })

  it('clicking auto-layout button calls fitView() when nodes exist', () => {
    render(<CanvasSidebar />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Node' }))
    fireEvent.click(screen.getByRole('button', { name: 'Auto Layout' }))
    expect(mockFitView).toHaveBeenCalledWith({ padding: 0.1 })
  })

  it('clicking redo button restores node removed by undo', () => {
    render(<CanvasSidebar />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Node' }))
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(useStore.getState().nodes).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(useStore.getState().nodes).toHaveLength(1)
  })

  it('renders two dividers in the sidebar', () => {
    const { container } = render(<CanvasSidebar />)
    const dividers = container.querySelectorAll('.canvas-sidebar__divider')
    expect(dividers).toHaveLength(2)
  })
})
