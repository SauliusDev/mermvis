import React, { useState, useEffect } from 'react'
import { NodeToolbar as RFNodeToolbar, Position, useViewport } from '@xyflow/react'
import { useStore, useShallow } from '@/lib/store'
import type { NodeShape } from '@/lib/store'

interface NodeToolbarProps {
  isVisible?: boolean
  nodeId: string
  shape: NodeShape
  positionAbsoluteY: number
  onEditLabel: () => void
}

const SHAPE_OPTIONS: Array<{ shape: NodeShape; label: string; icon: string }> = [
  { shape: 'rectangle', label: 'Rectangle', icon: '▭' },
  { shape: 'rounded',   label: 'Rounded',   icon: '▢' },
  { shape: 'pill',      label: 'Pill',       icon: '⬭' },
  { shape: 'diamond',   label: 'Diamond',    icon: '◇' },
  { shape: 'circle',    label: 'Circle',     icon: '○' },
  { shape: 'hexagon',   label: 'Hexagon',    icon: '⬡' },
  { shape: 'cylinder',  label: 'Cylinder',   icon: '⊓' },
  { shape: 'subgraph',  label: 'Subgraph',   icon: '⊞' },
]

export default function NodeToolbar({ isVisible, nodeId, shape, positionAbsoluteY, onEditLabel }: NodeToolbarProps): React.JSX.Element {
  const { zoom, y: viewportY } = useViewport()
  const screenY = positionAbsoluteY * zoom + viewportY
  const toolbarPosition = screenY < 100 ? Position.Bottom : Position.Top

  const { removeNodes, duplicateNode, toggleNodeLock, updateNodeShape } = useStore(
    useShallow(s => ({
      removeNodes: s.removeNodes,
      duplicateNode: s.duplicateNode,
      toggleNodeLock: s.toggleNodeLock,
      updateNodeShape: s.updateNodeShape,
    }))
  )

  const isLocked = useStore(s => s.nodes.find(n => n.id === nodeId)?.draggable === false)

  const [shapeDropdownOpen, setShapeDropdownOpen] = useState(false)

  useEffect(() => {
    if (!isVisible) setShapeDropdownOpen(false)
  }, [isVisible])

  function handleShapeSelect(s: NodeShape): void {
    updateNodeShape(nodeId, s)
    setShapeDropdownOpen(false)
  }

  return (
    <RFNodeToolbar isVisible={isVisible} position={toolbarPosition} offset={8}>
      <div className="node-toolbar">
        <button
          className="node-toolbar__btn"
          aria-label="Edit label"
          title="Edit label"
          onClick={onEditLabel}
        >✎</button>

        <div className="node-toolbar__shape-wrapper">
          <button
            className="node-toolbar__btn"
            aria-label="Change shape"
            title="Change shape"
            aria-expanded={shapeDropdownOpen}
            onClick={() => setShapeDropdownOpen(prev => !prev)}
          >◇</button>
          {shapeDropdownOpen && (
            <div
              className="node-toolbar__shape-dropdown"
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  e.stopPropagation()
                  setShapeDropdownOpen(false)
                }
              }}
            >
              {SHAPE_OPTIONS.map(({ shape: s, label, icon }) => (
                <button
                  key={s}
                  className={`node-toolbar__shape-option${s === shape ? ' node-toolbar__shape-option--active' : ''}`}
                  aria-label={label}
                  title={label}
                  onClick={() => handleShapeSelect(s)}
                >
                  <span aria-hidden="true">{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className="node-toolbar__btn"
          aria-label="Duplicate node"
          title="Duplicate"
          onClick={() => duplicateNode(nodeId)}
        >⧉</button>

        <button
          className={`node-toolbar__btn${isLocked ? ' node-toolbar__btn--active' : ''}`}
          aria-label={isLocked ? 'Unlock node' : 'Lock node'}
          title={isLocked ? 'Unlock' : 'Lock'}
          onClick={() => toggleNodeLock(nodeId)}
        >{isLocked ? '⊠' : '⊟'}</button>

        <div className="node-toolbar__divider" aria-hidden="true" />

        <button
          className="node-toolbar__btn node-toolbar__btn--danger"
          aria-label="Delete node"
          title="Delete"
          onClick={() => removeNodes([nodeId])}
        >✕</button>
      </div>
    </RFNodeToolbar>
  )
}
