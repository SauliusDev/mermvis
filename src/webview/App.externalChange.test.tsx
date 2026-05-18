import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import type { HostToWebviewMessage } from '../shared/types'
import type { Node, Edge } from '@xyflow/react'
import type { FlowNodeData, FlowEdgeData } from './lib/store'

// --- Module mocks (hoisted by Vitest before imports) ---

vi.mock('zustand')

// Mock vscode — spy on sendToHost, keep real window-event behavior for onHostMessage
vi.mock('./vscode', () => ({
  sendToHost: vi.fn(),
  onHostMessage: (handler: (msg: HostToWebviewMessage) => void) => {
    const listener = (event: MessageEvent<HostToWebviewMessage>) => handler(event.data)
    window.addEventListener('message', listener)
    return () => window.removeEventListener('message', listener)
  },
}))

// Mock heavy child components so App can render without ReactFlow
vi.mock('./components/Canvas', () => ({ default: () => null }))
vi.mock('./components/TopBar', () => ({ default: () => null }))
vi.mock('./components/PanelLayout', () => ({ default: () => null }))

// Mock auto-save hooks (would subscribe to store / set timers)
vi.mock('./lib/autoSave', () => ({
  useAutoSave: vi.fn(),
  useManualSave: vi.fn(),
}))

// Mock layout — return nodes with fixed positions so assertions are deterministic
vi.mock('./lib/layout', () => ({
  applyDagreLayout: vi.fn((nodes: Node<FlowNodeData>[]) =>
    nodes.map(n => ({ ...n, position: { x: 100, y: 200 } }))
  ),
}))

// Mock parser so each test controls exactly what nodes/edges come back
vi.mock('./lib/parser', () => ({
  parseMermaidFlowchart: vi.fn(),
}))

// --- Imports after mocks ---

import App from './App'
import { useStore } from './lib/store'
import { sendToHost } from './vscode'
import { applyDagreLayout } from './lib/layout'
import { parseMermaidFlowchart } from './lib/parser'

// --- Helpers ---

function makeFlowNode(id: string): Node<FlowNodeData> {
  return {
    id,
    position: { x: 0, y: 0 },
    data: { label: id, shape: 'rectangle' },
    type: 'flowNode',
  }
}

function dispatchHostMessage(msg: HostToWebviewMessage): void {
  window.dispatchEvent(new MessageEvent('message', { data: msg }))
}

function makeParseSuccess(nodes: Node<FlowNodeData>[], edges: Edge<FlowEdgeData>[] = []) {
  return { nodes, edges, passthroughLines: [] }
}

// --- Tests ---

describe('App.tsx — EXTERNAL_FILE_CHANGE and LOAD message handling', () => {
  let unmount: () => void

  beforeEach(() => {
    vi.mocked(parseMermaidFlowchart).mockReturnValue(makeParseSuccess([]))
    vi.mocked(applyDagreLayout).mockImplementation((nodes: Node<FlowNodeData>[]) =>
      nodes.map(n => ({ ...n, position: { x: 100, y: 200 } }))
    )

    const result = render(<App />)
    unmount = result.unmount
    vi.mocked(sendToHost).mockClear()
  })

  afterEach(() => {
    unmount()
    vi.clearAllMocks()
  })

  describe('EXTERNAL_FILE_CHANGE', () => {
    it('warns via LOG when isDirty=true and does not call importFromCode', () => {
      useStore.setState({ isDirty: true })

      dispatchHostMessage({
        type: 'EXTERNAL_FILE_CHANGE',
        payload: { content: 'flowchart TD\n  A[Test]' },
      })

      expect(vi.mocked(sendToHost)).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'LOG',
          payload: expect.objectContaining({ level: 'warn' }),
        })
      )
      expect(useStore.getState().nodes).toHaveLength(0)
    })

    it('calls importFromCode and requestFitView when isDirty=false and content parses', () => {
      const nodeA = makeFlowNode('A')
      vi.mocked(parseMermaidFlowchart).mockReturnValue(makeParseSuccess([nodeA]))

      dispatchHostMessage({
        type: 'EXTERNAL_FILE_CHANGE',
        payload: { content: 'flowchart TD\n  A[Test]' },
      })

      expect(useStore.getState().nodes.length).toBeGreaterThan(0)
      expect(useStore.getState().fitViewRequested).toBe(true)
      expect(useStore.getState().isDirty).toBe(false)
    })

    it('calls LOG with error and does not importFromCode when parse fails', () => {
      vi.mocked(parseMermaidFlowchart).mockReturnValue({ error: 'unexpected token' } as never)

      dispatchHostMessage({
        type: 'EXTERNAL_FILE_CHANGE',
        payload: { content: 'not valid mermaid' },
      })

      expect(vi.mocked(sendToHost)).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'LOG',
          payload: expect.objectContaining({ level: 'error' }),
        })
      )
      expect(useStore.getState().nodes).toHaveLength(0)
    })
  })

  describe('LOAD', () => {
    it('applies Dagre layout when layoutJson is null (no sidecar)', () => {
      const nodeA = makeFlowNode('A')
      vi.mocked(parseMermaidFlowchart).mockReturnValue(makeParseSuccess([nodeA]))

      act(() => {
        dispatchHostMessage({
          type: 'LOAD',
          payload: { content: 'flowchart TD\n  A[Test]', layoutJson: null },
        })
      })

      expect(vi.mocked(applyDagreLayout)).toHaveBeenCalled()
      const node = useStore.getState().nodes[0]
      expect(node.position).toEqual({ x: 100, y: 200 })
    })

    it('calls requestFitView after Dagre layout when layoutJson is null', () => {
      const nodeA = makeFlowNode('A')
      vi.mocked(parseMermaidFlowchart).mockReturnValue(makeParseSuccess([nodeA]))

      act(() => {
        dispatchHostMessage({
          type: 'LOAD',
          payload: { content: 'flowchart TD\n  A[Test]', layoutJson: null },
        })
      })

      expect(useStore.getState().fitViewRequested).toBe(true)
    })

    it('uses sidecar positions for known nodes, Dagre for new nodes when layoutJson present', () => {
      const nodeA = makeFlowNode('A')
      const nodeB = makeFlowNode('B')
      vi.mocked(parseMermaidFlowchart).mockReturnValue(makeParseSuccess([nodeA, nodeB]))

      const layoutJson = JSON.stringify({
        version: 1,
        nodes: { A: { x: 50, y: 60 } },
        viewport: { x: 0, y: 0, zoom: 1 },
      })

      act(() => {
        dispatchHostMessage({
          type: 'LOAD',
          payload: { content: 'flowchart TD\n  A[Test]\n  B[Test2]', layoutJson },
        })
      })

      const nodes = useStore.getState().nodes
      const storedA = nodes.find(n => n.id === 'A')
      const storedB = nodes.find(n => n.id === 'B')

      expect(storedA?.position).toEqual({ x: 50, y: 60 })
      expect(storedB?.position).toEqual({ x: 100, y: 200 })
    })
  })

  describe('SAVE_RESULT', () => {
    it('calls clearDirty on success=true', () => {
      useStore.setState({ isDirty: true })

      dispatchHostMessage({
        type: 'SAVE_RESULT',
        payload: { success: true },
      })

      expect(useStore.getState().isDirty).toBe(false)
    })

    it('does not call clearDirty on success=false', () => {
      useStore.setState({ isDirty: true })

      dispatchHostMessage({
        type: 'SAVE_RESULT',
        payload: { success: false, error: 'disk full' },
      })

      expect(useStore.getState().isDirty).toBe(true)
    })
  })
})
