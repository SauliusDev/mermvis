import * as vscode from 'vscode'

export class MermvisEditorProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'mermvis.editor'

  static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      MermvisEditorProvider.viewType,
      new MermvisEditorProvider(context),
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveCustomTextEditor(
    _document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): void {
    // Stub — full CSP-compliant implementation in Story 1.2
    webviewPanel.webview.html = `<!DOCTYPE html>
<html><body><div id="root">Mermvis loading...</div></body></html>`
  }
}
