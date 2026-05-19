import type { Node, Edge } from '@xyflow/react'
import type { FlowNodeData, FlowEdgeData } from '@/lib/store'

export interface CanvasJson {
  version: 1
  exportedAt: string
  nodes: Node<FlowNodeData>[]
  edges: Edge<FlowEdgeData>[]
  viewport: { x: number; y: number; zoom: number }
}

export function exportCanvasToJson(
  nodes: Node<FlowNodeData>[],
  edges: Edge<FlowEdgeData>[],
  viewport: { x: number; y: number; zoom: number }
): string {
  const cleanNodes = nodes.map(n => ({
    id: n.id,
    type: n.type,
    position: { x: n.position.x, y: n.position.y },
    data: { ...n.data },
    ...(n.width !== undefined && { width: n.width }),
    ...(n.height !== undefined && { height: n.height }),
    ...(n.parentId !== undefined && { parentId: n.parentId }),
    ...(n.extent === 'parent' && { extent: 'parent' as const }),
  }))

  const cleanEdges = edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    ...(e.data && { data: { ...e.data } }),
    ...(e.type && { type: e.type }),
  }))

  const canvas: CanvasJson = {
    version: 1,
    exportedAt: new Date().toISOString(),
    nodes: cleanNodes as Node<FlowNodeData>[],
    edges: cleanEdges as Edge<FlowEdgeData>[],
    viewport,
  }

  return JSON.stringify(canvas, null, 2)
}

export function importCanvasFromJson(jsonString: string): CanvasJson | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    return null
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as CanvasJson).version !== 1 ||
    !Array.isArray((parsed as CanvasJson).nodes) ||
    !Array.isArray((parsed as CanvasJson).edges) ||
    typeof (parsed as CanvasJson).viewport !== 'object' ||
    (parsed as CanvasJson).viewport === null ||
    typeof (parsed as CanvasJson).viewport.x !== 'number' ||
    typeof (parsed as CanvasJson).viewport.y !== 'number' ||
    typeof (parsed as CanvasJson).viewport.zoom !== 'number'
  ) {
    return null
  }
  return parsed as CanvasJson
}
