import React from 'react'
import { EditableCellProps, Structure, Table } from '../../types'
import { isTableHeader } from '../../utils'

export const EditableCell: React.FC<EditableCellProps> = ({ 
  value, 
  onChange, 
  isSelected, 
  onFocus, 
  onEnterPress, 
  onArrowKeyPress, 
  shouldStartEditing, 
  onEditingStarted, 
  structure, 
  onMouseDown, 
  onMouseEnter, 
  onMouseUp, 
  onRightClick, 
  onHeaderHover, 
  onAddColumn, 
  row, 
  col, 
  isMergedCell 
}) => {
  const [cellValue, setCellValue] = React.useState(value)
  const [isEditing, setIsEditing] = React.useState(false)

  const handleBlur = () => {
    onChange(cellValue)
    setIsEditing(false)
  }

  const handleFocus = () => {
    onFocus()
    setIsEditing(true)
  }

  const handleDoubleClick = () => {
    setIsEditing(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onChange(cellValue)
      setIsEditing(false)
      if (onEnterPress) {
        onEnterPress()
      }
    }
  }
  
  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      if (onArrowKeyPress) {
        onArrowKeyPress(e.key as 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight')
      }
    } else if (e.key === 'Enter' || e.key === 'F2') {
      // Start editing on Enter or F2
      e.preventDefault()
      setIsEditing(true)
    }
  }

  React.useEffect(() => {
    setCellValue(value)
  }, [value])

  // Auto-start editing when shouldStartEditing is true
  React.useEffect(() => {
    if (shouldStartEditing && isSelected) {
      setIsEditing(true)
      if (onEditingStarted) {
        onEditingStarted()
      }
    }
  }, [shouldStartEditing, isSelected, onEditingStarted])

  // Check if this cell is a header in a table
  const isHeaderCell = (): boolean => {
    if (!structure || structure.type !== 'table') return false
    
    const table = structure as Table
    const { startPosition } = table
    const headerRows = table.headerRows || 1
    const headerCols = table.headerCols || 1
    
    // Check if cell is within header row range
    const isInHeaderRows = (table.hasHeaderRow === true) && 
      row >= startPosition.row && 
      row < startPosition.row + headerRows
    
    // Check if cell is within header column range
    const isInHeaderCols = (table.hasHeaderCol === true) && 
      col >= startPosition.col && 
      col < startPosition.col + headerCols
    
    return isInHeaderRows || isInHeaderCols
  }

  // Get cell styling classes
  const getCellClasses = (): string => {
    let classes = 'w-full h-full px-2 py-1 cursor-cell flex items-center'
    
    if (isHeaderCell()) {
      classes += ' font-bold'
    }
    
    // Center text in merged cells
    if (isMergedCell) {
      classes += ' justify-center'
    }
    
    return classes
  }

  // Get cell background styling
  const getCellStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = { 
      width: '100%', 
      height: '100%',
    }
    
    if (isHeaderCell() && structure?.type === 'table') {
      // Use green background to match table border color
      return { ...baseStyle, backgroundColor: '#10b981', opacity: 0.8 }
    }
    
    return baseStyle
  }

  // Only show borders for individual cells and selection
  const getDisplay = (): string => {
    if (isSelected) {
      return 'bg-blue-100' // Selection border
    }
    return 'border-none' // No border for array/table cells (they get overlay borders)
  }

  return (
    <div 
      className={`w-full h-full relative ${getDisplay()}`}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseUp={onMouseUp}
      onContextMenu={onRightClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleCellKeyDown}
      tabIndex={isSelected ? 0 : -1}
    >
      {isEditing ? (
        <input
          type="text"
          value={cellValue}
          onChange={(e) => setCellValue(e.target.value)}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="w-full h-full outline-none px-2 py-1 bg-transparent"
          style={{ minWidth: '80px', minHeight: '30px' }}
          autoFocus
        />
      ) : (
        <div 
          className={getCellClasses()}
          style={getCellStyle()}
          title={structure?.name ? `${structure.type}: ${structure.name}` : undefined}
          onClick={() => setIsEditing(true)}
        >
          {cellValue || '\u00A0'}
        </div>
      )}
    </div>
  )
}
