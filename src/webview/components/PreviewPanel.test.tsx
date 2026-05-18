import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// All vi.mock() MUST be at top level — Vitest hoists them
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg><g>test</g></svg>' }),
  },
}))

vi.mock('../lib/store', () => ({
  useStore: vi.fn((selector: (s: unknown) => unknown) => {
    const state = {
      nodes: [{ id: 'A', type: 'flowNode', position: { x: 0, y: 0 }, data: { label: 'A', shape: 'rectangle' } }],
      edges: [],
    }
    return selector(state)
  }),
}))

vi.mock('../lib/serializer', () => ({
  serialize: vi.fn(() => 'flowchart TD\n  A[Test]'),
}))

import mermaid from 'mermaid'
import PreviewPanel from './PreviewPanel'

describe('PreviewPanel', () => {
  beforeEach(() => {
    vi.mocked(mermaid).render = vi.fn().mockResolvedValue({ svg: '<svg><g>test</g></svg>' })
  })

  afterEach(() => {
    vi.mocked(mermaid).render.mockReset()
  })

  it('renders PREVIEW header', () => {
    render(<PreviewPanel />)
    expect(screen.getByText('PREVIEW')).toBeDefined()
  })

  it('calls mermaid.initialize at module load', () => {
    // initialize is called at module scope when PreviewPanel.tsx is imported —
    // check the recorded calls (not cleared because we only reset render in afterEach)
    expect(vi.mocked(mermaid).initialize).toHaveBeenCalledWith(
      expect.objectContaining({ startOnLoad: false })
    )
  })

  it('calls mermaid.render on mount with serialized code', async () => {
    await act(async () => {
      render(<PreviewPanel />)
    })
    expect(vi.mocked(mermaid).render).toHaveBeenCalledWith(
      expect.stringMatching(/^mermaid-svg-/),
      'flowchart TD\n  A[Test]'
    )
  })

  it('updates SVG container innerHTML on successful render', async () => {
    vi.mocked(mermaid).render = vi.fn().mockResolvedValue({ svg: '<svg id="test">test</svg>' })
    let container!: HTMLElement
    await act(async () => {
      const result = render(<PreviewPanel />)
      container = result.container
    })
    const svgContainer = container.querySelector('.preview-panel__svg-container')
    expect(svgContainer?.innerHTML).toContain('<svg')
  })

  it('does not crash on mermaid.render rejection', async () => {
    vi.mocked(mermaid).render = vi.fn().mockRejectedValue(new Error('parse error'))
    await expect(
      act(async () => {
        render(<PreviewPanel />)
      })
    ).resolves.not.toThrow()
  })

  it('re-renders when code changes (nodes update)', async () => {
    const { useStore } = await import('../lib/store')
    const { serialize } = await import('../lib/serializer')

    vi.mocked(serialize).mockReturnValue('flowchart TD\n  A[Test]')
    vi.mocked(useStore).mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ nodes: [{ id: 'A', type: 'flowNode', position: { x: 0, y: 0 }, data: { label: 'A', shape: 'rectangle' } }], edges: [] })
    )

    let rerender!: ReturnType<typeof render>['rerender']
    await act(async () => {
      const result = render(<PreviewPanel />)
      rerender = result.rerender
    })

    // Simulate store nodes change
    vi.mocked(serialize).mockReturnValue('flowchart TD\n  B[Updated]')
    vi.mocked(useStore).mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ nodes: [{ id: 'B', type: 'flowNode', position: { x: 100, y: 0 }, data: { label: 'B', shape: 'rectangle' } }], edges: [] })
    )

    await act(async () => {
      rerender(<PreviewPanel />)
    })

    expect(vi.mocked(mermaid).render).toHaveBeenCalledTimes(2)
  })
})
