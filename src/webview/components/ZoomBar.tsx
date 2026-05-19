import React from 'react'
import { useReactFlow } from '@xyflow/react'
import { useStore } from '@/lib/store'

export default function ZoomBar(): React.JSX.Element {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const viewport = useStore(s => s.viewport)
  const minimapOpen = useStore(s => s.minimapOpen)
  const toggleMinimap = useStore(s => s.toggleMinimap)
  const isLocked = useStore(s => s.isLocked)
  const toggleLock = useStore(s => s.toggleLock)

  const zoomPercent = Math.round((viewport.zoom ?? 1) * 100)

  return (
    <div className="zoom-bar" role="toolbar" aria-label="Zoom controls">
      <button
        className="zoom-bar__btn"
        aria-label="Zoom out"
        disabled={isLocked}
        onClick={() => zoomOut({ duration: 200 })}
      >−</button>
      <span className="zoom-bar__percentage">{zoomPercent}%</span>
      <button
        className="zoom-bar__btn"
        aria-label="Zoom in"
        disabled={isLocked}
        onClick={() => zoomIn({ duration: 200 })}
      >+</button>
      <div className="zoom-bar__divider" aria-hidden="true" />
      <button
        className="zoom-bar__btn"
        aria-label="Fit all nodes in viewport"
        onClick={() => fitView({ padding: 0.1, duration: 200 })}
      >⤢</button>
      <div className="zoom-bar__divider" aria-hidden="true" />
      <button
        className={`zoom-bar__btn zoom-bar__btn--toggle${minimapOpen ? ' zoom-bar__btn--active' : ''}`}
        role="switch"
        aria-checked={minimapOpen}
        aria-label={minimapOpen ? 'Hide minimap' : 'Show minimap'}
        onClick={toggleMinimap}
      >⊞</button>
      <button
        className={`zoom-bar__btn zoom-bar__btn--toggle${isLocked ? ' zoom-bar__btn--active' : ''}`}
        role="switch"
        aria-checked={isLocked}
        aria-label={isLocked ? 'Unlock canvas' : 'Lock canvas'}
        onClick={toggleLock}
      >⊘</button>
    </div>
  )
}
