import React, { useState, useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'
import { sendToHost } from '@/vscode'
import { serialize } from '@/lib/serializer'
import { exportCanvasToJson } from '@/lib/export'

export type PanelId = 'canvas' | 'code' | 'preview'
export type PanelVisible = Record<PanelId, boolean>

interface TopBarProps {
  panelVisible: PanelVisible
  onTogglePanel: (panel: PanelId) => void
  theme: 'dark' | 'adaptive'
  onThemeChange: (theme: 'dark' | 'adaptive') => void
}

export default function TopBar({ panelVisible, onTogglePanel, theme, onThemeChange }: TopBarProps): React.JSX.Element {
  const filename = useStore(s => s.filename)
  const [isThemeOpen, setIsThemeOpen] = useState(false)
  const themeButtonRef = useRef<HTMLButtonElement>(null)
  const themeDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isThemeOpen) return
    const handleMouseDown = (e: MouseEvent): void => {
      if (
        themeButtonRef.current?.contains(e.target as Node) ||
        themeDropdownRef.current?.contains(e.target as Node)
      ) return
      setIsThemeOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isThemeOpen])

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
          aria-label="Export as .mmd file"
          title="Export as .mmd file"
          onClick={handleExportFile}
        >⬇</button>
        <button
          className="topbar__btn"
          aria-label="Copy Mermaid syntax to clipboard"
          title="Copy Mermaid syntax to clipboard"
          onClick={handleCopyClipboard}
        >⎘</button>
        <button
          className="topbar__btn"
          aria-label="Save canvas as JSON"
          title="Save canvas as JSON"
          onClick={handleSaveJson}
        >↓</button>
        <button
          className="topbar__btn"
          aria-label="Load canvas from JSON"
          title="Load canvas from JSON"
          onClick={handleLoadJson}
        >↑</button>
        <div className="topbar__theme-picker">
          <button
            ref={themeButtonRef}
            className={`topbar__btn${isThemeOpen ? ' topbar__btn--active' : ''}`}
            aria-label={`Theme: ${theme === 'adaptive' ? 'Adaptive' : 'Dark'}. Click to change`}
            aria-haspopup="listbox"
            aria-expanded={isThemeOpen}
            title="Theme picker"
            onClick={() => setIsThemeOpen(o => !o)}
          >◑</button>
          {isThemeOpen && (
            <div
              ref={themeDropdownRef}
              role="listbox"
              aria-label="Select theme"
              className="topbar__theme-dropdown"
            >
              {(['dark', 'adaptive'] as const).map(t => (
                <button
                  key={t}
                  role="option"
                  aria-selected={theme === t}
                  className={`topbar__theme-option${theme === t ? ' topbar__theme-option--active' : ''}`}
                  onClick={() => { onThemeChange(t); setIsThemeOpen(false) }}
                >
                  {t === 'dark' ? '◑ Dark' : '◑ Adaptive'}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="topbar__btn" aria-label="Settings" title="Settings" disabled>⚙</button>
      </div>
    </header>
  )
}
