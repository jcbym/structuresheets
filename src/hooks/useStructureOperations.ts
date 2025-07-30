import React from 'react'
import { Structure, Cell, StructureArray, Position } from '../types'
import { generateUUID } from '../utils/sheetUtils'
import { getCellValue, getStructureAtPosition, positionsToDimensions } from '../utils/structureUtils'
import { MAX_ROWS, MAX_COLS } from '../constants'

const createMultipleCells = (
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  structures: Map<string, Structure>
) => {
  const cells: Cell[] = []
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      if (r < MAX_ROWS && c < MAX_COLS) {
        cells.push({
          type: 'cell',
          id: generateUUID(),
          startPosition: { row: r, col: c },
          endPosition: { row: r, col: c },
          value: getCellValue(r, c, structures)
        })
      }
    }
  }
  return cells
}

export const useStructureOperations = (
  structures: Map<string, Structure>,
  setStructures: React.Dispatch<React.SetStateAction<Map<string, Structure>>>,
  selectedRange: {start: Position, end: Position} | null,
  setSelectedStructure: React.Dispatch<React.SetStateAction<Structure | null>>
) => {
  const createStructure = (type: Structure['type'], name: string, startPosition: Position, endPosition: Position) => {
    let newStructure: Structure

    switch (type) {
      case 'cell':
        newStructure = {
          type: 'cell',
          id: generateUUID(),
          startPosition: startPosition,
          endPosition: endPosition,
          name,
          value: ''
        }
        return newStructure
      
      case 'array':
        const arrayDims = positionsToDimensions(startPosition, endPosition)
        // const cells = createMultipleCells(row, row + arrayDims.rows - 1, col, col + arrayDims.cols - 1, structures)
        let direction: 'horizontal' | 'vertical';

        if (arrayDims.cols == 1) {
          direction = 'vertical'
        } else if (arrayDims.rows == 1) {
          direction = 'horizontal'
        } else {
          console.warn('Invalid array dimensions:', arrayDims)
          return
        }

        newStructure = {
          type: 'array',
          id: generateUUID(),
          startPosition: startPosition,
          endPosition: endPosition,
          name,
          cells: [],
          size: Math.max(arrayDims.rows, arrayDims.cols),
          direction
        }
        return newStructure

      case 'table':
        const arrays: StructureArray[] = []
        const tableDims = positionsToDimensions(startPosition, endPosition)
        
        // // Create arrays for the rows
        // for (let r = 0; r < tableDims.rows; r++) {
        //   const rowCells = createMultipleCells(row + r, row + r, col, col + tableDims.cols - 1, structures)
          
        //   arrays.push({
        //     type: 'array',
        //     id: generateUUID(),
        //     startPosition: { row: row + r, col },
        //     endPosition: { row: row + r, col: col + tableDims.cols - 1 },
        //     cells: rowCells,
        //     direction: 'horizontal',
        //     size: tableDims.cols
        //   })
        // }

        newStructure = {
          type: 'table',
          id: generateUUID(),
          startPosition: startPosition,
          endPosition: endPosition,
          name,
          arrays,
          hasHeaderRow: true,
          hasHeaderCol: false,
          headerRows: 1,
          headerCols: 1
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

    const newStructure = createStructure(type, '', {row: startRow, col: startCol}, {row: endRow, col: endCol})

    if (!newStructure) return // Invalid structure type or dimensions

    // Set the main structure in structures map
    setStructures(prev => {
      const newStructures = new Map(prev)
      newStructures.set(newStructure.id, newStructure)
      
      return newStructures
    })
    
    // Select the newly created structure
    setSelectedStructure(newStructure)
  }, [selectedRange, structures, setStructures, setSelectedStructure])

  // Function to update table header settings
  const updateTableHeaders = React.useCallback((row: number, col: number, hasHeaderRow: boolean, hasHeaderCol: boolean, headerRows?: number, headerCols?: number) => {
    // Find the structure at the given position
    let targetStructure: Structure | null = null
    for (const [id, structure] of structures) {
      if (structure.type === 'table') {
        const { startPosition, endPosition } = structure
        if (row >= startPosition.row && row <= endPosition.row &&
            col >= startPosition.col && col <= endPosition.col) {
          targetStructure = structure
          break
        }
      }
    }
    
    if (targetStructure && targetStructure.type === 'table') {
      const updatedTable = { 
        ...targetStructure, 
        hasHeaderRow, 
        hasHeaderCol,
        headerRows: headerRows || 1,
        headerCols: headerCols || 1
      }
      
      setStructures(prev => {
        const newStructures = new Map(prev)
        newStructures.set(updatedTable.id, updatedTable)
        
        return newStructures
      })
    }
  }, [structures, setStructures])

  const getStructureAtPositionSafe = React.useCallback((row: number, col: number) => {
    return getStructureAtPosition(row, col, structures)
  }, [structures])

  const updateStructureName = React.useCallback((structureId: string, name: string) => {
    setStructures(prev => {
      const newStructures = new Map(prev)
      const structure = newStructures.get(structureId)
      if (structure) {
        // Set name to undefined if empty string is passed to delete the name
        const updatedStructure = { ...structure, name: name || undefined }
        newStructures.set(structureId, updatedStructure)
        
        // Also update the selected structure if it's the same one
        setSelectedStructure(current => {
          if (current && current.id === structureId) {
            return updatedStructure
          }
          return current
        })
      }
      return newStructures
    })
  }, [setStructures, setSelectedStructure])

  const rotateArray = React.useCallback((arrayId: string) => {
    setStructures(prev => {
      const newStructures = new Map(prev)
      const structure = newStructures.get(arrayId)
      
      if (structure && structure.type === 'array') {
        const array = structure
        const { startPosition } = array
        const newDirection: 'horizontal' | 'vertical' = array.direction === 'horizontal' ? 'vertical' : 'horizontal'
        
        // Calculate new dimensions based on rotation
        let newEndPosition: { row: number, col: number }
        let newCells: Cell[] = []
        
        if (newDirection === 'vertical') {
          // Converting from horizontal to vertical
          newEndPosition = { 
            row: startPosition.row + array.size - 1, 
            col: startPosition.col 
          }
          
          // Update cell positions to be vertical
          newCells = array.cells.map((cell, index) => ({
            ...cell,
            startPosition: { row: startPosition.row + index, col: startPosition.col },
            endPosition: { row: startPosition.row + index, col: startPosition.col }
          }))
        } else {
          // Converting from vertical to horizontal
          newEndPosition = { 
            row: startPosition.row, 
            col: startPosition.col + array.size - 1 
          }
          
          // Update cell positions to be horizontal
          newCells = array.cells.map((cell, index) => ({
            ...cell,
            startPosition: { row: startPosition.row, col: startPosition.col + index },
            endPosition: { row: startPosition.row, col: startPosition.col + index }
          }))
        }
        
        const updatedArray = {
          ...array,
          direction: newDirection,
          endPosition: newEndPosition,
          cells: newCells
        }
        
        newStructures.set(arrayId, updatedArray)
        
        // Also update the selected structure if it's the same one
        setSelectedStructure(current => {
          if (current && current.id === arrayId) {
            return updatedArray
          }
          return current
        })
      }
      
      return newStructures
    })
  }, [setStructures, setSelectedStructure])

  const deleteStructure = React.useCallback((structureId: string) => {
    setStructures(prev => {
      const newStructures = new Map(prev)
      newStructures.delete(structureId)
      return newStructures
    })
    
    // Clear selected structure if it was the deleted one
    setSelectedStructure(current => {
      if (current && current.id === structureId) {
        return null
      }
      return current
    })
  }, [setStructures, setSelectedStructure])

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
