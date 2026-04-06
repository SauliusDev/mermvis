import React from 'react'
import { ReactFlow, Background, BackgroundVariant } from '@xyflow/react'
import { useStore } from '@/lib/store'

export default function Canvas(): React.JSX.Element {
  const nodes = useStore(s => s.nodes)
  const edges = useStore(s => s.edges)

  return (
    <div className="canvas-container">
      <ReactFlow nodes={nodes} edges={edges} colorMode="dark">
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255,255,255,0.055)"
        />
      </ReactFlow>
    </div>
  )
}
