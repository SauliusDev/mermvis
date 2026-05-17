import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// vi.mock() is hoisted to top of file by Vitest's transform pipeline.
vi.mock('zustand')

vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({ screenToFlowPosition: vi.fn((p: { x: number; y: number }) => p) }),
}))

import Palette from './Palette'
import { useStore } from '@/lib/store'
import { mockReactFlow } from '../setupTests'

mockReactFlow()

const mockOnClose = vi.fn()
const mockTriggerRef = { current: null } as React.RefObject<HTMLButtonElement | null>

describe('Palette', () => {
  beforeEach(() => {
    mockOnClose.mockClear()
    useStore.setState({ nodes: [], edges: [] })
  })

  it('renders title "Shapes" in header', () => {
    const { container } = render(<Palette onClose={mockOnClose} triggerRef={mockTriggerRef} />)
    const title = container.querySelector('.component-palette__title')
    expect(title?.textContent).toBe('Shapes')
  })

  it('renders close button with aria-label="Close palette"', () => {
    render(<Palette onClose={mockOnClose} triggerRef={mockTriggerRef} />)
    expect(screen.getByRole('button', { name: 'Close palette' })).toBeTruthy()
  })

  it('renders search input with placeholder "Search shapes…"', () => {
    render(<Palette onClose={mockOnClose} triggerRef={mockTriggerRef} />)
    const input = screen.getByPlaceholderText('Search shapes…')
    expect(input).toBeTruthy()
  })

  it('renders all 8 shape items', () => {
    render(<Palette onClose={mockOnClose} triggerRef={mockTriggerRef} />)
    const labels = ['Rectangle', 'Rounded', 'Pill', 'Diamond', 'Circle', 'Hexagon', 'Cylinder', 'Subgraph']
    for (const label of labels) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy()
    }
  })

  it('clicking close button calls onClose', () => {
    render(<Palette onClose={mockOnClose} triggerRef={mockTriggerRef} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close palette' }))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('typing in search filters shapes (type "dia" → only Diamond visible)', () => {
    render(<Palette onClose={mockOnClose} triggerRef={mockTriggerRef} />)
    const input = screen.getByPlaceholderText('Search shapes…')
    fireEvent.change(input, { target: { value: 'dia' } })
    expect(screen.getByRole('button', { name: 'Diamond' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Rectangle' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Circle' })).toBeNull()
  })

  it('clearing search shows all shapes again', () => {
    render(<Palette onClose={mockOnClose} triggerRef={mockTriggerRef} />)
    const input = screen.getByPlaceholderText('Search shapes…')
    fireEvent.change(input, { target: { value: 'dia' } })
    fireEvent.change(input, { target: { value: '' } })
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(8)
  })

  it('shows empty state message when search matches nothing', () => {
    render(<Palette onClose={mockOnClose} triggerRef={mockTriggerRef} />)
    const input = screen.getByPlaceholderText('Search shapes…')
    fireEvent.change(input, { target: { value: 'zzz' } })
    expect(screen.getByText(/No shapes match/)).toBeTruthy()
  })

  it('Escape key calls onClose', () => {
    render(<Palette onClose={mockOnClose} triggerRef={mockTriggerRef} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('shapes category label renders as uppercase text', () => {
    const { container } = render(<Palette onClose={mockOnClose} triggerRef={mockTriggerRef} />)
    const category = container.querySelector('.component-palette__category')
    expect(category).toBeTruthy()
    expect(category?.textContent).toBe('Shapes')
  })

  it('clicking a non-subgraph shape item calls addNode with the correct shape', () => {
    render(<Palette onClose={mockOnClose} triggerRef={mockTriggerRef} />)
    fireEvent.click(screen.getByRole('button', { name: 'Rectangle' }))
    const nodes = useStore.getState().nodes
    expect(nodes).toHaveLength(1)
    expect(nodes[0].data.shape).toBe('rectangle')
    expect(nodes[0].data.label).toBe('New Node')
  })

  it('clicking the subgraph shape item calls addSubgraph', () => {
    render(<Palette onClose={mockOnClose} triggerRef={mockTriggerRef} />)
    fireEvent.click(screen.getByRole('button', { name: 'Subgraph' }))
    const nodes = useStore.getState().nodes
    expect(nodes).toHaveLength(1)
    expect(nodes[0].data.isSubgraph).toBe(true)
  })

  it('onDragStart on a shape item sets dataTransfer with the shape name', () => {
    render(<Palette onClose={mockOnClose} triggerRef={mockTriggerRef} />)
    const mockSetData = vi.fn()
    const shapeItem = screen.getByRole('button', { name: 'Rectangle' })
    fireEvent.dragStart(shapeItem, {
      dataTransfer: { setData: mockSetData, effectAllowed: '' },
    })
    expect(mockSetData).toHaveBeenCalledWith('application/reactflow-palette', 'rectangle')
  })

  it('outside click calls onClose', () => {
    render(<Palette onClose={mockOnClose} triggerRef={mockTriggerRef} />)
    fireEvent.mouseDown(document.body)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})
