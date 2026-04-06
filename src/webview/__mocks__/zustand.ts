/**
 * Zustand test mock — replaces `create` with a version that tracks all store
 * instances and resets them to their initial state after each test.
 *
 * Activated by `vi.mock('zustand')` in a test file. Vitest resolves this file
 * automatically from `src/webview/__mocks__/zustand.ts` when called from any
 * test in `src/webview/**`.
 *
 * Usage in test files:
 *   vi.mock('zustand')  ← call at top level (hoisted by Vitest)
 */
import { afterEach, afterAll } from 'vitest'
import { create as actualCreate } from 'zustand'
import type { StateCreator } from 'zustand'

// Re-export everything from actual zustand so non-create imports still work
export * from 'zustand'

const storeResetFns = new Set<() => void>()

// This export shadows the `create` re-exported by `export * from 'zustand'` above.
// TypeScript resolves local named exports with higher priority than star re-exports.
export const create = <T,>(initializer: StateCreator<T, [], []>) => {
  const store = actualCreate<T>(initializer)
  const initialState = store.getState()
  storeResetFns.add(() => store.setState(initialState, true))
  return store
}

afterEach(() => {
  storeResetFns.forEach((reset) => reset())
})

afterAll(() => {
  storeResetFns.clear()
})
