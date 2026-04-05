import React from 'react'
import { ReactFlow, Background, BackgroundVariant } from '@xyflow/react'

export default function Canvas(): React.JSX.Element {
  return (
    <div className="canvas-container">
      <ReactFlow nodes={[]} edges={[]} colorMode="dark">
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
