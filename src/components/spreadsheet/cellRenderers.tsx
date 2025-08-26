import React from 'react'
import { Structure, TableStructure, StructureMap, PositionMap } from '../../types'
import { getEndPosition } from '../../utils/structureUtils'

// =============================================================================
// CELL RENDERING UTILITIES
// =============================================================================

/**
 * Check if a cell is a table header cell
 */
export function isHeaderCell(row: number, col: number, structure?: Structure): boolean {
  if (!structure || structure.type !== 'table') return false
  
  const table = structure as TableStructure
  const { startPosition } = table
  const headerRows = table.colHeaderLevels || 0
  const headerCols = table.rowHeaderLevels || 0
  
  // Check if cell is within header row range (column headers)
  const isInHeaderRows = headerRows > 0 && 
    row >= startPosition.row && 
    row < startPosition.row + headerRows
  
  // Check if cell is within header column range (row headers)
  const isInHeaderCols = headerCols > 0 && 
    col >= startPosition.col && 
    col < startPosition.col + headerCols
  
  return isInHeaderRows || isInHeaderCols
}

/**
 * Get CSS classes for a cell
 */
export function getCellClasses(row: number, col: number, structure?: Structure): string {
  let classes = 'w-full h-full px-2 py-1 cursor-cell flex items-center'
  
  if (structure && isHeaderCell(row, col, structure)) {
    classes += ' font-bold'
  }
  
  // Center content for resized cells (merged cells)
  if (structure && structure.type === 'cell') {
    const { startPosition, dimensions } = structure
    if (dimensions.rows > 1 || dimensions.cols > 1) {
      classes += ' justify-center text-center'
    }
  }
  
  return classes
}

/**
 * Get inline styles for a cell
 */
export function getCellStyle(row: number, col: number, structure?: Structure, isInRange?: boolean): React.CSSProperties {
  const baseStyle: React.CSSProperties = { 
    width: '100%', 
    height: '100%'
  }
  
  // Default background
  baseStyle.backgroundColor = '#F3F4F6'
  
  if (structure && isHeaderCell(row, col, structure) && structure.type === 'table') {
    // Use green background to match table border color
    return { ...baseStyle, backgroundColor: 'rgba(0, 166, 62, 0.8)' }
  }
  
  if (structure?.type === 'cell') {
    return { ...baseStyle, backgroundColor: 'rgba(255, 255, 255, 1)' }
  }

  // If cell is in selected range, use blue background
  if (isInRange) {
    return { ...baseStyle, backgroundColor: '#dbeafe' } // bg-blue-100 equivalent
  }
  
  return baseStyle
}

/**
 * Check if a cell position is covered by a resized cell
 */
export function isCellCoveredByResizedCell(row: number, col: number, structures: StructureMap): boolean {
  for (const [, structure] of structures) {
    if (structure.type === 'cell') {
      const { startPosition, dimensions } = structure
      const endPosition = getEndPosition(startPosition, dimensions)
      const rows = endPosition.row - startPosition.row + 1
      const cols = endPosition.col - startPosition.col + 1
      if (rows > 1 || cols > 1) {
        // This is a resized cell
        if (row >= startPosition.row && row < startPosition.row + rows &&
            col >= startPosition.col && col < startPosition.col + cols &&
            !(row === startPosition.row && col === startPosition.col)) {
          // This position is covered by the resized cell (but not the top-left corner)
          return true
        }
      }
    }
  }
  return false
}

// =============================================================================
// CELL CONTENT RENDERING
// =============================================================================

export interface CellContentProps {
  row: number
  col: number
  value: string
  isSelected: boolean
  structure?: Structure
  isInRange?: boolean
  cellKey: string
  isEditing: boolean
  cellValue: string
  
  // Event handlers
  handleMouseEnter: (row: number, col: number) => void
  handleMouseUp: () => void
  handleRightClick: (row: number, col: number, e: React.MouseEvent) => void
  handleCellDoubleClick: (row: number, col: number) => void
  handleCellKeyDownGeneral: (e: React.KeyboardEvent, row: number, col: number) => void
  handleCellBlur: (row: number, col: number, e?: React.FocusEvent<HTMLInputElement>) => void
  handleCellFocusChange: (row: number, col: number) => void
  handleCellKeyDown: (e: React.KeyboardEvent, row: number, col: number) => void
  
  // State setters
  setCellValues: React.Dispatch<React.SetStateAction<Map<string, string>>>
}

/**
 * Render the content of a cell (including editing state)
 */
export function renderCellContent(props: CellContentProps): JSX.Element {
  const {
    row,
    col,
    isSelected,
    structure,
    isInRange,
    cellKey,
    isEditing,
    cellValue,
    handleMouseEnter,
    handleMouseUp,
    handleRightClick,
    handleCellDoubleClick,
    handleCellKeyDownGeneral,
    handleCellBlur,
    handleCellFocusChange,
    handleCellKeyDown,
    setCellValues
  } = props

  return (
    <div 
      className="w-full h-full relative"
      onMouseEnter={() => handleMouseEnter(row, col)}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => handleRightClick(row, col, e)}
      onDoubleClick={() => handleCellDoubleClick(row, col)}
      onKeyDown={(e) => handleCellKeyDownGeneral(e, row, col)}
      tabIndex={isSelected ? 0 : -1}
    >
      {isEditing ? (
        <input
          type="text"
          value={cellValue}
          data-cell-key={cellKey}
          onChange={(e) => {
            setCellValues(prev => {
              const newMap = new Map(prev)
              newMap.set(cellKey, e.target.value)
              return newMap
            })
          }}
          onBlur={(e) => handleCellBlur(row, col, e)}
          onFocus={() => handleCellFocusChange(row, col)}
          onKeyDown={(e) => handleCellKeyDown(e, row, col)}
          className="w-full h-full outline-none px-2 py-1"
          style={{ 
            minWidth: '80px', 
            minHeight: '30px',
            backgroundColor: isInRange ? '#dbeafe' : 'transparent'
          }}
          autoFocus
        />
      ) : (
        <div 
          className={getCellClasses(row, col, structure)}
          style={getCellStyle(row, col, structure, isInRange)}
          title={structure?.name ? `${structure.type}: ${structure.name}` : undefined}
        >
          {cellValue || '\u00A0'}
        </div>
      )}
    </div>
  )
}
