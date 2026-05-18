import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// All vi.mock() at top level — Vitest hoists these before imports
vi.mock('@codemirror/view', () => ({
  EditorView: vi.fn(),
}))

vi.mock('./store', () => ({
  useStore: vi.fn(),
}))

import { useSyncCanvasToCode } from './sync'
import { useStore } from './store'

function makeMockView(docContent: string, cursorHead = 0) {
  let currentContent = docContent
  let currentHead = cursorHead

  const dispatch = vi.fn((transaction: {
    changes?: { from: number; to: number; insert: string }
    selection?: { anchor: number }
  }) => {
    if (transaction.changes) {
      currentContent = transaction.changes.insert
      currentHead = 0  // CodeMirror resets cursor on content replacement
    }
    if (transaction.selection) {
      currentHead = transaction.selection.anchor
    }
  })

  return {
    dispatch,
    get state() {
      return {
        doc: { toString: () => currentContent, length: currentContent.length },
        selection: { main: { head: currentHead } },
      }
    },
  }
}

describe('useSyncCanvasToCode', () => {
  beforeEach(() => {
    vi.mocked(useStore).mockReturnValue(null)
  })

  it('does nothing when viewRef.current is null', () => {
    const viewRef = { current: null }
    expect(() => renderHook(() => useSyncCanvasToCode(viewRef as never, 'content'))).not.toThrow()
  })

  it('does nothing when syncDirection is "code"', () => {
    vi.mocked(useStore).mockReturnValue('code')
    const view = makeMockView('old content', 5)
    const viewRef = { current: view }
    renderHook(() => useSyncCanvasToCode(viewRef as never, 'new content'))
    expect(view.dispatch).not.toHaveBeenCalled()
  })

  it('allows sync when syncDirection is "canvas"', () => {
    vi.mocked(useStore).mockReturnValue('canvas')
    const view = makeMockView('old content', 0)
    const viewRef = { current: view }
    renderHook(() => useSyncCanvasToCode(viewRef as never, 'new content'))
    expect(view.dispatch).toHaveBeenCalledWith({
      changes: { from: 0, to: 'old content'.length, insert: 'new content' },
    })
  })

  it('does nothing when code matches current doc', () => {
    const view = makeMockView('same content', 5)
    const viewRef = { current: view }
    renderHook(() => useSyncCanvasToCode(viewRef as never, 'same content'))
    expect(view.dispatch).not.toHaveBeenCalled()
  })

  it('dispatches document replacement when code differs', () => {
    const view = makeMockView('old content', 0)
    const viewRef = { current: view }
    renderHook(() => useSyncCanvasToCode(viewRef as never, 'new content'))
    expect(view.dispatch).toHaveBeenCalledWith({
      changes: { from: 0, to: 'old content'.length, insert: 'new content' },
    })
  })

  it('restores cursor position after dispatch', () => {
    const view = makeMockView('hello world', 5)
    const viewRef = { current: view }
    renderHook(() => useSyncCanvasToCode(viewRef as never, 'new content'))
    // savedPos=5; after content dispatch cursor resets to 0; clamp(5,11)=5; 5 !== 0 → restore
    expect(view.dispatch).toHaveBeenNthCalledWith(2, { selection: { anchor: 5 } })
  })

  it('clamps cursor to new doc length when cursor is beyond end', () => {
    const view = makeMockView('long content', 12)  // cursor at end of 'long content' (len 12)
    const viewRef = { current: view }
    renderHook(() => useSyncCanvasToCode(viewRef as never, 'hi'))  // shorter doc
    // savedPos=12; after dispatch doc='hi' (len 2), cursor=0; clamp(12,2)=2; 2 !== 0 → restore
    expect(view.dispatch).toHaveBeenNthCalledWith(2, { selection: { anchor: 2 } })
  })

  it('does not restore cursor when position is unchanged', () => {
    const view = makeMockView('old content', 0)  // cursor at 0
    const viewRef = { current: view }
    renderHook(() => useSyncCanvasToCode(viewRef as never, 'new content'))
    // savedPos=0; after dispatch cursor=0; clamp(0,11)=0; 0 !== 0 → FALSE → no restore dispatch
    expect(view.dispatch).toHaveBeenCalledTimes(1)
  })

  it('re-runs when code changes', () => {
    const view = makeMockView('initial', 0)
    const viewRef = { current: view }
    const { rerender } = renderHook(({ code }) => useSyncCanvasToCode(viewRef as never, code), {
      initialProps: { code: 'first update' },
    })
    expect(view.dispatch).toHaveBeenCalledTimes(1)

    rerender({ code: 'second update' })
    expect(view.dispatch).toHaveBeenCalledTimes(2)
  })
})
