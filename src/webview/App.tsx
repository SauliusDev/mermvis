import React, { useEffect, useState, useCallback } from 'react'
import { sendToHost, onHostMessage } from './vscode'
import type { HostToWebviewMessage, LayoutSidecar } from '../shared/types'
import { useStore } from './lib/store'
import { useAutoSave, useManualSave } from './lib/autoSave'
import { parseMermaidFlowchart } from './lib/parser'
import { applyDagreLayout } from './lib/layout'
import Canvas from './components/Canvas'
import PanelLayout from './components/PanelLayout'
import TopBar from './components/TopBar'
import type { PanelId, PanelVisible } from './components/TopBar'
import '@xyflow/react/dist/style.css'
import './styles/variables.css'
import './styles/base.css'
import './styles/components/panels.css'
import './styles/themes/dark.css'
import './styles/components/topbar.css'
import './styles/components/node.css'
import './styles/components/edge.css'
import './styles/components/sidebar.css'
import './styles/components/subgraph.css'
import './styles/components/palette.css'
import './styles/components/node-toolbar.css'
import './styles/components/node-color-picker.css'

const CodePanel = React.lazy(() => import('./components/CodePanel'))
const PreviewPanel = React.lazy(() => import('./components/PreviewPanel'))

export default function App(): React.JSX.Element {
  const setFilename = useStore(s => s.setFilename)
  const importFromCode = useStore(s => s.importFromCode)
  const requestViewportRestore = useStore(s => s.requestViewportRestore)
  const requestFitView = useStore(s => s.requestFitView)
  const clearDirty = useStore(s => s.clearDirty)
  const [autoSave, setAutoSave] = useState(true)

  useAutoSave(autoSave)
  useManualSave()

  const [panelVisible, setPanelVisible] = useState<PanelVisible>({
    canvas: true,
    code: false,
    preview: false,
  })

  const handleTogglePanel = useCallback((panel: PanelId): void => {
    setPanelVisible(prev => {
      const next: PanelVisible = { ...prev, [panel]: !prev[panel] }
      const anyActive = (Object.keys(next) as PanelId[]).some(k => next[k])
      return anyActive ? next : prev
    })
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      import('./components/CodePanel')
      import('./components/PreviewPanel')
    }, 1500)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    sendToHost({ type: 'READY', payload: {} })

    const cleanup = onHostMessage((msg: HostToWebviewMessage) => {
      switch (msg.type) {
        case 'LOAD': {
          if (msg.payload.filename) setFilename(msg.payload.filename)
          if (msg.payload.autoSave !== undefined) setAutoSave(msg.payload.autoSave)
          const parsed = parseMermaidFlowchart(msg.payload.content)
          if ('error' in parsed) {
            sendToHost({ type: 'LOG', payload: { level: 'error', message: `Failed to parse diagram: ${parsed.error}` } })
            break
          }
          if (msg.payload.layoutJson) {
            try {
              const layout = JSON.parse(msg.payload.layoutJson) as LayoutSidecar
              const dagreNodes = parsed.nodes.length > 0
                ? applyDagreLayout(parsed.nodes, parsed.edges)
                : parsed.nodes
              const dagreById = new Map(dagreNodes.map(n => [n.id, n]))
              const nodesWithPositions = parsed.nodes.map(n => {
                const saved = layout.nodes[n.id]
                if (saved) {
                  return {
                    ...n,
                    position: { x: saved.x, y: saved.y },
                    ...(saved.width != null ? { width: saved.width } : {}),
                    ...(saved.height != null ? { height: saved.height } : {}),
                  }
                }
                const fromDagre = dagreById.get(n.id)
                return fromDagre ?? n
              })
              importFromCode({ ...parsed, nodes: nodesWithPositions })
              if (layout.viewport) requestViewportRestore(layout.viewport)
            } catch {
              sendToHost({ type: 'LOG', payload: { level: 'error', message: 'Failed to parse layout sidecar — loading without positions' } })
              importFromCode(parsed)
            }
          } else {
            if (parsed.nodes.length > 0) {
              const laidOut = applyDagreLayout(parsed.nodes, parsed.edges)
              importFromCode({ ...parsed, nodes: laidOut })
              requestFitView()
            } else {
              importFromCode(parsed)
            }
          }
          break
        }
        case 'THEME_CHANGED':
          // Story 12.3 — adaptive theme activation
          break
        case 'EXTERNAL_FILE_CHANGE': {
          const { isDirty } = useStore.getState()
          if (isDirty) {
            sendToHost({
              type: 'LOG',
              payload: { level: 'warn', message: 'External file change detected — canvas has unsaved edits. Save first (Ctrl+S) to apply the external update.' },
            })
            break
          }
          const extParsed = parseMermaidFlowchart(msg.payload.content)
          if ('error' in extParsed) {
            sendToHost({ type: 'LOG', payload: { level: 'error', message: `External file change: failed to parse: ${extParsed.error}` } })
            break
          }
          if (extParsed.nodes.length > 0) {
            const laidOut = applyDagreLayout(extParsed.nodes, extParsed.edges)
            importFromCode({ ...extParsed, nodes: laidOut })
            clearDirty()
            requestFitView()
          } else {
            importFromCode(extParsed)
            clearDirty()
          }
          break
        }
        case 'SAVE_RESULT':
          if (msg.payload.success) {
            clearDirty()
          } else {
            sendToHost({ type: 'LOG', payload: { level: 'error', message: `Auto-save failed: ${msg.payload.error ?? 'unknown error'}` } })
          }
          break
        default: {
          const _exhaustive: never = msg
          break
        }
      }
    })

    return cleanup
  }, [setFilename])

  return (
    <div className="app">
      <TopBar panelVisible={panelVisible} onTogglePanel={handleTogglePanel} />
      <main className="app__main">
        <PanelLayout
          panelVisible={panelVisible}
          canvas={<Canvas />}
          code={
            <React.Suspense fallback={<div className="code-panel-loading" />}>
              <CodePanel />
            </React.Suspense>
          }
          preview={
            <React.Suspense fallback={<div className="preview-panel-loading" />}>
              <PreviewPanel />
            </React.Suspense>
          }
        />
      </main>
    </div>
  )
}
