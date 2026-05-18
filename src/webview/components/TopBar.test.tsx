import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// vi.mock() MUST be at module top level — hoisted by Vitest before imports.
vi.mock('zustand')

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
})
