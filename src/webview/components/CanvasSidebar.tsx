import React, { useState, useRef, useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '@/lib/store'
import { applyDagreLayout } from '@/lib/layout'
import Palette from '@/components/Palette'

export default function CanvasSidebar(): React.JSX.Element {
  const { fitView } = useReactFlow()

  const [paletteOpen, setPaletteOpen] = useState(false)
  const addNodeBtnRef = useRef<HTMLButtonElement>(null)

  const nodes = useStore(s => s.nodes)
  const edges = useStore(s => s.edges)
  const past = useStore(s => s.history.past)
  const future = useStore(s => s.history.future)
  const inspectorOpen = useStore(s => s.inspectorOpen)

  const { addSubgraph, moveNodes, undo, redo, deselectAll, toggleInspector } = useStore(
    useShallow(s => ({
      addSubgraph: s.addSubgraph,
      moveNodes: s.moveNodes,
      undo: s.undo,
      redo: s.redo,
      deselectAll: s.deselectAll,
      toggleInspector: s.toggleInspector,
    }))
  )

  const canUndo = past.length > 0
  const canRedo = future.length > 0

  const handlePaletteClose = useCallback(function handlePaletteClose(): void {
    setPaletteOpen(false)
    addNodeBtnRef.current?.focus()
  }, [])

  function handleAutoLayout(): void {
    if (nodes.length === 0) return
    const laidOutNodes = applyDagreLayout(nodes, edges)
    const updates = laidOutNodes.map(n => ({ id: n.id, position: n.position }))
    moveNodes(updates)
    fitView({ padding: 0.1 })
  }

  function handleZoomToFit(): void {
    fitView({ padding: 0.1 })
  }

  return (
    <>
      <div className="canvas-sidebar" role="toolbar" aria-label="Canvas tools">
        <button className="canvas-sidebar__btn" aria-label="Select" onClick={deselectAll}>
          ↖
        </button>
        <button
          ref={addNodeBtnRef}
          className={`canvas-sidebar__btn${paletteOpen ? ' canvas-sidebar__btn--active' : ''}`}
          aria-label="Add Node"
          aria-expanded={paletteOpen}
          aria-haspopup="dialog"
          onClick={() => setPaletteOpen(p => !p)}
        >
          ＋
        </button>
        <button className="canvas-sidebar__btn" aria-label="Add Edge">
          ⌁
        </button>
        <button className="canvas-sidebar__btn" aria-label="Add Subgraph" onClick={addSubgraph}>
          ⊞
        </button>
        <div className="canvas-sidebar__divider" aria-hidden="true" />
        <button
          className="canvas-sidebar__btn"
          aria-label="Undo"
          disabled={!canUndo}
          onClick={undo}
        >
          ↩
        </button>
        <button
          className="canvas-sidebar__btn"
          aria-label="Redo"
          disabled={!canRedo}
          onClick={redo}
        >
          ↪
        </button>
        <div className="canvas-sidebar__divider" aria-hidden="true" />
        <button className="canvas-sidebar__btn" aria-label="Auto Layout" onClick={handleAutoLayout}>
          ⬡
        </button>
        <button className="canvas-sidebar__btn" aria-label="Zoom to Fit" onClick={handleZoomToFit}>
          ⤢
        </button>
        <div className="canvas-sidebar__divider" aria-hidden="true" />
        <button
          className={`canvas-sidebar__btn${inspectorOpen ? ' canvas-sidebar__btn--active' : ''}`}
          aria-label="Toggle Inspector"
          aria-expanded={inspectorOpen}
          aria-controls="inspector-panel"
          onClick={toggleInspector}
        >
          ⊟
        </button>
      </div>
      {paletteOpen && (
        <Palette onClose={handlePaletteClose} triggerRef={addNodeBtnRef} />
      )}
    </>
  )
}
