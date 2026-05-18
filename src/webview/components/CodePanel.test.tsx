import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'

// All vi.mock() MUST be at top level — Vitest hoists them
vi.mock('@codemirror/view', () => {
  const dispatch = vi.fn()
  const destroy = vi.fn()
  const MockEditorView = vi.fn().mockImplementation(() => ({
    dispatch,
    destroy,
    state: {
      doc: { toString: () => 'graph TD\n  A[Test]' },
      selection: { main: { head: 0 } },
    },
  }))
  MockEditorView.editable = { of: vi.fn(() => []) }
  MockEditorView.updateListener = { of: vi.fn(() => []) }
  MockEditorView.theme = vi.fn(() => [])
  return {
    EditorView: MockEditorView,
    lineNumbers: vi.fn(() => []),
    highlightActiveLine: vi.fn(() => []),
    drawSelection: vi.fn(() => []),
  }
})

vi.mock('@codemirror/state', () => ({
  EditorState: {
    create: vi.fn().mockReturnValue({}),
  },
}))

vi.mock('@codemirror/language', () => ({
  StreamLanguage: { define: vi.fn(() => []) },
  HighlightStyle: { define: vi.fn(() => []) },
  syntaxHighlighting: vi.fn(() => []),
}))

vi.mock('@lezer/highlight', () => ({
  tags: {
    comment: 'comment',
    keyword: 'keyword',
    string: 'string',
    variableName: 'variableName',
    operator: 'operator',
    function: 'function',
  },
}))

vi.mock('../lib/store', () => ({
  useStore: vi.fn((selector: (s: unknown) => unknown) => {
    const state = { nodes: [], edges: [] }
    return selector(state)
  }),
}))

vi.mock('../lib/serializer', () => ({
  serialize: vi.fn().mockReturnValue('graph TD\n  A[Test]'),
}))

import CodePanel from './CodePanel'

describe('CodePanel', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders panel header with "CODE" title', () => {
    render(<CodePanel />)
    expect(screen.getByText('CODE')).toBeDefined()
  })

  it('renders status bar with initial "Ln 1, Col 1"', () => {
    render(<CodePanel />)
    expect(screen.getByText('Ln 1, Col 1')).toBeDefined()
  })

  it('renders "Mermaid" language indicator in status bar', () => {
    render(<CodePanel />)
    expect(screen.getByText('Mermaid')).toBeDefined()
  })

  it('renders a container div for CodeMirror (code-panel__body)', () => {
    const { container } = render(<CodePanel />)
    const body = container.querySelector('.code-panel__body')
    expect(body).not.toBeNull()
  })

  it('mounts EditorView on the container ref on first render', async () => {
    const { EditorView } = await import('@codemirror/view')
    render(<CodePanel />)
    expect(vi.mocked(EditorView)).toHaveBeenCalledTimes(1)
  })

  it('destroys EditorView on unmount', async () => {
    const { EditorView } = await import('@codemirror/view')
    const destroy = vi.fn()
    vi.mocked(EditorView).mockImplementationOnce(() => ({
      dispatch: vi.fn(),
      destroy,
      state: {
        doc: { toString: () => 'graph TD\n  A[Test]' },
        selection: { main: { head: 0 } },
      },
    }) as never)

    const { unmount } = render(<CodePanel />)
    unmount()
    expect(destroy).toHaveBeenCalledTimes(1)
  })

  it('dispatches content update when serialized code changes', async () => {
    const { EditorView } = await import('@codemirror/view')
    const { serialize } = await import('../lib/serializer')

    const mockDispatch = vi.fn()
    vi.mocked(EditorView).mockImplementationOnce(() => ({
      dispatch: mockDispatch,
      destroy: vi.fn(),
      state: { doc: { toString: () => 'old content' }, selection: { main: { head: 0 } } },
    }) as never)
    vi.mocked(serialize).mockReturnValueOnce('new content')

    render(<CodePanel />)
    expect(mockDispatch).toHaveBeenCalledWith({
      changes: { from: 0, to: 'old content'.length, insert: 'new content' },
    })
  })

  it('does not dispatch when content is unchanged', async () => {
    const { EditorView } = await import('@codemirror/view')
    const { serialize } = await import('../lib/serializer')

    const mockDispatch = vi.fn()
    const sameContent = 'graph TD\n  A[Test]'
    vi.mocked(EditorView).mockImplementationOnce(() => ({
      dispatch: mockDispatch,
      destroy: vi.fn(),
      state: { doc: { toString: () => sameContent }, selection: { main: { head: 0 } } },
    }) as never)
    vi.mocked(serialize).mockReturnValue(sameContent)

    render(<CodePanel />)
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('EditorView.editable.of(false) is included in extensions (read-only)', async () => {
    const { EditorView } = await import('@codemirror/view')
    render(<CodePanel />)
    expect(EditorView.editable.of).toHaveBeenCalledWith(false)
  })

  it('CodePanel is a default export (required for React.lazy)', () => {
    expect(typeof CodePanel).toBe('function')
    expect(CodePanel.name).toBe('CodePanel')
  })

  it('renders the full code-panel structure with all sections', () => {
    const { container } = render(<CodePanel />)
    expect(container.querySelector('.code-panel')).not.toBeNull()
    expect(container.querySelector('.code-panel__header')).not.toBeNull()
    expect(container.querySelector('.code-panel__body')).not.toBeNull()
    expect(container.querySelector('.code-panel__statusbar')).not.toBeNull()
  })
})
