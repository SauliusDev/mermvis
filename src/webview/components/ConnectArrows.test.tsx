import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('zustand')

import ConnectArrows from './ConnectArrows'
import { useStore } from '@/lib/store'
import { mockReactFlow } from '../setupTests'

mockReactFlow()

describe('ConnectArrows', () => {
  const mockSetPendingConnect = vi.fn()

  beforeEach(() => {
    useStore.setState({ setPendingConnect: mockSetPendingConnect } as never)
    mockSetPendingConnect.mockClear()
  })

  it('renders 4 direction buttons when visible', () => {
    render(<ConnectArrows isVisible={true} nodeId="node-1" />)
    expect(screen.getByTestId('top')).toBeTruthy()
    expect(screen.getByTestId('right')).toBeTruthy()
    expect(screen.getByTestId('bottom')).toBeTruthy()
    expect(screen.getByTestId('left')).toBeTruthy()
  })

  it('returns null when not visible', () => {
    const { container } = render(<ConnectArrows isVisible={false} nodeId="node-1" />)
    expect(container.firstChild).toBeNull()
  })

  it('calls setPendingConnect(nodeId) when a button is clicked', () => {
    render(<ConnectArrows isVisible={true} nodeId="node-1" />)
    const btn = screen.getByTestId('right')
    fireEvent.click(btn)
    expect(mockSetPendingConnect).toHaveBeenCalledWith('node-1')
  })
})
