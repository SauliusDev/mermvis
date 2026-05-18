import React, { useEffect, useState, useCallback } from 'react'
import { sendToHost, onHostMessage } from './vscode'
import type { HostToWebviewMessage } from '../shared/types'
import { useStore } from './lib/store'
import { useAutoSave, useManualSave } from './lib/autoSave'
import { parseMermaidFlowchart } from './lib/parser'
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
        case 'LOAD':
          if (msg.payload.filename) setFilename(msg.payload.filename)
          if (msg.payload.autoSave !== undefined) setAutoSave(msg.payload.autoSave)
          {
            const result = parseMermaidFlowchart(msg.payload.content)
            if ('error' in result) {
              sendToHost({ type: 'LOG', payload: { level: 'error', message: `Failed to parse diagram: ${result.error}` } })
            } else {
              importFromCode(result)
            }
          }
          break
        case 'THEME_CHANGED':
          // Story 12.3 — adaptive theme activation
          break
        case 'EXTERNAL_FILE_CHANGE':
          // Story 6.5 — bidirectional sync conflict resolution
          break
        case 'SAVE_RESULT':
          if (!msg.payload.success) {
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
