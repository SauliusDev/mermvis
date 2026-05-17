import React, { useState, useRef, useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '@/lib/store'
import type { NodeShape } from '@/lib/store'

const PALETTE_SHAPES: Array<{ shape: NodeShape; label: string }> = [
  { shape: 'rectangle', label: 'Rectangle' },
  { shape: 'rounded',   label: 'Rounded'   },
  { shape: 'pill',      label: 'Pill'      },
  { shape: 'diamond',   label: 'Diamond'   },
  { shape: 'circle',    label: 'Circle'    },
  { shape: 'hexagon',   label: 'Hexagon'   },
  { shape: 'cylinder',  label: 'Cylinder'  },
  { shape: 'subgraph',  label: 'Subgraph'  },
]

const SHAPE_ICONS: Record<NodeShape, string> = {
  rectangle: '▭',
  rounded:   '▢',
  pill:      '⬭',
  diamond:   '◇',
  circle:    '○',
  hexagon:   '⬡',
  cylinder:  '⊓',
  subgraph:  '⊞',
}

export interface PaletteProps {
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

export default function Palette({ onClose, triggerRef }: PaletteProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const paletteRef = useRef<HTMLDivElement>(null)

  const nodes = useStore(s => s.nodes)
  const { addNode, addSubgraph } = useStore(
    useShallow(s => ({ addNode: s.addNode, addSubgraph: s.addSubgraph }))
  )

  useEffect(() => {
    function handleOutside(e: MouseEvent): void {
      if (paletteRef.current?.contains(e.target as Node)) return
      if (triggerRef.current?.contains(e.target as Node)) return
      onClose()
    }
    function handleEscape(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose, triggerRef])

  function handleDragStart(e: React.DragEvent, shape: NodeShape): void {
    e.dataTransfer.setData('application/reactflow-palette', shape)
    e.dataTransfer.effectAllowed = 'copy'
  }

  function handleShapeClick(shape: NodeShape): void {
    if (shape === 'subgraph') {
      addSubgraph()
    } else {
      const position = { x: 60 + nodes.length * 30, y: 60 + nodes.length * 30 }
      addNode({
        id: crypto.randomUUID(),
        type: 'flowNode',
        position,
        data: { label: 'New Node', shape },
      })
    }
    onClose()
  }

  const filtered = PALETTE_SHAPES.filter(s =>
    s.label.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div ref={paletteRef} className="component-palette" role="dialog" aria-modal="true" aria-label="Shape palette">
      <div className="component-palette__header">
        <span className="component-palette__title">Shapes</span>
        <button
          className="component-palette__close"
          aria-label="Close palette"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <input
        className="component-palette__search"
        type="text"
        placeholder="Search shapes…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        aria-label="Search shapes"
        autoFocus
      />
      <span className="component-palette__category">Shapes</span>
      {filtered.length === 0 ? (
        <p className="component-palette__empty">No shapes match &ldquo;{query}&rdquo;</p>
      ) : (
        <div className="component-palette__grid">
          {filtered.map(({ shape, label }) => (
            <div
              key={shape}
              className="component-palette__item"
              draggable
              role="button"
              tabIndex={0}
              aria-label={label}
              onDragStart={e => handleDragStart(e, shape)}
              onClick={() => handleShapeClick(shape)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleShapeClick(shape) }
              }}
            >
              <span className="component-palette__item-icon" aria-hidden="true">{SHAPE_ICONS[shape]}</span>
              <span className="component-palette__item-label">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
