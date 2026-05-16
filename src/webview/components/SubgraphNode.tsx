import React, { useState, useCallback, useRef } from 'react'
import { NodeResizer, Handle, Position } from '@xyflow/react'
import type { NodeProps, Node, ResizeParams } from '@xyflow/react'
import type { FlowNodeData } from '@/lib/store'
import { useStore } from '@/lib/store'

export default function SubgraphNode({
  id,
  data,
  selected,
}: NodeProps<Node<FlowNodeData>>): React.JSX.Element {
  const { label } = data
  const resizeNode = useStore(s => s.resizeNode)
  const updateNodeLabel = useStore(s => s.updateNodeLabel)
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const isEscapingRef = useRef(false)

  const handleResizeEnd = useCallback((_: unknown, params: ResizeParams) => {
    resizeNode(id, { width: params.width, height: params.height }, { x: params.x, y: params.y })
  }, [id, resizeNode])

  function handleDoubleClick(e: React.MouseEvent): void {
    e.stopPropagation()
    isEscapingRef.current = false
    setEditingLabel(label)
  }

  function commitEdit(): void {
    if (editingLabel !== null && !isEscapingRef.current) {
      updateNodeLabel(id, editingLabel)
    }
    isEscapingRef.current = false
    setEditingLabel(null)
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    e.stopPropagation()
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') {
      isEscapingRef.current = true
      setEditingLabel(null)
    }
  }

  return (
    <div className={['subgraph-node', selected ? 'subgraph-node--selected' : ''].filter(Boolean).join(' ')}>
      <NodeResizer isVisible={selected} minWidth={120} minHeight={80} onResizeEnd={handleResizeEnd} />
      <div className="subgraph-node__header nodrag">
        {editingLabel !== null ? (
          <input
            className="subgraph-node__label-input"
            value={editingLabel}
            onChange={e => setEditingLabel(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={commitEdit}
            autoFocus
          />
        ) : (
          <span className="subgraph-node__label" onDoubleClick={handleDoubleClick}>{label}</span>
        )}
      </div>
      <div className="subgraph-node__body" />
      <Handle type="source" position={Position.Top} id={`${id}-top`} className="flow-node__handle" />
      <Handle type="source" position={Position.Right} id={`${id}-right`} className="flow-node__handle" />
      <Handle type="source" position={Position.Bottom} id={`${id}-bottom`} className="flow-node__handle" />
      <Handle type="source" position={Position.Left} id={`${id}-left`} className="flow-node__handle" />
    </div>
  )
}
