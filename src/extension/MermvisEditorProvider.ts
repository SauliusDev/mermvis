import * as vscode from 'vscode'
import * as crypto from 'crypto'
import * as fs from 'fs'
import { getWebviewHtml } from '@tomjs/vite-plugin-vscode/webview'
import type { HostToWebviewMessage, WebviewToHostMessage } from '../shared/types'
import { detectDiagramType } from './diagramTypeDetector'
import { readSidecar, writeSidecar } from './layoutSidecar'

export class MermvisEditorProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'mermvis.editor'

  private static outputChannel: vscode.OutputChannel | undefined

  private _suppressNextExternalChange = false

  static register(context: vscode.ExtensionContext): vscode.Disposable {
    if (!MermvisEditorProvider.outputChannel) {
      MermvisEditorProvider.outputChannel = vscode.window.createOutputChannel('Mermvis')
      context.subscriptions.push(MermvisEditorProvider.outputChannel)
    }
    return vscode.window.registerCustomEditorProvider(
      MermvisEditorProvider.viewType,
      new MermvisEditorProvider(context),
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): void {
    if (token.isCancellationRequested) return

    // Fallback: non-flowchart files open in VSCode's default text editor
    if (detectDiagramType(document.getText()) === 'unknown') {
      MermvisEditorProvider.outputChannel?.appendLine(
        `[INFO] Non-flowchart file detected, falling back to text editor: ${document.uri.fsPath}`
      )
      webviewPanel.dispose()
      vscode.commands.executeCommand('vscode.openWith', document.uri, 'default').then(
        undefined,
        (err: unknown) => {
          MermvisEditorProvider.outputChannel?.appendLine(
            `[ERROR] Failed to open fallback text editor: ${String(err)}`
          )
        }
      )
      return
    }

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    }

    const disposables: vscode.Disposable[] = []

    disposables.push(
      webviewPanel.webview.onDidReceiveMessage((msg: WebviewToHostMessage) => {
        this._handleWebviewMessage(msg, document, webviewPanel)
      })
    )

    webviewPanel.webview.html = this._getHtmlForWebview(webviewPanel.webview)

    disposables.push(
      vscode.workspace.onDidChangeTextDocument(e => {
        if (e.document.uri.toString() !== document.uri.toString()) return
        if (this._suppressNextExternalChange) {
          this._suppressNextExternalChange = false
          return
        }
        const msg: HostToWebviewMessage = {
          type: 'EXTERNAL_FILE_CHANGE',
          payload: { content: e.document.getText() },
        }
        webviewPanel.webview.postMessage(msg)
      })
    )

    webviewPanel.onDidDispose(() => disposables.forEach(d => d.dispose()))
  }

  private _handleWebviewMessage(
    msg: WebviewToHostMessage,
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel
  ): void {
    switch (msg.type) {
      case 'READY': {
        const autoSave = vscode.workspace.getConfiguration('mermvis').get<boolean>('autoSave', true)
        const layoutJson = readSidecar(document.uri.fsPath)
        const loadMsg: HostToWebviewMessage = {
          type: 'LOAD',
          payload: {
            content: document.getText(),
            layoutJson,
            filename: document.uri.path.split('/').pop() ?? 'untitled.mmd',
            autoSave,
          },
        }
        webviewPanel.webview.postMessage(loadMsg)
        break
      }
      case 'SAVE': {
        const edit = new vscode.WorkspaceEdit()
        edit.replace(
          document.uri,
          new vscode.Range(0, 0, document.lineCount, 0),
          msg.payload.content
        )
        this._suppressNextExternalChange = true
        vscode.workspace.applyEdit(edit).then(
          success => {
            if (success) {
              try {
                writeSidecar(document.uri.fsPath, msg.payload.layoutJson)
              } catch (err) {
                MermvisEditorProvider.outputChannel?.appendLine(`[ERROR] Failed to write layout sidecar: ${String(err)}`)
              }
            }
            const resultMsg: HostToWebviewMessage = {
              type: 'SAVE_RESULT',
              payload: { success },
            }
            webviewPanel.webview.postMessage(resultMsg)
          },
          (err: unknown) => {
            const resultMsg: HostToWebviewMessage = {
              type: 'SAVE_RESULT',
              payload: { success: false, error: String(err) },
            }
            webviewPanel.webview.postMessage(resultMsg)
          }
        )
        break
      }
      case 'LOG': {
        const { level, message } = msg.payload
        MermvisEditorProvider.outputChannel?.appendLine(`[${level.toUpperCase()}] ${message}`)
        if (level === 'error') {
          MermvisEditorProvider.outputChannel?.show(true)
        }
        break
      }
      case 'EXPORT': {
        // Story 11 — no-op
        break
      }
      default: {
        const _exhaustive: never = msg
        break
      }
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const serverUrl = process.env.VITE_DEV_SERVER_URL
    if (serverUrl) {
      return this._buildDevHtml(serverUrl)
    }
    return this._buildProductionHtml(webview)
  }

  private _buildDevHtml(serverUrl: string): string {
    const html = getWebviewHtml({ serverUrl })
    // Permissive CSP for dev mode — the iframe bridge uses inline scripts and HMR uses WebSocket
    const csp = [
      `default-src 'none'`,
      `script-src 'unsafe-inline' 'unsafe-eval' ${serverUrl}`,
      `style-src 'unsafe-inline' ${serverUrl} https://fonts.googleapis.com`,
      `font-src https://fonts.gstatic.com`,
      `frame-src ${serverUrl}`,
      `connect-src ${serverUrl} ws: wss:`,
      `img-src vscode-resource: data: blob:`,
    ].join('; ')
    return html.replace('<head>', `<head>\n  <meta http-equiv="Content-Security-Policy" content="${csp}">`)
  }

  private _buildProductionHtml(webview: vscode.Webview): string {
    const nonce = crypto.randomUUID().replace(/-/g, '')
    const webviewOutUri = vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview')

    let html: string
    try {
      html = fs.readFileSync(
        vscode.Uri.joinPath(webviewOutUri, 'index.html').fsPath,
        'utf-8'
      )
    } catch (err) {
      MermvisEditorProvider.outputChannel?.appendLine(`[ERROR] Failed to read webview index.html: ${String(err)}`)
      return `<!DOCTYPE html><html><body><p>Mermvis: webview not built. Run <code>pnpm build</code>.</p></body></html>`
    }

    // Transform /assets/... paths to vscode-webview:// URIs
    html = html.replace(/ src="(\/[^"]+)"/g, (_match, assetPath: string) => {
      const uri = webview.asWebviewUri(vscode.Uri.joinPath(webviewOutUri, assetPath.slice(1)))
      return ` src="${uri}"`
    })

    html = html.replace(/ href="(\/[^"]+)"/g, (_match, assetPath: string) => {
      const uri = webview.asWebviewUri(vscode.Uri.joinPath(webviewOutUri, assetPath.slice(1)))
      return ` href="${uri}"`
    })

    // Stamp nonce on every <script tag before injecting the CSP
    html = html.replace(/<script(?=[ >])/g, `<script nonce="${nonce}"`)

    const csp = [
      `default-src 'none'`,
      `img-src ${webview.cspSource} data:`,
      `style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com`,
      `font-src https://fonts.gstatic.com`,
      `script-src 'nonce-${nonce}'`,
    ].join('; ')
    html = html.replace('<head>', `<head>\n  <meta http-equiv="Content-Security-Policy" content="${csp}">`)

    return html
  }
}
