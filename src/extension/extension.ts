import * as vscode from 'vscode'
import { MermvisEditorProvider } from './MermvisEditorProvider'

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(MermvisEditorProvider.register(context))
}

export function deactivate(): void {}
