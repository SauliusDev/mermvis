import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// vi.mock() MUST be at module top level — hoisted by Vitest before imports.
vi.mock('zustand')

const { mockSendToHost, mockSerialize, mockExportCanvasToJson } = vi.hoisted(() => ({
  mockSendToHost: vi.fn(),
  mockSerialize: vi.fn(() => 'flowchart LR\n  A-->B'),
  mockExportCanvasToJson: vi.fn(() => '{"version":1,"nodes":[],"edges":[],"viewport":{"x":0,"y":0,"zoom":1}}'),
}))

vi.mock('@/vscode', () => ({
  sendToHost: mockSendToHost,
}))

vi.mock('@/lib/serializer', () => ({
  serialize: mockSerialize,
}))

vi.mock('@/lib/export', () => ({
  exportCanvasToJson: mockExportCanvasToJson,
}))

import { useStore } from '@/lib/store'
import TopBar from './TopBar'
import type { PanelVisible } from './TopBar'

const mockOnTogglePanel = vi.fn()

const defaultProps = {
  panelVisible: { canvas: true, code: false, preview: false } as PanelVisible,
  onTogglePanel: mockOnTogglePanel,
}

beforeEach(() => {
  useStore.setState({ filename: 'test-diagram.mmd' })
  mockOnTogglePanel.mockClear()
  mockSendToHost.mockClear()
  mockSerialize.mockClear()
  mockSerialize.mockReturnValue('flowchart LR\n  A-->B')
  mockExportCanvasToJson.mockClear()
})

describe('TopBar', () => {
  it('renders logo, brand name "mermvis", and filename from store', () => {
    render(<TopBar {...defaultProps} />)
    expect(screen.getByText('mermvis')).not.toBeNull()
    expect(screen.getByText('test-diagram.mmd')).not.toBeNull()
  })

  it('filename uses mono font class (topbar__filename)', () => {
    const { container } = render(<TopBar {...defaultProps} />)
    const filenameEl = container.querySelector('.topbar__filename')
    expect(filenameEl).not.toBeNull()
    expect(filenameEl?.textContent).toBe('test-diagram.mmd')
  })

  it('renders Canvas, Code, and Preview tabs', () => {
    render(<TopBar {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Canvas' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Code' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Preview' })).not.toBeNull()
  })

  it('tabs are wrapped in a nav element', () => {
    const { container } = render(<TopBar {...defaultProps} />)
    const nav = container.querySelector('nav.topbar__tabs')
    expect(nav).not.toBeNull()
  })

  it('Canvas tab has active class when canvas is visible', () => {
    const { container } = render(<TopBar {...defaultProps} />)
    const buttons = container.querySelectorAll('.topbar__tab')
    const canvasBtn = Array.from(buttons).find(b => b.textContent === 'Canvas')
    expect(canvasBtn?.classList.contains('topbar__tab--active')).toBe(true)
  })

  it('Code tab does not have active class when code is not visible', () => {
    const { container } = render(<TopBar {...defaultProps} />)
    const buttons = container.querySelectorAll('.topbar__tab')
    const codeBtn = Array.from(buttons).find(b => b.textContent === 'Code')
    expect(codeBtn?.classList.contains('topbar__tab--active')).toBe(false)
  })

  it('clicking Canvas tab calls onTogglePanel with "canvas"', () => {
    render(<TopBar {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Canvas' }))
    expect(mockOnTogglePanel).toHaveBeenCalledWith('canvas')
  })

  it('clicking Code tab calls onTogglePanel with "code"', () => {
    render(<TopBar {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Code' }))
    expect(mockOnTogglePanel).toHaveBeenCalledWith('code')
  })

  it('clicking Preview tab calls onTogglePanel with "preview"', () => {
    render(<TopBar {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    expect(mockOnTogglePanel).toHaveBeenCalledWith('preview')
  })

  it('active tab has aria-pressed true', () => {
    render(<TopBar {...defaultProps} />)
    const canvasBtn = screen.getByRole('button', { name: 'Canvas' })
    expect(canvasBtn.getAttribute('aria-pressed')).toBe('true')
  })

  it('inactive tab has aria-pressed false', () => {
    render(<TopBar {...defaultProps} />)
    const codeBtn = screen.getByRole('button', { name: 'Code' })
    expect(codeBtn.getAttribute('aria-pressed')).toBe('false')
  })

  it('renders theme picker and settings buttons', () => {
    render(<TopBar {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Theme picker' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Settings' })).not.toBeNull()
  })

  it('theme picker and settings buttons are disabled', () => {
    render(<TopBar {...defaultProps} />)
    const themeBtn = screen.getByRole('button', { name: 'Theme picker' })
    const settingsBtn = screen.getByRole('button', { name: 'Settings' })
    expect((themeBtn as HTMLButtonElement).disabled).toBe(true)
    expect((settingsBtn as HTMLButtonElement).disabled).toBe(true)
  })

  it('renders Export .mmd button', () => {
    render(<TopBar {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Export as .mmd file' })).not.toBeNull()
  })

  it('renders Copy syntax button', () => {
    render(<TopBar {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Copy Mermaid syntax to clipboard' })).not.toBeNull()
  })

  it('Export .mmd button is not disabled', () => {
    render(<TopBar {...defaultProps} />)
    const btn = screen.getByRole('button', { name: 'Export as .mmd file' }) as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })

  it('Copy syntax button is not disabled', () => {
    render(<TopBar {...defaultProps} />)
    const btn = screen.getByRole('button', { name: 'Copy Mermaid syntax to clipboard' }) as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })

  it('clicking Export .mmd calls sendToHost with file subtype', () => {
    render(<TopBar {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Export as .mmd file' }))
    expect(mockSendToHost).toHaveBeenCalledWith({
      type: 'EXPORT',
      payload: { content: 'flowchart LR\n  A-->B', format: 'mmd', subtype: 'file' },
    })
  })

  it('clicking Copy syntax calls sendToHost with clipboard subtype', () => {
    render(<TopBar {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy Mermaid syntax to clipboard' }))
    expect(mockSendToHost).toHaveBeenCalledWith({
      type: 'EXPORT',
      payload: { content: 'flowchart LR\n  A-->B', format: 'mmd', subtype: 'clipboard' },
    })
  })

  it('renders Save as JSON button', () => {
    render(<TopBar {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Save canvas as JSON' })).not.toBeNull()
  })

  it('renders Load JSON button', () => {
    render(<TopBar {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Load canvas from JSON' })).not.toBeNull()
  })

  it('clicking Save as JSON calls sendToHost with EXPORT format json', () => {
    render(<TopBar {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save canvas as JSON' }))
    expect(mockSendToHost).toHaveBeenCalledWith({
      type: 'EXPORT',
      payload: { content: expect.any(String), format: 'json', subtype: 'file' },
    })
  })

  it('clicking Load JSON calls sendToHost with IMPORT_JSON type', () => {
    render(<TopBar {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Load canvas from JSON' }))
    expect(mockSendToHost).toHaveBeenCalledWith({ type: 'IMPORT_JSON', payload: {} })
  })
})
