import type { Node, XYPosition } from '@xyflow/react'
import type { FlowNodeData } from './store'

export function findDropTargetSubgraph(
  draggedNode: Node<FlowNodeData>,
  allNodes: Node<FlowNodeData>[]
): string | null {
  const nodeW = draggedNode.measured?.width ?? 80
  const nodeH = draggedNode.measured?.height ?? 40
  const cx = draggedNode.position.x + nodeW / 2
  const cy = draggedNode.position.y + nodeH / 2

  let bestId: string | null = null
  let bestArea = Infinity

  for (const sg of allNodes) {
    if (!sg.data.isSubgraph) continue
    if (sg.id === draggedNode.parentId) continue
    if (sg.id === draggedNode.id) continue
    if (sg.parentId === draggedNode.id) continue

    const sgW = sg.width ?? sg.measured?.width ?? 300
    const sgH = sg.height ?? sg.measured?.height ?? 200
    const { x, y } = sg.position

    if (cx >= x && cx <= x + sgW && cy >= y && cy <= y + sgH) {
      const area = sgW * sgH
      if (area < bestArea) {
        bestArea = area
        bestId = sg.id
      }
    }
  }

  return bestId
}

export function isNodeOutsideParent(
  childNode: Node<FlowNodeData>,
  parentNode: Node<FlowNodeData>
): boolean {
  const nodeW = childNode.measured?.width ?? 80
  const nodeH = childNode.measured?.height ?? 40
  const cx = childNode.position.x + nodeW / 2
  const cy = childNode.position.y + nodeH / 2

  const parentW = parentNode.width ?? parentNode.measured?.width ?? 300
  const parentH = parentNode.height ?? parentNode.measured?.height ?? 200

  return cx < 0 || cx > parentW || cy < 0 || cy > parentH
}

export function toRelativePosition(absolutePos: XYPosition, parentPos: XYPosition): XYPosition {
  return {
    x: absolutePos.x - parentPos.x,
    y: absolutePos.y - parentPos.y,
  }
}

export function toAbsolutePosition(relativePos: XYPosition, parentPos: XYPosition): XYPosition {
  return {
    x: relativePos.x + parentPos.x,
    y: relativePos.y + parentPos.y,
  }
}
