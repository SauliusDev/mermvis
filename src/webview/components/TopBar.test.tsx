import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

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
const mockOnThemeChange = vi.fn()

const defaultProps = {
  panelVisible: { canvas: true, code: false, preview: false } as PanelVisible,
  onTogglePanel: mockOnTogglePanel,
  theme: 'dark' as const,
  onThemeChange: mockOnThemeChange,
}

beforeEach(() => {
  useStore.setState({ filename: 'test-diagram.mmd' })
  mockOnTogglePanel.mockClear()
  mockOnThemeChange.mockClear()
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

  it('renders theme picker button and settings button', () => {
    render(<TopBar {...defaultProps} theme="dark" onThemeChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Theme: Dark/ })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Settings' })).not.toBeNull()
  })

  it('theme picker button is enabled; settings button is still disabled', () => {
    render(<TopBar {...defaultProps} theme="dark" onThemeChange={vi.fn()} />)
    const themeBtn = screen.getByRole('button', { name: /Theme: Dark/ }) as HTMLButtonElement
    const settingsBtn = screen.getByRole('button', { name: 'Settings' }) as HTMLButtonElement
    expect(themeBtn.disabled).toBe(false)
    expect(settingsBtn.disabled).toBe(true)
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

  describe('theme picker', () => {
    it('renders with aria-label reflecting dark theme', () => {
      render(<TopBar {...defaultProps} theme="dark" onThemeChange={vi.fn()} />)
      const btn = screen.getByRole('button', { name: /Theme: Dark/ })
      expect(btn).not.toBeNull()
    })

    it('renders with aria-label reflecting adaptive theme', () => {
      render(<TopBar {...defaultProps} theme="adaptive" onThemeChange={vi.fn()} />)
      const btn = screen.getByRole('button', { name: /Theme: Adaptive/ })
      expect(btn).not.toBeNull()
    })

    it('clicking the theme button opens the dropdown (listbox visible)', () => {
      render(<TopBar {...defaultProps} />)
      const btn = screen.getByRole('button', { name: /Theme: Dark/ })
      fireEvent.click(btn)
      expect(screen.getByRole('listbox', { name: 'Select theme' })).not.toBeNull()
    })

    it('dropdown shows Dark and Adaptive options', () => {
      render(<TopBar {...defaultProps} />)
      fireEvent.click(screen.getByRole('button', { name: /Theme: Dark/ }))
      expect(screen.getByText('◑ Dark')).not.toBeNull()
      expect(screen.getByText('◑ Adaptive')).not.toBeNull()
    })

    it('clicking Adaptive option calls onThemeChange with "adaptive" and closes dropdown', () => {
      const mockChange = vi.fn()
      render(<TopBar {...defaultProps} onThemeChange={mockChange} />)
      fireEvent.click(screen.getByRole('button', { name: /Theme: Dark/ }))
      fireEvent.click(screen.getByText('◑ Adaptive'))
      expect(mockChange).toHaveBeenCalledWith('adaptive')
      expect(screen.queryByRole('listbox')).toBeNull()
    })

    it('clicking Dark option calls onThemeChange with "dark" and closes dropdown', () => {
      const mockChange = vi.fn()
      render(<TopBar {...defaultProps} theme="adaptive" onThemeChange={mockChange} />)
      fireEvent.click(screen.getByRole('button', { name: /Theme: Adaptive/ }))
      fireEvent.click(screen.getByText('◑ Dark'))
      expect(mockChange).toHaveBeenCalledWith('dark')
      expect(screen.queryByRole('listbox')).toBeNull()
    })

    it('mousedown outside the dropdown closes it', () => {
      render(<TopBar {...defaultProps} />)
      fireEvent.click(screen.getByRole('button', { name: /Theme: Dark/ }))
      expect(screen.getByRole('listbox')).not.toBeNull()
      act(() => {
        fireEvent.mouseDown(document.body)
      })
      expect(screen.queryByRole('listbox')).toBeNull()
    })

    it('active option has aria-selected="true"', () => {
      render(<TopBar {...defaultProps} theme="dark" onThemeChange={vi.fn()} />)
      fireEvent.click(screen.getByRole('button', { name: /Theme: Dark/ }))
      const options = screen.getAllByRole('option')
      const darkOption = options.find(o => o.textContent === '◑ Dark')
      const adaptiveOption = options.find(o => o.textContent === '◑ Adaptive')
      expect(darkOption?.getAttribute('aria-selected')).toBe('true')
      expect(adaptiveOption?.getAttribute('aria-selected')).toBe('false')
    })

    it('dropdown is absent from DOM when closed', () => {
      render(<TopBar {...defaultProps} />)
      expect(screen.queryByRole('listbox')).toBeNull()
    })
  })
})
