import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { useStore } from '../lib/store'
import { serialize } from '../lib/serializer'
import PreviewBar from './PreviewBar'
import type { Direction, MermaidTheme, CurveStyle, Look } from './PreviewBar'

mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' })
let renderIdCounter = 0

export default function PreviewPanel(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const nodes = useStore(s => s.nodes)
  const edges = useStore(s => s.edges)
  const code = useMemo(() => serialize({ nodes, edges }), [nodes, edges])

  const [direction, setDirection] = useState<Direction>('TD')
  const [theme, setTheme] = useState<MermaidTheme>('dark')
  const [curve, setCurve] = useState<CurveStyle>('basis')
  const [look, setLook] = useState<Look>('classic')
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    let cancelled = false
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme,
      look,
      flowchart: { curve },
    })
    const directedCode = code.replace(/^(flowchart|graph)\s+\w+/m, `flowchart ${direction}`)
    const id = `mermaid-svg-${++renderIdCounter}`
    mermaid.render(id, directedCode)
      .then(({ svg }) => {
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [code, direction, theme, curve, look])

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setZoom(z => {
        const delta = e.deltaY < 0 ? 0.1 : -0.1
        return Math.min(3, Math.max(0.25, parseFloat((z + delta).toFixed(2))))
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(3, parseFloat((z + 0.25).toFixed(2)))), [])
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(0.25, parseFloat((z - 0.25).toFixed(2)))), [])
  const handleZoomReset = useCallback(() => setZoom(1), [])

  const handleExport = useCallback(() => {
    const svgEl = containerRef.current?.querySelector('svg')
    if (!svgEl) return
    const blob = new Blob([svgEl.outerHTML], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'diagram.svg'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return (
    <div className="preview-panel">
      <div className="preview-panel__header">
        <span className="preview-panel__title">PREVIEW</span>
      </div>
      <div className="preview-panel__body" ref={bodyRef}>
        <div
          ref={containerRef}
          className="preview-panel__svg-container"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        />
        <PreviewBar
          direction={direction}
          theme={theme}
          curve={curve}
          look={look}
          zoom={zoom}
          onDirectionChange={setDirection}
          onThemeChange={setTheme}
          onCurveChange={setCurve}
          onLookChange={setLook}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          onExport={handleExport}
        />
      </div>
    </div>
  )
}
