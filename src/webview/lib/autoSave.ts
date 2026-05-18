import { useEffect, useRef } from 'react'
import { useStore } from './store'
import { serialize } from './serializer'
import { sendToHost } from '../vscode'
import type { LayoutSidecar } from '../../shared/types'
import type { Node } from '@xyflow/react'
import type { FlowNodeData } from './store'

export const AUTO_SAVE_DEBOUNCE_MS = 1500

export function buildLayoutJson(
  nodes: Node<FlowNodeData>[],
  viewport: { x: number; y: number; zoom: number }
): LayoutSidecar {
  const layoutNodes: LayoutSidecar['nodes'] = {}
  for (const node of nodes) {
    layoutNodes[node.id] = {
      x: node.position.x,
      y: node.position.y,
      ...(node.width != null ? { width: node.width } : {}),
      ...(node.height != null ? { height: node.height } : {}),
    }
  }
  return { version: 1, nodes: layoutNodes, viewport }
}

function buildSavePayload() {
  const { nodes, edges, viewport } = useStore.getState()
  const layout = buildLayoutJson(nodes, viewport)
  return { content: serialize({ nodes, edges }), layoutJson: JSON.stringify(layout) }
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
