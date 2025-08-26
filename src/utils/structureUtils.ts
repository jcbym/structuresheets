import { Dimensions, Position, Structure, TableStructure, ArrayStructure, CellStructure, StructureMap, PositionMap, TemplateStructure } from '../types'
import { DEFAULT_CELL_HEIGHT } from '../constants'
import { isValidPosition } from './sheetUtils'
import { 
  getCellOverride, 
  isPositionInTemplate, 
  convertToRelativePosition 
} from './templateOverrides'

// Key generation utilities
export const getCellKey = (row: number, col: number): string => `${row}-${col}`

export const getStructureKey = (row: number, col: number): string => `struct-${row}-${col}`

export const getMergedCellKey = (startRow: number, startCol: number, endRow: number, endCol: number): string => 
  `merged-${startRow}-${startCol}-${endRow}-${endCol}`

// Position map utilities
export const getPositionKey = (row: number, col: number): string => `${row}-${col}`

export const addStructureToPositionMap = (structure: Structure, positions: PositionMap): PositionMap => {
  const newPositionMap = new Map(positions)
  const { startPosition, dimensions } = structure
  const endPosition = getEndPosition(startPosition, dimensions)
  
  for (let row = startPosition.row; row <= endPosition.row; row++) {
    for (let col = startPosition.col; col <= endPosition.col; col++) {
      const posKey = getPositionKey(row, col)
      const existingIds = newPositionMap.get(posKey) || []
      if (!existingIds.includes(structure.id)) {
        newPositionMap.set(posKey, [...existingIds, structure.id])
      }
    }
  }
  
  return newPositionMap
}

export const removeStructureFromPositionMap = (structure: Structure, positions: PositionMap): PositionMap => {
  const newPositionMap = new Map(positions)
  const { startPosition, dimensions } = structure
  const endPosition = getEndPosition(startPosition, dimensions)
  
  for (let row = startPosition.row; row <= endPosition.row; row++) {
    for (let col = startPosition.col; col <= endPosition.col; col++) {
      const posKey = getPositionKey(row, col)
      const existingIds = newPositionMap.get(posKey) || []
      const filteredIds = existingIds.filter(id => id !== structure.id)
      
      if (filteredIds.length === 0) {
        newPositionMap.delete(posKey)
      } else {
        newPositionMap.set(posKey, filteredIds)
      }
    }
  }
  
  return newPositionMap
}

export const buildPositionMapFromStructures = (structures: StructureMap): PositionMap => {
  let positions: PositionMap = new Map()
  
  for (const [, structure] of structures) {
    positions = addStructureToPositionMap(structure, positions)
  }
  
  return positions
}

export const getStructureIdsAtPosition = (row: number, col: number, positions: PositionMap): string[] => {
  const posKey = getPositionKey(row, col)
  return positions.get(posKey) || []
}

// Helper functions for ID-based structure lookups
export const getTableCells = (tableId: string, structures: StructureMap): CellStructure[] => {
  const table = structures.get(tableId) as TableStructure
  if (!table || table.type !== 'table') return []
  
  const cells: CellStructure[] = []
  for (const row of table.cellIds) {
    for (const cellId of row) {
      if (cellId) {
        const cell = structures.get(cellId) as CellStructure
        if (cell) {
          cells.push(cell)
        }
      }
    }
  }
  return cells
}

export const getArrayCells = (arrayId: string, structures: StructureMap): CellStructure[] => {
  const array = structures.get(arrayId) as ArrayStructure
  if (!array || array.type !== 'array') return []
  
  const cells: CellStructure[] = []
  for (const cellId of array.cellIds) {
    if (cellId) {
      const cell = structures.get(cellId) as CellStructure
      if (cell) {
        cells.push(cell)
      }
    }
  }
  return cells
}

export const getCellFromTable = (tableId: string, row: number, col: number, structures: StructureMap): CellStructure | undefined => {
  const table = structures.get(tableId) as TableStructure
  if (!table || table.type !== 'table') return undefined
  
  if (row < 0 || row >= table.cellIds.length || col < 0 || col >= table.cellIds[row].length) {
    return undefined
  }
  
  const cellId = table.cellIds[row][col]
  if (!cellId) return undefined
  
  return structures.get(cellId) as CellStructure
}

// Cell and structure utilities - now computes table cell positions dynamically
export const getCellValue = (row: number, col: number, structureMap: StructureMap, positionMap: PositionMap): string => {
  // First check if this position is within a template instance and has an override
  const templateInstance = findTemplateInstanceAtPosition(row, col, structureMap)
  if (templateInstance) {
    const relativePosition = convertToRelativePosition(
      { row, col },
      templateInstance.startPosition
    )
    const relativePositionKey = `${relativePosition.row}-${relativePosition.col}`
    const override = getCellOverride(templateInstance, relativePositionKey)
    
    if (override !== undefined) {
      // Return the override value
      return override
    }
    // If no override, continue with normal logic to get template default value
  }

  const structures = getStructuresAtPosition(row, col, positionMap, structureMap)

  for (const structure of structures) {
    if (structure.type === 'cell') {
      // For merged cells (dimensions > 1x1), only return value at the top-left position
      if (structure.dimensions.rows > 1 || structure.dimensions.cols > 1) {
        if (row === structure.startPosition.row && col === structure.startPosition.col) {
          return structure.value || ''
        }
        // For other positions within the merged cell, return empty string
        return ''
      } else {
        // For regular 1x1 cells, return the value
        return structure.value || ''
      }
    } else if (structure.type === 'table') {
      // For tables, compute the offset to find the correct cell
      const table = structure as TableStructure
      const tableRow = row - table.startPosition.row
      const tableCol = col - table.startPosition.col
      
      // Ensure we're within table bounds
      if (tableRow >= 0 && tableRow < table.dimensions.rows && 
          tableCol >= 0 && tableCol < table.dimensions.cols) {
        
        // Check if cellIds array exists and has the position
        if (table.cellIds && 
            tableRow < table.cellIds.length && 
            tableCol < table.cellIds[tableRow].length) {
          const cellId = table.cellIds[tableRow][tableCol]
          if (cellId) {
            const cell = structureMap.get(cellId) as CellStructure
            if (cell) {
              return cell.value || ''
            }
          }
        }
        
        // If no specific cell is found but we're within table bounds,
        // look for any standalone cell at this exact position
        const standaloneCell = structureMap.get(`cell-${row}-${col}`)
        if (standaloneCell && standaloneCell.type === 'cell') {
          return standaloneCell.value || ''
        }
      }
    } else if (structure.type === 'array') {
      // For arrays, compute the offset to find the correct cell
      const array = structure as ArrayStructure
      const arrayRow = row - array.startPosition.row
      const arrayCol = col - array.startPosition.col
      
      // Ensure we're within array bounds
      if (arrayRow >= 0 && arrayRow < array.dimensions.rows && 
          arrayCol >= 0 && arrayCol < array.dimensions.cols) {
        
        // Calculate the index in the cellIds array
        let cellIndex: number
        if (array.direction === 'horizontal') {
          cellIndex = arrayCol
        } else {
          cellIndex = arrayRow
        }
        
        // Check if cellIds array exists and has the position
        if (array.cellIds && cellIndex < array.cellIds.length) {
          const cellId = array.cellIds[cellIndex]
          if (cellId) {
            const cell = structureMap.get(cellId) as CellStructure
            if (cell) {
              return cell.value || ''
            }
          }
        }
        
        // If no specific cell is found but we're within array bounds,
        // look for any standalone cell at this exact position
        const standaloneCell = structureMap.get(`cell-${row}-${col}`)
        if (standaloneCell && standaloneCell.type === 'cell') {
          return standaloneCell.value || ''
        }
      }
    }
  }
  // No structure found, return empty string
  return ''
}

// Get structure using position map
export const getStructureAtPosition = (row: number, col: number, positions: PositionMap, structures: StructureMap): Structure | undefined => {
  const structureIds = getStructureIdsAtPosition(row, col, positions)
  if (structureIds.length === 0) return undefined
  
  // Return the first structure (maintains backward compatibility)
  const firstStructure = structures.get(structureIds[0])
  return firstStructure
}

// Return all structures at a position
export const getStructuresAtPosition = (row: number, col: number, positions: PositionMap, structures: StructureMap): Structure[] => {
  const structureIds = getStructureIdsAtPosition(row, col, positions)
  return structureIds.map(id => structures.get(id)).filter(Boolean) as Structure[]
}

export const getDimensions = (start: Position, end: Position): Dimensions => {
  return {
    rows: end.row - start.row + 1,
    cols: end.col - start.col + 1
  }
}

export const getEndPosition = (start: Position, dimensions: Dimensions): Position => {
  return {
    row: start.row + dimensions.rows - 1,
    col: start.col + dimensions.cols - 1
  }
}

export const positionsToDimensions = (start: Position, end: Position): Dimensions => {
  return {
    rows: end.row - start.row + 1,
    cols: end.col - start.col + 1
  }
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
export const isTableHeader = (row: number, col: number, structures: StructureMap, positions: PositionMap): boolean => {
  const structure = getStructureAtPosition(row, col, positions, structures)
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

export const getHeaderLevel = (row: number, table: TableStructure): number => {
  const headerRows = table.colHeaderLevels || 1
  const relativeRow = row - table.startPosition.row
  if (relativeRow < 0 || relativeRow >= headerRows) return -1
  return relativeRow
}


// Add column utilities
export const getColumnHeight = (row: number, col: number, structures: StructureMap): number => {
  // Find the table this column belongs to
  for (const [, structure] of structures) {
    if (structure.type === 'table') {
      const table = structure as TableStructure
      const headerLevel = getHeaderLevel(row, table)
      const endPosition = getEndPosition(table.startPosition, table.dimensions)
      
      // Check if this position is for adding a column to this table
      if (row >= table.startPosition.row && row <= endPosition.row &&
          col <= endPosition.col + 1 && 
          row < table.startPosition.row + (table.colHeaderLevels || 1)) {
        
        // For top-level headers, return full table height
        if (headerLevel === 0) {
          return table.dimensions.rows * DEFAULT_CELL_HEIGHT
        }
        
        // For sub-level headers, return height from current row to bottom of table
        if (headerLevel > 0) {
          return (endPosition.row - row + 1) * DEFAULT_CELL_HEIGHT
        }
        
        // Default to full table height
        return table.dimensions.rows * DEFAULT_CELL_HEIGHT
      }
    }
  }
  
  // Default to single cell height if no table found
  return DEFAULT_CELL_HEIGHT
}

export const isGhostedColumn = (row: number, col: number, hoveredHeaderCell: {row: number, col: number} | null, structures: StructureMap): boolean => {
  if (!hoveredHeaderCell) return false
  
  for (const [, structure] of structures) {
    if (structure.type === 'table') {
      const table = structure as TableStructure
      const headerLevel = getHeaderLevel(hoveredHeaderCell.row, table)
      const endPosition = getEndPosition(table.startPosition, table.dimensions)
      
      // Case 1: Ghosted column at end of table (top-level header)
      if (row >= table.startPosition.row && 
          row <= endPosition.row &&
          col === endPosition.col + 1 &&
          hoveredHeaderCell.col === endPosition.col + 1) {
        return true
      }
      
      // Case 2: Ghosted sub-column (sub-level header)
      if (headerLevel > 0 && 
          row >= table.startPosition.row && 
          row <= endPosition.row &&
          col === hoveredHeaderCell.col &&
          hoveredHeaderCell.row >= table.startPosition.row && 
          hoveredHeaderCell.row < table.startPosition.row + (table.colHeaderLevels || 1)) {
        return true
      }
    }
  }
  return false
}

// Move validation utilities
export const isValidMoveTarget = (
  sourceStructure: Structure,
  targetPosition: Position,
  structures: StructureMap,
  positions: PositionMap
): boolean => {
  const { startPosition: sourceStart, dimensions: sourceDims } = sourceStructure
  const sourceEnd = getEndPosition(sourceStart, sourceDims)
  const targetEnd = getEndPosition(targetPosition, sourceDims)
  
  // Check each position in the target area
  for (let row = targetPosition.row; row <= targetEnd.row; row++) {
    for (let col = targetPosition.col; col <= targetEnd.col; col++) {
      // Skip if this position is part of the source structure (moving within itself)
      if (row >= sourceStart.row && row <= sourceEnd.row && 
          col >= sourceStart.col && col <= sourceEnd.col) {
        continue
      }
      
      const targetStructures = getStructuresAtPosition(row, col, positions, structures)
      
      for (const targetStructure of targetStructures) {
        // Rule 1: Cells cannot be placed on top of existing cells
        if (sourceStructure.type === 'cell' && targetStructure.type === 'cell') {
          return false
        }
        
        // Rule 2: Tables and arrays cannot be placed on top of existing tables and arrays
        if ((sourceStructure.type === 'table' || sourceStructure.type === 'array') &&
            (targetStructure.type === 'table' || targetStructure.type === 'array')) {
          return false
        }
        
        // Rule 3: Tables and arrays cannot be placed on top of existing cells
        if ((sourceStructure.type === 'table' || sourceStructure.type === 'array') &&
            targetStructure.type === 'cell') {
          return false
        }
        
        // Rule 4: Templates cannot be placed on top of any existing structures
        if (sourceStructure.type === 'template') {
          return false
        }
        
        // Rule 5: No structures can be placed on top of templates
        if (targetStructure.type === 'template') {
          return false
        }
        
        // Allow cells to be placed inside tables/arrays (they will be integrated)
        // This is handled in the existing logic
      }
    }
  }
  
  return true
}

// Drag and drop utilities
export const getCellsInStructure = (structure: Structure, structures: StructureMap, positions: PositionMap): Array<{row: number, col: number, value: string}> => {
  const cells = []
  const { startPosition, dimensions } = structure
  
  // For merged cells (cells with dimensions > 1x1), treat as single entity
  if (structure.type === 'cell' && (dimensions.rows > 1 || dimensions.cols > 1)) {
    // Return only the top-left position with the merged cell's value
    cells.push({
      row: startPosition.row,
      col: startPosition.col,
      value: structure.value || ''
    })
  } else {
    // For regular structures, iterate through all positions
    const endPosition = getEndPosition(startPosition, dimensions)
    for (let row = startPosition.row; row <= endPosition.row; row++) {
      for (let col = startPosition.col; col <= endPosition.col; col++) {
        const value = getCellValue(row, col, structures, positions)
        cells.push({ row, col, value })
      }
    }
  }
  
  return cells
}

export const detectConflicts = (
  targetPosition: Position,
  structureCells: Array<{row: number, col: number, value: string}>,
  structures: StructureMap,
  positions: PositionMap,
  sourceStructure?: Structure
): Array<{row: number, col: number, existingValue: string, newValue: string}> => {
  const conflicts = []
  
  // Create a set of source cell positions to exclude from conflict detection
  const sourceCellPositions = new Set<string>()
  if (sourceStructure) {
    const endPosition = getEndPosition(sourceStructure.startPosition, sourceStructure.dimensions)
    for (let row = sourceStructure.startPosition.row; row <= endPosition.row; row++) {
      for (let col = sourceStructure.startPosition.col; col <= endPosition.col; col++) {
        sourceCellPositions.add(`${row}-${col}`)
      }
    }
  }
  
  // Special handling for merged cells
  if (sourceStructure?.type === 'cell' && (sourceStructure.dimensions.rows > 1 || sourceStructure.dimensions.cols > 1)) {
    // For merged cells, check for conflicts across the entire target area
    const endPosition = getEndPosition(targetPosition, sourceStructure.dimensions)
    for (let row = targetPosition.row; row <= endPosition.row; row++) {
      for (let col = targetPosition.col; col <= endPosition.col; col++) {
        const targetKey = `${row}-${col}`
        
        // Skip conflict detection if the target cell is part of the source structure
        if (sourceCellPositions.has(targetKey)) {
          continue
        }

        const existingValue = getCellValue(row, col, structures, positions)
        const newValue = sourceStructure.value || ''

        // Only consider it a conflict if both values are non-empty and different
        if (existingValue && newValue && existingValue !== newValue) {
          conflicts.push({
            row,
            col,
            existingValue,
            newValue
          })
        }
      }
    }
  } else {
    // For regular structures, use the original logic
    for (const cell of structureCells) {
      const targetRow = targetPosition.row + (cell.row - structureCells[0].row)
      const targetCol = targetPosition.col + (cell.col - structureCells[0].col)
      const targetKey = `${targetRow}-${targetCol}`
      
      // Skip conflict detection if the target cell is part of the source structure
      if (sourceCellPositions.has(targetKey)) {
        continue
      }

      const existingValue = getCellValue(targetRow, targetCol, structures, positions)

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
  }
  
  return conflicts
}

// Helper function to find if a position is within a template instance
const findTemplateInstanceAtPosition = (row: number, col: number, structures: StructureMap): TemplateStructure | null => {
  for (const [, structure] of structures) {
    if (structure.type === 'template') {
      const templateInstance = structure as TemplateStructure
      if (isPositionInTemplate({ row, col }, templateInstance)) {
        return templateInstance
      }
    }
  }
  return null
}

// Helper function to get all structures within a template
const getTemplateInternalStructures = (
  templateStructure: Structure,
  structures: StructureMap,
  positions: PositionMap
): Structure[] => {
  if (templateStructure.type !== 'template') return []
  
  const internalStructures: Structure[] = []
  const { startPosition, dimensions } = templateStructure
  const endPosition = getEndPosition(startPosition, dimensions)
  
  // Find all structures that are within the template bounds (but not the template itself)
  for (let row = startPosition.row; row <= endPosition.row; row++) {
    for (let col = startPosition.col; col <= endPosition.col; col++) {
      const structuresAtPosition = getStructuresAtPosition(row, col, positions, structures)
      
      for (const struct of structuresAtPosition) {
        if (struct.id !== templateStructure.id && 
            !internalStructures.some(existing => existing.id === struct.id)) {
          // Check if this structure is completely within the template bounds
          const structEnd = getEndPosition(struct.startPosition, struct.dimensions)
          if (struct.startPosition.row >= startPosition.row &&
              struct.startPosition.col >= startPosition.col &&
              structEnd.row <= endPosition.row &&
              structEnd.col <= endPosition.col) {
            internalStructures.push(struct)
          }
        }
      }
    }
  }
  
  return internalStructures
}

// Simplified structure moving function - consolidates moveCompleteStructure, moveStructureCells, and moveStructurePosition
export const moveStructure = (
  structure: Structure,
  targetPosition: Position,
  structures: StructureMap,
  positions: PositionMap,
  overwriteExisting: boolean = false
): { structures: StructureMap, positions: PositionMap } => {
  const newStructures = new Map(structures)
  
  // Remove the old structure from position map
  let newPositions = removeStructureFromPositionMap(structure, positions)
  
  // For templates, we need to find and move all internal structures
  let templateInternalStructures: Structure[] = []
  if (structure.type === 'template') {
    templateInternalStructures = getTemplateInternalStructures(structure, structures, positions)
    
    // Remove all internal structures from their current positions
    for (const internalStructure of templateInternalStructures) {
      newStructures.delete(internalStructure.id)
      newPositions = removeStructureFromPositionMap(internalStructure, newPositions)
    }
  }

  // For tables and arrays, we need to clean up individual cell structures that were referenced by cellIds
  if ((structure.type === 'table' || structure.type === 'array') && 'cellIds' in structure) {
    const cellsToRemove: CellStructure[] = []
    
    if (structure.type === 'table') {
      cellsToRemove.push(...getTableCells(structure.id, structures))
    } else if (structure.type === 'array') {
      // Only use the dedicated helper function for arrays - don't do additional position-based cleanup
      // This prevents removing cells that might be legitimately shared or outside the cellIds array
      cellsToRemove.push(...getArrayCells(structure.id, structures))
    }
    
    // Remove individual cell structures that belong to this table/array
    for (const cell of cellsToRemove) {
      newStructures.delete(cell.id)
      newPositions = removeStructureFromPositionMap(cell, newPositions)
    }
  }
  
  // For standalone cell structures, always clean up existing structures at target position to prevent overlapping
  if (structure.type === 'cell') {
    const endPosition = getEndPosition(targetPosition, structure.dimensions)
    for (let row = targetPosition.row; row <= endPosition.row; row++) {
      for (let col = targetPosition.col; col <= endPosition.col; col++) {
        const existingStructures = getStructuresAtPosition(row, col, newPositions, newStructures)
        for (const existingStructure of existingStructures) {
          // Don't remove the structure we're moving
          if (existingStructure.id !== structure.id) {
            // If removing a cell structure, check if it's part of a table/array and update references
            if (existingStructure.type === 'cell') {
              // Find and update any tables that reference this cell
              for (const [tableId, tableStructure] of newStructures) {
                if (tableStructure.type === 'table' && 'cellIds' in tableStructure) {
                  const table = tableStructure as TableStructure
                  let updated = false
                  for (let tRow = 0; tRow < table.cellIds.length; tRow++) {
                    for (let tCol = 0; tCol < table.cellIds[tRow].length; tCol++) {
                      if (table.cellIds[tRow][tCol] === existingStructure.id) {
                        table.cellIds[tRow][tCol] = null
                        updated = true
                      }
                    }
                  }
                  if (updated) {
                    newStructures.set(tableId, { ...table })
                  }
                }
                // Also check arrays
                if (tableStructure.type === 'array' && 'cellIds' in tableStructure) {
                  const array = tableStructure as ArrayStructure
                  let updated = false
                  for (let i = 0; i < array.cellIds.length; i++) {
                    if (array.cellIds[i] === existingStructure.id) {
                      array.cellIds[i] = null
                      updated = true
                    }
                  }
                  if (updated) {
                    newStructures.set(tableId, { ...array })
                  }
                }
              }
            }
            
            newStructures.delete(existingStructure.id)
            newPositions = removeStructureFromPositionMap(existingStructure, newPositions)
          }
        }
      }
    }
  }

  // Update the structure's position
  const movedStructure = {
    ...structure,
    startPosition: targetPosition
  }
  
  // For tables and arrays, update the cellIds to reference cells at the new position
  if (structure.type === 'table' && 'cellIds' in structure) {
    const tableStructure = structure as TableStructure
    const newCellIds: (string | null)[][] = []
    
    // Create new cellIds array with updated cell references
    for (let row = 0; row < tableStructure.dimensions.rows; row++) {
      const rowCells: (string | null)[] = []
      for (let col = 0; col < tableStructure.dimensions.cols; col++) {
        const newRow = targetPosition.row + row
        const newCol = targetPosition.col + col
        
        if (isValidPosition(newRow, newCol)) {
          // Get the original cell value
          const originalCellId = tableStructure.cellIds[row]?.[col]
          const originalCell = originalCellId ? structures.get(originalCellId) as CellStructure : null
          const originalValue = originalCell?.value || ''
          
          // Always clean up any existing structures at target position to prevent overlapping
          const existingValue = getCellValue(newRow, newCol, newStructures, newPositions)
          const existingStructures = getStructuresAtPosition(newRow, newCol, newPositions, newStructures)
          
          // Remove all existing structures at this position and update parent structures
          for (const existingStructure of existingStructures) {
            // If removing a cell structure, check if it's part of a table/array and update references
            if (existingStructure.type === 'cell') {
              // Find and update any tables that reference this cell
              for (const [tableId, tableStructure] of newStructures) {
                if (tableStructure.type === 'table' && 'cellIds' in tableStructure) {
                  const table = tableStructure as TableStructure
                  let updated = false
                  for (let tRow = 0; tRow < table.cellIds.length; tRow++) {
                    for (let tCol = 0; tCol < table.cellIds[tRow].length; tCol++) {
                      if (table.cellIds[tRow][tCol] === existingStructure.id) {
                        table.cellIds[tRow][tCol] = null
                        updated = true
                      }
                    }
                  }
                  if (updated) {
                    newStructures.set(tableId, { ...table })
                  }
                }
                // Also check arrays
                if (tableStructure.type === 'array' && 'cellIds' in tableStructure) {
                  const array = tableStructure as ArrayStructure
                  let updated = false
                  for (let i = 0; i < array.cellIds.length; i++) {
                    if (array.cellIds[i] === existingStructure.id) {
                      array.cellIds[i] = null
                      updated = true
                    }
                  }
                  if (updated) {
                    newStructures.set(tableId, { ...array })
                  }
                }
              }
            }
            
            newStructures.delete(existingStructure.id)
            newPositions = removeStructureFromPositionMap(existingStructure, newPositions)
          }
          
          // Determine final value based on merge strategy
          let finalValue = originalValue
          if (!overwriteExisting && existingValue && originalValue) {
            finalValue = existingValue // Keep existing when not overwriting
          } else if (existingValue && !originalValue) {
            finalValue = existingValue // Keep existing if no new value
          } else {
            finalValue = originalValue // Use new value (overwrite or no conflict)
          }
          
          // Create new cell structure at target position if there's a value
          if (finalValue) {
            const newCellId = `cell-${newRow}-${newCol}-${Date.now()}`
            const newCell: CellStructure = {
              type: 'cell',
              id: newCellId,
              startPosition: { row: newRow, col: newCol },
              dimensions: { rows: 1, cols: 1 },
              value: finalValue
            }
            newStructures.set(newCellId, newCell)
            newPositions = addStructureToPositionMap(newCell, newPositions)
            rowCells.push(newCellId)
          } else {
            rowCells.push(null)
          }
        } else {
          rowCells.push(null)
        }
      }
      newCellIds.push(rowCells)
    }
    
    // Update the table structure with new cellIds
    (movedStructure as TableStructure).cellIds = newCellIds
  } else if (structure.type === 'array' && 'cellIds' in structure) {
    const arrayStructure = structure as ArrayStructure
    const newCellIds: (string | null)[] = []
    
    // Create new cellIds array with updated cell references
    const size = arrayStructure.direction === 'horizontal' ? arrayStructure.dimensions.cols : arrayStructure.dimensions.rows
    
    for (let i = 0; i < size; i++) {
      let newRow, newCol
      if (arrayStructure.direction === 'horizontal') {
        newRow = targetPosition.row
        newCol = targetPosition.col + i
      } else {
        newRow = targetPosition.row + i
        newCol = targetPosition.col
      }
      
      if (isValidPosition(newRow, newCol)) {
        // Get the original cell value
        const originalCellId = arrayStructure.cellIds[i]
        const originalCell = originalCellId ? structures.get(originalCellId) as CellStructure : null
        const originalValue = originalCell?.value || ''
        
        // Always clean up any existing structures at target position to prevent overlapping
        const existingValue = getCellValue(newRow, newCol, newStructures, newPositions)
        const existingStructures = getStructuresAtPosition(newRow, newCol, newPositions, newStructures)
        
        // Remove all existing structures at this position and update parent structures
        for (const existingStructure of existingStructures) {
          // If removing a cell structure, check if it's part of a table/array and update references
          if (existingStructure.type === 'cell') {
            // Find and update any tables that reference this cell
            for (const [tableId, tableStructure] of newStructures) {
              if (tableStructure.type === 'table' && 'cellIds' in tableStructure) {
                const table = tableStructure as TableStructure
                let updated = false
                for (let tRow = 0; tRow < table.cellIds.length; tRow++) {
                  for (let tCol = 0; tCol < table.cellIds[tRow].length; tCol++) {
                    if (table.cellIds[tRow][tCol] === existingStructure.id) {
                      table.cellIds[tRow][tCol] = null
                      updated = true
                    }
                  }
                }
                if (updated) {
                  newStructures.set(tableId, { ...table })
                }
              }
              // Also check arrays
              if (tableStructure.type === 'array' && 'cellIds' in tableStructure) {
                const array = tableStructure as ArrayStructure
                let updated = false
                for (let i = 0; i < array.cellIds.length; i++) {
                  if (array.cellIds[i] === existingStructure.id) {
                    array.cellIds[i] = null
                    updated = true
                  }
                }
                if (updated) {
                  newStructures.set(tableId, { ...array })
                }
              }
            }
          }
          
          newStructures.delete(existingStructure.id)
          newPositions = removeStructureFromPositionMap(existingStructure, newPositions)
        }
        
        // Determine final value based on merge strategy
        let finalValue = originalValue
        if (!overwriteExisting && existingValue && originalValue) {
          finalValue = existingValue // Keep existing when not overwriting
        } else if (existingValue && !originalValue) {
          finalValue = existingValue // Keep existing if no new value
        } else {
          finalValue = originalValue // Use new value (overwrite or no conflict)
        }
        
        // Create new cell structure at target position if there was an original cell (preserve cell structure even if empty)
        if (originalCell || finalValue) {
          const newCellId = `cell-${newRow}-${newCol}-${Date.now()}`
          const newCell: CellStructure = {
            type: 'cell',
            id: newCellId,
            startPosition: { row: newRow, col: newCol },
            dimensions: { rows: 1, cols: 1 },
            value: finalValue
          }
          newStructures.set(newCellId, newCell)
          newPositions = addStructureToPositionMap(newCell, newPositions)
          newCellIds.push(newCellId)
        } else {
          newCellIds.push(null)
        }
      } else {
        newCellIds.push(null)
      }
    }
    
    // Update the array structure with new cellIds
    (movedStructure as ArrayStructure).cellIds = newCellIds
  }
  
  // For templates, move all internal structures to their new positions
  if (structure.type === 'template' && templateInternalStructures.length > 0) {
    const deltaRow = targetPosition.row - structure.startPosition.row
    const deltaCol = targetPosition.col - structure.startPosition.col
    
    for (const internalStructure of templateInternalStructures) {
      // Calculate new position for each internal structure
      const newInternalPosition: Position = {
        row: internalStructure.startPosition.row + deltaRow,
        col: internalStructure.startPosition.col + deltaCol
      }
      
      // Create moved version of the internal structure
      const movedInternalStructure: Structure = {
        ...internalStructure,
        startPosition: newInternalPosition
      }
      
      // If the internal structure is a table or array, we need to update its cellIds
      if ((internalStructure.type === 'table' || internalStructure.type === 'array') && 'cellIds' in internalStructure) {
        if (internalStructure.type === 'table') {
          const tableStructure = internalStructure as TableStructure
          const newCellIds: (string | null)[][] = []
          
          for (let row = 0; row < tableStructure.dimensions.rows; row++) {
            const rowCells: (string | null)[] = []
            for (let col = 0; col < tableStructure.dimensions.cols; col++) {
              const newRow = newInternalPosition.row + row
              const newCol = newInternalPosition.col + col
              
              if (isValidPosition(newRow, newCol)) {
                // Get the original cell value
                const originalCellId = tableStructure.cellIds[row]?.[col]
                const originalCell = originalCellId ? structures.get(originalCellId) as CellStructure : null
                const originalValue = originalCell?.value || ''
                
                // Create new cell structure at target position if there's a value
                if (originalValue) {
                  const newCellId = `cell-${newRow}-${newCol}-${Date.now()}`
                  const newCell: CellStructure = {
                    type: 'cell',
                    id: newCellId,
                    startPosition: { row: newRow, col: newCol },
                    dimensions: { rows: 1, cols: 1 },
                    value: originalValue
                  }
                  newStructures.set(newCellId, newCell)
                  newPositions = addStructureToPositionMap(newCell, newPositions)
                  rowCells.push(newCellId)
                } else {
                  rowCells.push(null)
                }
              } else {
                rowCells.push(null)
              }
            }
            newCellIds.push(rowCells)
          }
          
          // Update the table structure with new cellIds
          (movedInternalStructure as TableStructure).cellIds = newCellIds
        } else if (internalStructure.type === 'array') {
          const arrayStructure = internalStructure as ArrayStructure
          const newCellIds: (string | null)[] = []
          
          const size = arrayStructure.direction === 'horizontal' ? arrayStructure.dimensions.cols : arrayStructure.dimensions.rows
          
          for (let i = 0; i < size; i++) {
            let newRow, newCol
            if (arrayStructure.direction === 'horizontal') {
              newRow = newInternalPosition.row
              newCol = newInternalPosition.col + i
            } else {
              newRow = newInternalPosition.row + i
              newCol = newInternalPosition.col
            }
            
            if (isValidPosition(newRow, newCol)) {
              // Get the original cell value
              const originalCellId = arrayStructure.cellIds[i]
              const originalCell = originalCellId ? structures.get(originalCellId) as CellStructure : null
              const originalValue = originalCell?.value || ''
              
              // Create new cell structure at target position if there was an original cell
              if (originalCell || originalValue) {
                const newCellId = `cell-${newRow}-${newCol}-${Date.now()}`
                const newCell: CellStructure = {
                  type: 'cell',
                  id: newCellId,
                  startPosition: { row: newRow, col: newCol },
                  dimensions: { rows: 1, cols: 1 },
                  value: originalValue
                }
                newStructures.set(newCellId, newCell)
                newPositions = addStructureToPositionMap(newCell, newPositions)
                newCellIds.push(newCellId)
              } else {
                newCellIds.push(null)
              }
            } else {
              newCellIds.push(null)
            }
          }
          
          // Update the array structure with new cellIds
          (movedInternalStructure as ArrayStructure).cellIds = newCellIds
        }
      }
      
      // Add the moved internal structure to the new structures map and position map
      newStructures.set(movedInternalStructure.id, movedInternalStructure)
      newPositions = addStructureToPositionMap(movedInternalStructure, newPositions)
    }
  }

  // Update the moved structure in the structures map
  newStructures.set(movedStructure.id, movedStructure)
  
  // Add the moved structure to the new position in the position map
  newPositions = addStructureToPositionMap(movedStructure, newPositions)
  
  return { structures: newStructures, positions: newPositions }
}

// Initialize cellIds array based on existing structures in a range
export const initializeCellIdsFromRange = (
  startPosition: Position,
  dimensions: Dimensions,
  positions: PositionMap,
  structures: StructureMap,
  structureType: 'array' | 'table'
): (string | null)[] | (string | null)[][] => {
  if (structureType === 'array') {
    const cellIds: (string | null)[] = []
    const size = dimensions.rows === 1 ? dimensions.cols : dimensions.rows
    
    for (let i = 0; i < size; i++) {
      let row, col
      if (dimensions.rows === 1) {
        // Horizontal array
        row = startPosition.row
        col = startPosition.col + i
      } else {
        // Vertical array
        row = startPosition.row + i
        col = startPosition.col
      }
      
      const existingStructure = getStructureAtPosition(row, col, positions, structures)
      cellIds.push(existingStructure ? existingStructure.id : null)
    }
    
    return cellIds
  } else {
    // Table: 2D array
    const cellIds: (string | null)[][] = []
    
    for (let row = 0; row < dimensions.rows; row++) {
      const rowArray: (string | null)[] = []
      for (let col = 0; col < dimensions.cols; col++) {
        const gridRow = startPosition.row + row
        const gridCol = startPosition.col + col
        
        const existingStructure = getStructureAtPosition(gridRow, gridCol, positions, structures)
        rowArray.push(existingStructure ? existingStructure.id : null)
      }
      cellIds.push(rowArray)
    }
    
    return cellIds
  }
}
