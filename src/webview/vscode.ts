import type { WebviewToHostMessage, HostToWebviewMessage } from '../shared/types'

// acquireVsCodeApi() must be called exactly once per webview lifetime
const vscodeApi = acquireVsCodeApi()

export function sendToHost(msg: WebviewToHostMessage): void {
  vscodeApi.postMessage(msg)
}

export function onHostMessage(handler: (msg: HostToWebviewMessage) => void): () => void {
  const listener = (event: MessageEvent<HostToWebviewMessage>) => handler(event.data)
  window.addEventListener('message', listener)
  return () => window.removeEventListener('message', listener)
}
