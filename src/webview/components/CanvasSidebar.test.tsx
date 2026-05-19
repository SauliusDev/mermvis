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

vi.mock('@/components/Palette', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="mock-palette" onClick={onClose} />
  ),
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
    expect(screen.getByRole('button', { name: 'Apply auto-layout' })).toBeTruthy()
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

  it('clicking Add Node button toggles palette open', () => {
    render(<CanvasSidebar />)
    expect(screen.queryByTestId('mock-palette')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Add Node' }))
    expect(screen.getByTestId('mock-palette')).toBeTruthy()
  })

  it('Add Node button has canvas-sidebar__btn--active class when palette is open', () => {
    render(<CanvasSidebar />)
    const addBtn = screen.getByRole('button', { name: 'Add Node' })
    expect(addBtn.classList.contains('canvas-sidebar__btn--active')).toBe(false)
    fireEvent.click(addBtn)
    expect(addBtn.classList.contains('canvas-sidebar__btn--active')).toBe(true)
  })

  it('clicking Add Node again closes palette (toggle behavior)', () => {
    render(<CanvasSidebar />)
    const addBtn = screen.getByRole('button', { name: 'Add Node' })
    fireEvent.click(addBtn)
    expect(screen.getByTestId('mock-palette')).toBeTruthy()
    fireEvent.click(addBtn)
    expect(screen.queryByTestId('mock-palette')).toBeNull()
  })

  it('undo button is enabled after a node is added', () => {
    render(<CanvasSidebar />)
    const undoBtn = screen.getByRole('button', { name: 'Undo' }) as HTMLButtonElement
    expect(undoBtn.disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Add Subgraph' }))
    expect(undoBtn.disabled).toBe(false)
  })

  it('clicking undo button removes the added node', () => {
    render(<CanvasSidebar />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Subgraph' }))
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

  it('clicking zoom-to-fit button calls fitView()', () => {
    render(<CanvasSidebar />)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom to Fit' }))
    expect(mockFitView).toHaveBeenCalledWith({ padding: 0.1 })
  })

  it('clicking auto-layout button calls fitView() when nodes exist', () => {
    render(<CanvasSidebar />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Subgraph' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply auto-layout' }))
    expect(mockFitView).toHaveBeenCalledWith({ padding: 0.1 })
  })

  it('clicking redo button restores node removed by undo', () => {
    render(<CanvasSidebar />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Subgraph' }))
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(useStore.getState().nodes).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(useStore.getState().nodes).toHaveLength(1)
  })

  it('renders three dividers in the sidebar', () => {
    const { container } = render(<CanvasSidebar />)
    const dividers = container.querySelectorAll('.canvas-sidebar__divider')
    expect(dividers).toHaveLength(3)
  })

  it('Inspector button is rendered in sidebar', () => {
    render(<CanvasSidebar />)
    expect(screen.getByRole('button', { name: 'Toggle Inspector' })).toBeTruthy()
  })

  it('Inspector button click calls toggleInspector', () => {
    render(<CanvasSidebar />)
    expect(useStore.getState().inspectorOpen).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Inspector' }))
    expect(useStore.getState().inspectorOpen).toBe(true)
  })

  it('Inspector button has canvas-sidebar__btn--active class when inspectorOpen is true', () => {
    useStore.setState({ inspectorOpen: true })
    render(<CanvasSidebar />)
    const btn = screen.getByRole('button', { name: 'Toggle Inspector' })
    expect(btn.classList.contains('canvas-sidebar__btn--active')).toBe(true)
  })
})
