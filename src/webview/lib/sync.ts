import { useEffect } from 'react'
import type { RefObject } from 'react'
import type { EditorView } from '@codemirror/view'
import { useStore } from './store'

export function useSyncCanvasToCode(
  viewRef: RefObject<EditorView | null>,
  code: string
): void {
  const syncDirection = useStore(s => s.syncDirection)

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    if (syncDirection === 'code') return

    const current = view.state.doc.toString()
    if (current === code) return

    const savedPos = view.state.selection.main.head
    view.dispatch({ changes: { from: 0, to: current.length, insert: code } })

    const clampedPos = Math.min(savedPos, view.state.doc.length)
    if (clampedPos !== view.state.selection.main.head) {
      view.dispatch({ selection: { anchor: clampedPos } })
    }
  }, [code, syncDirection, viewRef])
}
