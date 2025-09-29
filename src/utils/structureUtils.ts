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
  for (const row of table.itemIds) {
    for (const itemId of row) {
      if (itemId) {
        const cell = structures.get(itemId) as CellStructure
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
  for (const itemId of array.itemIds) {
    if (itemId) {
      const cell = structures.get(itemId) as CellStructure
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
  
  if (row < 0 || row >= table.itemIds.length || col < 0 || col >= table.itemIds[row].length) {
    return undefined
  }
  
  const itemId = table.itemIds[row][col]
  if (!itemId) return undefined
  
  return structures.get(itemId) as CellStructure
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
          // For merged cells, return the value (which now contains formula results)
          return structure.value || ''
        }
        // For other positions within the merged cell, return empty string
        return ''
      } else {
        // For regular 1x1 cells, return the value (which now contains formula results)
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
        
        // Check if itemIds array exists and has the position
        if (table.itemIds && 
            tableRow < table.itemIds.length && 
            tableCol < table.itemIds[tableRow].length) {
          const itemId = table.itemIds[tableRow][tableCol]
          if (itemId) {
            const cell = structureMap.get(itemId) as CellStructure
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
      // For arrays, handle different content types
      const array = structure as ArrayStructure
      const arrayRow = row - array.startPosition.row
      const arrayCol = col - array.startPosition.col
      
      // Ensure we're within array bounds
      if (arrayRow >= 0 && arrayRow < array.dimensions.rows && 
          arrayCol >= 0 && arrayCol < array.dimensions.cols) {
        
        // Calculate the index in the array
        let itemIndex: number
        if (array.direction === 'horizontal') {
          itemIndex = arrayCol
        } else {
          itemIndex = arrayRow
        }
        
        // Handle different content types
        if (array.contentType === 'cells') {
          // Legacy behavior: use itemIds array
          if (array.itemIds && itemIndex < array.itemIds.length) {
            const itemId = array.itemIds[itemIndex]
            if (itemId) {
              const cell = structureMap.get(itemId) as CellStructure
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
        } else {
          // Nested structures (templates): use itemIds array
          if (array.itemIds && itemIndex < array.itemIds.length) {
            const itemId = array.itemIds[itemIndex]
            if (itemId) {
              const nestedStructure = structureMap.get(itemId)
              if (nestedStructure && nestedStructure.type === 'template') {
                // For template structures, check if position is within bounds
                const nestedEndPos = getEndPosition(nestedStructure.startPosition, nestedStructure.dimensions)
                if (row >= nestedStructure.startPosition.row && row <= nestedEndPos.row &&
                    col >= nestedStructure.startPosition.col && col <= nestedEndPos.col) {
                  // For templates, we need to get the value from template content
                  // without causing recursion. Check for template overrides first.
                  if (nestedStructure.type === 'template') {
                    const templateInstance = nestedStructure as TemplateStructure
                    const relativePosition = convertToRelativePosition(
                      { row, col },
                      templateInstance.startPosition
                    )
                    const relativePositionKey = `${relativePosition.row}-${relativePosition.col}`
                    const override = getCellOverride(templateInstance, relativePositionKey)
                    
                    if (override !== undefined) {
                      return override
                    }
                  }
                  
                  // If no override, return empty for now to prevent recursion
                  // Template content will be handled by the template rendering system
                  return ''
                }
              }
            }
          }
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
  
  // If multiple structures exist at this position, prioritize non-template structures
  // This ensures that cells inside template instances get the correct nested structure
  // (like table or cell) rather than the parent template structure
  if (structureIds.length > 1) {
    for (const structureId of structureIds) {
      const structure = structures.get(structureId)
      if (structure && structure.type !== 'template') {
        return structure
      }
    }
  }
  
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

// =============================================================================
// PUSHING AND COLLISION DETECTION UTILITIES
// =============================================================================

/**
 * Detect structures that would be affected by expanding a structure in a given direction
 */
export const detectExpansionCollisions = (
  expandingStructure: Structure,
  direction: 'left' | 'right' | 'up' | 'down',
  expansionAmount: number,
  structures: StructureMap,
  positions: PositionMap
): Structure[] => {
  const collisions: Structure[] = []
  const { startPosition, dimensions } = expandingStructure
  const endPosition = getEndPosition(startPosition, dimensions)
  
  // Calculate the area that will be occupied after expansion
  let checkStartRow: number, checkEndRow: number, checkStartCol: number, checkEndCol: number
  
  switch (direction) {
    case 'left':
      checkStartRow = startPosition.row
      checkEndRow = endPosition.row
      checkStartCol = startPosition.col - expansionAmount
      checkEndCol = startPosition.col - 1
      break
    case 'right':
      checkStartRow = startPosition.row
      checkEndRow = endPosition.row
      checkStartCol = endPosition.col + 1
      checkEndCol = endPosition.col + expansionAmount
      break
    case 'up':
      checkStartRow = startPosition.row - expansionAmount
      checkEndRow = startPosition.row - 1
      checkStartCol = startPosition.col
      checkEndCol = endPosition.col
      break
    case 'down':
      checkStartRow = endPosition.row + 1
      checkEndRow = endPosition.row + expansionAmount
      checkStartCol = startPosition.col
      checkEndCol = endPosition.col
      break
  }
  
  // Find all structures in the expansion area
  for (let row = checkStartRow; row <= checkEndRow; row++) {
    for (let col = checkStartCol; col <= checkEndCol; col++) {
      if (row < 0 || col < 0) continue // Skip invalid positions
      
      const structuresAtPosition = getStructuresAtPosition(row, col, positions, structures)
      for (const structure of structuresAtPosition) {
        // Don't include the expanding structure itself
        if (structure.id !== expandingStructure.id && 
            !collisions.some(existing => existing.id === structure.id)) {
          collisions.push(structure)
        }
      }
    }
  }
  
  return collisions
}

/**
 * Calculate push direction based on expansion direction
 */
export const calculatePushDirection = (expansionDirection: 'left' | 'right' | 'up' | 'down'): 'left' | 'right' | 'up' | 'down' => {
  // Structures get pushed in the same direction as the expansion
  return expansionDirection
}

/**
 * Find all structures that need to be moved in a recursive push operation
 */
export const findStructuresInPushChain = (
  initialStructures: Structure[],
  pushDirection: 'left' | 'right' | 'up' | 'down',
  pushAmount: number,
  structures: StructureMap,
  positions: PositionMap,
  visited: Set<string> = new Set()
): Structure[] => {
  const allStructuresToPush: Structure[] = [...initialStructures]
  
  for (const structure of initialStructures) {
    if (visited.has(structure.id)) continue
    visited.add(structure.id)
    
    // Calculate where this structure would move to
    const newPosition = calculatePushedPosition(structure.startPosition, pushDirection, pushAmount)
    
    // Check if the new position would collide with other structures
    const collisions = detectStructureCollisions(
      structure,
      newPosition,
      structures,
      positions,
      new Set([...allStructuresToPush.map(s => s.id), ...visited])
    )
    
    if (collisions.length > 0) {
      // Recursively find structures that need to be pushed
      const chainedStructures = findStructuresInPushChain(
        collisions,
        pushDirection,
        pushAmount,
        structures,
        positions,
        visited
      )
      
      // Add new structures to the push list
      for (const chainedStructure of chainedStructures) {
        if (!allStructuresToPush.some(existing => existing.id === chainedStructure.id)) {
          allStructuresToPush.push(chainedStructure)
        }
      }
    }
  }
  
  return allStructuresToPush
}

/**
 * Calculate new position after being pushed
 */
export const calculatePushedPosition = (
  position: Position,
  direction: 'left' | 'right' | 'up' | 'down',
  amount: number
): Position => {
  switch (direction) {
    case 'left':
      return { row: position.row, col: position.col - amount }
    case 'right':
      return { row: position.row, col: position.col + amount }
    case 'up':
      return { row: position.row - amount, col: position.col }
    case 'down':
      return { row: position.row + amount, col: position.col }
  }
}

/**
 * Detect if a structure at a new position would collide with existing structures
 */
export const detectStructureCollisions = (
  structure: Structure,
  newPosition: Position,
  structures: StructureMap,
  positions: PositionMap,
  excludeIds: Set<string> = new Set()
): Structure[] => {
  const collisions: Structure[] = []
  const endPosition = getEndPosition(newPosition, structure.dimensions)
  
  for (let row = newPosition.row; row <= endPosition.row; row++) {
    for (let col = newPosition.col; col <= endPosition.col; col++) {
      if (row < 0 || col < 0) continue // Skip invalid positions
      
      const structuresAtPosition = getStructuresAtPosition(row, col, positions, structures)
      for (const existingStructure of structuresAtPosition) {
        if (!excludeIds.has(existingStructure.id) && 
            !collisions.some(existing => existing.id === existingStructure.id)) {
          collisions.push(existingStructure)
        }
      }
    }
  }
  
  return collisions
}

/**
 * Validate that a push operation is valid (no structures go out of bounds)
 */
export const validatePushOperation = (
  structuresToPush: Structure[],
  pushDirection: 'left' | 'right' | 'up' | 'down',
  pushAmount: number,
  maxRows: number = 1000,
  maxCols: number = 26
): boolean => {
  for (const structure of structuresToPush) {
    const newPosition = calculatePushedPosition(structure.startPosition, pushDirection, pushAmount)
    const newEndPosition = getEndPosition(newPosition, structure.dimensions)
    
    // Check if any part of the structure would go out of bounds
    if (newPosition.row < 0 || newPosition.col < 0 ||
        newEndPosition.row >= maxRows || newEndPosition.col >= maxCols) {
      return false
    }
  }
  
  return true
}

/**
 * Apply pushing transformation to multiple structures using recursive approach
 */
export const pushStructures = (
  structuresToPush: Structure[],
  pushDirection: 'left' | 'right' | 'up' | 'down',
  pushAmount: number,
  structures: StructureMap,
  positions: PositionMap
): { structures: StructureMap, positions: PositionMap } => {
  let newStructures = new Map(structures)
  let newPositions = new Map(positions)
  
  // Move each structure using the recursive approach
  for (const structure of structuresToPush) {
    const newPosition = calculatePushedPosition(structure.startPosition, pushDirection, pushAmount)
    
    // Use the recursive move function which handles all complexity automatically
    const result = moveStructureRecursively(structure, newPosition, newStructures, newPositions, true)
    newStructures = result.structures
    newPositions = result.positions
  }
  
  return { structures: newStructures, positions: newPositions }
}

/**
 * Main function to handle structure expansion with pushing
 */
export const expandStructureWithPushing = (
  structureId: string,
  direction: 'left' | 'right' | 'up' | 'down',
  expansionAmount: number,
  structures: StructureMap,
  positions: PositionMap,
  maxRows: number = 1000,
  maxCols: number = 26
): { structures: StructureMap, positions: PositionMap, success: boolean, reason?: string } => {
  const structure = structures.get(structureId)
  if (!structure) {
    return { structures, positions, success: false, reason: 'Structure not found' }
  }
  
  // 1. Detect initial collisions
  const initialCollisions = detectExpansionCollisions(
    structure,
    direction,
    expansionAmount,
    structures,
    positions
  )
  
  if (initialCollisions.length === 0) {
    // No collisions, proceed with normal expansion
    return expandStructureNormally(structureId, direction, expansionAmount, structures, positions)
  }
  
  // 2. Find all structures in the push chain
  const pushDirection = calculatePushDirection(direction)
  const allStructuresToPush = findStructuresInPushChain(
    initialCollisions,
    pushDirection,
    expansionAmount,
    structures,
    positions
  )
  
  // 3. Validate push operation
  if (!validatePushOperation(allStructuresToPush, pushDirection, expansionAmount, maxRows, maxCols)) {
    return { 
      structures, 
      positions, 
      success: false, 
      reason: 'Push operation would move structures out of bounds' 
    }
  }
  
  // 4. Apply pushing transformation
  const pushResult = pushStructures(
    allStructuresToPush,
    pushDirection,
    expansionAmount,
    structures,
    positions
  )
  
  // 5. Expand the original structure
  return expandStructureNormally(
    structureId,
    direction,
    expansionAmount,
    pushResult.structures,
    pushResult.positions
  )
}

/**
 * Helper function to expand a structure normally (without collision detection)
 */
export const expandStructureNormally = (
  structureId: string,
  direction: 'left' | 'right' | 'up' | 'down',
  expansionAmount: number,
  structures: StructureMap,
  positions: PositionMap
): { structures: StructureMap, positions: PositionMap, success: boolean } => {
  const structure = structures.get(structureId)
  if (!structure) {
    return { structures, positions, success: false }
  }
  
  let newStructures = new Map(structures)
  let newPositions = new Map(positions)
  
  // Remove structure from current position
  newPositions = removeStructureFromPositionMap(structure, newPositions)
  
  // Calculate new dimensions and position
  let newStartPosition = { ...structure.startPosition }
  let newDimensions = { ...structure.dimensions }
  
  switch (direction) {
    case 'left':
      newStartPosition.col -= expansionAmount
      newDimensions.cols += expansionAmount
      break
    case 'right':
      newDimensions.cols += expansionAmount
      break
    case 'up':
      newStartPosition.row -= expansionAmount
      newDimensions.rows += expansionAmount
      break
    case 'down':
      newDimensions.rows += expansionAmount
      break
  }
  
  // Update structure with new dimensions and position
  const updatedStructure = {
    ...structure,
    startPosition: newStartPosition,
    dimensions: newDimensions
  }
  
  // Handle itemIds update for tables and arrays
  if (structure.type === 'table' && 'itemIds' in structure) {
    const tableStructure = structure as TableStructure
    const newItemIds: (string | null)[][] = []
    
    for (let r = 0; r < newDimensions.rows; r++) {
      const row: (string | null)[] = []
      for (let c = 0; c < newDimensions.cols; c++) {
        // Map new position to old position if it exists
        let sourceRow = r
        let sourceCol = c
        
        if (direction === 'left') sourceCol = c - expansionAmount
        if (direction === 'up') sourceRow = r - expansionAmount
        
        if (sourceRow >= 0 && sourceRow < structure.dimensions.rows &&
            sourceCol >= 0 && sourceCol < structure.dimensions.cols &&
            tableStructure.itemIds && tableStructure.itemIds[sourceRow] &&
            tableStructure.itemIds[sourceRow][sourceCol]) {
          row.push(tableStructure.itemIds[sourceRow][sourceCol])
        } else {
          row.push(null)
        }
      }
      newItemIds.push(row)
    }
    
    (updatedStructure as TableStructure).itemIds = newItemIds
  } else if (structure.type === 'array' && 'itemIds' in structure) {
    const arrayStructure = structure as ArrayStructure
    const newItemIds: (string | null)[] = []
    const newSize = arrayStructure.direction === 'horizontal' ? newDimensions.cols : newDimensions.rows
    
    for (let i = 0; i < newSize; i++) {
      let sourceIndex = i
      
      if ((direction === 'left' && arrayStructure.direction === 'horizontal') ||
          (direction === 'up' && arrayStructure.direction === 'vertical')) {
        sourceIndex = i - expansionAmount
      }
      
      if (sourceIndex >= 0 && sourceIndex < arrayStructure.itemIds.length &&
          arrayStructure.itemIds[sourceIndex]) {
        newItemIds.push(arrayStructure.itemIds[sourceIndex])
      } else {
        newItemIds.push(null)
      }
    }
    
    (updatedStructure as ArrayStructure).itemIds = newItemIds
  }
  
  // Update structures and positions
  newStructures.set(structureId, updatedStructure)
  newPositions = addStructureToPositionMap(updatedStructure, newPositions)
  
  return { structures: newStructures, positions: newPositions, success: true }
}

// Centralized structure moving function using recursive architecture
export const moveStructure = (
  structure: Structure,
  targetPosition: Position,
  structures: StructureMap,
  positions: PositionMap,
  overwriteExisting: boolean = false
): { structures: StructureMap, positions: PositionMap } => {
  // Use the new recursive move function
  return moveStructureRecursively(structure, targetPosition, structures, positions, overwriteExisting)
}

// Initialize itemIds array based on existing structures in a range
export const initializeCellIdsFromRange = (
  startPosition: Position,
  dimensions: Dimensions,
  positions: PositionMap,
  structures: StructureMap,
  structureType: 'array' | 'table'
): (string | null)[] | (string | null)[][] => {
  if (structureType === 'array') {
    const itemIds: (string | null)[] = []
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
      itemIds.push(existingStructure ? existingStructure.id : null)
    }
    
    return itemIds
  } else {
    // Table: 2D array
    const itemIds: (string | null)[][] = []
    
    for (let row = 0; row < dimensions.rows; row++) {
      const rowArray: (string | null)[] = []
      for (let col = 0; col < dimensions.cols; col++) {
        const gridRow = startPosition.row + row
        const gridCol = startPosition.col + col
        
        const existingStructure = getStructureAtPosition(gridRow, gridCol, positions, structures)
        rowArray.push(existingStructure ? existingStructure.id : null)
      }
      itemIds.push(rowArray)
    }
    
    return itemIds
  }
}

// =============================================================================
// CENTRALIZED RECURSIVE STRUCTURE OPERATIONS
// =============================================================================

/**
 * Recursively find all nested structures within a parent structure
 */
export const getAllNestedStructures = (
  parentStructure: Structure,
  structures: StructureMap,
  positions: PositionMap,
  visited: Set<string> = new Set()
): Structure[] => {
  const nestedStructures: Structure[] = []
  
  // Prevent infinite recursion
  if (visited.has(parentStructure.id)) {
    return nestedStructures
  }
  visited.add(parentStructure.id)
  
  const { startPosition, dimensions } = parentStructure
  const endPosition = getEndPosition(startPosition, dimensions)
  
  // Find all structures that are within the parent bounds (but not the parent itself)
  for (let row = startPosition.row; row <= endPosition.row; row++) {
    for (let col = startPosition.col; col <= endPosition.col; col++) {
      const structuresAtPosition = getStructuresAtPosition(row, col, positions, structures)
      
      for (const structure of structuresAtPosition) {
        if (structure.id !== parentStructure.id && 
            !nestedStructures.some(existing => existing.id === structure.id)) {
          
          // Check if this structure is completely within the parent bounds
          const structEnd = getEndPosition(structure.startPosition, structure.dimensions)
          if (structure.startPosition.row >= startPosition.row &&
              structure.startPosition.col >= startPosition.col &&
              structEnd.row <= endPosition.row &&
              structEnd.col <= endPosition.col) {
            
            nestedStructures.push(structure)
            
            // Recursively find nested structures within this structure
            const deeperNested = getAllNestedStructures(structure, structures, positions, visited)
            for (const deepNested of deeperNested) {
              if (!nestedStructures.some(existing => existing.id === deepNested.id)) {
                nestedStructures.push(deepNested)
              }
            }
          }
        }
      }
    }
  }
  
  return nestedStructures
}

/**
 * Get structures directly referenced by a parent structure (via itemIds)
 */
export const getDirectlyReferencedStructures = (
  parentStructure: Structure,
  structures: StructureMap
): Structure[] => {
  const referencedStructures: Structure[] = []
  
  if (parentStructure.type === 'table' && 'itemIds' in parentStructure) {
    const table = parentStructure as TableStructure
    for (const row of table.itemIds) {
      for (const itemId of row) {
        if (itemId) {
          const structure = structures.get(itemId)
          if (structure && !referencedStructures.some(existing => existing.id === structure.id)) {
            referencedStructures.push(structure)
          }
        }
      }
    }
  } else if (parentStructure.type === 'array' && 'itemIds' in parentStructure) {
    const array = parentStructure as ArrayStructure
    for (const itemId of array.itemIds) {
      if (itemId) {
        const structure = structures.get(itemId)
        if (structure && !referencedStructures.some(existing => existing.id === structure.id)) {
          referencedStructures.push(structure)
        }
      }
    }
  }
  
  return referencedStructures
}

/**
 * Calculate position delta between old and new positions
 */
export const calculatePositionDelta = (
  oldPosition: Position,
  newPosition: Position
): { deltaRow: number, deltaCol: number } => {
  return {
    deltaRow: newPosition.row - oldPosition.row,
    deltaCol: newPosition.col - oldPosition.col
  }
}

/**
 * Apply position delta to a structure
 */
export const applyPositionDelta = (
  structure: Structure,
  deltaRow: number,
  deltaCol: number
): Structure => {
  return {
    ...structure,
    startPosition: {
      row: structure.startPosition.row + deltaRow,
      col: structure.startPosition.col + deltaCol
    }
  }
}

/**
 * Recursively move a structure and all its nested structures
 */
export const moveStructureRecursively = (
  structure: Structure,
  targetPosition: Position,
  structures: StructureMap,
  positions: PositionMap,
  overwriteExisting: boolean = false
): { structures: StructureMap, positions: PositionMap } => {
  const { deltaRow, deltaCol } = calculatePositionDelta(structure.startPosition, targetPosition)
  
  let newStructures = new Map(structures)
  let newPositions = new Map(positions)
  
  // Step 1: Collect all structures that need to be moved (parent + all nested)
  const nestedStructures = getAllNestedStructures(structure, structures, positions)
  const directlyReferenced = getDirectlyReferencedStructures(structure, structures)
  
  // Combine all structures that need to be moved
  const allStructuresToMove = [
    structure,
    ...nestedStructures,
    ...directlyReferenced.filter(ref => !nestedStructures.some(nested => nested.id === ref.id))
  ]
  
  // Step 2: Remove all structures from their current positions
  for (const structureToMove of allStructuresToMove) {
    newStructures.delete(structureToMove.id)
    newPositions = removeStructureFromPositionMap(structureToMove, newPositions)
  }
  
  // Step 3: Clear existing structures at target positions if overwriting
  if (overwriteExisting) {
    const mainEndPosition = getEndPosition(targetPosition, structure.dimensions)
    for (let row = targetPosition.row; row <= mainEndPosition.row; row++) {
      for (let col = targetPosition.col; col <= mainEndPosition.col; col++) {
        const existingStructures = getStructuresAtPosition(row, col, newPositions, newStructures)
        for (const existingStructure of existingStructures) {
          if (!allStructuresToMove.some(moving => moving.id === existingStructure.id)) {
            newStructures.delete(existingStructure.id)
            newPositions = removeStructureFromPositionMap(existingStructure, newPositions)
          }
        }
      }
    }
  }
  
  // Step 4: Move all structures to their new positions
  const movedStructures = new Map<string, Structure>()
  
  for (const structureToMove of allStructuresToMove) {
    const movedStructure = applyPositionDelta(structureToMove, deltaRow, deltaCol)
    movedStructures.set(structureToMove.id, movedStructure)
  }
  
  // Step 5: Update itemIds references for tables and arrays
  for (const [structureId, movedStructure] of movedStructures) {
    if (movedStructure.type === 'table' && 'itemIds' in movedStructure) {
      const table = movedStructure as TableStructure
      const newItemIds: (string | null)[][] = []
      
      for (let row = 0; row < table.dimensions.rows; row++) {
        const rowCells: (string | null)[] = []
        for (let col = 0; col < table.dimensions.cols; col++) {
          const newRow = table.startPosition.row + row
          const newCol = table.startPosition.col + col
          
          if (isValidPosition(newRow, newCol)) {
            // Get the original cell value if it exists
            const originalCellId = (structure as TableStructure).itemIds?.[row]?.[col]
            const originalCell = originalCellId ? structures.get(originalCellId) as CellStructure : null
            const originalValue = originalCell?.value || ''
            
            // Create new cell structure at target position if there's a value
            if (originalValue || originalCell) {
              const newCellId = `cell-${newRow}-${newCol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
              const newCell: CellStructure = {
                type: 'cell',
                id: newCellId,
                startPosition: { row: newRow, col: newCol },
                dimensions: { rows: 1, cols: 1 },
                value: originalValue
              }
              movedStructures.set(newCellId, newCell)
              rowCells.push(newCellId)
            } else {
              rowCells.push(null)
            }
          } else {
            rowCells.push(null)
          }
        }
        newItemIds.push(rowCells)
      }
      
      // Update the table structure with new itemIds
      movedStructures.set(structureId, { ...movedStructure, itemIds: newItemIds } as TableStructure)
      
    } else if (movedStructure.type === 'array' && 'itemIds' in movedStructure) {
      const array = movedStructure as ArrayStructure
      const newItemIds: (string | null)[] = []
      
      if (array.contentType === 'cells') {
        // Handle cell arrays
        const size = array.direction === 'horizontal' ? array.dimensions.cols : array.dimensions.rows
        
        for (let i = 0; i < size; i++) {
          let newRow, newCol
          if (array.direction === 'horizontal') {
            newRow = array.startPosition.row
            newCol = array.startPosition.col + i
          } else {
            newRow = array.startPosition.row + i
            newCol = array.startPosition.col
          }
          
          if (isValidPosition(newRow, newCol)) {
            // Get the original cell value if it exists
            const originalCellId = (structure as ArrayStructure).itemIds?.[i]
            const originalCell = originalCellId ? structures.get(originalCellId) as CellStructure : null
            const originalValue = originalCell?.value || ''
            
            // Create new cell structure at target position if there was an original cell
            if (originalCell || originalValue) {
              const newCellId = `cell-${newRow}-${newCol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
              const newCell: CellStructure = {
                type: 'cell',
                id: newCellId,
                startPosition: { row: newRow, col: newCol },
                dimensions: { rows: 1, cols: 1 },
                value: originalValue
              }
              movedStructures.set(newCellId, newCell)
              newItemIds.push(newCellId)
            } else {
              newItemIds.push(null)
            }
          } else {
            newItemIds.push(null)
          }
        }
      } else {
        // Handle template arrays - itemIds should reference the moved template instances
        for (const originalItemId of array.itemIds) {
          if (originalItemId && movedStructures.has(originalItemId)) {
            newItemIds.push(originalItemId) // Reference stays the same, just position changed
          } else {
            newItemIds.push(null)
          }
        }
      }
      
      // Update the array structure with new itemIds
      movedStructures.set(structureId, { ...movedStructure, itemIds: newItemIds } as ArrayStructure)
    }
  }
  
  // Step 6: Add all moved structures to the new maps
  for (const [structureId, movedStructure] of movedStructures) {
    newStructures.set(structureId, movedStructure)
    newPositions = addStructureToPositionMap(movedStructure, newPositions)
  }
  
  return { structures: newStructures, positions: newPositions }
}

// =============================================================================
// HIERARCHY DETECTION AND SELECTION UTILITIES
// =============================================================================

/**
 * Get all structures at a position ordered by containment hierarchy (outermost to innermost)
 */
export const getStructureHierarchy = (
  row: number, 
  col: number, 
  positions: PositionMap, 
  structures: StructureMap
): Structure[] => {
  const structuresAtPosition = getStructuresAtPosition(row, col, positions, structures)
  
  if (structuresAtPosition.length <= 1) {
    return structuresAtPosition
  }
  
  return sortStructuresByContainment(structuresAtPosition)
}

/**
 * Sort structures by containment hierarchy (outermost to innermost)
 * Uses area size, position, and structure type to determine hierarchy
 */
export const sortStructuresByContainment = (structures: Structure[]): Structure[] => {
  return structures.sort((a, b) => {
    // Calculate areas
    const areaA = a.dimensions.rows * a.dimensions.cols
    const areaB = b.dimensions.rows * b.dimensions.cols
    
    // Primary sort: larger structures (by area) come first (outermost)
    if (areaA !== areaB) {
      return areaB - areaA
    }
    
    // Secondary sort: if same area, use position (top-left comes first)
    const positionCompare = (a.startPosition.row - b.startPosition.row) || (a.startPosition.col - b.startPosition.col)
    if (positionCompare !== 0) {
      return positionCompare
    }
    
    // Tertiary sort: use structure type hierarchy (template > array > table > cell)
    const typeOrder = { template: 0, array: 1, table: 2, cell: 3 }
    const typeA = typeOrder[a.type as keyof typeof typeOrder] ?? 4
    const typeB = typeOrder[b.type as keyof typeof typeOrder] ?? 4
    
    return typeA - typeB
  })
}

/**
 * Check if one structure completely contains another
 */
export const isStructureContainedIn = (inner: Structure, outer: Structure): boolean => {
  const innerEnd = getEndPosition(inner.startPosition, inner.dimensions)
  const outerEnd = getEndPosition(outer.startPosition, outer.dimensions)
  
  return (
    inner.startPosition.row >= outer.startPosition.row &&
    inner.startPosition.col >= outer.startPosition.col &&
    innerEnd.row <= outerEnd.row &&
    innerEnd.col <= outerEnd.col &&
    inner.id !== outer.id
  )
}

/**
 * Get the next structure in the hierarchy when clicking repeatedly on the same position
 */
export const getNextStructureInHierarchy = (
  currentStructure: Structure | null,
  hierarchy: Structure[],
  currentLevel: number
): { structure: Structure | null, level: number } => {
  if (hierarchy.length === 0) {
    return { structure: null, level: 0 }
  }
  
  // If no current structure or not in hierarchy, start at level 0
  if (!currentStructure || !hierarchy.some(s => s.id === currentStructure.id)) {
    return { structure: hierarchy[0], level: 0 }
  }
  
  // Find current structure index in hierarchy
  const currentIndex = hierarchy.findIndex(s => s.id === currentStructure.id)
  
  // If current structure is in hierarchy, advance to next level
  if (currentIndex !== -1) {
    const nextLevel = currentLevel + 1
    
    // If we've reached the end, cycle back to the beginning
    if (nextLevel >= hierarchy.length) {
      return { structure: hierarchy[0], level: 0 }
    }
    
    return { structure: hierarchy[nextLevel], level: nextLevel }
  }
  
  // Fallback: start at level 0
  return { structure: hierarchy[0], level: 0 }
}

/**
 * Check if two positions are the same
 */
export const isSamePosition = (pos1: Position | null, pos2: Position | null): boolean => {
  if (!pos1 || !pos2) return false
  return pos1.row === pos2.row && pos1.col === pos2.col
}

// =============================================================================
// TEMPLATE ARRAY UTILITIES
// =============================================================================

/**
 * Calculate array dimensions when containing templates
 */
export const calculateArrayDimensionsWithTemplate = (
  array: ArrayStructure,
  templateDimensions: { rows: number, cols: number },
  instanceCount: number = 1
): Dimensions => {
  if (array.direction === 'horizontal') {
    return {
      rows: templateDimensions.rows,
      cols: templateDimensions.cols * instanceCount
    }
  } else {
    return {
      rows: templateDimensions.rows * instanceCount,
      cols: templateDimensions.cols
    }
  }
}

/**
 * Calculate position for a template instance within an array
 */
export const calculateTemplateInstancePosition = (
  arrayStartPosition: Position,
  arrayDirection: 'horizontal' | 'vertical',
  templateDimensions: { rows: number, cols: number },
  instanceIndex: number
): Position => {
  if (arrayDirection === 'horizontal') {
    return {
      row: arrayStartPosition.row,
      col: arrayStartPosition.col + (templateDimensions.cols * instanceIndex)
    }
  } else {
    return {
      row: arrayStartPosition.row + (templateDimensions.rows * instanceIndex),
      col: arrayStartPosition.col
    }
  }
}

/**
 * Get template dimensions from template storage
 * Note: This function will need to be called with templateStructures passed as parameter
 * to avoid circular dependency issues
 */
export const getTemplateDimensionsFromStructures = (
  templateStructures: Map<string, Structure>
): { rows: number, cols: number } => {
  if (!templateStructures || templateStructures.size === 0) {
    // Default dimensions if template not found
    return { rows: 2, cols: 2 }
  }
  
  // Calculate bounding box of all structures in the template
  let minRow = Infinity, maxRow = -Infinity
  let minCol = Infinity, maxCol = -Infinity
  
  for (const [, structure] of templateStructures) {
    const endPos = getEndPosition(structure.startPosition, structure.dimensions)
    
    minRow = Math.min(minRow, structure.startPosition.row)
    maxRow = Math.max(maxRow, endPos.row)
    minCol = Math.min(minCol, structure.startPosition.col)
    maxCol = Math.max(maxCol, endPos.col)
  }
  
  return {
    rows: maxRow - minRow + 1,
    cols: maxCol - minCol + 1
  }
}

/**
 * Check if an array contains templates
 */
export const isTemplateArray = (array: ArrayStructure): boolean => {
  return array.contentType !== 'cells' && array.templateDimensions != null
}

/**
 * Get the number of template instances that can fit in an array's current dimensions
 */
export const getTemplateInstanceCount = (
  array: ArrayStructure,
  templateDimensions: { rows: number, cols: number }
): number => {
  if (array.direction === 'horizontal') {
    return Math.floor(array.dimensions.cols / templateDimensions.cols)
  } else {
    return Math.floor(array.dimensions.rows / templateDimensions.rows)
  }
}

/**
 * Calculate the expansion needed to add another template instance
 */
export const calculateTemplateArrayExpansion = (
  array: ArrayStructure,
  templateDimensions: { rows: number, cols: number }
): { direction: 'left' | 'right' | 'up' | 'down', amount: number } => {
  if (array.direction === 'horizontal') {
    return {
      direction: 'right',
      amount: templateDimensions.cols
    }
  } else {
    return {
      direction: 'down',
      amount: templateDimensions.rows
    }
  }
}
