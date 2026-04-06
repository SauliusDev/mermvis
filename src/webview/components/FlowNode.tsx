import React from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import type { FlowNodeData, NodeShape } from '@/lib/store'

// ── SVG constants ─────────────────────────────────────────────────────────────

const FILL   = 'var(--mv-node-fill)'
const STROKE = 'var(--mv-node-stroke)'
const SW     = 1.5

// ── Shape renderers ───────────────────────────────────────────────────────────

type ShapeRenderer = () => React.JSX.Element

function renderRectangle(): React.JSX.Element {
  return (
    <svg className="flow-node__svg" viewBox="0 0 120 40" preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg">
      <rect x={SW / 2} y={SW / 2} width={120 - SW} height={40 - SW}
        fill={FILL} stroke={STROKE} strokeWidth={SW} />
    </svg>
  )
}

function renderRounded(): React.JSX.Element {
  return (
    <svg className="flow-node__svg" viewBox="0 0 120 40" preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg">
      <rect x={SW / 2} y={SW / 2} width={120 - SW} height={40 - SW}
        rx={8} ry={8} fill={FILL} stroke={STROKE} strokeWidth={SW} />
    </svg>
  )
}

function renderPill(): React.JSX.Element {
  return (
    <svg className="flow-node__svg" viewBox="0 0 120 40" preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg">
      <rect x={SW / 2} y={SW / 2} width={120 - SW} height={40 - SW}
        rx={20} ry={20} fill={FILL} stroke={STROKE} strokeWidth={SW} />
    </svg>
  )
}

function renderDiamond(): React.JSX.Element {
  const cx = 60, cy = 60, w = 116, h = 116
  const points = `${cx},${SW} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${cx - w / 2},${cy}`
  return (
    <svg className="flow-node__svg" viewBox="0 0 120 120"
      preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <polygon points={points} fill={FILL} stroke={STROKE} strokeWidth={SW} />
    </svg>
  )
}

function renderCircle(): React.JSX.Element {
  return (
    <svg className="flow-node__svg" viewBox="0 0 80 80"
      preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <circle cx={40} cy={40} r={40 - SW}
        fill={FILL} stroke={STROKE} strokeWidth={SW} />
    </svg>
  )
}

function renderHexagon(): React.JSX.Element {
  const W = 120, H = 50
  const pad = SW / 2
  const inset = 20
  const points = [
    `${inset},${pad}`,
    `${W - inset},${pad}`,
    `${W - pad},${H / 2}`,
    `${W - inset},${H - pad}`,
    `${inset},${H - pad}`,
    `${pad},${H / 2}`,
  ].join(' ')
  return (
    <svg className="flow-node__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg">
      <polygon points={points} fill={FILL} stroke={STROKE} strokeWidth={SW} />
    </svg>
  )
}

function renderCylinder(): React.JSX.Element {
  const W = 120, H = 60, ry = 8
  const pad = SW / 2
  return (
    <svg className="flow-node__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg">
      <rect x={pad} y={ry} width={W - SW} height={H - ry * 2}
        fill={FILL} stroke={STROKE} strokeWidth={SW} />
      <ellipse cx={W / 2} cy={ry} rx={W / 2 - pad} ry={ry}
        fill={FILL} stroke={STROKE} strokeWidth={SW} />
      <ellipse cx={W / 2} cy={H - ry} rx={W / 2 - pad} ry={ry}
        fill={FILL} stroke={STROKE} strokeWidth={SW} />
    </svg>
  )
}

// ── SVG_RENDERERS map ─────────────────────────────────────────────────────────
// Does not include 'subgraph' — SubgraphNode is a separate component (Story 4.1).
// Unknown shapes fall back to rectangle via ?? operator in FlowNode.

const SVG_RENDERERS: Partial<Record<NodeShape, ShapeRenderer>> = {
  rectangle: renderRectangle,
  rounded:   renderRounded,
  pill:      renderPill,
  diamond:   renderDiamond,
  circle:    renderCircle,
  hexagon:   renderHexagon,
  cylinder:  renderCylinder,
}

// ── FlowNode component ────────────────────────────────────────────────────────

export default function FlowNode({
  id,
  data,
  selected,
}: NodeProps<Node<FlowNodeData>>): React.JSX.Element {
  const { label, shape } = data
  const renderShape = SVG_RENDERERS[shape] ?? renderRectangle

  return (
    <div
      className={[
        'flow-node',
        `flow-node--${shape}`,
        selected ? 'flow-node--selected' : '',
      ].filter(Boolean).join(' ')}
    >
      {renderShape()}
      <div className="flow-node__label">{label}</div>
      <Handle
        type="source"
        position={Position.Top}
        id={`${id}-top`}
        className="flow-node__handle"
      />
      <Handle
        type="source"
        position={Position.Right}
        id={`${id}-right`}
        className="flow-node__handle"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id={`${id}-bottom`}
        className="flow-node__handle"
      />
      <Handle
        type="source"
        position={Position.Left}
        id={`${id}-left`}
        className="flow-node__handle"
      />
    </div>
  )
}
