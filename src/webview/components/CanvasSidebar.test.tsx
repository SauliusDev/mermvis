import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// vi.mock() is hoisted to top of file by Vitest's transform pipeline.
// Must be at top level — not inside a function or beforeEach.
vi.mock('zustand')

import CanvasSidebar from './CanvasSidebar'
import { useStore } from '@/lib/store'
import { mockReactFlow } from '../setupTests'

mockReactFlow()

describe('CanvasSidebar', () => {
  it('renders Add Node button', () => {
    render(<CanvasSidebar />)
    expect(screen.getByTitle('Add Node')).toBeTruthy()
  })

  it('clicking Add Node button adds a node to the store', () => {
    render(<CanvasSidebar />)
    fireEvent.click(screen.getByTitle('Add Node'))
    expect(useStore.getState().nodes).toHaveLength(1)
  })

  it('created node has type flowNode', () => {
    render(<CanvasSidebar />)
    fireEvent.click(screen.getByTitle('Add Node'))
    expect(useStore.getState().nodes[0].type).toBe('flowNode')
  })

  it('created node has shape rectangle', () => {
    render(<CanvasSidebar />)
    fireEvent.click(screen.getByTitle('Add Node'))
    expect(useStore.getState().nodes[0].data.shape).toBe('rectangle')
  })

  it('created node has label New Node', () => {
    render(<CanvasSidebar />)
    fireEvent.click(screen.getByTitle('Add Node'))
    expect(useStore.getState().nodes[0].data.label).toBe('New Node')
  })

  it('created node has a non-empty unique id', () => {
    render(<CanvasSidebar />)
    fireEvent.click(screen.getByTitle('Add Node'))
    const id = useStore.getState().nodes[0].id
    expect(id).toBeTruthy()
    expect(id.length).toBeGreaterThan(0)
  })

  it('undo after Add Node removes the created node', () => {
    render(<CanvasSidebar />)
    fireEvent.click(screen.getByTitle('Add Node'))
    expect(useStore.getState().nodes).toHaveLength(1)
    useStore.getState().undo()
    expect(useStore.getState().nodes).toHaveLength(0)
  })

  it('clicking Add Node multiple times staggers node positions', () => {
    render(<CanvasSidebar />)
    fireEvent.click(screen.getByTitle('Add Node'))
    fireEvent.click(screen.getByTitle('Add Node'))
    const [first, second] = useStore.getState().nodes
    expect(first.position).not.toEqual(second.position)
  })
})
