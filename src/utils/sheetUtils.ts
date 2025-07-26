import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH, DEFAULT_HEADER_HEIGHT, DEFAULT_HEADER_WIDTH, MAX_COLS, MAX_ROWS } from '../constants'

// UUID generation utility
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

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

// Validation utilities
export const isValidPosition = (row: number, col: number): boolean => {
  return row >= 0 && row < MAX_ROWS && col >= 0 && col < MAX_COLS
}

export const isValidRange = (startRow: number, startCol: number, endRow: number, endCol: number): boolean => {
  return isValidPosition(startRow, startCol) && isValidPosition(endRow, endCol)
}