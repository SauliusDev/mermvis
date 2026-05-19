import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

vi.mock('zustand')
vi.mock('@/lib/layout', () => ({ applyDagreLayout: vi.fn((nodes: unknown[]) => nodes) }))
vi.mock('@/lib/serializer', () => ({ serialize: vi.fn(() => 'flowchart TD\n  A[Node]') }))
vi.mock('@/lib/export', () => ({ exportCanvasToJson: vi.fn(() => '{"version":1}') }))
vi.mock('@/vscode', () => ({ sendToHost: vi.fn() }))

import CommandPalette from './CommandPalette'
import { useStore } from '@/lib/store'
import { sendToHost } from '@/vscode'
import { mockReactFlow } from '../setupTests'

mockReactFlow()

const mockTogglePanel = vi.fn()

function renderPalette(): ReturnType<typeof render> {
  return render(<CommandPalette onTogglePanel={mockTogglePanel} />)
}

function openPalette(): void {
  act(() => {
    useStore.getState().openCommandPalette()
  })
}

describe('CommandPalette', () => {
  beforeEach(() => {
    mockTogglePanel.mockClear()
    vi.mocked(sendToHost).mockClear()
  })

  it('does not render when commandPaletteOpen is false', () => {
    renderPalette()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByPlaceholderText('Search actions…')).toBeNull()
  })

  it('renders search input and action list when open', () => {
    renderPalette()
    openPalette()
    expect(screen.getByPlaceholderText('Search actions…')).toBeTruthy()
    const items = screen.getAllByRole('option')
    expect(items.length).toBeGreaterThan(0)
  })

  it('shows all shape creation actions', () => {
    renderPalette()
    openPalette()
    expect(screen.getByText('Add Rectangle Node')).toBeTruthy()
    expect(screen.getByText('Add Rounded Node')).toBeTruthy()
    expect(screen.getByText('Add Diamond Node')).toBeTruthy()
    expect(screen.getByText('Add Circle Node')).toBeTruthy()
    expect(screen.getByText('Add Hexagon Node')).toBeTruthy()
    expect(screen.getByText('Add Cylinder Node')).toBeTruthy()
    expect(screen.getByText('Add Subgraph Container')).toBeTruthy()
  })

  it('typing filters actions by fuzzy match', () => {
    renderPalette()
    openPalette()
    const input = screen.getByPlaceholderText('Search actions…')
    act(() => {
      fireEvent.change(input, { target: { value: 'ul' } })
    })
    expect(screen.getByText('Apply Auto-Layout')).toBeTruthy()
    expect(screen.queryByText('Add Rectangle Node')).toBeNull()
  })

  it('typing is case-insensitive', () => {
    renderPalette()
    openPalette()
    const input = screen.getByPlaceholderText('Search actions…')
    act(() => {
      fireEvent.change(input, { target: { value: 'AUTO' } })
    })
    expect(screen.getByText('Apply Auto-Layout')).toBeTruthy()
  })

  it('shows empty state when query has no matches', () => {
    renderPalette()
    openPalette()
    const input = screen.getByPlaceholderText('Search actions…')
    act(() => {
      fireEvent.change(input, { target: { value: 'zzzzz' } })
    })
    expect(screen.getByText('No results')).toBeTruthy()
  })

  it('pressing Escape calls closeCommandPalette', () => {
    renderPalette()
    openPalette()
    const input = screen.getByPlaceholderText('Search actions…')
    act(() => {
      fireEvent.keyDown(input, { key: 'Escape' })
    })
    expect(useStore.getState().commandPaletteOpen).toBe(false)
  })

  it('clicking backdrop closes palette', () => {
    const { container } = renderPalette()
    openPalette()
    const backdrop = container.querySelector('.command-palette-backdrop')!
    act(() => {
      fireEvent.mouseDown(backdrop)
    })
    expect(useStore.getState().commandPaletteOpen).toBe(false)
  })

  it('clicking inner panel does not close palette', () => {
    const { container } = renderPalette()
    openPalette()
    const panel = container.querySelector('.command-palette')!
    act(() => {
      fireEvent.mouseDown(panel)
    })
    expect(useStore.getState().commandPaletteOpen).toBe(true)
  })

  it('ArrowDown moves selection to next item', () => {
    renderPalette()
    openPalette()
    const input = screen.getByPlaceholderText('Search actions…')
    act(() => {
      fireEvent.keyDown(input, { key: 'ArrowDown' })
    })
    const items = screen.getAllByRole('option')
    expect(items[1].getAttribute('aria-selected')).toBe('true')
  })

  it('ArrowDown wraps from last to first', () => {
    renderPalette()
    openPalette()
    // Filter to 2 items — "Zoom In" and "Zoom Out" both contain "zoom"
    const input = screen.getByPlaceholderText('Search actions…')
    act(() => {
      fireEvent.change(input, { target: { value: 'zoom i' } })
    })
    // Should show "Zoom In" only — navigate to it with ArrowDown then wrap
    act(() => {
      fireEvent.keyDown(input, { key: 'ArrowDown' })
    })
    // Now at last item (first), ArrowDown wraps to first
    const items = screen.getAllByRole('option')
    expect(items[0].getAttribute('aria-selected')).toBe('true')
  })

  it('ArrowUp wraps from first to last', () => {
    renderPalette()
    openPalette()
    // Filter to exactly 2 items
    const input = screen.getByPlaceholderText('Search actions…')
    act(() => {
      fireEvent.change(input, { target: { value: 'fit v' } })
    })
    // "Fit View" — single item. Navigate up from first (idx 0) wraps to last.
    act(() => {
      fireEvent.keyDown(input, { key: 'ArrowUp' })
    })
    const items = screen.getAllByRole('option')
    expect(items[items.length - 1].getAttribute('aria-selected')).toBe('true')
  })

  it('pressing Enter executes selected action and closes palette', () => {
    renderPalette()
    openPalette()
    const input = screen.getByPlaceholderText('Search actions…')
    // Filter to just Undo
    act(() => {
      fireEvent.change(input, { target: { value: 'undo' } })
    })
    // Add a node first to create history so undo does something
    useStore.getState().addNode({ id: 'n1', type: 'flowNode', position: { x: 0, y: 0 }, data: { label: 'A', shape: 'rectangle' } })
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' })
    })
    // palette should be closed
    expect(useStore.getState().commandPaletteOpen).toBe(false)
  })

  it('clicking an action executes it and closes palette', () => {
    renderPalette()
    openPalette()
    const canvasItem = screen.getByText('Toggle Canvas Panel')
    act(() => {
      fireEvent.mouseDown(canvasItem)
    })
    expect(mockTogglePanel).toHaveBeenCalledWith('canvas')
    expect(useStore.getState().commandPaletteOpen).toBe(false)
  })

  it('"Add Rectangle Node" action calls requestAddNode', () => {
    renderPalette()
    openPalette()
    const item = screen.getByText('Add Rectangle Node')
    act(() => {
      fireEvent.mouseDown(item)
    })
    expect(useStore.getState().pendingAddNode).toEqual({ shape: 'rectangle' })
  })

  it('"Undo" action calls undo store action', () => {
    renderPalette()
    // Add a node to create history
    useStore.getState().addNode({ id: 'n1', type: 'flowNode', position: { x: 0, y: 0 }, data: { label: 'A', shape: 'rectangle' } })
    expect(useStore.getState().nodes).toHaveLength(1)
    openPalette()
    const item = screen.getByText('Undo')
    act(() => {
      fireEvent.mouseDown(item)
    })
    expect(useStore.getState().nodes).toHaveLength(0)
  })

  it('"Apply Auto-Layout" action calls moveNodes when nodes exist', async () => {
    const { applyDagreLayout } = await import('@/lib/layout')
    const mockLayout = vi.mocked(applyDagreLayout)
    const node = { id: 'n1', type: 'flowNode', position: { x: 0, y: 0 }, data: { label: 'A', shape: 'rectangle' as const } }
    useStore.setState({ nodes: [node], edges: [] } as never)
    mockLayout.mockReturnValueOnce([{ ...node, position: { x: 100, y: 200 } }] as never)

    renderPalette()
    openPalette()
    const item = screen.getByText('Apply Auto-Layout')
    act(() => {
      fireEvent.mouseDown(item)
    })
    expect(mockLayout).toHaveBeenCalled()
  })

  it('search input is auto-focused when palette opens', () => {
    vi.useFakeTimers()
    try {
      renderPalette()
      act(() => {
        useStore.getState().openCommandPalette()
      })
      act(() => {
        vi.runAllTimers()
      })
      const input = screen.getByPlaceholderText('Search actions…')
      expect(document.activeElement).toBe(input)
    } finally {
      vi.useRealTimers()
    }
  })
})
