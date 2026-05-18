import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// All vi.mock() at top level — Vitest hoists these before imports
vi.mock('./store', () => {
  const mockSubscribe = vi.fn()
  const mockGetState = vi.fn()
  const store = Object.assign(vi.fn(), {
    subscribe: mockSubscribe,
    getState: mockGetState,
  })
  return { useStore: store }
})

vi.mock('../vscode', () => ({
  sendToHost: vi.fn(),
}))

vi.mock('./serializer', () => ({
  serialize: vi.fn(() => 'flowchart TD\n  A[Node]'),
}))

import { useAutoSave, useManualSave, AUTO_SAVE_DEBOUNCE_MS, buildLayoutJson } from './autoSave'
import { useStore } from './store'
import { sendToHost } from '../vscode'
import type { Node } from '@xyflow/react'
import type { FlowNodeData } from './store'

describe('useAutoSave', () => {
  let unsubscribeMock: ReturnType<typeof vi.fn>
  let capturedSubscriber: ((state: unknown, prevState: unknown) => void) | undefined

  beforeEach(() => {
    vi.useFakeTimers()
    unsubscribeMock = vi.fn()
    capturedSubscriber = undefined

    vi.mocked(useStore.subscribe).mockImplementation((cb: (state: unknown, prevState: unknown) => void) => {
      capturedSubscriber = cb
      return unsubscribeMock
    })

    vi.mocked(useStore.getState).mockReturnValue({
      syncDirection: null,
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    } as never)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('does nothing when enabled is false', () => {
    renderHook(() => useAutoSave(false))
    expect(useStore.subscribe).not.toHaveBeenCalled()
  })

  it('subscribes to store on mount when enabled', () => {
    renderHook(() => useAutoSave(true))
    expect(useStore.subscribe).toHaveBeenCalledTimes(1)
  })

  it('does not fire when history.past ref is unchanged', () => {
    renderHook(() => useAutoSave(true))
    const pastRef = [{}]
    const state = { history: { past: pastRef } }
    capturedSubscriber!(state, state)
    act(() => { vi.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS) })
    expect(sendToHost).not.toHaveBeenCalled()
  })

  it('sends SAVE after 1500ms when history changes', () => {
    renderHook(() => useAutoSave(true))
    const prevState = { history: { past: [{}] } }
    const nextState = { history: { past: [{}, {}] } }
    capturedSubscriber!(nextState, prevState)
    act(() => { vi.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS) })
    expect(sendToHost).toHaveBeenCalledWith({
      type: 'SAVE',
      payload: expect.objectContaining({ content: expect.any(String), layoutJson: expect.any(String) }),
    })
    const call = vi.mocked(sendToHost).mock.calls[0][0] as { type: string; payload: { layoutJson: string } }
    const layout = JSON.parse(call.payload.layoutJson)
    expect(layout.version).toBe(1)
    expect(layout).toHaveProperty('nodes')
    expect(layout).toHaveProperty('viewport')
  })

  it('resets timer on rapid successive history changes', () => {
    renderHook(() => useAutoSave(true))
    const prevState = { history: { past: [{}] } }
    capturedSubscriber!({ history: { past: [{}, {}] } }, prevState)
    act(() => { vi.advanceTimersByTime(800) })
    capturedSubscriber!({ history: { past: [{}, {}, {}] } }, { history: { past: [{}, {}] } })
    act(() => { vi.advanceTimersByTime(800) })
    // Only 800ms elapsed since second trigger — should not have fired yet
    expect(sendToHost).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS - 800) })
    expect(sendToHost).toHaveBeenCalledTimes(1)
  })

  it('does not send SAVE when syncDirection is "canvas" at timer fire time', () => {
    vi.mocked(useStore.getState).mockReturnValue({
      syncDirection: 'canvas',
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    } as never)
    renderHook(() => useAutoSave(true))
    const prevState = { history: { past: [{}] } }
    capturedSubscriber!({ history: { past: [{}, {}] } }, prevState)
    act(() => { vi.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS) })
    expect(sendToHost).not.toHaveBeenCalled()
  })

  it('unsubscribes and clears timer on unmount', () => {
    const { unmount } = renderHook(() => useAutoSave(true))
    const prevState = { history: { past: [{}] } }
    capturedSubscriber!({ history: { past: [{}, {}] } }, prevState)
    unmount()
    act(() => { vi.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS) })
    expect(unsubscribeMock).toHaveBeenCalledTimes(1)
    expect(sendToHost).not.toHaveBeenCalled()
  })

  it('unsubscribes old subscription when enabled toggles', () => {
    const { rerender } = renderHook(({ enabled }: { enabled: boolean }) => useAutoSave(enabled), {
      initialProps: { enabled: true },
    })
    expect(useStore.subscribe).toHaveBeenCalledTimes(1)
    rerender({ enabled: false })
    expect(unsubscribeMock).toHaveBeenCalledTimes(1)
    rerender({ enabled: true })
    expect(useStore.subscribe).toHaveBeenCalledTimes(2)
  })
})

describe('buildLayoutJson', () => {
  it('maps node positions to layout schema', () => {
    const nodes: Node<FlowNodeData>[] = [
      { id: 'a', position: { x: 100, y: 200 }, data: { label: 'A', shape: 'rectangle' }, type: 'flowNode' },
    ]
    const vp = { x: -50, y: -30, zoom: 1.5 }
    const layout = buildLayoutJson(nodes, vp)
    expect(layout).toEqual({
      version: 1,
      nodes: { a: { x: 100, y: 200 } },
      viewport: { x: -50, y: -30, zoom: 1.5 },
    })
  })

  it('includes width/height only for nodes that have them', () => {
    const nodes: Node<FlowNodeData>[] = [
      { id: 'a', position: { x: 10, y: 20 }, width: 120, height: 40, data: { label: 'A', shape: 'rectangle' }, type: 'flowNode' },
      { id: 'b', position: { x: 30, y: 40 }, data: { label: 'B', shape: 'rounded' }, type: 'flowNode' },
    ]
    const vp = { x: 0, y: 0, zoom: 1 }
    const layout = buildLayoutJson(nodes, vp)
    expect(layout.nodes['a']).toEqual({ x: 10, y: 20, width: 120, height: 40 })
    expect(layout.nodes['b']).toEqual({ x: 30, y: 40 })
    expect(layout.nodes['b']).not.toHaveProperty('width')
    expect(layout.nodes['b']).not.toHaveProperty('height')
  })

  it('includes viewport', () => {
    const nodes: Node<FlowNodeData>[] = []
    const vp = { x: 10, y: 20, zoom: 2 }
    const layout = buildLayoutJson(nodes, vp)
    expect(layout.viewport).toEqual({ x: 10, y: 20, zoom: 2 })
    expect(layout.version).toBe(1)
  })
})

describe('useManualSave', () => {
  beforeEach(() => {
    vi.mocked(useStore.getState).mockReturnValue({
      syncDirection: null,
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('sends SAVE immediately on Ctrl+S', () => {
    renderHook(() => useManualSave())
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }))
    })
    expect(sendToHost).toHaveBeenCalledWith({
      type: 'SAVE',
      payload: expect.objectContaining({ content: expect.any(String), layoutJson: expect.any(String) }),
    })
  })

  it('sends SAVE immediately on Meta+S (Mac)', () => {
    renderHook(() => useManualSave())
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true }))
    })
    expect(sendToHost).toHaveBeenCalledWith({
      type: 'SAVE',
      payload: expect.objectContaining({ content: expect.any(String), layoutJson: expect.any(String) }),
    })
  })
})
