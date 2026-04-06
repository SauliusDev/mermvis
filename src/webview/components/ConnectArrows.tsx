import React from 'react'

interface ConnectArrowsProps {
  isVisible: boolean
  nodeId: string
}

const DIRECTIONS = [
  { dir: 'top',    icon: '▲', title: 'Connect top' },
  { dir: 'right',  icon: '▶', title: 'Connect right' },
  { dir: 'bottom', icon: '▼', title: 'Connect bottom' },
  { dir: 'left',   icon: '◀', title: 'Connect left' },
] as const

// Placeholder connect arrows — Story 3.3 adds onClick spawn behavior
export default function ConnectArrows({ isVisible, nodeId }: ConnectArrowsProps): React.JSX.Element | null {
  if (!isVisible) return null

  return (
    <div className="connect-arrows" data-nodeid={nodeId}>
      {DIRECTIONS.map(({ dir, icon, title }) => (
        <button
          key={dir}
          className={`connect-arrow connect-arrow--${dir}`}
          title={title}
          type="button"
          // onClick — Story 3.3 adds: create new connected node in this direction
        >
          {icon}
        </button>
      ))}
    </div>
  )
}
