import { describe, expect, it } from 'vitest'
import { detectDiagramType } from './diagramTypeDetector'

describe('detectDiagramType', () => {
  describe('flowchart cases', () => {
    it('detects lowercase flowchart keyword', () => {
      expect(detectDiagramType('flowchart LR\n  A --> B')).toBe('flowchart')
    })

    it('detects graph keyword', () => {
      expect(detectDiagramType('graph TD\n  A --> B')).toBe('flowchart')
    })

    it('is case-insensitive for flowchart', () => {
      expect(detectDiagramType('FLOWCHART LR\n  A --> B')).toBe('flowchart')
    })

    it('is case-insensitive for graph', () => {
      expect(detectDiagramType('GRAPH TD')).toBe('flowchart')
    })
  })

  describe('empty and comment-only cases', () => {
    it('returns flowchart for empty string', () => {
      expect(detectDiagramType('')).toBe('flowchart')
    })

    it('returns flowchart for whitespace-only content', () => {
      expect(detectDiagramType('  \n  \n  ')).toBe('flowchart')
    })

    it('returns flowchart for comment-only content', () => {
      expect(detectDiagramType('%% this is a comment\n%% another comment')).toBe('flowchart')
    })

    it('returns flowchart for comment followed by blank lines', () => {
      expect(detectDiagramType('%% comment\n\n')).toBe('flowchart')
    })

    it('skips leading comments before flowchart keyword', () => {
      expect(detectDiagramType('%% my diagram\nflowchart LR\n  A --> B')).toBe('flowchart')
    })

    it('skips blank lines before diagram keyword', () => {
      expect(detectDiagramType('\n\nflowchart LR')).toBe('flowchart')
    })
  })

  describe('non-flowchart cases', () => {
    it('detects sequenceDiagram as unknown', () => {
      expect(detectDiagramType('sequenceDiagram\n  Alice->>Bob: Hello')).toBe('unknown')
    })

    it('detects classDiagram as unknown', () => {
      expect(detectDiagramType('classDiagram\n  class Animal')).toBe('unknown')
    })

    it('detects gantt as unknown', () => {
      expect(detectDiagramType('gantt\n  title A')).toBe('unknown')
    })

    it('detects erDiagram as unknown', () => {
      expect(detectDiagramType('erDiagram\n  CUSTOMER')).toBe('unknown')
    })

    it('detects pie as unknown', () => {
      expect(detectDiagramType('pie\n  title Pets')).toBe('unknown')
    })

    it('detects gitGraph as unknown', () => {
      expect(detectDiagramType('gitGraph\n  commit')).toBe('unknown')
    })

    it('detects mindmap as unknown', () => {
      expect(detectDiagramType('mindmap\n  root')).toBe('unknown')
    })
  })
})
