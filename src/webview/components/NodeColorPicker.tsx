import React, { useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/lib/store'

const FILL_SWATCHES = [
  '#1e2022', '#1e2a3a', '#1e2a22', '#2a1e2a',
  '#2a221e', '#2a2a1e', '#1e2a2a', '#2a1e22',
]
const STROKE_SWATCHES = [
  '#3a3c3e', '#3a6a8a', '#3a6a3a', '#6a3a6a',
  '#6a4a3a', '#6a6a3a', '#3a6a6a', '#6a3a4a',
]
const TEXT_SWATCHES = [
  '#bfbfbf', '#79b3d3', '#79c97d', '#c36dc3',
  '#c3a079', '#c3c379', '#79c3c3', '#c379a0',
]

interface NodeColorPickerProps {
  nodeId: string
  fillColor?: string
  strokeColor?: string
  textColor?: string
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

interface SwatchSectionProps {
  label: string
  swatches: string[]
  selected?: string
  onSelect: (color: string) => void
}

function SwatchSection({ label, swatches, selected, onSelect }: SwatchSectionProps): React.JSX.Element {
  return (
    <div className="node-color-picker__section">
      <span className="node-color-picker__label">{label}</span>
      <div className="node-color-picker__swatches" role="group" aria-label={`${label} color swatches`}>
        {swatches.map(color => (
          <button
            key={color}
            className={`node-color-picker__swatch${selected === color ? ' node-color-picker__swatch--active' : ''}`}
            style={{ background: color }}
            aria-label={`${label} color ${color}`}
            aria-pressed={selected === color}
            title={color}
            onClick={() => onSelect(color)}
          />
        ))}
      </div>
    </div>
  )
}

export default function NodeColorPicker({
  nodeId, fillColor, strokeColor, textColor, onClose, triggerRef,
}: NodeColorPickerProps): React.JSX.Element {
  const pickerRef = useRef<HTMLDivElement>(null)
  const updateNodeColors = useStore(s => s.updateNodeColors)

  useEffect(() => {
    function handleMouseDown(e: MouseEvent): void {
      if (
        pickerRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) return
      onClose()
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose, triggerRef])

  const handleKeyDown = useCallback((e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    }
  }, [onClose])

  function handleFill(color: string): void {
    updateNodeColors(nodeId, { fillColor: color, strokeColor, textColor })
  }

  function handleStroke(color: string): void {
    updateNodeColors(nodeId, { fillColor, strokeColor: color, textColor })
  }

  function handleText(color: string): void {
    updateNodeColors(nodeId, { fillColor, strokeColor, textColor: color })
  }

  function handleReset(): void {
    updateNodeColors(nodeId, { fillColor: undefined, strokeColor: undefined, textColor: undefined })
  }

  return (
    <div
      ref={pickerRef}
      className="node-color-picker"
      role="dialog"
      aria-label="Node color picker"
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      <SwatchSection
        label="Fill"
        swatches={FILL_SWATCHES}
        selected={fillColor}
        onSelect={handleFill}
      />
      <SwatchSection
        label="Border"
        swatches={STROKE_SWATCHES}
        selected={strokeColor}
        onSelect={handleStroke}
      />
      <SwatchSection
        label="Text"
        swatches={TEXT_SWATCHES}
        selected={textColor}
        onSelect={handleText}
      />
      <button
        className="node-color-picker__reset"
        onClick={handleReset}
        aria-label="Reset node colors to default"
      >
        Reset
      </button>
    </div>
  )
}
