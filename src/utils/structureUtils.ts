import { Dimensions, MergedCell, Position, Structure, Table, StructureArray } from '../types'
import { DEFAULT_CELL_HEIGHT } from '../constants'
import { isValidPosition } from './sheetUtils'

// Key generation utilities
export const getCellKey = (row: number, col: number): string => `${row}-${col}`

export const getStructureKey = (row: number, col: number): string => `struct-${row}-${col}`

export const getMergedCellKey = (startRow: number, startCol: number, endRow: number, endCol: number): string => 
  `merged-${startRow}-${startCol}-${endRow}-${endCol}`

// Cell and structure utilities
export const getCellValue = (row: number, col: number, structures: Map<string, Structure>): string => {
  // First check if there's a structure at this position
  const structure = getStructureAtPosition(row, col, structures)
  
  if (structure) {
    if (structure.type === 'cell') {
      return structure.value || ''
    }
    
    // For arrays and tables, find the specific cell within the structure
    if (structure.type === 'array') {
      const arrayStructure = structure as StructureArray
      const cellIndex = (row - structure.startPosition.row) * (structure.endPosition.col - structure.startPosition.col + 1) + 
                       (col - structure.startPosition.col)
      if (cellIndex >= 0 && cellIndex < arrayStructure.cells.length) {
        return arrayStructure.cells[cellIndex].value || ''
      }
    }
    
    if (structure.type === 'table') {
      const tableStructure = structure as Table
      const rowIndex = row - structure.startPosition.row
      if (rowIndex >= 0 && rowIndex < tableStructure.arrays.length) {
        const arrayInTable = tableStructure.arrays[rowIndex]
        const colIndex = col - structure.startPosition.col
        if (colIndex >= 0 && colIndex < arrayInTable.cells.length) {
          return arrayInTable.cells[colIndex].value || ''
        }
      }
    }
  }
  
  // No structure found, return empty string
  return ''
}

export const getStructureAtPosition = (row: number, col: number, structures: Map<string, Structure>): Structure | undefined => {
  const matches = []
  // Search through all structures, find all structures containing this position
  for (const [id, structure] of structures) {
    const { startPosition, endPosition } = structure
    if (row >= startPosition.row && row <= endPosition.row &&
        col >= startPosition.col && col <= endPosition.col) {
      matches.push(structure)
      // TEMPORARY: return first match
      return structure
    }
  }
  return undefined
}

export const getDimensions = (structure: Structure): Dimensions => {
  const { startPosition, endPosition } = structure
  return {
    rows: endPosition.row - startPosition.row + 1,
    cols: endPosition.col - startPosition.col + 1
  }
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

// Drag and drop utilities
export const getCellsInStructure = (structure: Structure, structures: Map<string, Structure>): Array<{row: number, col: number, value: string}> => {
  const cells = []
  const { startPosition, endPosition } = structure
  
  for (let row = startPosition.row; row <= endPosition.row; row++) {
    for (let col = startPosition.col; col <= endPosition.col; col++) {
      const value = getCellValue(row, col, structures)
      cells.push({ row, col, value })
    }
  }
  
  return cells
}

export const detectConflicts = (
  targetPosition: Position,
  structureCells: Array<{row: number, col: number, value: string}>,
  structures: Map<string, Structure>,
  sourceStructure?: Structure
): Array<{row: number, col: number, existingValue: string, newValue: string}> => {
  const conflicts = []
  
  // Create a set of source cell positions to exclude from conflict detection
  const sourceCellPositions = new Set<string>()
  if (sourceStructure) {
    for (let row = sourceStructure.startPosition.row; row <= sourceStructure.endPosition.row; row++) {
      for (let col = sourceStructure.startPosition.col; col <= sourceStructure.endPosition.col; col++) {
        sourceCellPositions.add(`${row}-${col}`)
      }
    }
  }
  
  for (const cell of structureCells) {
    const targetRow = targetPosition.row + (cell.row - structureCells[0].row)
    const targetCol = targetPosition.col + (cell.col - structureCells[0].col)
    const targetKey = `${targetRow}-${targetCol}`
    
    // Skip conflict detection if the target cell is part of the source structure
    if (sourceCellPositions.has(targetKey)) {
      continue
    }
    
    const existingValue = getCellValue(targetRow, targetCol, structures)
    
    // Only consider it a conflict if both values are non-empty and different
    if (existingValue && cell.value && existingValue !== cell.value) {
      conflicts.push({
        row: targetRow,
        col: targetCol,
        existingValue,
        newValue: cell.value
      })
    }
  }
  
  return conflicts
}

export const moveStructureCells = (
  structure: Structure,
  targetPosition: Position,
  structures: Map<string, Structure>,
  overwriteExisting: boolean = false
): Map<string, Structure> => {
  const newStructures = new Map(structures)
  const structureCells = getCellsInStructure(structure, structures)
  
  // Clear old positions by removing cells that will be moved
  for (const cell of structureCells) {
    const existingStructure = getStructureAtPosition(cell.row, cell.col, newStructures)
    if (existingStructure && existingStructure.id === structure.id) {
      // This is part of the structure being moved, we'll handle it in the move
      continue
    }
  }
  
  // Set new positions
  for (const cell of structureCells) {
    const newRow = targetPosition.row + (cell.row - structure.startPosition.row)
    const newCol = targetPosition.col + (cell.col - structure.startPosition.col)
    
    if (isValidPosition(newRow, newCol)) {
      const existingValue = getCellValue(newRow, newCol, newStructures)
      const newValue = cell.value
      
      // Determine final value based on merge strategy
      let finalValue = newValue
      if (existingValue && newValue) {
        // Both values exist - use override strategy
        finalValue = overwriteExisting ? newValue : existingValue
      } else if (existingValue) {
        // Only existing value - keep it
        finalValue = existingValue
      }
      // If only new value or both empty, use new value
      
      if (finalValue) {
        // Create or update cell structure at new position
        const existingStructure = getStructureAtPosition(newRow, newCol, newStructures)
        if (existingStructure && existingStructure.type === 'cell') {
          // Update existing cell
          newStructures.set(existingStructure.id, { ...existingStructure, value: finalValue })
        } else if (!existingStructure) {
          // Create new cell structure
          const newCellId = `cell-${newRow}-${newCol}-${Date.now()}`
          const newCell: Structure = {
            type: 'cell',
            id: newCellId,
            startPosition: { row: newRow, col: newCol },
            endPosition: { row: newRow, col: newCol },
            value: finalValue
          }
          newStructures.set(newCellId, newCell)
        }
      }
    }
  }
  
  return newStructures
}

export const moveStructurePosition = (structure: Structure, targetPosition: Position): Structure => {
  const deltaRow = targetPosition.row - structure.startPosition.row
  const deltaCol = targetPosition.col - structure.startPosition.col
  
  const newStartPosition = targetPosition
  const newEndPosition = {
    row: structure.endPosition.row + deltaRow,
    col: structure.endPosition.col + deltaCol
  }
  
  // Update internal positions for different structure types
  if (structure.type === 'array') {
    const arrayStructure = structure as any
    const updatedCells = arrayStructure.cells.map((cell: any) => ({
      ...cell,
      startPosition: {
        row: cell.startPosition.row + deltaRow,
        col: cell.startPosition.col + deltaCol
      },
      endPosition: {
        row: cell.endPosition.row + deltaRow,
        col: cell.endPosition.col + deltaCol
      }
    }))
    
    return {
      ...arrayStructure,
      startPosition: newStartPosition,
      endPosition: newEndPosition,
      cells: updatedCells
    } as Structure
  } else if (structure.type === 'table') {
    const tableStructure = structure as any
    const updatedArrays = tableStructure.arrays.map((arr: any) => ({
      ...arr,
      startPosition: {
        row: arr.startPosition.row + deltaRow,
        col: arr.startPosition.col + deltaCol
      },
      endPosition: {
        row: arr.endPosition.row + deltaRow,
        col: arr.endPosition.col + deltaCol
      },
      cells: arr.cells.map((cell: any) => ({
        ...cell,
        startPosition: {
          row: cell.startPosition.row + deltaRow,
          col: cell.startPosition.col + deltaCol
        },
        endPosition: {
          row: cell.endPosition.row + deltaRow,
          col: cell.endPosition.col + deltaCol
        }
      }))
    }))
    
    return {
      ...tableStructure,
      startPosition: newStartPosition,
      endPosition: newEndPosition,
      arrays: updatedArrays
    } as Structure
  } else {
    // For cell and column types, just update positions
    return {
      ...structure,
      startPosition: newStartPosition,
      endPosition: newEndPosition
    }
  }
}
