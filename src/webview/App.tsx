import React, { useEffect } from 'react'
import { sendToHost, onHostMessage } from './vscode'
import type { HostToWebviewMessage } from '../shared/types'
import Canvas from './components/Canvas'
import '@xyflow/react/dist/style.css'
import './styles/variables.css'
import './styles/base.css'
import './styles/themes/dark.css'
import './styles/components/node.css'
import './styles/components/edge.css'
import './styles/components/sidebar.css'
import './styles/components/subgraph.css'
import './styles/components/palette.css'
import './styles/components/node-toolbar.css'

export default function App(): React.JSX.Element {
  useEffect(() => {
    sendToHost({ type: 'READY', payload: {} })

    const cleanup = onHostMessage((msg: HostToWebviewMessage) => {
      switch (msg.type) {
        case 'LOAD':
          // Story 2.7 — call parseMermaidFlowchart(msg.payload.content) and dispatch nodes/edges via a future setCanvasState() action
          break
        case 'THEME_CHANGED':
          // Story 12.3 — adaptive theme activation
          break
        case 'EXTERNAL_FILE_CHANGE':
          // Story 6 — bidirectional sync conflict resolution
          break
        case 'SAVE_RESULT':
          // Story 8 — save confirmation feedback
          break
        default: {
          const _exhaustive: never = msg
          break
        }
      }
    })

    return cleanup
  }, [])

  return <Canvas />
}
