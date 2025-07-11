import { MergedCell, Position, Structure, Table } from '../types'
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH, DEFAULT_HEADER_HEIGHT, DEFAULT_HEADER_WIDTH, MAX_COLS, MAX_ROWS } from '../constants'

// UUID generation utility
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Key generation utilities
export const getCellKey = (row: number, col: number): string => `${row}-${col}`

export const getStructureKey = (row: number, col: number): string => `struct-${row}-${col}`

export const getMergedCellKey = (startRow: number, startCol: number, endRow: number, endCol: number): string => 
  `merged-${startRow}-${startCol}-${endRow}-${endCol}`

// Dimension calculation utilities
export const getColumnWidth = (colIndex: number, columnWidths: Map<number, number>): number => {
  return columnWidths.get(colIndex) || DEFAULT_CELL_WIDTH
}

export const getRowHeight = (rowIndex: number, rowHeights: Map<number, number>): number => {
  return rowHeights.get(rowIndex) || DEFAULT_CELL_HEIGHT
}

export const getHeaderHeight = (): number => DEFAULT_HEADER_HEIGHT

export const getHeaderWidth = (): number => DEFAULT_HEADER_WIDTH

// Position calculation utilities
export const getColumnPosition = (colIndex: number, columnWidths: Map<number, number>): number => {
  let position = getHeaderWidth()
  for (let i = 0; i < colIndex; i++) {
    position += getColumnWidth(i, columnWidths)
  }
  return position
}

export const getRowPosition = (rowIndex: number, rowHeights: Map<number, number>): number => {
  let position = getHeaderHeight()
  for (let i = 0; i < rowIndex; i++) {
    position += getRowHeight(i, rowHeights)
  }
  return position
}

// Viewport calculation utilities
export const calculateVisibleCols = (
  scrollLeft: number, 
  viewportWidth: number, 
  columnWidths: Map<number, number>
): { startCol: number; endCol: number } => {
  let startCol = 0
  let currentPos = getHeaderWidth()
  
  // Find start column
  while (startCol < MAX_COLS && currentPos + getColumnWidth(startCol, columnWidths) < scrollLeft) {
    currentPos += getColumnWidth(startCol, columnWidths)
    startCol++
  }
  
  // Find end column
  let endCol = startCol
  while (endCol < MAX_COLS && currentPos < scrollLeft + viewportWidth) {
    currentPos += getColumnWidth(endCol, columnWidths)
    endCol++
  }
  
  return { startCol: Math.max(0, startCol), endCol: Math.min(MAX_COLS, endCol + 2) }
}

export const calculateVisibleRows = (
  scrollTop: number, 
  viewportHeight: number, 
  rowHeights: Map<number, number>
): { startRow: number; endRow: number } => {
  let startRow = 0
  let currentPos = getHeaderHeight()
  
  // Find start row
  while (startRow < MAX_ROWS && currentPos + getRowHeight(startRow, rowHeights) < scrollTop) {
    currentPos += getRowHeight(startRow, rowHeights)
    startRow++
  }
  
  // Find end row
  let endRow = startRow
  while (endRow < MAX_ROWS && currentPos < scrollTop + viewportHeight) {
    currentPos += getRowHeight(endRow, rowHeights)
    endRow++
  }
  
  return { startRow: Math.max(0, startRow), endRow: Math.min(MAX_ROWS, endRow + 5) }
}

// Cell and structure utilities
export const getCellValue = (row: number, col: number, cellData: Map<string, string>): string => {
  return cellData.get(getCellKey(row, col)) || ''
}

export const getStructureAtPosition = (row: number, col: number, structures: Map<string, Structure>): Structure | undefined => {
  // Search through all structures to find one that contains this position
  for (const [id, structure] of structures) {
    // For single cell structures, check exact position match
    if (structure.type === 'cell') {
      if (structure.position.row === row && structure.position.col === col) {
        return structure
      }
    }
    // For array and table structures, check if position is within bounds
    else if (structure.type === 'array' || structure.type === 'table') {
      const { startPosition, endPosition } = structure
      if (row >= startPosition.row && row <= endPosition.row &&
          col >= startPosition.col && col <= endPosition.col) {
        return structure
      }
    }
    // For column structures, check if position matches
    else if (structure.type === 'column') {
      if (structure.position.row === row && structure.position.col === col) {
        return structure
      }
    }
  }
  return undefined
}

// Merged cell utilities
export const getMergedCellContaining = (row: number, col: number, mergedCells: Map<string, MergedCell>): MergedCell | null => {
  for (const [key, mergedCell] of mergedCells) {
    if (row >= mergedCell.startRow && row <= mergedCell.endRow &&
        col >= mergedCell.startCol && col <= mergedCell.endCol) {
      return mergedCell
    }
  }
  return null
}

export const shouldRenderCell = (row: number, col: number, mergedCells: Map<string, MergedCell>): boolean => {
  const mergedCell = getMergedCellContaining(row, col, mergedCells)
  if (!mergedCell) return true
  return row === mergedCell.startRow && col === mergedCell.startCol
}

// Selection utilities
export const isCellInRange = (row: number, col: number, selectedRange: {start: Position, end: Position} | null): boolean => {
  if (!selectedRange) return false
  
  const minRow = Math.min(selectedRange.start.row, selectedRange.end.row)
  const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row)
  const minCol = Math.min(selectedRange.start.col, selectedRange.end.col)
  const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col)
  
  return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol
}

// Table utilities
export const isTableHeader = (row: number, col: number, structures: Map<string, Structure>): boolean => {
  const structure = getStructureAtPosition(row, col, structures)
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

export const getHeaderLevel = (row: number, table: Table): number => {
  const headerRows = table.headerRows || 1
  const relativeRow = row - table.startPosition.row
  if (relativeRow < 0 || relativeRow >= headerRows) return -1
  return relativeRow
}

// Navigation utilities
export const getNextCell = (row: number, col: number, direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'): {row: number, col: number} => {
  let newRow = row
  let newCol = col

  switch (direction) {
    case 'ArrowUp':
      newRow = Math.max(0, row - 1)
      break
    case 'ArrowDown':
      newRow = Math.min(MAX_ROWS - 1, row + 1)
      break
    case 'ArrowLeft':
      newCol = Math.max(0, col - 1)
      break
    case 'ArrowRight':
      newCol = Math.min(MAX_COLS - 1, col + 1)
      break
  }

  return { row: newRow, col: newCol }
}

// Add column utilities
export const getColumnHeight = (row: number, col: number, structures: Map<string, Structure>): number => {
  // Find the table this column belongs to
  for (const [key, structure] of structures) {
    if (structure.type === 'table') {
      const table = structure as Table
      const headerLevel = getHeaderLevel(row, table)
      
      // Check if this position is for adding a column to this table
      if (row >= table.startPosition.row && row <= table.endPosition.row &&
          col <= table.endPosition.col + 1 && 
          row < table.startPosition.row + (table.headerRows || 1)) {
        
        // For top-level headers, return full table height
        if (headerLevel === 0) {
          return (table.endPosition.row - table.startPosition.row + 1) * DEFAULT_CELL_HEIGHT
        }
        
        // For sub-level headers, return height from current row to bottom of table
        if (headerLevel > 0) {
          return (table.endPosition.row - row + 1) * DEFAULT_CELL_HEIGHT
        }
        
        // Default to full table height
        return (table.endPosition.row - table.startPosition.row + 1) * DEFAULT_CELL_HEIGHT
      }
    }
  }
  
  // Default to single cell height if no table found
  return DEFAULT_CELL_HEIGHT
}

export const isGhostedColumn = (row: number, col: number, hoveredHeaderCell: {row: number, col: number} | null, structures: Map<string, Structure>): boolean => {
  if (!hoveredHeaderCell) return false
  
  for (const [key, structure] of structures) {
    if (structure.type === 'table') {
      const table = structure as Table
      const headerLevel = getHeaderLevel(hoveredHeaderCell.row, table)
      
      // Case 1: Ghosted column at end of table (top-level header)
      if (row >= table.startPosition.row && 
          row <= table.endPosition.row &&
          col === table.endPosition.col + 1 &&
          hoveredHeaderCell.col === table.endPosition.col + 1) {
        return true
      }
      
      // Case 2: Ghosted sub-column (sub-level header)
      if (headerLevel > 0 && 
          row >= table.startPosition.row && 
          row <= table.endPosition.row &&
          col === hoveredHeaderCell.col &&
          hoveredHeaderCell.row >= table.startPosition.row && 
          hoveredHeaderCell.row < table.startPosition.row + (table.headerRows || 1)) {
        return true
      }
    }
  }
  return false
}

// Validation utilities
export const isValidPosition = (row: number, col: number): boolean => {
  return row >= 0 && row < MAX_ROWS && col >= 0 && col < MAX_COLS
}

export const isValidRange = (startRow: number, startCol: number, endRow: number, endCol: number): boolean => {
  return isValidPosition(startRow, startCol) && isValidPosition(endRow, endCol)
}
