import React, { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { useShallow } from 'zustand/react/shallow'
import type { NodeShape } from '@/lib/store'

const SHAPE_LABELS: Record<NodeShape, string> = {
  rectangle: 'Rectangle',
  rounded: 'Rounded',
  pill: 'Pill',
  diamond: 'Diamond',
  circle: 'Circle',
  hexagon: 'Hexagon',
  cylinder: 'Cylinder',
  subgraph: 'Subgraph',
}

export default function Inspector(): React.JSX.Element {
  const inspectorOpen = useStore(s => s.inspectorOpen)
  const nodes = useStore(s => s.nodes)
  const edges = useStore(s => s.edges)

  const { toggleInspector, updateNodeLabel, moveNodes } = useStore(
    useShallow(s => ({
      toggleInspector: s.toggleInspector,
      updateNodeLabel: s.updateNodeLabel,
      moveNodes: s.moveNodes,
    }))
  )

  const selectedNode = nodes.find(n => n.selected && !n.data.isSubgraph) ?? null
  // Patch: exclude subgraphs from selectedCount to match selectedNode derivation
  const selectedCount = nodes.filter(n => n.selected && !n.data.isSubgraph).length

  // Patch: include edgeId in connection objects for stable list keys
  const connections = selectedNode
    ? [
        ...edges
          .filter(e => e.source === selectedNode.id)
          .map(e => ({
            direction: '→' as const,
            edgeId: e.id,
            label: nodes.find(n => n.id === e.target)?.data.label ?? e.target,
          })),
        ...edges
          .filter(e => e.target === selectedNode.id)
          .map(e => ({
            direction: '←' as const,
            edgeId: e.id,
            label: nodes.find(n => n.id === e.source)?.data.label ?? e.source,
          })),
      ]
    : []

  const [labelValue, setLabelValue] = useState(selectedNode?.data.label ?? '')
  const [xValue, setXValue] = useState(
    selectedNode ? String(Math.round(selectedNode.position.x)) : ''
  )
  const [yValue, setYValue] = useState(
    selectedNode ? String(Math.round(selectedNode.position.y)) : ''
  )

  useEffect(() => {
    if (!selectedNode) return
    setLabelValue(selectedNode.data.label)
    setXValue(String(Math.round(selectedNode.position.x)))
    setYValue(String(Math.round(selectedNode.position.y)))
  }, [selectedNode?.id])

  useEffect(() => {
    if (!inspectorOpen) return
    // Patch: do not close inspector when Escape is pressed inside an input
    function onKeyDown(e: KeyboardEvent): void {
      const activeTag = (document.activeElement?.tagName ?? '').toUpperCase()
      if (e.key === 'Escape' && activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
        toggleInspector()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [inspectorOpen, toggleInspector])

  function handleLabelBlur(): void {
    if (!selectedNode || labelValue === selectedNode.data.label) return
    updateNodeLabel(selectedNode.id, labelValue)
  }

  function handleLabelKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key !== 'Enter') return
    if (!selectedNode || labelValue === selectedNode.data.label) return
    updateNodeLabel(selectedNode.id, labelValue)
  }

  function handleXKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key !== 'Enter') return
    if (!selectedNode) return
    const x = parseFloat(xValue)
    if (isNaN(x)) return
    if (Math.abs(x - selectedNode.position.x) < 0.5) return
    moveNodes([{ id: selectedNode.id, position: { x, y: selectedNode.position.y } }])
  }

  function handleXBlur(): void {
    if (!selectedNode) return
    const x = parseFloat(xValue)
    // Patch: reset field to current position when input is not a valid number
    if (isNaN(x)) {
      setXValue(String(Math.round(selectedNode.position.x)))
      return
    }
    if (Math.abs(x - selectedNode.position.x) < 0.5) return
    moveNodes([{ id: selectedNode.id, position: { x, y: selectedNode.position.y } }])
  }

  function handleYKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key !== 'Enter') return
    if (!selectedNode) return
    const y = parseFloat(yValue)
    if (isNaN(y)) return
    if (Math.abs(y - selectedNode.position.y) < 0.5) return
    moveNodes([{ id: selectedNode.id, position: { x: selectedNode.position.x, y } }])
  }

  function handleYBlur(): void {
    if (!selectedNode) return
    const y = parseFloat(yValue)
    // Patch: reset field to current position when input is not a valid number
    if (isNaN(y)) {
      setYValue(String(Math.round(selectedNode.position.y)))
      return
    }
    if (Math.abs(y - selectedNode.position.y) < 0.5) return
    moveNodes([{ id: selectedNode.id, position: { x: selectedNode.position.x, y } }])
  }

  return (
    // Patch: add id so aria-controls on the sidebar toggle button can reference this panel
    <aside
      id="inspector-panel"
      className={`inspector${inspectorOpen ? ' inspector--open' : ''}`}
      aria-label="Inspector Panel"
      aria-hidden={!inspectorOpen}
    >
      <div className="inspector__header">
        <span className="inspector__title">Inspector</span>
        {/* Patch: remove from tab order when panel is hidden (aria-hidden subtree must not be focusable) */}
        <button
          className="inspector__close"
          aria-label="Close inspector"
          tabIndex={!inspectorOpen ? -1 : undefined}
          onClick={toggleInspector}
        >
          ×
        </button>
      </div>
      {inspectorOpen && selectedCount > 1 && (
        <div className="inspector__content">
          <div className="inspector__empty">Multiple nodes selected</div>
        </div>
      )}
      {inspectorOpen && selectedCount <= 1 && !selectedNode && (
        <div className="inspector__content">
          <div className="inspector__empty">Select a node to inspect</div>
        </div>
      )}
      {inspectorOpen && selectedNode && (
        <div className="inspector__content">
          <div className="inspector__section">
            <div className="inspector__section-title">Node Properties</div>
            {/* Patch: associate labels with inputs via htmlFor/id for screen readers */}
            <div className="inspector__field">
              <label className="inspector__label" htmlFor="inspector-id-field">ID</label>
              <input
                id="inspector-id-field"
                className="inspector__input inspector__input--readonly"
                value={selectedNode.id}
                readOnly
              />
            </div>
            <div className="inspector__field">
              <label className="inspector__label" htmlFor="inspector-label-field">Label</label>
              <input
                id="inspector-label-field"
                className="inspector__input"
                value={labelValue}
                onChange={e => setLabelValue(e.target.value)}
                onBlur={handleLabelBlur}
                onKeyDown={handleLabelKeyDown}
              />
            </div>
            <div className="inspector__field">
              <label className="inspector__label" htmlFor="inspector-shape-field">Shape</label>
              <input
                id="inspector-shape-field"
                className="inspector__input inspector__input--readonly"
                value={SHAPE_LABELS[selectedNode.data.shape]}
                readOnly
              />
            </div>
          </div>
          <div className="inspector__section">
            <div className="inspector__section-title">Position</div>
            <div className="inspector__row">
              <div className="inspector__field">
                <label className="inspector__label" htmlFor="inspector-x-field">X</label>
                <input
                  id="inspector-x-field"
                  className="inspector__input"
                  type="number"
                  value={xValue}
                  onChange={e => setXValue(e.target.value)}
                  onKeyDown={handleXKeyDown}
                  onBlur={handleXBlur}
                />
              </div>
              <div className="inspector__field">
                <label className="inspector__label" htmlFor="inspector-y-field">Y</label>
                <input
                  id="inspector-y-field"
                  className="inspector__input"
                  type="number"
                  value={yValue}
                  onChange={e => setYValue(e.target.value)}
                  onKeyDown={handleYKeyDown}
                  onBlur={handleYBlur}
                />
              </div>
            </div>
          </div>
          <div className="inspector__section">
            <div className="inspector__section-title">Connections</div>
            {connections.length === 0 ? (
              <div className="inspector__no-connections">No connections</div>
            ) : (
              <ul className="inspector__connection-list">
                {/* Patch: use direction+edgeId as stable key instead of array index */}
                {connections.map(conn => (
                  <li key={`${conn.direction}-${conn.edgeId}`} className="inspector__connection-item">
                    <span className="inspector__connection-dir">{conn.direction}</span>
                    <span>{conn.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
