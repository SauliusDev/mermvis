import * as assert from 'assert'
import * as vscode from 'vscode'

// Mocha TDD style (not describe/it — this is integration test territory)
suite('Extension Integration Smoke Test', () => {
  test('VS Code API is available in test environment', () => {
    assert.ok(vscode.version, 'vscode.version should be a non-empty string')
    assert.strictEqual(typeof vscode.version, 'string')
  })

  test('VS Code window API methods are available', () => {
    assert.strictEqual(typeof vscode.window.showInformationMessage, 'function')
    assert.strictEqual(typeof vscode.window.createOutputChannel, 'function')
  })

  test('VS Code workspace API is available', () => {
    assert.strictEqual(typeof vscode.workspace.applyEdit, 'function')
    assert.strictEqual(typeof vscode.workspace.onDidChangeTextDocument, 'function')
  })
})
