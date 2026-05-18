import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('zustand')

const mockZoomIn = vi.fn()
const mockZoomOut = vi.fn()
const mockFitView = vi.fn()

vi.mock('@xyflow/react', () => ({
  useReactFlow: vi.fn(() => ({
    zoomIn: mockZoomIn,
    zoomOut: mockZoomOut,
    fitView: mockFitView,
  })),
}))

import ZoomBar from './ZoomBar'
import { useStore } from '@/lib/store'
import { mockReactFlow } from '../setupTests'

mockReactFlow()

describe('ZoomBar', () => {
  beforeEach(() => {
    useStore.setState({
      viewport: { x: 0, y: 0, zoom: 1 },
      minimapOpen: false,
      isLocked: false,
    })
    mockZoomIn.mockClear()
    mockZoomOut.mockClear()
    mockFitView.mockClear()
  })

  it('renders 100% when zoom is 1', () => {
    useStore.setState({ viewport: { x: 0, y: 0, zoom: 1 } })
    render(<ZoomBar />)
    expect(screen.getByText('100%')).toBeTruthy()
  })

  it('renders 75% when zoom is 0.75', () => {
    useStore.setState({ viewport: { x: 0, y: 0, zoom: 0.75 } })
    render(<ZoomBar />)
    expect(screen.getByText('75%')).toBeTruthy()
  })

  it('renders 150% when zoom is 1.5', () => {
    useStore.setState({ viewport: { x: 0, y: 0, zoom: 1.5 } })
    render(<ZoomBar />)
    expect(screen.getByText('150%')).toBeTruthy()
  })

  it('clicking zoom in calls zoomIn with duration 200', () => {
    render(<ZoomBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(mockZoomIn).toHaveBeenCalledWith({ duration: 200 })
  })

  it('clicking zoom out calls zoomOut with duration 200', () => {
    render(<ZoomBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(mockZoomOut).toHaveBeenCalledWith({ duration: 200 })
  })

  it('clicking fit to view calls fitView with padding and duration', () => {
    render(<ZoomBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Fit to view' }))
    expect(mockFitView).toHaveBeenCalledWith({ padding: 0.1, duration: 200 })
  })

  it('clicking minimap toggle changes minimapOpen', () => {
    useStore.setState({ minimapOpen: false })
    render(<ZoomBar />)
    fireEvent.click(screen.getByRole('switch', { name: /minimap/i }))
    expect(useStore.getState().minimapOpen).toBe(true)
  })

  it('clicking lock toggle changes isLocked', () => {
    useStore.setState({ isLocked: false })
    render(<ZoomBar />)
    fireEvent.click(screen.getByRole('switch', { name: /lock/i }))
    expect(useStore.getState().isLocked).toBe(true)
  })

  it('zoom in button is disabled when isLocked=true', () => {
    useStore.setState({ isLocked: true })
    render(<ZoomBar />)
    const btn = screen.getByRole('button', { name: 'Zoom in' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('zoom out button is disabled when isLocked=true', () => {
    useStore.setState({ isLocked: true })
    render(<ZoomBar />)
    const btn = screen.getByRole('button', { name: 'Zoom out' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('clicking zoom in does not call zoomIn when locked', () => {
    useStore.setState({ isLocked: true })
    render(<ZoomBar />)
    const btn = screen.getByRole('button', { name: 'Zoom in' })
    fireEvent.click(btn)
    expect(mockZoomIn).not.toHaveBeenCalled()
  })

  it('minimap toggle has role=switch and aria-checked=false by default', () => {
    render(<ZoomBar />)
    const btn = screen.getByRole('switch', { name: /minimap/i })
    expect(btn.getAttribute('aria-checked')).toBe('false')
  })

  it('minimap toggle aria-checked=true when minimapOpen=true', () => {
    useStore.setState({ minimapOpen: true })
    render(<ZoomBar />)
    const btn = screen.getByRole('switch', { name: /minimap/i })
    expect(btn.getAttribute('aria-checked')).toBe('true')
  })

  it('lock toggle has role=switch and aria-checked=false by default', () => {
    render(<ZoomBar />)
    const btn = screen.getByRole('switch', { name: /lock/i })
    expect(btn.getAttribute('aria-checked')).toBe('false')
  })

  it('lock toggle aria-checked=true when isLocked=true', () => {
    useStore.setState({ isLocked: true })
    render(<ZoomBar />)
    const btn = screen.getByRole('switch', { name: /lock/i })
    expect(btn.getAttribute('aria-checked')).toBe('true')
  })

  it('zoom-bar has role=toolbar', () => {
    render(<ZoomBar />)
    expect(screen.getByRole('toolbar')).toBeTruthy()
  })
})
