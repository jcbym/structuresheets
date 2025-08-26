import React from 'react'
import { CellStructure, ArrayStructure, TableStructure, StructureMap, PositionMap, TemplateStructure } from '../types'
import { getCellValue, getStructureAtPosition, addStructureToPositionMap } from '../utils/structureUtils'
import { 
  markCellOverride, 
  isPositionInTemplate, 
  convertToRelativePosition 
} from '../utils/templateOverrides'

export const useCellOperations = (
  structures: StructureMap,
  setStructures: React.Dispatch<React.SetStateAction<StructureMap>>,
  positions: PositionMap,
  setPositions: React.Dispatch<React.SetStateAction<PositionMap>>,
  triggerRecalculation?: (changedCells: Array<{row: number, col: number}>) => void
) => {
  const updateCell = React.useCallback((row: number, col: number, value: string) => {
    // First, check if this position is within a template instance
    const templateInstance = findTemplateInstanceAtPosition(row, col, structures)
    
    if (templateInstance) {
      // Position is within a template instance - record as override
      const relativePosition = convertToRelativePosition(
        { row, col },
        templateInstance.startPosition
      )
      const relativePositionKey = `${relativePosition.row}-${relativePosition.col}`
      
      // Update the template instance with the cell override
      setStructures((prev: StructureMap) => {
        const newStructures = new Map(prev)
        const updatedInstance = markCellOverride(templateInstance, relativePositionKey, value)
        newStructures.set(templateInstance.id, updatedInstance)
        return newStructures
      })
      
      // Also update any existing cell structure at this position
      const existingStructure = getStructureAtPosition(row, col, positions, structures)
      if (existingStructure && existingStructure.type === 'cell') {
        setStructures((prev: StructureMap) => {
          const newStructures = new Map(prev)
          newStructures.set(existingStructure.id, { ...existingStructure, value })
          return newStructures
        })
      } else if (value !== '') {
        // Create new cell structure if value is not empty
        const newCellId = `cell-${row}-${col}-${Date.now()}`
        const newCell: CellStructure = {
          type: 'cell',
          id: newCellId,
          startPosition: { row, col },
          dimensions: { rows: 1, cols: 1 },
          value
        }
        
        setStructures((prev: StructureMap) => {
          const newStructures = new Map(prev)
          newStructures.set(newCellId, newCell)
          return newStructures
        })
        
        // Add new cell to position map
        setPositions(prev => addStructureToPositionMap(newCell, prev))
      }
      
      // Trigger recalculation for any formulas that depend on this cell
      if (triggerRecalculation) {
        triggerRecalculation([{ row, col }]);
      }
      return
    }

    // Continue with normal cell update logic if not in template instance
    // First, check if this position belongs to a table
    const tableStructure = findTableAtPosition(row, col, structures)
    
    if (tableStructure) {
      // This position is within a table - handle table cell logic
      const tableRow = row - tableStructure.startPosition.row
      const tableCol = col - tableStructure.startPosition.col
      
      // Check if there's already a cell ID in the table at this position
      const existingCellId = tableStructure.cellIds[tableRow]?.[tableCol]
      
      if (existingCellId) {
        // Update existing table cell
        const existingCell = structures.get(existingCellId) as CellStructure
        if (existingCell) {
          setStructures((prev: StructureMap) => {
            const newStructures = new Map(prev)
            newStructures.set(existingCellId, { ...existingCell, value })
            return newStructures
          })
        }
      } else {
        // Create new cell and update table's cellIds
        const newCellId = `cell-${row}-${col}-${Date.now()}`
        const newCell: CellStructure = {
          type: 'cell',
          id: newCellId,
          startPosition: { row, col },
          dimensions: { rows: 1, cols: 1 },
          value
        }
        
        setStructures((prev: StructureMap) => {
          const newStructures = new Map(prev)
          
          // Add the new cell structure
          newStructures.set(newCellId, newCell)
          
          // Update the table's cellIds to reference the new cell
          const updatedTable = { ...tableStructure }
          const newCellIds = updatedTable.cellIds.map(row => [...row]) // Deep copy
          newCellIds[tableRow][tableCol] = newCellId
          updatedTable.cellIds = newCellIds
          
          newStructures.set(tableStructure.id, updatedTable)
          
          return newStructures
        })
        
        // Add new cell to position map
        setPositions(prev => addStructureToPositionMap(newCell, prev))
      }
    } else {
      // Check if this position belongs to an array
      const arrayStructure = findArrayAtPosition(row, col, structures)
      
      if (arrayStructure) {
        // This position is within an array - handle array cell logic
        const arrayIndex = getArrayIndex(row, col, arrayStructure)
        
        if (arrayIndex !== -1) {
          // Check if there's already a cell ID in the array at this position
          const existingCellId = arrayStructure.cellIds[arrayIndex]
          
          if (existingCellId) {
            // Update existing array cell
            const existingCell = structures.get(existingCellId) as CellStructure
            if (existingCell) {
              setStructures((prev: StructureMap) => {
                const newStructures = new Map(prev)
                newStructures.set(existingCellId, { ...existingCell, value })
                return newStructures
              })
            }
          } else {
            // Create new cell and update array's cellIds
            const newCellId = `cell-${row}-${col}-${Date.now()}`
            const newCell: CellStructure = {
              type: 'cell',
              id: newCellId,
              startPosition: { row, col },
              dimensions: { rows: 1, cols: 1 },
              value
            }
            
            setStructures((prev: StructureMap) => {
              const newStructures = new Map(prev)
              
              // Add the new cell structure
              newStructures.set(newCellId, newCell)
              
              // Update the array's cellIds to reference the new cell
              const updatedArray = { ...arrayStructure }
              const newCellIds = [...updatedArray.cellIds] // Copy array
              newCellIds[arrayIndex] = newCellId
              updatedArray.cellIds = newCellIds
              
              newStructures.set(arrayStructure.id, updatedArray)
              
              return newStructures
            })
            
            // Add new cell to position map
            setPositions(prev => addStructureToPositionMap(newCell, prev))
          }
        }
      } else {
        // Not in a table or array - check for existing standalone structures
        const existingStructure = getStructureAtPosition(row, col, positions, structures)
        
        if (existingStructure && existingStructure.type === 'cell') {
          // Update existing standalone cell
          setStructures((prev: StructureMap) => {
            const newStructures = new Map(prev)
            newStructures.set(existingStructure.id, { ...existingStructure, value })
            return newStructures
          })
        } else {
          // Create new standalone cell
          const newCellId = `cell-${row}-${col}-${Date.now()}`
          const newCell: CellStructure = {
            type: 'cell',
            id: newCellId,
            startPosition: { row, col },
            dimensions: { rows: 1, cols: 1 },
            value
          }
          
          setStructures((prev: StructureMap) => {
            const newStructures = new Map(prev)
            newStructures.set(newCellId, newCell)
            return newStructures
          })
          
          // Add new cell to position map
          setPositions(prev => addStructureToPositionMap(newCell, prev))
        }
      }
    }

    // Trigger recalculation for any formulas that depend on this cell
    if (triggerRecalculation) {
      triggerRecalculation([{ row, col }]);
    }
  }, [structures, setStructures, positions, setPositions, triggerRecalculation])

  // Helper function to find if a position belongs to a table
  const findTableAtPosition = React.useCallback((row: number, col: number, structures: StructureMap): TableStructure | null => {
    for (const [, structure] of structures) {
      if (structure.type === 'table') {
        const table = structure as TableStructure
        const { startPosition, dimensions } = table
        const endRow = startPosition.row + dimensions.rows - 1
        const endCol = startPosition.col + dimensions.cols - 1
        
        // Check if the position is within the table bounds
        if (row >= startPosition.row && row <= endRow && 
            col >= startPosition.col && col <= endCol) {
          return table
        }
      }
    }
    return null
  }, [])

  // Helper function to find if a position belongs to an array
  const findArrayAtPosition = React.useCallback((row: number, col: number, structures: StructureMap): ArrayStructure | null => {
    for (const [, structure] of structures) {
      if (structure.type === 'array') {
        const array = structure as ArrayStructure
        const { startPosition, dimensions } = array
        const endRow = startPosition.row + dimensions.rows - 1
        const endCol = startPosition.col + dimensions.cols - 1
        
        // Check if the position is within the array bounds
        if (row >= startPosition.row && row <= endRow && 
            col >= startPosition.col && col <= endCol) {
          return array
        }
      }
    }
    return null
  }, [])

  // Helper function to get the index in the array's cellIds for a given position
  const getArrayIndex = React.useCallback((row: number, col: number, arrayStructure: ArrayStructure): number => {
    const arrayRow = row - arrayStructure.startPosition.row
    const arrayCol = col - arrayStructure.startPosition.col
    
    // Calculate the index based on array direction
    if (arrayStructure.direction === 'horizontal') {
      // For horizontal arrays, the index is the column offset
      return arrayCol
    } else {
      // For vertical arrays, the index is the row offset
      return arrayRow
    }
  }, [])

  // Helper function to find if a position is within a template instance
  const findTemplateInstanceAtPosition = React.useCallback((row: number, col: number, structures: StructureMap): TemplateStructure | null => {
    for (const [, structure] of structures) {
      if (structure.type === 'template') {
        const templateInstance = structure as TemplateStructure
        if (isPositionInTemplate({ row, col }, templateInstance)) {
          return templateInstance
        }
      }
    }
    return null
  }, [])

  const getCellValueSafe = React.useCallback((row: number, col: number): string => {
    return getCellValue(row, col, structures, positions)
  }, [positions, structures])

  return {
    updateCell,
    getCellValueSafe
  }
}
