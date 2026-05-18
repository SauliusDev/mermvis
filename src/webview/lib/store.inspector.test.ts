import { describe, it, expect } from 'vitest'

// vi.mock() is hoisted by Vitest — must appear before source imports.
// This activates __mocks__/zustand.ts which resets ALL stores in afterEach.
import { vi } from 'vitest'
vi.mock('zustand')

import { useStore } from './store'

describe('inspectorOpen', () => {
  it('defaults to false', () => {
    expect(useStore.getState().inspectorOpen).toBe(false)
  })
})

describe('toggleInspector', () => {
  it('sets inspectorOpen to true when false', () => {
    expect(useStore.getState().inspectorOpen).toBe(false)
    useStore.getState().toggleInspector()
    expect(useStore.getState().inspectorOpen).toBe(true)
  })

  it('sets inspectorOpen to false when true', () => {
    useStore.getState().toggleInspector()
    expect(useStore.getState().inspectorOpen).toBe(true)
    useStore.getState().toggleInspector()
    expect(useStore.getState().inspectorOpen).toBe(false)
  })

  it('does NOT push a history entry (past.length remains 0 after toggle)', () => {
    expect(useStore.getState().history.past).toHaveLength(0)
    useStore.getState().toggleInspector()
    expect(useStore.getState().history.past).toHaveLength(0)
    useStore.getState().toggleInspector()
    expect(useStore.getState().history.past).toHaveLength(0)
  })
})
