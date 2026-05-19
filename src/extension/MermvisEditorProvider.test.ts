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

  describe('EXPORT handler', () => {
    const fakeContext = {
      subscriptions: [],
      extensionUri: vscode.Uri.file('/fake/extension'),
    } as unknown as vscode.ExtensionContext

    const fakeDocument = {
      uri: vscode.Uri.file('/test/diagram.mmd'),
      getText: vi.fn(() => 'flowchart TD\n  A[Test]'),
      lineCount: 2,
    } as unknown as vscode.TextDocument

    let capturedWebviewMessageHandler: ((msg: WebviewToHostMessage) => void) | undefined

    beforeEach(() => {
      capturedWebviewMessageHandler = undefined

      vi.mocked(vscode.workspace.onDidChangeTextDocument).mockImplementation(
        () => ({ dispose: vi.fn() })
      )

      vi.mocked(vscode.workspace.applyEdit).mockResolvedValue(true as never)

      vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
        get: vi.fn(() => true),
      } as unknown as vscode.WorkspaceConfiguration)

      const fakePanel = {
        webview: {
          options: {},
          html: '',
          onDidReceiveMessage: vi.fn((cb: (msg: WebviewToHostMessage) => void) => {
            capturedWebviewMessageHandler = cb
            return { dispose: vi.fn() }
          }),
          postMessage: vi.fn(),
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

    it('EXPORT clipboard: calls vscode.env.clipboard.writeText with content', async () => {
      vi.mocked(vscode.env.clipboard.writeText).mockResolvedValue(undefined as never)
      capturedWebviewMessageHandler!({
        type: 'EXPORT',
        payload: { content: 'flowchart LR\n  A-->B', format: 'mmd', subtype: 'clipboard' },
      })
      await Promise.resolve()
      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith('flowchart LR\n  A-->B')
    })

    it('EXPORT clipboard: does not crash when clipboard write rejects', async () => {
      vi.mocked(vscode.env.clipboard.writeText).mockRejectedValue(new Error('write failed') as never)
      await expect(async () => {
        capturedWebviewMessageHandler!({
          type: 'EXPORT',
          payload: { content: 'flowchart LR\n  A-->B', format: 'mmd', subtype: 'clipboard' },
        })
        await Promise.resolve()
      }).not.toThrow()
    })

    it('EXPORT file: calls showSaveDialog with Mermaid filter', async () => {
      const fakeUri = vscode.Uri.file('/test/output.mmd')
      vi.mocked(vscode.window.showSaveDialog).mockResolvedValue(fakeUri as never)
      vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValue(undefined as never)
      capturedWebviewMessageHandler!({
        type: 'EXPORT',
        payload: { content: 'flowchart LR\n  A-->B', format: 'mmd', subtype: 'file' },
      })
      await Promise.resolve()
      expect(vscode.window.showSaveDialog).toHaveBeenCalledWith(
        expect.objectContaining({ filters: { 'Mermaid': ['mmd'] } })
      )
    })

    it('EXPORT file: calls workspace.fs.writeFile with encoded content when dialog confirms', async () => {
      const fakeUri = vscode.Uri.file('/test/output.mmd')
      vi.mocked(vscode.window.showSaveDialog).mockResolvedValue(fakeUri as never)
      vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValue(undefined as never)
      capturedWebviewMessageHandler!({
        type: 'EXPORT',
        payload: { content: 'flowchart LR\n  A-->B', format: 'mmd', subtype: 'file' },
      })
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(
        fakeUri,
        expect.any(Uint8Array)
      )
    })

    it('EXPORT file: does not call writeFile when dialog is cancelled (returns undefined)', async () => {
      vi.mocked(vscode.window.showSaveDialog).mockResolvedValue(undefined as never)
      capturedWebviewMessageHandler!({
        type: 'EXPORT',
        payload: { content: 'flowchart LR\n  A-->B', format: 'mmd', subtype: 'file' },
      })
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(vscode.workspace.fs.writeFile).not.toHaveBeenCalled()
    })
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

  describe('IMPORT_JSON handler', () => {
    const fakeContext = {
      subscriptions: [],
      extensionUri: vscode.Uri.file('/fake/extension'),
    } as unknown as vscode.ExtensionContext

    const fakeDocument = {
      uri: vscode.Uri.file('/test/diagram.mmd'),
      getText: vi.fn(() => 'flowchart TD\n  A[Test]'),
      lineCount: 2,
    } as unknown as vscode.TextDocument

    let capturedWebviewMessageHandler: ((msg: WebviewToHostMessage) => void) | undefined
    let postMessageSpy: ReturnType<typeof vi.fn>

    beforeEach(() => {
      capturedWebviewMessageHandler = undefined

      vi.mocked(vscode.workspace.onDidChangeTextDocument).mockImplementation(
        () => ({ dispose: vi.fn() })
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

    it('IMPORT_JSON: calls showOpenDialog with JSON filter and canSelectMany: false', async () => {
      vi.mocked(vscode.window.showOpenDialog).mockResolvedValue(undefined as never)
      capturedWebviewMessageHandler!({ type: 'IMPORT_JSON', payload: {} })
      await Promise.resolve()
      expect(vscode.window.showOpenDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: { 'JSON': ['json'] },
          canSelectMany: false,
          canSelectFiles: true,
        })
      )
    })

    it('IMPORT_JSON: posts LOAD_JSON to webview when file read succeeds with valid JSON', async () => {
      const validJson = '{"version":1,"exportedAt":"2026-05-19T00:00:00.000Z","nodes":[],"edges":[],"viewport":{"x":0,"y":0,"zoom":1}}'
      const fakeUri = vscode.Uri.file('/test/canvas.json')
      vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([fakeUri] as never)
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(new TextEncoder().encode(validJson) as never)
      capturedWebviewMessageHandler!({ type: 'IMPORT_JSON', payload: {} })
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(postMessageSpy).toHaveBeenCalledWith({
        type: 'LOAD_JSON',
        payload: { content: validJson },
      })
    })

    it('IMPORT_JSON: calls showErrorMessage when file content is invalid JSON', async () => {
      const fakeUri = vscode.Uri.file('/test/bad.json')
      vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([fakeUri] as never)
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(new TextEncoder().encode('not json at all') as never)
      vi.mocked(vscode.window.showErrorMessage).mockResolvedValue(undefined as never)
      capturedWebviewMessageHandler!({ type: 'IMPORT_JSON', payload: {} })
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Invalid JSON')
      )
      expect(postMessageSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'LOAD_JSON' }))
    })

    it('IMPORT_JSON: calls showErrorMessage when workspace.fs.readFile rejects', async () => {
      const fakeUri = vscode.Uri.file('/test/missing.json')
      vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([fakeUri] as never)
      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(new Error('file not found') as never)
      vi.mocked(vscode.window.showErrorMessage).mockResolvedValue(undefined as never)
      capturedWebviewMessageHandler!({ type: 'IMPORT_JSON', payload: {} })
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read JSON file')
      )
    })

    it('IMPORT_JSON: does not post any message when open dialog returns undefined (cancelled)', async () => {
      vi.mocked(vscode.window.showOpenDialog).mockResolvedValue(undefined as never)
      capturedWebviewMessageHandler!({ type: 'IMPORT_JSON', payload: {} })
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(postMessageSpy).not.toHaveBeenCalled()
    })
  })

  describe('EXPORT json format', () => {
    const fakeContext = {
      subscriptions: [],
      extensionUri: vscode.Uri.file('/fake/extension'),
    } as unknown as vscode.ExtensionContext

    const fakeDocument = {
      uri: vscode.Uri.file('/test/diagram.mmd'),
      getText: vi.fn(() => 'flowchart TD\n  A[Test]'),
      lineCount: 2,
    } as unknown as vscode.TextDocument

    let capturedWebviewMessageHandler: ((msg: WebviewToHostMessage) => void) | undefined

    beforeEach(() => {
      capturedWebviewMessageHandler = undefined

      vi.mocked(vscode.workspace.onDidChangeTextDocument).mockImplementation(
        () => ({ dispose: vi.fn() })
      )

      vi.mocked(vscode.workspace.applyEdit).mockResolvedValue(true as never)

      vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
        get: vi.fn(() => true),
      } as unknown as vscode.WorkspaceConfiguration)

      const fakePanel = {
        webview: {
          options: {},
          html: '',
          onDidReceiveMessage: vi.fn((cb: (msg: WebviewToHostMessage) => void) => {
            capturedWebviewMessageHandler = cb
            return { dispose: vi.fn() }
          }),
          postMessage: vi.fn(),
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

    it('EXPORT json: calls showSaveDialog with JSON filter when format is json', async () => {
      const fakeUri = vscode.Uri.file('/test/canvas.json')
      vi.mocked(vscode.window.showSaveDialog).mockResolvedValue(fakeUri as never)
      vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValue(undefined as never)
      capturedWebviewMessageHandler!({
        type: 'EXPORT',
        payload: { content: '{}', format: 'json', subtype: 'file' },
      })
      await Promise.resolve()
      expect(vscode.window.showSaveDialog).toHaveBeenCalledWith(
        expect.objectContaining({ filters: { 'JSON': ['json'] } })
      )
    })

    it('EXPORT json: calls writeFile with TextEncoder encoded content for json format', async () => {
      const fakeUri = vscode.Uri.file('/test/canvas.json')
      const jsonContent = '{"version":1}'
      vi.mocked(vscode.window.showSaveDialog).mockResolvedValue(fakeUri as never)
      vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValue(undefined as never)
      capturedWebviewMessageHandler!({
        type: 'EXPORT',
        payload: { content: jsonContent, format: 'json', subtype: 'file' },
      })
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(
        fakeUri,
        expect.any(Uint8Array)
      )
    })
  })
})
