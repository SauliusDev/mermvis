import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useStore, useShallow } from '@/lib/store'
import type { NodeShape } from '@/lib/store'
import { applyDagreLayout } from '@/lib/layout'
import { serialize } from '@/lib/serializer'
import { exportCanvasToJson } from '@/lib/export'
import { sendToHost } from '@/vscode'
import type { PanelId } from './TopBar'

function fuzzyMatch(query: string, label: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  const t = label.toLowerCase()
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

interface PaletteAction {
  id: string
  label: string
  category: string
  disabled?: boolean
  execute: () => void
}

interface CommandPaletteProps {
  onTogglePanel: (id: PanelId) => void
}

export default function CommandPalette({ onTogglePanel }: CommandPaletteProps): React.JSX.Element | null {
  const { commandPaletteOpen, closeCommandPalette, openCommandPalette } = useStore(
    useShallow(s => ({
      commandPaletteOpen: s.commandPaletteOpen,
      closeCommandPalette: s.closeCommandPalette,
      openCommandPalette: s.openCommandPalette,
    }))
  )
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!commandPaletteOpen) return
    setQuery('')
    setSelectedIdx(0)
    const id = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(id)
  }, [commandPaletteOpen])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        if (commandPaletteOpen) {
          closeCommandPalette()
        } else {
          openCommandPalette()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commandPaletteOpen, closeCommandPalette, openCommandPalette])

  const actions: PaletteAction[] = useMemo(() => {
    const close = () => useStore.getState().closeCommandPalette()

    const shapes: Array<[NodeShape, string]> = [
      ['rectangle', 'Add Rectangle Node'],
      ['rounded', 'Add Rounded Node'],
      ['pill', 'Add Pill Node'],
      ['diamond', 'Add Diamond Node'],
      ['circle', 'Add Circle Node'],
      ['hexagon', 'Add Hexagon Node'],
      ['cylinder', 'Add Cylinder Node'],
      ['subgraph', 'Add Subgraph Container'],
    ]
    const shapeActions: PaletteAction[] = shapes.map(([shape, label]) => ({
      id: `add-${shape}`,
      label,
      category: 'Shapes',
      execute: () => {
        close()
        useStore.getState().requestAddNode(shape)
      },
    }))

    return [
      ...shapeActions,
      {
        id: 'undo', label: 'Undo', category: 'Edit',
        execute: () => { close(); useStore.getState().undo() },
      },
      {
        id: 'redo', label: 'Redo', category: 'Edit',
        execute: () => { close(); useStore.getState().redo() },
      },
      {
        id: 'auto-layout', label: 'Apply Auto-Layout', category: 'Layout',
        execute: () => {
          close()
          const { nodes, edges, moveNodes, requestFitView } = useStore.getState()
          if (nodes.length === 0) return
          const laidOut = applyDagreLayout(nodes, edges)
          moveNodes(laidOut.map(n => ({ id: n.id, position: n.position })))
          requestFitView()
        },
      },
      {
        id: 'export-mmd', label: 'Export as .mmd File', category: 'Export',
        execute: () => {
          close()
          const { nodes, edges } = useStore.getState()
          const content = serialize({ nodes, edges })
          sendToHost({ type: 'EXPORT', payload: { content, format: 'mmd', subtype: 'file' } })
        },
      },
      {
        id: 'copy-syntax', label: 'Copy Mermaid Syntax', category: 'Export',
        execute: () => {
          close()
          const { nodes, edges } = useStore.getState()
          const content = serialize({ nodes, edges })
          sendToHost({ type: 'EXPORT', payload: { content, format: 'mmd', subtype: 'clipboard' } })
        },
      },
      {
        id: 'save-json', label: 'Save Canvas as JSON', category: 'Export',
        execute: () => {
          close()
          const { nodes, edges, viewport } = useStore.getState()
          const content = exportCanvasToJson(nodes, edges, viewport)
          sendToHost({ type: 'EXPORT', payload: { content, format: 'json', subtype: 'file' } })
        },
      },
      {
        id: 'load-json', label: 'Load Canvas from JSON', category: 'Export',
        execute: () => {
          close()
          sendToHost({ type: 'IMPORT_JSON', payload: {} })
        },
      },
      {
        id: 'toggle-canvas', label: 'Toggle Canvas Panel', category: 'View',
        execute: () => { close(); onTogglePanel('canvas') },
      },
      {
        id: 'toggle-code', label: 'Toggle Code Panel', category: 'View',
        execute: () => { close(); onTogglePanel('code') },
      },
      {
        id: 'toggle-preview', label: 'Toggle Preview Panel', category: 'View',
        execute: () => { close(); onTogglePanel('preview') },
      },
      {
        id: 'toggle-inspector', label: 'Toggle Inspector Panel', category: 'View',
        execute: () => { close(); useStore.getState().toggleInspector() },
      },
      {
        id: 'zoom-fit', label: 'Fit View', category: 'Zoom',
        execute: () => { close(); useStore.getState().dispatchZoomAction('fit') },
      },
      {
        id: 'zoom-100', label: 'Zoom to 100%', category: 'Zoom',
        execute: () => { close(); useStore.getState().dispatchZoomAction('reset') },
      },
      {
        id: 'zoom-in', label: 'Zoom In', category: 'Zoom',
        execute: () => { close(); useStore.getState().dispatchZoomAction('in') },
      },
      {
        id: 'zoom-out', label: 'Zoom Out', category: 'Zoom',
        execute: () => { close(); useStore.getState().dispatchZoomAction('out') },
      },
      {
        id: 'toggle-lock', label: 'Toggle Canvas Lock', category: 'View',
        execute: () => { close(); useStore.getState().toggleLock() },
      },
      {
        id: 'toggle-minimap', label: 'Toggle Minimap', category: 'View',
        execute: () => { close(); useStore.getState().toggleMinimap() },
      },
    ]
  }, [onTogglePanel])

  const filtered = useMemo(
    () => actions.filter(a => !a.disabled && fuzzyMatch(query, a.label)),
    [actions, query]
  )

  const clampedIdx = Math.min(selectedIdx, Math.max(0, filtered.length - 1))

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeCommandPalette()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => (i >= filtered.length - 1 ? 0 : i + 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => (i <= 0 ? filtered.length - 1 : i - 1))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const action = filtered[clampedIdx]
      if (action) action.execute()
      return
    }
  }, [filtered, clampedIdx, closeCommandPalette])

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setSelectedIdx(0)
  }, [])

  if (!commandPaletteOpen) return null

  return (
    <div
      className="command-palette-backdrop"
      onMouseDown={e => { if (e.button !== 0) return; closeCommandPalette() }}
      role="presentation"
    >
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={e => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="command-palette__input"
          type="text"
          placeholder="Search actions…"
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleInputKeyDown}
          aria-label="Search actions"
          aria-autocomplete="list"
          aria-controls="command-palette-list"
          aria-activedescendant={filtered[clampedIdx] ? `cmd-${filtered[clampedIdx].id}` : undefined}
        />
        <ul
          id="command-palette-list"
          className="command-palette__list"
          role="listbox"
          aria-multiselectable={false}
          aria-label="Actions"
        >
          {filtered.length === 0 && (
            <li className="command-palette__empty">No results</li>
          )}
          {filtered.map((action, idx) => (
            <li
              key={action.id}
              id={`cmd-${action.id}`}
              role="option"
              aria-selected={idx === clampedIdx}
              className={`command-palette__item${idx === clampedIdx ? ' command-palette__item--selected' : ''}`}
              onMouseDown={e => { e.preventDefault(); action.execute() }}
              onMouseEnter={() => setSelectedIdx(idx)}
            >
              <span className="command-palette__item-label">{action.label}</span>
              <span className="command-palette__item-category">{action.category}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
