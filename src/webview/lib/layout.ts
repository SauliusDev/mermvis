import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'
import type { FlowNodeData, FlowEdgeData } from '@/lib/store'

export function applyDagreLayout(
  nodes: Node<FlowNodeData>[],
  edges: Edge<FlowEdgeData>[]
): Node<FlowNodeData>[] {
  if (nodes.length === 0) return nodes

  const g = new dagre.graphlib.Graph({ compound: true })
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TD', nodesep: 50, ranksep: 70 })

  // Add subgraph containers first — they must exist before setParent calls
  for (const node of nodes.filter(n => n.data.isSubgraph)) {
    g.setNode(node.id, { width: node.width ?? 300, height: node.height ?? 200 })
  }
  // Add regular nodes
  for (const node of nodes.filter(n => !n.data.isSubgraph)) {
    g.setNode(node.id, {
      width: node.measured?.width ?? 80,
      height: node.measured?.height ?? 40,
    })
  }
  // Set parent relationships — skip if parentId references a node not in the graph
  for (const node of nodes.filter(n => n.parentId)) {
    if (g.hasNode(node.parentId!)) {
      g.setParent(node.id, node.parentId!)
    }
  }
  // Add edges
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  return nodes.map(node => {
    const dagreNode = g.node(node.id)
    if (!dagreNode) return node

    const { x, y, width, height } = dagreNode
    let position = { x: x - width / 2, y: y - height / 2 }

    if (node.parentId) {
      const parentDagre = g.node(node.parentId)
      if (parentDagre) {
        const parentX = parentDagre.x - (parentDagre.width ?? 0) / 2
        const parentY = parentDagre.y - (parentDagre.height ?? 0) / 2
        position = { x: position.x - parentX, y: position.y - parentY }
      }
    }

    return { ...node, position }
  })
}
