import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('@xyflow/react', () => ({
  NodeToolbar: ({ isVisible, children }: { isVisible?: boolean; children?: React.ReactNode }) =>
    isVisible ? <div data-testid="rf-node-toolbar">{children}</div> : null,
  Position: { Top: 'top', Right: 'right', Bottom: 'bottom', Left: 'left' },
}))

import NodeToolbar from './NodeToolbar'

describe('NodeToolbar (placeholder)', () => {
  it('renders nothing when isVisible is false', () => {
    const { container } = render(<NodeToolbar isVisible={false} />)
    expect(container.querySelector('[data-testid="rf-node-toolbar"]')).toBeNull()
  })

  it('renders toolbar container when isVisible is true', () => {
    const { container } = render(<NodeToolbar isVisible={true} />)
    expect(container.querySelector('[data-testid="rf-node-toolbar"]')).not.toBeNull()
  })
})
