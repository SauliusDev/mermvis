import { useEffect, useRef } from 'react'
import { useStore } from './store'
import { serialize } from './serializer'
import { sendToHost } from '../vscode'

export const AUTO_SAVE_DEBOUNCE_MS = 1500
export const STUB_LAYOUT_JSON = JSON.stringify({
  version: 1,
  nodes: {},
  viewport: { x: 0, y: 0, zoom: 1 },
})

function buildSavePayload() {
  const { nodes, edges } = useStore.getState()
  return { content: serialize({ nodes, edges }), layoutJson: STUB_LAYOUT_JSON }
}

export function useAutoSave(enabled: boolean): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    const restartTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        if (useStore.getState().syncDirection === 'canvas') {
          timerRef.current = null
          return
        }
        sendToHost({ type: 'SAVE', payload: buildSavePayload() })
        timerRef.current = null
      }, AUTO_SAVE_DEBOUNCE_MS)
    }

    const unsubscribe = useStore.subscribe((state, prevState) => {
      if (state.history.past === prevState.history.past) return
      restartTimer()
    })

    return () => {
      unsubscribe()
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [enabled])
}

export function useManualSave(): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        sendToHost({ type: 'SAVE', payload: buildSavePayload() })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
