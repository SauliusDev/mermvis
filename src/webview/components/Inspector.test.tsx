import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// vi.mock() is hoisted to top of file by Vitest's transform pipeline.
// Must be at top level — not inside a function or beforeEach.
vi.mock('zustand')

import Inspector from './Inspector'
import { useStore } from '@/lib/store'
import { makeNode, makeEdge } from '@/test/store-helpers'
import { mockReactFlow } from '../setupTests'

mockReactFlow()

describe('Inspector', () => {
  describe('inspector visibility', () => {
    it('renders nothing visible when inspectorOpen is false', () => {
      const { container } = render(<Inspector />)
      const aside = container.querySelector('.inspector')
      expect(aside).toBeTruthy()
      expect(aside!.classList.contains('inspector--open')).toBe(false)
    })

    it('renders panel when inspectorOpen is true', () => {
      useStore.setState({ inspectorOpen: true })
      const { container } = render(<Inspector />)
      const aside = container.querySelector('.inspector')
      expect(aside!.classList.contains('inspector--open')).toBe(true)
    })
  })

  describe('empty states', () => {
    it('shows empty state when no node selected', () => {
      useStore.setState({ inspectorOpen: true, nodes: [] })
      render(<Inspector />)
      expect(screen.getByText('Select a node to inspect')).toBeTruthy()
    })

    it('shows multi-select state when multiple nodes selected', () => {
      const nodeA = makeNode('a', { selected: true })
      const nodeB = makeNode('b', { selected: true })
      useStore.setState({ inspectorOpen: true, nodes: [nodeA, nodeB] })
      render(<Inspector />)
      expect(screen.getByText('Multiple nodes selected')).toBeTruthy()
    })
  })

  describe('node properties section', () => {
    it('shows node ID in read-only field', () => {
      const node = makeNode('test-id', { selected: true })
      useStore.setState({ inspectorOpen: true, nodes: [node] })
      render(<Inspector />)
      const inputs = screen.getAllByDisplayValue('test-id')
      expect(inputs.length).toBeGreaterThan(0)
    })

    it('shows node label in editable input', () => {
      const node = makeNode('a', { selected: true, data: { label: 'My Node', shape: 'rectangle' } })
      useStore.setState({ inspectorOpen: true, nodes: [node] })
      render(<Inspector />)
      const input = screen.getByDisplayValue('My Node') as HTMLInputElement
      expect(input.readOnly).toBe(false)
    })

    it('shows shape type in read-only field', () => {
      const node = makeNode('a', { selected: true, data: { label: 'Node a', shape: 'diamond' } })
      useStore.setState({ inspectorOpen: true, nodes: [node] })
      render(<Inspector />)
      expect(screen.getByDisplayValue('Diamond')).toBeTruthy()
    })

    it('calls updateNodeLabel on label blur with new value', () => {
      const node = makeNode('a', { selected: true, data: { label: 'Original', shape: 'rectangle' } })
      useStore.setState({ inspectorOpen: true, nodes: [node] })
      render(<Inspector />)

      const labelInput = screen.getByDisplayValue('Original')
      fireEvent.change(labelInput, { target: { value: 'Updated' } })
      fireEvent.blur(labelInput)

      expect(useStore.getState().nodes[0].data.label).toBe('Updated')
    })

    it('calls updateNodeLabel on Enter key in label input', () => {
      const node = makeNode('a', { selected: true, data: { label: 'Original', shape: 'rectangle' } })
      useStore.setState({ inspectorOpen: true, nodes: [node] })
      render(<Inspector />)

      const labelInput = screen.getByDisplayValue('Original')
      fireEvent.change(labelInput, { target: { value: 'NewLabel' } })
      fireEvent.keyDown(labelInput, { key: 'Enter' })

      expect(useStore.getState().nodes[0].data.label).toBe('NewLabel')
    })

    it('does not call updateNodeLabel if label unchanged', () => {
      const node = makeNode('a', { selected: true, data: { label: 'Same', shape: 'rectangle' } })
      useStore.setState({ inspectorOpen: true, nodes: [node] })
      const initialPastLength = useStore.getState().history.past.length
      render(<Inspector />)

      const labelInput = screen.getByDisplayValue('Same')
      fireEvent.blur(labelInput)

      expect(useStore.getState().history.past.length).toBe(initialPastLength)
    })
  })

  describe('position section', () => {
    it('shows node x and y position in numeric inputs', () => {
      const node = makeNode('a', { selected: true, position: { x: 100, y: 200 } })
      useStore.setState({ inspectorOpen: true, nodes: [node] })
      render(<Inspector />)
      expect(screen.getByDisplayValue('100')).toBeTruthy()
      expect(screen.getByDisplayValue('200')).toBeTruthy()
    })

    it('calls moveNodes on x input Enter with new x value', () => {
      const node = makeNode('a', { selected: true, position: { x: 100, y: 200 } })
      useStore.setState({ inspectorOpen: true, nodes: [node] })
      render(<Inspector />)

      const xInput = screen.getByDisplayValue('100')
      fireEvent.change(xInput, { target: { value: '300' } })
      fireEvent.keyDown(xInput, { key: 'Enter' })

      expect(useStore.getState().nodes[0].position.x).toBe(300)
      expect(useStore.getState().nodes[0].position.y).toBe(200)
    })

    it('calls moveNodes on y input blur with new y value', () => {
      const node = makeNode('a', { selected: true, position: { x: 100, y: 200 } })
      useStore.setState({ inspectorOpen: true, nodes: [node] })
      render(<Inspector />)

      const yInput = screen.getByDisplayValue('200')
      fireEvent.change(yInput, { target: { value: '400' } })
      fireEvent.blur(yInput)

      expect(useStore.getState().nodes[0].position.y).toBe(400)
      expect(useStore.getState().nodes[0].position.x).toBe(100)
    })

    it('does not call moveNodes if x value is NaN', () => {
      const node = makeNode('a', { selected: true, position: { x: 100, y: 200 } })
      useStore.setState({ inspectorOpen: true, nodes: [node] })
      const initialPastLength = useStore.getState().history.past.length
      render(<Inspector />)

      const xInput = screen.getByDisplayValue('100')
      fireEvent.change(xInput, { target: { value: 'abc' } })
      fireEvent.keyDown(xInput, { key: 'Enter' })

      expect(useStore.getState().nodes[0].position.x).toBe(100)
      expect(useStore.getState().history.past.length).toBe(initialPastLength)
    })
  })

  describe('connections section', () => {
    it('shows outgoing connection with → indicator', () => {
      const nodeA = makeNode('a', { selected: true, data: { label: 'Node A', shape: 'rectangle' } })
      const nodeB = makeNode('b', { data: { label: 'Node B', shape: 'rectangle' } })
      const edge = makeEdge('e1', 'a', 'b')
      useStore.setState({ inspectorOpen: true, nodes: [nodeA, nodeB], edges: [edge] })
      render(<Inspector />)

      expect(screen.getByText('→')).toBeTruthy()
      expect(screen.getByText('Node B')).toBeTruthy()
    })

    it('shows incoming connection with ← indicator', () => {
      const nodeA = makeNode('a', { data: { label: 'Node A', shape: 'rectangle' } })
      const nodeB = makeNode('b', { selected: true, data: { label: 'Node B', shape: 'rectangle' } })
      const edge = makeEdge('e1', 'a', 'b')
      useStore.setState({ inspectorOpen: true, nodes: [nodeA, nodeB], edges: [edge] })
      render(<Inspector />)

      expect(screen.getByText('←')).toBeTruthy()
      expect(screen.getByText('Node A')).toBeTruthy()
    })

    it('shows no-connections message when node has no edges', () => {
      const node = makeNode('a', { selected: true })
      useStore.setState({ inspectorOpen: true, nodes: [node], edges: [] })
      render(<Inspector />)

      expect(screen.getByText('No connections')).toBeTruthy()
    })
  })

  describe('close behavior', () => {
    it('close button calls toggleInspector', () => {
      useStore.setState({ inspectorOpen: true })
      render(<Inspector />)

      expect(useStore.getState().inspectorOpen).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: 'Close inspector' }))
      expect(useStore.getState().inspectorOpen).toBe(false)
    })

    it('Escape key calls toggleInspector when inspector is open', () => {
      useStore.setState({ inspectorOpen: true })
      render(<Inspector />)

      expect(useStore.getState().inspectorOpen).toBe(true)
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(useStore.getState().inspectorOpen).toBe(false)
    })
  })
})
