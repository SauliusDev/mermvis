// ─── Shared Types ────────────────────────────────────────────────────────────

export interface LayoutSidecar {
  version: 1
  nodes: Record<string, { x: number; y: number; width?: number; height?: number }>
  viewport: { x: number; y: number; zoom: number }
}

// ─── Host → Webview ──────────────────────────────────────────────────────────

export type HostToWebviewMessage =
  | { type: 'LOAD'; payload: LoadPayload }
  | { type: 'THEME_CHANGED'; payload: ThemePayload }
  | { type: 'EXTERNAL_FILE_CHANGE'; payload: ExternalFileChangePayload }
  | { type: 'SAVE_RESULT'; payload: SaveResultPayload }

export interface LoadPayload {
  content: string            // raw .mmd file text
  layoutJson: string | null  // stringified .mmd.layout.json, or null if no sidecar
  filename?: string          // basename of the .mmd file; sent by MermvisEditorProvider on document open
  autoSave?: boolean         // whether auto-save debounce is enabled; defaults to true
}

export interface ThemePayload {
  kind: 'dark' | 'light' | 'highContrast'
}

export interface ExternalFileChangePayload {
  content: string  // new file content after external edit
}

export interface SaveResultPayload {
  success: boolean
  error?: string
}

// ─── Webview → Host ──────────────────────────────────────────────────────────

export type WebviewToHostMessage =
  | { type: 'SAVE'; payload: SavePayload }
  | { type: 'READY'; payload: Record<string, never> }
  | { type: 'EXPORT'; payload: ExportPayload }
  | { type: 'LOG'; payload: LogPayload }

export interface SavePayload {
  content: string    // serialized .mmd text from serialize()
  layoutJson: string // stringified layout sidecar JSON
}

export interface ExportPayload {
  content: string
  format: 'mmd'
}

export interface LogPayload {
  level: 'info' | 'warn' | 'error'
  message: string
}
