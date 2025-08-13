import React from 'react'
import { Structure, CellStructure, Position, Dimensions, StructureMap, PositionMap } from '../types'
import { generateUUID } from '../utils/sheetUtils'
import { getCellValue, positionsToDimensions, addStructureToPositionMap, removeStructureFromPositionMap, getStructureAtPosition, getDimensions, initializeCellIdsFromRange } from '../utils/structureUtils'
import { MAX_ROWS, MAX_COLS } from '../constants'

export const useStructureOperations = (
  structures: StructureMap,
  setStructures: React.Dispatch<React.SetStateAction<StructureMap>>,
  positions: PositionMap,
  setPositions: React.Dispatch<React.SetStateAction<PositionMap>>,
  selectedRange: {start: Position, end: Position} | null,
  setSelectedStructure: React.Dispatch<React.SetStateAction<Structure | null>>
) => {
  const createStructure = (type: Structure['type'], name: string, startPosition: Position, dimensions: Dimensions) => {
    let newStructure: Structure

    switch (type) {
      case 'cell':
        newStructure = {
          type: 'cell',
          id: generateUUID(),
          startPosition: startPosition,
          dimensions: dimensions,
          name,
          value: ''
        }
        return newStructure
      
      case 'array':
        let direction: 'horizontal' | 'vertical';

        if (dimensions.cols == 1) {
          direction = 'vertical'
        } else if (dimensions.rows == 1) {
          direction = 'horizontal'
        } else {
          console.warn('Invalid array dimensions:', dimensions)
          return
        }

        const arrayCellIds = initializeCellIdsFromRange(
          startPosition, dimensions, positions, structures, 'array'
        ) as (string | null)[]

        newStructure = {
          type: 'array',
          id: generateUUID(),
          startPosition: startPosition,
          dimensions: dimensions,
          name,
          direction,
          cellIds: arrayCellIds
        }
        return newStructure

      case 'table':
        const tableCellIds = initializeCellIdsFromRange(
          startPosition, dimensions, positions, structures, 'table'
        ) as (string | null)[][]
        
        newStructure = {
          type: 'table',
          id: generateUUID(),
          startPosition: startPosition,
          dimensions: dimensions,
          name,
          colHeaderLevels: 1,
          rowHeaderLevels: 0,
          cellIds: tableCellIds
        }
        return newStructure
    }
  }

  // Create structure from toolbar (works with selected range)
  const createStructureFromToolbar = React.useCallback((type: Structure['type']) => {
    let startRow: number, endRow: number, startCol: number, endCol: number

    if (selectedRange) {
      // Use selected range
      startRow = Math.min(selectedRange.start.row, selectedRange.end.row)
      endRow = Math.max(selectedRange.start.row, selectedRange.end.row)
      startCol = Math.min(selectedRange.start.col, selectedRange.end.col)
      endCol = Math.max(selectedRange.start.col, selectedRange.end.col)
    } else {
      return // No selection
    }

    const newStructure = createStructure(type, '', {row: startRow, col: startCol}, getDimensions({row: startRow, col: startCol}, {row: endRow, col: endCol}))

    if (!newStructure) return // Invalid structure type or dimensions

    // Set the main structure in structures map and update position map
    setStructures((prev: StructureMap) => {
      const newStructures = new Map(prev)
      newStructures.set(newStructure.id, newStructure)
      
      return newStructures
    })
    
    // Update position map
    setPositions(prev => addStructureToPositionMap(newStructure, prev))
    
    // Select the newly created structure
    setSelectedStructure(newStructure)
  }, [selectedRange, structures, positions, setStructures, setSelectedStructure, setPositions])

  // Function to update table header settings
  const updateTableHeaders = React.useCallback((row: number, col: number, headerRows: number, headerCols: number) => {
    // Find the structure at the given position
    // let targetStructure: Structure | null = null
    // for (const [, structure] of structures) {
    //   if (structure.type === 'table') {
    //     const { startPosition, endPosition } = structure
    //     if (row >= startPosition.row && row <= endPosition.row &&
    //         col >= startPosition.col && col <= endPosition.col) {
    //       targetStructure = structure
    //       break
    //     }
    //   }
    // }
    
    // if (targetStructure && targetStructure.type === 'table') {
    //   const updatedTable = { 
    //     ...targetStructure,
    //     headerRows: headerRows || 1,
    //     headerCols: headerCols || 0
    //   }
      
    //   setStructures((prev: StructureMap) => {
    //     const newStructures = new Map(prev)
    //     newStructures.set(updatedTable.id, updatedTable)
        
    //     return newStructures
    //   })
    // }
  }, [structures, setStructures])

  const getStructureAtPositionSafe = React.useCallback((row: number, col: number) => {
    return getStructureAtPosition(row, col, positions, structures)
  }, [positions, structures])

  const updateStructureName = React.useCallback((structureId: string, name: string) => {
    setStructures((prev: StructureMap) => {
      const newStructures = new Map(prev)
      const structure = newStructures.get(structureId)
      if (structure) {
        // Set name to undefined if empty string is passed to delete the name
        const updatedStructure = { ...structure, name: name || undefined }
        newStructures.set(structureId, updatedStructure)
        
        // Also update the selected structure if it's the same one
        setSelectedStructure(current => {
          if (current && current.id === structureId) {
            return updatedStructure as Structure
          }
          return current
        })
      }
      return newStructures
    })
  }, [setStructures, setSelectedStructure])

  const rotateArray = React.useCallback((arrayId: string) => { // TODO: Implement array rotation with new model
    // setStructures((prev: StructureMap) => {
    //   const newStructures = new Map<string, Structure>(prev)
    //   const structure = newStructures.get(arrayId)
      
    //   if (structure && structure.type === 'array') {
    //     const array = structure
    //     const { startPosition } = array
    //     const newDirection: 'horizontal' | 'vertical' = array.direction === 'horizontal' ? 'vertical' : 'horizontal'
        
    //     // Calculate new dimensions based on rotation
    //     let newEndPosition: { row: number, col: number }
    //     let newCellIds: string[] = []
        
    //     if (newDirection === 'vertical') {
    //       // Converting from horizontal to vertical
    //       newEndPosition = { 
    //         row: startPosition.row + array.size - 1, 
    //         col: startPosition.col 
    //       }
          
    //       // Update cell positions to be vertical - need to update the actual cell structures
    //       newCellIds = array.cellIds.map((cellId, index) => {
    //         const cell = newStructures.get(cellId) as CellStructure
    //         if (cell) {
    //           const updatedCell = {
    //             ...cell,
    //             startPosition: { row: startPosition.row + index, col: startPosition.col },
    //             endPosition: { row: startPosition.row + index, col: startPosition.col }
    //           }
    //           newStructures.set(cellId, updatedCell)
    //         }
    //         return cellId
    //       })
    //     } else {
    //       // Converting from vertical to horizontal
    //       newEndPosition = { 
    //         row: startPosition.row, 
    //         col: startPosition.col + array.size - 1 
    //       }
          
    //       // Update cell positions to be horizontal - need to update the actual cell structures
    //       newCellIds = array.cellIds.map((cellId, index) => {
    //         const cell = newStructures.get(cellId) as CellStructure
    //         if (cell) {
    //           const updatedCell = {
    //             ...cell,
    //             startPosition: { row: startPosition.row, col: startPosition.col + index },
    //             endPosition: { row: startPosition.row, col: startPosition.col + index }
    //           }
    //           newStructures.set(cellId, updatedCell)
    //         }
    //         return cellId
    //       })
    //     }
        
    //     const updatedArray = {
    //       ...array,
    //       direction: newDirection,
    //       endPosition: newEndPosition,
    //       cellIds: newCellIds
    //     }
        
    //     newStructures.set(arrayId, updatedArray)
        
    //     // Also update the selected structure if it's the same one
    //     setSelectedStructure(current => {
    //       if (current && current.id === arrayId) {
    //         return updatedArray
    //       }
    //       return current
    //     })
    //   }
      
    //   return newStructures
    // })
    
    // // Update position map when rotating
    // setPositions(prev => {
    //   const structure = structures.get(arrayId)
    //   if (structure) {
    //     // Remove old positions and add new ones
    //     let newPositionMap = removeStructureFromPositionMap(structure, prev)
    //     // Get the updated structure from the structures map after rotation
    //     const updatedStructure = structures.get(arrayId)
    //     if (updatedStructure) {
    //       newPositionMap = addStructureToPositionMap(updatedStructure, newPositionMap)
    //     }
    //     return newPositionMap
    //   }
    //   return prev
    // })
  }, [structures, setStructures, setSelectedStructure, setPositions])

  const deleteStructure = React.useCallback((structureId: string) => {
    const structureToDelete = structures.get(structureId)
    
    setStructures((prev: StructureMap) => {
      const newStructures = new Map(prev)
      newStructures.delete(structureId)
      return newStructures
    })
    
    // Remove from position map
    if (structureToDelete) {
      setPositions(prev => removeStructureFromPositionMap(structureToDelete, prev))
    }
    
    // Clear selected structure if it was the deleted one
    setSelectedStructure(current => {
      if (current && current.id === structureId) {
        return null
      }
      return current
    })
  }, [structures, setStructures, setPositions, setSelectedStructure])

  return {
    createStructure,
    createStructureFromToolbar,
    updateTableHeaders,
    getStructureAtPositionSafe,
    updateStructureName,
    rotateArray,
    deleteStructure
  }
}
