import React, { useEffect, useState, useCallback } from 'react'
import { sendToHost, onHostMessage } from './vscode'
import type { HostToWebviewMessage } from '../shared/types'
import { useStore } from './lib/store'
import Canvas from './components/Canvas'
import TopBar from './components/TopBar'
import type { PanelId, PanelVisible } from './components/TopBar'
import '@xyflow/react/dist/style.css'
import './styles/variables.css'
import './styles/base.css'
import './styles/themes/dark.css'
import './styles/components/topbar.css'
import './styles/components/node.css'
import './styles/components/edge.css'
import './styles/components/sidebar.css'
import './styles/components/subgraph.css'
import './styles/components/palette.css'
import './styles/components/node-toolbar.css'
import './styles/components/node-color-picker.css'

export default function App(): React.JSX.Element {
  const setFilename = useStore(s => s.setFilename)

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
    sendToHost({ type: 'READY', payload: {} })

    const cleanup = onHostMessage((msg: HostToWebviewMessage) => {
      switch (msg.type) {
        case 'LOAD':
          if (msg.payload.filename) setFilename(msg.payload.filename)
          // Future Story 6.4: parseMermaidFlowchart(msg.payload.content) → setCanvasState()
          break
        case 'THEME_CHANGED':
          // Story 12.3 — adaptive theme activation
          break
        case 'EXTERNAL_FILE_CHANGE':
          // Story 6.5 — bidirectional sync conflict resolution
          break
        case 'SAVE_RESULT':
          // Story 8 — save confirmation feedback
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
        <div
          className="app__panel"
          style={panelVisible.canvas ? undefined : { display: 'none' }}
        >
          <Canvas />
        </div>
        {/* panelVisible.code: CodePanel lazy-loaded (Story 6-3) */}
        {/* panelVisible.preview: PreviewPanel lazy-loaded (Story 7-1) */}
      </main>
    </div>
  )
}
