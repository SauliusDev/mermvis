import type { Node, Edge } from '@xyflow/react'
import type { FlowNodeData, FlowEdgeData } from '@/lib/store'
import { shapeTemplates, edgeConnectors } from '@/lib/constants'

export interface SerializeInput {
  nodes: Node<FlowNodeData>[]
  edges: Edge<FlowEdgeData>[]
  passthroughLines?: string[]
}

function serializeBlock(
  node: Node<FlowNodeData>,
  input: SerializeInput,
  indent: string
): string[] {
  if (node.data.shape === 'subgraph') {
    const children = input.nodes.filter(n => n.parentId === node.id)
    return [
      `${indent}subgraph ${node.id} [${node.data.label}]`,
      ...children.flatMap(c => serializeBlock(c, input, indent + '  ')),
      `${indent}end`,
    ]
  }
  const { open, close } = shapeTemplates[node.data.shape]
  return [`${indent}${node.id}${open}${node.data.label}${close}`]
}

export function serialize(input: SerializeInput): string {
  const lines: string[] = ['flowchart TD']

  const childNodeIds = new Set(
    input.nodes.filter(n => n.parentId !== undefined).map(n => n.id)
  )

  for (const node of input.nodes) {
    if (childNodeIds.has(node.id)) continue
    lines.push(...serializeBlock(node, input, '  '))
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
