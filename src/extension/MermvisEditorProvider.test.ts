import { describe, it, expect, beforeEach, vi } from 'vitest'
// Note: `vscode` is mocked via src/extension/setupTests.ts (vi.mock('vscode', ...))
import * as vscode from 'vscode'
import { MermvisEditorProvider } from './MermvisEditorProvider'

describe('MermvisEditorProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset static field so each test gets a fresh channel creation + accurate mock call counts
    ;(MermvisEditorProvider as unknown as { outputChannel: vscode.OutputChannel | undefined }).outputChannel = undefined
  })

  it('has the correct viewType', () => {
    expect(MermvisEditorProvider.viewType).toBe('mermvis.editor')
  })

  it('register() calls createOutputChannel and registerCustomEditorProvider', () => {
    const fakeContext = {
      subscriptions: [] as { dispose(): void }[],
      extensionUri: vscode.Uri.file('/fake/extension'),
    } as unknown as vscode.ExtensionContext

    MermvisEditorProvider.register(fakeContext)

    expect(vscode.window.createOutputChannel).toHaveBeenCalledWith('Mermvis')
    expect(vscode.window.registerCustomEditorProvider).toHaveBeenCalledWith(
      'mermvis.editor',
      expect.any(MermvisEditorProvider),
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  })
})
