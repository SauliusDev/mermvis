import type { Node, Edge } from '@xyflow/react'
import type { FlowNodeData, FlowEdgeData } from '@/lib/store'
import { shapeTemplates, edgeConnectors } from '@/lib/constants'

export interface SerializeInput {
  nodes: Node<FlowNodeData>[]
  edges: Edge<FlowEdgeData>[]
  passthroughLines?: string[]
}

export function serialize(input: SerializeInput): string {
  const lines: string[] = ['flowchart TD']

  const childNodeIds = new Set(
    input.nodes.filter(n => n.parentId !== undefined).map(n => n.id)
  )

  for (const node of input.nodes) {
    if (childNodeIds.has(node.id)) continue

    const { id, data: { label, shape } } = node
    if (shape === 'subgraph') {
      lines.push(`  subgraph ${id} [${label}]`)
      const children = input.nodes.filter(n => n.parentId === id)
      for (const child of children) {
        const { open, close } = shapeTemplates[child.data.shape]
        lines.push(`    ${child.id}${open}${child.data.label}${close}`)
      }
      lines.push('  end')
    } else {
      const { open, close } = shapeTemplates[shape]
      lines.push(`  ${id}${open}${label}${close}`)
    }
  }

  for (const edge of input.edges) {
    const { source, target, data } = edge
    const connector = edgeConnectors[data?.style ?? 'arrow']
    const label = data?.label
    if (label) {
      lines.push(`  ${source} ${connector}|${label}| ${target}`)
    } else {
      lines.push(`  ${source} ${connector} ${target}`)
    }
  }

  if (input.passthroughLines) {
    for (const line of input.passthroughLines) {
      lines.push(`  ${line}`)
    }
  }

  return lines.join('\n') + '\n'
}
