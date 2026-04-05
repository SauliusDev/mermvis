import React, { useEffect, useState } from 'react'
import { sendToHost, onHostMessage } from './vscode'
import type { HostToWebviewMessage } from '../shared/types'

export default function App(): React.JSX.Element {
  const [mmdContent, setMmdContent] = useState<string | null>(null)

  useEffect(() => {
    sendToHost({ type: 'READY', payload: {} })

    const cleanup = onHostMessage((msg: HostToWebviewMessage) => {
      switch (msg.type) {
        case 'LOAD':
          setMmdContent(msg.payload.content)
          break
        case 'THEME_CHANGED':
          // Story 12 — no-op
          break
        case 'EXTERNAL_FILE_CHANGE':
          setMmdContent(msg.payload.content)
          break
        case 'SAVE_RESULT':
          // Story 8 — no-op
          break
        default: {
          const _exhaustive: never = msg
          break
        }
      }
    })

    return cleanup
  }, [])

  return <div>Mermvis{mmdContent !== null ? ` (${mmdContent.length} chars)` : ''}</div>
}
