import React from 'react'
import { Structure, Cell, StructureArray, Table } from '../types'
import { getCellValue, getStructureAtPosition } from '../utils/structureUtils'

export const useCellOperations = (
  structures: Map<string, Structure>,
  setStructures: React.Dispatch<React.SetStateAction<Map<string, Structure>>>
) => {
  const updateCell = React.useCallback((row: number, col: number, value: string) => {
    // Check if there's already a structure at this position
    const existingStructure = getStructureAtPosition(row, col, structures)
    
    if (existingStructure) {
      // Update existing structure
      if (existingStructure.type === 'cell') {
        // Update cell structure value
        setStructures(prev => {
          const newStructures = new Map(prev)
          newStructures.set(existingStructure.id, { ...existingStructure, value })
          return newStructures
        })
      } else if (existingStructure.type === 'array') {
        // Update cell within array structure
        const arrayStructure = existingStructure as StructureArray
        const cellIndex = (row - existingStructure.startPosition.row) * (existingStructure.endPosition.col - existingStructure.startPosition.col + 1) + 
                         (col - existingStructure.startPosition.col)
        
        if (cellIndex >= 0 && cellIndex < arrayStructure.cells.length) {
          setStructures(prev => {
            const newStructures = new Map(prev)
            const updatedCells = [...arrayStructure.cells]
            updatedCells[cellIndex] = { ...updatedCells[cellIndex], value }
            newStructures.set(existingStructure.id, { 
              ...arrayStructure, 
              cells: updatedCells 
            })
            return newStructures
          })
        }
      } else if (existingStructure.type === 'table') {
        // Update cell within table structure
        const tableStructure = existingStructure as Table
        const rowIndex = row - existingStructure.startPosition.row
        
        if (rowIndex >= 0 && rowIndex < tableStructure.arrays.length) {
          const arrayInTable = tableStructure.arrays[rowIndex]
          const colIndex = col - existingStructure.startPosition.col
          
          if (colIndex >= 0 && colIndex < arrayInTable.cells.length) {
            setStructures(prev => {
              const newStructures = new Map(prev)
              const updatedArrays = [...tableStructure.arrays]
              const updatedCells = [...arrayInTable.cells]
              updatedCells[colIndex] = { ...updatedCells[colIndex], value }
              updatedArrays[rowIndex] = { ...arrayInTable, cells: updatedCells }
              newStructures.set(existingStructure.id, { 
                ...tableStructure, 
                arrays: updatedArrays 
              })
              return newStructures
            })
          }
        }
      }
    } else {
      const newCellId = `cell-${row}-${col}-${Date.now()}`
      const newCell: Cell = {
        type: 'cell',
        id: newCellId,
        startPosition: { row, col },
        endPosition: { row, col },
        value
      }
      
      setStructures(prev => {
        const newStructures = new Map(prev)
        newStructures.set(newCellId, newCell)
        return newStructures
      })
    }
  }, [structures, setStructures])

  const getCellValueSafe = React.useCallback((row: number, col: number): string => {
    return getCellValue(row, col, structures)
  }, [structures])

  return {
    updateCell,
    getCellValueSafe
  }
}
