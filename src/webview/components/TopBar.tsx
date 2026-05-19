import React from 'react'
import { useStore } from '@/lib/store'
import { sendToHost } from '@/vscode'
import { serialize } from '@/lib/serializer'
import { exportCanvasToJson } from '@/lib/export'

export type PanelId = 'canvas' | 'code' | 'preview'
export type PanelVisible = Record<PanelId, boolean>

interface TopBarProps {
  panelVisible: PanelVisible
  onTogglePanel: (panel: PanelId) => void
}

export default function TopBar({ panelVisible, onTogglePanel }: TopBarProps): React.JSX.Element {
  const filename = useStore(s => s.filename)

  const handleExportFile = () => {
    const { nodes, edges } = useStore.getState()
    const content = serialize({ nodes, edges })
    sendToHost({ type: 'EXPORT', payload: { content, format: 'mmd', subtype: 'file' } })
  }

  const handleCopyClipboard = () => {
    const { nodes, edges } = useStore.getState()
    const content = serialize({ nodes, edges })
    sendToHost({ type: 'EXPORT', payload: { content, format: 'mmd', subtype: 'clipboard' } })
  }

  const handleSaveJson = () => {
    const { nodes, edges, viewport } = useStore.getState()
    const content = exportCanvasToJson(nodes, edges, viewport)
    sendToHost({ type: 'EXPORT', payload: { content, format: 'json', subtype: 'file' } })
  }

  const handleLoadJson = () => {
    sendToHost({ type: 'IMPORT_JSON', payload: {} })
  }

  return (
    <header className="topbar" role="banner">
      <div className="topbar__brand">
        <span className="topbar__logo" aria-hidden="true">◈</span>
        <span className="topbar__name">mermvis</span>
        <span className="topbar__filename">{filename}</span>
      </div>
      <nav className="topbar__tabs" aria-label="Panel tabs">
        {(['canvas', 'code', 'preview'] as const).map(panel => (
          <button
            key={panel}
            className={`topbar__tab${panelVisible[panel] ? ' topbar__tab--active' : ''}`}
            aria-pressed={panelVisible[panel]}
            onClick={() => onTogglePanel(panel)}
          >
            {panel.charAt(0).toUpperCase() + panel.slice(1)}
          </button>
        ))}
      </nav>
      <div className="topbar__actions">
        <button
          className="topbar__btn"
          aria-label="Export .mmd"
          title="Export .mmd"
          onClick={handleExportFile}
        >⬇</button>
        <button
          className="topbar__btn"
          aria-label="Copy syntax"
          title="Copy syntax to clipboard"
          onClick={handleCopyClipboard}
        >⎘</button>
        <button
          className="topbar__btn"
          aria-label="Save as JSON"
          title="Save canvas as JSON"
          onClick={handleSaveJson}
        >↓</button>
        <button
          className="topbar__btn"
          aria-label="Load JSON"
          title="Load canvas from JSON"
          onClick={handleLoadJson}
        >↑</button>
        <button className="topbar__btn" aria-label="Theme picker" title="Theme picker" disabled>◑</button>
        <button className="topbar__btn" aria-label="Settings" title="Settings" disabled>⚙</button>
      </div>
    </header>
  )
}
