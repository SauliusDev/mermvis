import React, { useState, useCallback, useRef } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import type { FlowEdgeData, EdgeStyle } from '@/lib/store'
import { useStore } from '@/lib/store'

const STYLE_META: Record<EdgeStyle, { label: string; title: string }> = {
  arrow:  { label: '→',  title: 'Solid arrow'  },
  dotted: { label: '⇢',  title: 'Dotted arrow' },
  thick:  { label: '⇒',  title: 'Thick arrow'  },
  open:   { label: '—',  title: 'Open link'    },
}

export default function FlowEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data, selected,
}: EdgeProps<FlowEdgeData>): React.JSX.Element {
  const setEdgeStyle = useStore(s => s.setEdgeStyle)
  const updateEdgeLabel = useStore(s => s.updateEdgeLabel)
  const style = data?.style ?? 'arrow'
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const isEscapingRef = useRef(false)

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const markerId = `mv-arrow-${id}`
  const hasMarker = style !== 'open'

  const commitEdit = useCallback(() => {
    if (!isEscapingRef.current) {
      updateEdgeLabel(id, editValue)
    }
    isEscapingRef.current = false
    setEditing(false)
  }, [id, editValue, updateEdgeLabel])

  const handleLabelDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    isEscapingRef.current = false
    setEditValue(data?.label ?? '')
    setEditing(true)
  }, [data?.label])

  return (
    <>
      {hasMarker && (
        <defs>
          <marker
            id={markerId}
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              className={
                selected
                  ? 'flow-edge__arrowhead flow-edge__arrowhead--selected'
                  : 'flow-edge__arrowhead'
              }
            />
          </marker>
        </defs>
      )}
      <BaseEdge
        id={id}
        path={edgePath}
        className={[
          'flow-edge__path',
          `flow-edge__path--${style}`,
          selected ? 'flow-edge__path--selected' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        markerEnd={hasMarker ? `url(#${markerId})` : undefined}
      />

      {/* Always-visible label area — not inside {selected && ...} */}
      <EdgeLabelRenderer>
        <div
          className="flow-edge__label-area nodrag nopan"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          onDoubleClick={handleLabelDoubleClick}
        >
          {editing ? (
            <input
              className="flow-edge__label-input"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
                if (e.key === 'Escape') { e.stopPropagation(); isEscapingRef.current = true; setEditing(false) }
              }}
              onBlur={commitEdit}
              autoFocus
            />
          ) : (
            <span
              className={
                data?.label
                  ? 'flow-edge__label'
                  : selected
                  ? 'flow-edge__label-affordance'
                  : undefined
              }
            >
              {data?.label ?? (selected ? '✎' : '')}
            </span>
          )}
        </div>
      </EdgeLabelRenderer>

      {/* Style toolbar — only when selected, positioned above the label */}
      {selected && (
        <EdgeLabelRenderer>
          <div
            className="flow-edge__toolbar nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, calc(-50% - 28px)) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
          >
            {(Object.keys(STYLE_META) as EdgeStyle[]).map(s => (
              <button
                key={s}
                className={[
                  'flow-edge__style-btn',
                  s === style ? 'flow-edge__style-btn--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                title={STYLE_META[s].title}
                onClick={() => setEdgeStyle(id, s)}
              >
                {STYLE_META[s].label}
              </button>
            ))}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
