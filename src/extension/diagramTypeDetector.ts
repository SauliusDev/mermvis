const FLOWCHART_KEYWORDS = new Set(['flowchart', 'graph'])

/**
 * Detects whether a .mmd file's content is a supported flowchart type.
 * Returns 'flowchart' for flowchart/graph diagrams and empty/comment-only files.
 * Returns 'unknown' for all other diagram types (sequenceDiagram, classDiagram, etc.)
 */
export function detectDiagramType(content: string): 'flowchart' | 'unknown' {
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('%%')) {
      continue
    }
    // First non-blank, non-comment line determines diagram type
    const keyword = trimmed.split(/\s+/)[0].toLowerCase()
    return FLOWCHART_KEYWORDS.has(keyword) ? 'flowchart' : 'unknown'
  }

  // All lines were empty or comments — treat as new empty flowchart
  return 'flowchart'
}
