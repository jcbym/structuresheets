import React from 'react'
import { CellStructure, ArrayStructure, TableStructure, StructureMap, PositionMap, TemplateStructure } from '../types'
import { getCellValue, getStructureAtPosition, addStructureToPositionMap } from '../utils/structureUtils'
import { 
  markCellOverride, 
  isPositionInTemplate, 
  convertToRelativePosition 
} from '../utils/templateOverrides'
import { FormulaEngine } from '../formula/engine'
import { DependencyManager } from '../formula/dependencyManager'

export const useCellOperations = (
  structures: StructureMap,
  setStructures: React.Dispatch<React.SetStateAction<StructureMap>>,
  positions: PositionMap,
  setPositions: React.Dispatch<React.SetStateAction<PositionMap>>,
  triggerRecalculation?: (changedCells: Array<{row: number, col: number}>) => void,
  dependencyManager?: DependencyManager
) => {
  // Helper function to evaluate formula and return cell data
  const evaluateFormula = React.useCallback((formula: string): { value?: string, formulaError?: string } => {
    try {
      const engine = new FormulaEngine(structures, positions)
      const result = engine.evaluateFormula(formula)
      
      if (result.kind === 'ERROR') {
        return { formulaError: result.value }
      } else if (result.kind === 'NUMBER') {
        return { value: result.value.toString() }
      } else if (result.kind === 'STRING') {
        return { value: result.value }
      } else if (result.kind === 'BOOLEAN') {
        return { value: result.value.toString() }
      } else if (result.kind === 'EMPTY') {
        return { value: '' }
      } else {
        // Handle other types like RANGE
        return { value: String(result.value) }
      }
    } catch (error) {
      return { formulaError: `Formula error: ${error instanceof Error ? error.message : 'Unknown error'}` }
    }
  }, [structures, positions])

  // Helper function to create or update cell with formula support
  const createOrUpdateCell = React.useCallback((existingCell: CellStructure | null, cellId: string, row: number, col: number, value: string): CellStructure => {
    const isFormula = value.startsWith('=')
    
    // Remove old formula dependencies if they exist
    if (dependencyManager && existingCell?.formula) {
      dependencyManager.removeFormula(cellId)
    }
    
    if (isFormula) {
      const { value: formulaResult, formulaError } = evaluateFormula(value)
      
      // Register formula dependencies with current structure state
      if (dependencyManager) {
        try {
          const engine = new FormulaEngine(structures, positions)
          engine.evaluateFormula(value) // This populates dependencies
          const dependencies = engine.getDependencies()
          dependencyManager.addFormula(cellId, value, dependencies)
        } catch (error) {
          // If formula evaluation fails, still register it without dependencies
          dependencyManager.addFormula(cellId, value, [])
        }
      }
      
      return {
        type: 'cell',
        id: cellId,
        startPosition: { row, col },
        dimensions: { rows: 1, cols: 1 },
        value: formulaResult || '', // Write formula result directly to value field
        formula: value,
        formulaError
      }
    } else {
      // When setting regular value, remove any formula dependencies
      if (dependencyManager) {
        dependencyManager.removeFormula(cellId)
      }
      
      return {
        type: 'cell',
        id: cellId,
        startPosition: { row, col },
        dimensions: { rows: 1, cols: 1 },
        value,
        // Clear formula fields when setting regular value
        formula: undefined,
        formulaError: undefined
      }
    }
  }, [evaluateFormula, dependencyManager, structures, positions])

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
        const updatedCell = createOrUpdateCell(existingStructure, existingStructure.id, row, col, value)
        setStructures((prev: StructureMap) => {
          const newStructures = new Map(prev)
          newStructures.set(existingStructure.id, updatedCell)
          return newStructures
        })
      } else if (value !== '') {
        // Create new cell structure if value is not empty
        const newCellId = `cell-${row}-${col}-${Date.now()}`
        const newCell = createOrUpdateCell(null, newCellId, row, col, value)
        
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
      
      // Check if this is a table header cell that needs colNames update
      const isHeaderCell = tableRow < (tableStructure.colHeaderLevels || 0)
      
      // Check if there's already a cell ID in the table at this position
      const existingCellId = tableStructure.itemIds[tableRow]?.[tableCol]
      
      if (existingCellId) {
        // Update existing table cell
        const existingCell = structures.get(existingCellId) as CellStructure
        if (existingCell) {
          if (value !== '') {
            // Update with non-empty value
            const updatedCell = createOrUpdateCell(existingCell, existingCellId, row, col, value)
            setStructures((prev: StructureMap) => {
              const newStructures = new Map(prev)
              newStructures.set(existingCellId, updatedCell)
              
              // If this is a header cell, update colNames mapping
              if (isHeaderCell) {
                const updatedTable = { ...tableStructure }
                const newColNames = { ...updatedTable.colNames }
                
                // Get old column name if it exists
                const oldColumnName = Object.keys(newColNames || {}).find(name => newColNames[name] === tableCol)
                
                // Remove old column name mapping if it exists
                if (oldColumnName) {
                  delete newColNames[oldColumnName]
                }
                
                // Add new column name mapping if value is not empty
                if (value.trim()) {
                  newColNames[value.trim()] = tableCol
                }
                
                updatedTable.colNames = Object.keys(newColNames).length > 0 ? newColNames : undefined
                newStructures.set(tableStructure.id, updatedTable)
              }
              
              return newStructures
            })
          } else {
            // Value is empty - remove cell and clean up table itemIds
            setStructures((prev: StructureMap) => {
              const newStructures = new Map(prev)
              
              // Remove the cell structure
              newStructures.delete(existingCellId)
              
              // Update the table's itemIds to remove the reference
              const updatedTable = { ...tableStructure }
              const newCellIds = updatedTable.itemIds.map(row => [...row]) // Deep copy
              newCellIds[tableRow][tableCol] = null
              updatedTable.itemIds = newCellIds
              
              // If this is a header cell, remove from colNames mapping
              if (isHeaderCell) {
                const newColNames = { ...updatedTable.colNames }
                const oldColumnName = Object.keys(newColNames || {}).find(name => newColNames[name] === tableCol)
                if (oldColumnName) {
                  delete newColNames[oldColumnName]
                  updatedTable.colNames = Object.keys(newColNames).length > 0 ? newColNames : undefined
                }
              }
              
              newStructures.set(tableStructure.id, updatedTable)
              
              return newStructures
            })
            
            // Remove cell from position map
            setPositions(prev => {
              const newPositions = new Map(prev)
              const posKey = `${row}-${col}`
              const existingIds = newPositions.get(posKey) || []
              const filteredIds = existingIds.filter(id => id !== existingCellId)
              
              if (filteredIds.length === 0) {
                newPositions.delete(posKey)
              } else {
                newPositions.set(posKey, filteredIds)
              }
              
              return newPositions
            })
          }
        }
        } else {
          // Create new cell - always create when updateCell is called (including empty values when Enter is pressed)
          const newCellId = `cell-${row}-${col}-${Date.now()}`
          const newCell = createOrUpdateCell(null, newCellId, row, col, value)
          
          setStructures((prev: StructureMap) => {
            const newStructures = new Map(prev)
            
            // Add the new cell structure
            newStructures.set(newCellId, newCell)
            
            // Update the table's itemIds to reference the new cell
            const updatedTable = { ...tableStructure }
            const newCellIds = updatedTable.itemIds.map(row => [...row]) // Deep copy
            newCellIds[tableRow][tableCol] = newCellId
            updatedTable.itemIds = newCellIds
            
            // If this is a header cell, update colNames mapping
            if (isHeaderCell && value.trim()) {
              const newColNames = { ...updatedTable.colNames }
              newColNames[value.trim()] = tableCol
              updatedTable.colNames = newColNames
            }
            
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
          const existingCellId = arrayStructure.itemIds[arrayIndex]
          
          if (existingCellId) {
            // Update existing array cell
            const existingCell = structures.get(existingCellId) as CellStructure
            if (existingCell) {
              if (value !== '') {
                // Update with non-empty value
                const updatedCell = createOrUpdateCell(existingCell, existingCellId, row, col, value)
                setStructures((prev: StructureMap) => {
                  const newStructures = new Map(prev)
                  newStructures.set(existingCellId, updatedCell)
                  return newStructures
                })
              } else {
                // Value is empty - remove cell and clean up array itemIds
                setStructures((prev: StructureMap) => {
                  const newStructures = new Map(prev)
                  
                  // Remove the cell structure
                  newStructures.delete(existingCellId)
                  
                  // Update the array's itemIds to remove the reference
                  const updatedArray = { ...arrayStructure }
                  const newCellIds = [...updatedArray.itemIds] // Copy array
                  newCellIds[arrayIndex] = null
                  updatedArray.itemIds = newCellIds
                  
                  newStructures.set(arrayStructure.id, updatedArray)
                  
                  return newStructures
                })
                
                // Remove cell from position map
                setPositions(prev => {
                  const newPositions = new Map(prev)
                  const posKey = `${row}-${col}`
                  const existingIds = newPositions.get(posKey) || []
                  const filteredIds = existingIds.filter(id => id !== existingCellId)
                  
                  if (filteredIds.length === 0) {
                    newPositions.delete(posKey)
                  } else {
                    newPositions.set(posKey, filteredIds)
                  }
                  
                  return newPositions
                })
              }
            }
          } else {
            // Create new cell - always create when updateCell is called (including empty values when Enter is pressed)
            const newCellId = `cell-${row}-${col}-${Date.now()}`
            const newCell = createOrUpdateCell(null, newCellId, row, col, value)
            
            setStructures((prev: StructureMap) => {
              const newStructures = new Map(prev)
              
              // Add the new cell structure
              newStructures.set(newCellId, newCell)
              
              // Update the array's itemIds to reference the new cell
              const updatedArray = { ...arrayStructure }
              const newCellIds = [...updatedArray.itemIds] // Copy array
              newCellIds[arrayIndex] = newCellId
              updatedArray.itemIds = newCellIds
              
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
          const updatedCell = createOrUpdateCell(existingStructure, existingStructure.id, row, col, value)
          setStructures((prev: StructureMap) => {
            const newStructures = new Map(prev)
            newStructures.set(existingStructure.id, updatedCell)
            return newStructures
          })
        } else {
          // Create new standalone cell - always create when updateCell is called (including empty values when Enter is pressed)
          const newCellId = `cell-${row}-${col}-${Date.now()}`
          const newCell = createOrUpdateCell(null, newCellId, row, col, value)
          
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
    // AND for the cell itself if it contains a formula
    if (triggerRecalculation) {
      triggerRecalculation([{ row, col }]);
    }
  }, [structures, setStructures, positions, setPositions, triggerRecalculation, createOrUpdateCell])

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

  // Helper function to get the index in the array's itemIds for a given position
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
