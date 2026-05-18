import { describe, it, expect, beforeEach, vi } from 'vitest'
// Note: `vscode` is mocked via src/extension/setupTests.ts (vi.mock('vscode', ...))
import * as vscode from 'vscode'
import { MermvisEditorProvider } from './MermvisEditorProvider'
import type { WebviewToHostMessage } from '../shared/types'

vi.mock('./layoutSidecar', () => ({
  readSidecar: vi.fn(() => null),
  writeSidecar: vi.fn(),
}))

vi.mock('./diagramTypeDetector', () => ({
  detectDiagramType: vi.fn(() => 'flowchart'),
}))

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

  describe('EXTERNAL_FILE_CHANGE suppress flag', () => {
    const fakeContext = {
      subscriptions: [],
      extensionUri: vscode.Uri.file('/fake/extension'),
    } as unknown as vscode.ExtensionContext

    const fakeDocument = {
      uri: vscode.Uri.file('/test/diagram.mmd'),
      getText: vi.fn(() => 'flowchart TD\n  A[Test]'),
      lineCount: 2,
    } as unknown as vscode.TextDocument

    let capturedOnDidChangeTextDocument: ((e: { document: vscode.TextDocument }) => void) | undefined
    let capturedWebviewMessageHandler: ((msg: WebviewToHostMessage) => void) | undefined
    let postMessageSpy: ReturnType<typeof vi.fn>

    beforeEach(() => {
      capturedOnDidChangeTextDocument = undefined
      capturedWebviewMessageHandler = undefined

      vi.mocked(vscode.workspace.onDidChangeTextDocument).mockImplementation(
        (listener: (e: { document: vscode.TextDocument }) => void) => {
          capturedOnDidChangeTextDocument = listener
          return { dispose: vi.fn() }
        }
      )

      vi.mocked(vscode.workspace.applyEdit).mockResolvedValue(true as never)

      vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
        get: vi.fn(() => true),
      } as unknown as vscode.WorkspaceConfiguration)

      postMessageSpy = vi.fn()

      const fakePanel = {
        webview: {
          options: {},
          html: '',
          onDidReceiveMessage: vi.fn((cb: (msg: WebviewToHostMessage) => void) => {
            capturedWebviewMessageHandler = cb
            return { dispose: vi.fn() }
          }),
          postMessage: postMessageSpy,
        },
        onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
      }

      const provider = new MermvisEditorProvider(fakeContext)
      provider.resolveCustomTextEditor(
        fakeDocument,
        fakePanel as unknown as vscode.WebviewPanel,
        { isCancellationRequested: false } as vscode.CancellationToken,
      )
    })

    it('does not send EXTERNAL_FILE_CHANGE after own SAVE triggers onDidChangeTextDocument', () => {
      capturedWebviewMessageHandler!({
        type: 'SAVE',
        payload: { content: 'flowchart TD\n  A[Test]', layoutJson: '{}' },
      })
      capturedOnDidChangeTextDocument!({ document: fakeDocument })
      expect(postMessageSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EXTERNAL_FILE_CHANGE' }),
      )
    })

    it('sends EXTERNAL_FILE_CHANGE for genuine external edits (flag not set)', () => {
      capturedOnDidChangeTextDocument!({ document: fakeDocument })
      expect(postMessageSpy).toHaveBeenCalledWith({
        type: 'EXTERNAL_FILE_CHANGE',
        payload: { content: 'flowchart TD\n  A[Test]' },
      })
    })

    it('only suppresses once — second onDidChangeTextDocument fires normally', () => {
      capturedWebviewMessageHandler!({
        type: 'SAVE',
        payload: { content: 'flowchart TD\n  A[Test]', layoutJson: '{}' },
      })
      capturedOnDidChangeTextDocument!({ document: fakeDocument })
      postMessageSpy.mockClear()
      capturedOnDidChangeTextDocument!({ document: fakeDocument })
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EXTERNAL_FILE_CHANGE' }),
      )
    })
  })
})
