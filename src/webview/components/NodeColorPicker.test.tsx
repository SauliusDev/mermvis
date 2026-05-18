import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('zustand')

import { useStore } from '@/lib/store'
import NodeColorPicker from './NodeColorPicker'

const TEST_NODE_ID = 'n1'
const mockUpdateNodeColors = vi.fn()
const mockOnClose = vi.fn()
const triggerRef = { current: null } as React.RefObject<HTMLButtonElement | null>

const defaultProps = {
  nodeId: TEST_NODE_ID,
  onClose: mockOnClose,
  triggerRef,
}

beforeEach(() => {
  useStore.setState({
    nodes: [{
      id: TEST_NODE_ID,
      position: { x: 0, y: 0 },
      data: { label: 'Test', shape: 'rectangle' },
      type: 'flowNode',
    }],
    updateNodeColors: mockUpdateNodeColors,
  })
  mockUpdateNodeColors.mockClear()
  mockOnClose.mockClear()
})

describe('NodeColorPicker', () => {
  it('renders three sections: Fill, Border, Text', () => {
    render(<NodeColorPicker {...defaultProps} />)
    expect(screen.getByText('Fill')).not.toBeNull()
    expect(screen.getByText('Border')).not.toBeNull()
    expect(screen.getByText('Text')).not.toBeNull()
  })

  it('each section shows 8 swatches', () => {
    render(<NodeColorPicker {...defaultProps} />)
    const fillGroup = screen.getByRole('group', { name: 'Fill color swatches' })
    const borderGroup = screen.getByRole('group', { name: 'Border color swatches' })
    const textGroup = screen.getByRole('group', { name: 'Text color swatches' })
    expect(fillGroup.querySelectorAll('button').length).toBe(8)
    expect(borderGroup.querySelectorAll('button').length).toBe(8)
    expect(textGroup.querySelectorAll('button').length).toBe(8)
  })

  it('renders a reset button', () => {
    render(<NodeColorPicker {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Reset node colors to default' })).not.toBeNull()
  })

  it('clicking a fill swatch calls updateNodeColors with correct fillColor', () => {
    render(<NodeColorPicker {...defaultProps} />)
    const fillSwatch = screen.getByRole('button', { name: 'Fill color #1e2022' })
    fireEvent.click(fillSwatch)
    expect(mockUpdateNodeColors).toHaveBeenCalledWith(TEST_NODE_ID, {
      fillColor: '#1e2022',
      strokeColor: undefined,
      textColor: undefined,
    })
  })

  it('clicking a border swatch calls updateNodeColors with correct strokeColor', () => {
    render(<NodeColorPicker {...defaultProps} />)
    const borderSwatch = screen.getByRole('button', { name: 'Border color #3a3c3e' })
    fireEvent.click(borderSwatch)
    expect(mockUpdateNodeColors).toHaveBeenCalledWith(TEST_NODE_ID, {
      fillColor: undefined,
      strokeColor: '#3a3c3e',
      textColor: undefined,
    })
  })

  it('clicking a text swatch calls updateNodeColors with correct textColor', () => {
    render(<NodeColorPicker {...defaultProps} />)
    const textSwatch = screen.getByRole('button', { name: 'Text color #bfbfbf' })
    fireEvent.click(textSwatch)
    expect(mockUpdateNodeColors).toHaveBeenCalledWith(TEST_NODE_ID, {
      fillColor: undefined,
      strokeColor: undefined,
      textColor: '#bfbfbf',
    })
  })

  it('clicking reset calls updateNodeColors with all undefined values', () => {
    render(<NodeColorPicker {...defaultProps} fillColor="#1e2022" strokeColor="#3a3c3e" textColor="#bfbfbf" />)
    fireEvent.click(screen.getByRole('button', { name: 'Reset node colors to default' }))
    expect(mockUpdateNodeColors).toHaveBeenCalledWith(TEST_NODE_ID, {
      fillColor: undefined,
      strokeColor: undefined,
      textColor: undefined,
    })
  })

  it('selected fill swatch gets active class when fillColor matches', () => {
    render(<NodeColorPicker {...defaultProps} fillColor="#1e2022" />)
    const activeSwatch = screen.getByRole('button', { name: 'Fill color #1e2022' })
    expect(activeSwatch.className).toContain('node-color-picker__swatch--active')
  })

  it('selected stroke swatch gets active class when strokeColor matches', () => {
    render(<NodeColorPicker {...defaultProps} strokeColor="#3a3c3e" />)
    const activeSwatch = screen.getByRole('button', { name: 'Border color #3a3c3e' })
    expect(activeSwatch.className).toContain('node-color-picker__swatch--active')
  })

  it('selected text swatch gets active class when textColor matches', () => {
    render(<NodeColorPicker {...defaultProps} textColor="#bfbfbf" />)
    const activeSwatch = screen.getByRole('button', { name: 'Text color #bfbfbf' })
    expect(activeSwatch.className).toContain('node-color-picker__swatch--active')
  })

  it('Escape key calls onClose and stops propagation', () => {
    render(<NodeColorPicker {...defaultProps} />)
    const picker = document.querySelector('.node-color-picker')!
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    const stopPropagationSpy = vi.spyOn(event, 'stopPropagation')
    picker.dispatchEvent(event)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
    expect(stopPropagationSpy).toHaveBeenCalled()
  })

  it('mousedown outside picker calls onClose', () => {
    render(<NodeColorPicker {...defaultProps} />)
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('mousedown inside picker does NOT call onClose', () => {
    render(<NodeColorPicker {...defaultProps} />)
    const picker = document.querySelector('.node-color-picker')!
    picker.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('mousedown on triggerRef element does NOT call onClose', () => {
    const btn = document.createElement('button')
    document.body.appendChild(btn)
    const ref = { current: btn } as React.RefObject<HTMLButtonElement | null>
    render(<NodeColorPicker {...defaultProps} triggerRef={ref} />)
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(mockOnClose).not.toHaveBeenCalled()
    document.body.removeChild(btn)
  })
})
