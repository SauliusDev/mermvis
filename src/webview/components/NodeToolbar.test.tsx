import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// vi.mock() MUST be at module top level — hoisted by Vitest before imports.
let capturedPosition: string | undefined

vi.mock('@xyflow/react', () => ({
  NodeToolbar: ({ isVisible, position, children }: { isVisible?: boolean; position?: string; children?: React.ReactNode }) => {
    capturedPosition = position
    return isVisible ? <div data-testid="rf-node-toolbar">{children}</div> : null
  },
  Position: { Top: 'top', Bottom: 'bottom', Right: 'right', Left: 'left' },
  useViewport: vi.fn(() => ({ zoom: 1, x: 0, y: 200 })),
}))

vi.mock('zustand')

import { useViewport } from '@xyflow/react'
import { useStore } from '@/lib/store'
import type { NodeShape } from '@/lib/store'
import NodeToolbar from './NodeToolbar'

const TEST_NODE_ID = 'n1'
const mockRemoveNodes = vi.fn()
const mockDuplicateNode = vi.fn()
const mockToggleNodeLock = vi.fn()
const mockUpdateNodeShape = vi.fn()
const mockOnEditLabel = vi.fn()

const defaultProps = {
  nodeId: TEST_NODE_ID,
  shape: 'rectangle' as NodeShape,
  positionAbsoluteY: 200,
  onEditLabel: mockOnEditLabel,
  isVisible: true,
}

beforeEach(() => {
  mockRemoveNodes.mockClear()
  mockDuplicateNode.mockClear()
  mockToggleNodeLock.mockClear()
  mockUpdateNodeShape.mockClear()
  mockOnEditLabel.mockClear()
  capturedPosition = undefined
  vi.mocked(useViewport).mockReturnValue({ zoom: 1, x: 0, y: 200 })
  useStore.setState({
    nodes: [{ id: TEST_NODE_ID, position: { x: 100, y: 100 }, data: { label: 'Test', shape: 'rectangle' }, type: 'flowNode' }],
    removeNodes: mockRemoveNodes,
    duplicateNode: mockDuplicateNode,
    toggleNodeLock: mockToggleNodeLock,
    updateNodeShape: mockUpdateNodeShape,
  })
})

describe('NodeToolbar', () => {
  it('renders nothing when isVisible is false', () => {
    render(<NodeToolbar {...defaultProps} isVisible={false} />)
    expect(screen.queryByTestId('rf-node-toolbar')).toBeNull()
  })

  it('renders toolbar with 5 action buttons when visible', () => {
    render(<NodeToolbar {...defaultProps} />)
    expect(screen.getByTestId('rf-node-toolbar')).not.toBeNull()
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(5)
  })

  it('renders Edit label, Change shape, Duplicate node, Lock node, Delete node buttons', () => {
    render(<NodeToolbar {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Edit label' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Change shape' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Duplicate node' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Lock node' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Delete node' })).not.toBeNull()
  })

  it('clicking Edit label button calls onEditLabel', () => {
    render(<NodeToolbar {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit label' }))
    expect(mockOnEditLabel).toHaveBeenCalledTimes(1)
  })

  it('clicking Delete button calls removeNodes with nodeId', () => {
    render(<NodeToolbar {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete node' }))
    expect(mockRemoveNodes).toHaveBeenCalledWith([TEST_NODE_ID])
  })

  it('clicking Duplicate button calls duplicateNode with nodeId', () => {
    render(<NodeToolbar {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate node' }))
    expect(mockDuplicateNode).toHaveBeenCalledWith(TEST_NODE_ID)
  })

  it('clicking Lock button calls toggleNodeLock with nodeId', () => {
    render(<NodeToolbar {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lock node' }))
    expect(mockToggleNodeLock).toHaveBeenCalledWith(TEST_NODE_ID)
  })

  it('lock button shows Unlock label when node is locked', () => {
    useStore.setState({
      nodes: [{ id: TEST_NODE_ID, position: { x: 100, y: 100 }, data: { label: 'Test', shape: 'rectangle' }, type: 'flowNode', draggable: false }],
    })
    render(<NodeToolbar {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Unlock node' })).not.toBeNull()
  })

  it('lock button has active class when node is locked', () => {
    useStore.setState({
      nodes: [{ id: TEST_NODE_ID, position: { x: 100, y: 100 }, data: { label: 'Test', shape: 'rectangle' }, type: 'flowNode', draggable: false }],
    })
    render(<NodeToolbar {...defaultProps} />)
    const lockBtn = screen.getByRole('button', { name: 'Unlock node' })
    expect(lockBtn.className).toContain('node-toolbar__btn--active')
  })

  it('clicking Change shape opens shape dropdown', () => {
    render(<NodeToolbar {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Change shape' }))
    expect(screen.getByRole('button', { name: 'Rectangle' })).not.toBeNull()
  })

  it('shape dropdown shows all 8 shape options', () => {
    render(<NodeToolbar {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Change shape' }))
    const shapeLabels = ['Rectangle', 'Rounded', 'Pill', 'Diamond', 'Circle', 'Hexagon', 'Cylinder', 'Subgraph']
    shapeLabels.forEach(label => {
      expect(screen.getByRole('button', { name: label })).not.toBeNull()
    })
  })

  it('selecting a shape from dropdown calls updateNodeShape and closes dropdown', () => {
    render(<NodeToolbar {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Change shape' }))
    fireEvent.click(screen.getByRole('button', { name: 'Diamond' }))
    expect(mockUpdateNodeShape).toHaveBeenCalledWith(TEST_NODE_ID, 'diamond')
    expect(screen.queryByRole('button', { name: 'Diamond' })).toBeNull()
  })

  it('Escape key in shape dropdown closes dropdown', () => {
    render(<NodeToolbar {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Change shape' }))
    const dropdown = document.querySelector('.node-toolbar__shape-dropdown')!
    fireEvent.keyDown(dropdown, { key: 'Escape' })
    expect(screen.queryByRole('button', { name: 'Rectangle' })).toBeNull()
  })

  it('delete button has danger CSS class', () => {
    render(<NodeToolbar {...defaultProps} />)
    const deleteBtn = screen.getByRole('button', { name: 'Delete node' })
    expect(deleteBtn.className).toContain('node-toolbar__btn--danger')
  })

  it('toolbar positions below node when near top viewport edge', () => {
    vi.mocked(useViewport).mockReturnValue({ zoom: 1, x: 0, y: -300 })
    render(<NodeToolbar {...defaultProps} positionAbsoluteY={50} />)
    expect(capturedPosition).toBe('bottom')
  })
})
