import React from 'react'
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
  const style = data?.style ?? 'arrow'

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const markerId = `mv-arrow-${id}`
  const hasMarker = style !== 'open'

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
      {selected && (
        <EdgeLabelRenderer>
          <div
            className="flow-edge__toolbar nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, calc(-50% - 20px)) translate(${labelX}px,${labelY}px)`,
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
