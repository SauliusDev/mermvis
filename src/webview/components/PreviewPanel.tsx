import React, { useEffect, useMemo, useRef } from 'react'
import mermaid from 'mermaid'
import { useStore } from '../lib/store'
import { serialize } from '../lib/serializer'

mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' })
let renderIdCounter = 0

export default function PreviewPanel(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const nodes = useStore(s => s.nodes)
  const edges = useStore(s => s.edges)
  const code = useMemo(() => serialize({ nodes, edges }), [nodes, edges])

  useEffect(() => {
    let cancelled = false
    const id = `mermaid-svg-${++renderIdCounter}`
    mermaid.render(id, code)
      .then(({ svg }) => {
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      })
      .catch(() => {
        // keep previous render intact on error
      })
    return () => { cancelled = true }
  }, [code])

  return (
    <div className="preview-panel">
      <div className="preview-panel__header">
        <span className="preview-panel__title">PREVIEW</span>
      </div>
      <div className="preview-panel__body">
        <div ref={containerRef} className="preview-panel__svg-container" />
      </div>
    </div>
  )
}
