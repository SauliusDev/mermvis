import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// vi.mock('zustand') must appear before source imports that use it.
vi.mock('zustand')

// Module-level captured onResizeEnd
let capturedOnResizeEnd: ((event: unknown, params: unknown) => void) | undefined

// Mock @xyflow/react BEFORE any imports that use it.
// Handle renders as a plain div so we can query for flow-node__handle class.
vi.mock('@xyflow/react', () => ({
  Handle: ({ className, id }: { className?: string; id?: string }) => (
    <div className={className} id={id} data-testid="handle" />
  ),
  Position: {
    Top: 'top',
    Right: 'right',
    Bottom: 'bottom',
    Left: 'left',
  },
  NodeResizer: ({ isVisible, onResizeEnd }: { isVisible?: boolean; onResizeEnd?: (...args: unknown[]) => void }) => {
    capturedOnResizeEnd = onResizeEnd
    return isVisible ? <div data-testid="node-resizer" /> : null
  },
  NodeToolbar: ({ isVisible, children }: { isVisible?: boolean; children?: React.ReactNode }) =>
    isVisible ? <div data-testid="rf-node-toolbar">{children}</div> : null,
  useViewport: vi.fn(() => ({ zoom: 1, x: 0, y: 200 })),
}))

import FlowNode from './FlowNode'
import { useStore } from '@/lib/store'
import { shapeTemplates, edgeConnectors } from '@/lib/constants'
import type { NodeShape, EdgeStyle } from '@/lib/store'

// mockReactFlow() stubs ResizeObserver, SVGElement.getBBox etc.
// Required to prevent jsdom errors when React Flow components render.
import { mockReactFlow } from '../setupTests'

// Helper: build the minimal NodeProps<Node<FlowNodeData>> object FlowNode needs.
function makeNodeProps(
  shape: NodeShape,
  label = 'Test',
  selected = false,
): Parameters<typeof FlowNode>[0] {
  return {
    id: 'node1',
    data: { label, shape },
    selected,
    dragging: false,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    xPos: 0,
    yPos: 0,
    zIndex: 0,
    type: 'flowNode',
  } as unknown as Parameters<typeof FlowNode>[0]
}

describe('FlowNode', () => {
  beforeEach(() => {
    capturedOnResizeEnd = undefined
    mockReactFlow()
    useStore.getState().addNode({
      id: 'node1',
      position: { x: 0, y: 0 },
      data: { label: 'Test', shape: 'rectangle' },
      type: 'default',
    })
  })

  const shapes: NodeShape[] = [
    'rectangle', 'rounded', 'pill', 'diamond', 'circle', 'hexagon', 'cylinder',
  ]

  describe('shape rendering', () => {
    it.each(shapes)('renders %s shape with correct CSS class', (shape) => {
      const { container } = render(<FlowNode {...makeNodeProps(shape)} />)
      const node = container.firstElementChild
      expect(node?.className).toContain('flow-node')
      expect(node?.className).toContain(`flow-node--${shape}`)
    })

    it('renders subgraph shape without crashing (fallback to rectangle)', () => {
      const { container } = render(<FlowNode {...makeNodeProps('subgraph')} />)
      const node = container.firstElementChild
      expect(node?.className).toContain('flow-node')
      expect(node?.className).toContain('flow-node--subgraph')
      expect(container.querySelector('svg')).not.toBeNull()
    })
  })

  describe('label rendering', () => {
    it('displays the node label text', () => {
      render(<FlowNode {...makeNodeProps('rectangle', 'My Label')} />)
      expect(screen.getByText('My Label')).toBeTruthy()
    })
  })

  describe('selection state', () => {
    it('applies flow-node--selected class when selected is true', () => {
      const { container } = render(
        <FlowNode {...makeNodeProps('rectangle', 'Test', true)} />,
      )
      expect(container.firstElementChild?.className).toContain('flow-node--selected')
    })

    it('does not apply flow-node--selected when selected is false', () => {
      const { container } = render(
        <FlowNode {...makeNodeProps('rectangle', 'Test', false)} />,
      )
      expect(container.firstElementChild?.className).not.toContain('flow-node--selected')
    })

    it('renders NodeResizer when selected is true', () => {
      const { container } = render(<FlowNode {...makeNodeProps('rectangle', 'Test', true)} />)
      expect(container.querySelector('[data-testid="node-resizer"]')).not.toBeNull()
    })

    it('does not render NodeResizer when selected is false', () => {
      const { container } = render(<FlowNode {...makeNodeProps('rectangle', 'Test', false)} />)
      expect(container.querySelector('[data-testid="node-resizer"]')).toBeNull()
    })

    it('renders ConnectArrows when selected is true', () => {
      const { container } = render(<FlowNode {...makeNodeProps('rectangle', 'Test', true)} />)
      expect(container.querySelector('.connect-arrows')).not.toBeNull()
    })

    it('does not render ConnectArrows when selected is false', () => {
      const { container } = render(<FlowNode {...makeNodeProps('rectangle', 'Test', false)} />)
      expect(container.querySelector('.connect-arrows')).toBeNull()
    })
  })

  describe('connection handles', () => {
    it('renders exactly 4 handles', () => {
      render(<FlowNode {...makeNodeProps('rectangle')} />)
      const handles = document.querySelectorAll('[data-testid="handle"]')
      expect(handles).toHaveLength(4)
    })

    it('each handle has flow-node__handle class', () => {
      render(<FlowNode {...makeNodeProps('rectangle')} />)
      const handles = document.querySelectorAll('.flow-node__handle')
      expect(handles).toHaveLength(4)
    })

    it('handle ids follow the ${id}-${position} pattern', () => {
      render(<FlowNode {...makeNodeProps('rectangle')} />)
      const expectedIds = ['node1-top', 'node1-right', 'node1-bottom', 'node1-left']
      expectedIds.forEach(expectedId => {
        expect(document.getElementById(expectedId)).not.toBeNull()
      })
    })
  })

  describe('SVG shape element', () => {
    it('renders an SVG element for each shape', () => {
      shapes.forEach(shape => {
        const { container, unmount } = render(<FlowNode {...makeNodeProps(shape)} />)
        expect(container.querySelector('svg.flow-node__svg')).not.toBeNull()
        unmount()
      })
    })
  })

  describe('resize end', () => {
    it('calls resizeNode on resize end', () => {
      const node = {
        id: 'node1',
        position: { x: 0, y: 0 },
        data: { label: 'Node node1', shape: 'rectangle' as NodeShape },
        type: 'default',
      }
      useStore.setState({ nodes: [node] })
      render(<FlowNode {...makeNodeProps('rectangle', 'Test', true)} />)
      capturedOnResizeEnd?.({}, { x: 0, y: 0, width: 200, height: 80, direction: [1, 0] })
      expect(useStore.getState().nodes[0].width).toBe(200)
      expect(useStore.getState().nodes[0].height).toBe(80)
    })
  })

  describe('toolbar visibility', () => {
    it('renders toolbar when selected and single node is selected in store', () => {
      useStore.setState({
        nodes: [{ id: 'node1', position: { x: 0, y: 0 }, data: { label: 'Test', shape: 'rectangle' }, type: 'default', selected: true }],
      })
      const { container } = render(<FlowNode {...makeNodeProps('rectangle', 'Test', true)} />)
      expect(container.querySelector('[data-testid="rf-node-toolbar"]')).not.toBeNull()
    })

    it('does not render toolbar when not selected', () => {
      const { container } = render(<FlowNode {...makeNodeProps('rectangle', 'Test', false)} />)
      expect(container.querySelector('[data-testid="rf-node-toolbar"]')).toBeNull()
    })
  })

  describe('inline label editing', () => {
    it('double-clicking the label shows an input pre-filled with current label', () => {
      render(<FlowNode {...makeNodeProps('rectangle', 'Test')} />)
      fireEvent.dblClick(screen.getByText('Test'))
      const input = screen.getByRole('textbox')
      expect((input as HTMLInputElement).value).toBe('Test')
    })

    it('pressing Enter in the input commits the label to the store', () => {
      render(<FlowNode {...makeNodeProps('rectangle', 'Test')} />)
      fireEvent.dblClick(screen.getByText('Test'))
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'Updated' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(useStore.getState().nodes[0].data.label).toBe('Updated')
      expect(screen.queryByRole('textbox')).toBeNull()
    })

    it('pressing Escape cancels editing without updating the store', () => {
      render(<FlowNode {...makeNodeProps('rectangle', 'Test')} />)
      fireEvent.dblClick(screen.getByText('Test'))
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'Changed' } })
      fireEvent.keyDown(input, { key: 'Escape' })
      expect(useStore.getState().nodes[0].data.label).toBe('Test')
      expect(screen.queryByRole('textbox')).toBeNull()
    })

    it('blur on the input commits the label', () => {
      render(<FlowNode {...makeNodeProps('rectangle', 'Test')} />)
      fireEvent.dblClick(screen.getByText('Test'))
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'Blurred' } })
      fireEvent.blur(input)
      expect(useStore.getState().nodes[0].data.label).toBe('Blurred')
    })
  })
})

describe('shapeTemplates', () => {
  const allShapes: NodeShape[] = [
    'rectangle', 'rounded', 'pill', 'diamond', 'circle', 'hexagon', 'cylinder', 'subgraph',
  ]

  it('has entries for all 8 NodeShape values', () => {
    allShapes.forEach(shape => {
      expect(shapeTemplates).toHaveProperty(shape)
      expect(typeof shapeTemplates[shape].open).toBe('string')
      expect(typeof shapeTemplates[shape].close).toBe('string')
    })
  })

  it('maps rectangle to [label] bracket syntax', () => {
    expect(shapeTemplates.rectangle).toEqual({ open: '[', close: ']' })
  })

  it('maps circle to ((label)) bracket syntax', () => {
    expect(shapeTemplates.circle).toEqual({ open: '((', close: '))' })
  })

  it('maps cylinder to [(label)] bracket syntax', () => {
    expect(shapeTemplates.cylinder).toEqual({ open: '[(', close: ')]' })
  })
})

describe('edgeConnectors', () => {
  const allStyles: EdgeStyle[] = ['arrow', 'dotted', 'thick', 'open']

  it('has entries for all 4 EdgeStyle values', () => {
    allStyles.forEach(style => {
      expect(edgeConnectors).toHaveProperty(style)
      expect(typeof edgeConnectors[style]).toBe('string')
    })
  })

  it('maps arrow to --> syntax', () => {
    expect(edgeConnectors.arrow).toBe('-->')
  })

  it('maps dotted to -.-> syntax', () => {
    expect(edgeConnectors.dotted).toBe('-.->')
  })
})
