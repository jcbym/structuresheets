import React from 'react'
import { Structure, MergedCell } from '../types'
import { getCellKey, getCellValue, getMergedCellContaining, getStructureAtPosition } from '../utils'

export const useCellOperations = (
  cellData: Map<string, string>,
  setCellData: React.Dispatch<React.SetStateAction<Map<string, string>>>,
  structures: Map<string, Structure>,
  setStructures: React.Dispatch<React.SetStateAction<Map<string, Structure>>>,
  mergedCells: Map<string, MergedCell>,
  setMergedCells: React.Dispatch<React.SetStateAction<Map<string, MergedCell>>>
) => {
  const updateCell = React.useCallback((row: number, col: number, value: string) => {
    const key = getCellKey(row, col)
    setCellData(prev => {
      const newData = new Map(prev)
      if (value === '') {
        newData.delete(key)
      } else {
        newData.set(key, value)
      }
      return newData
    })

    // Update structure if it exists
    const structure = getStructureAtPosition(row, col, structures)
    if (structure && structure.type === 'cell') {
      setStructures(prev => {
        const newStructures = new Map(prev)
        newStructures.set(structure.id, { ...structure, value })
        return newStructures
      })
    }

    // Update merged cell value if this cell is part of a merged cell
    const mergedCell = getMergedCellContaining(row, col, mergedCells)
    if (mergedCell) {
      setMergedCells(prev => {
        const newMerged = new Map(prev)
        for (const [key, cell] of prev) {
          if (cell === mergedCell) {
            newMerged.set(key, { ...cell, value })
            break
          }
        }
        return newMerged
      })
    }
  }, [cellData, setCellData, structures, setStructures, mergedCells, setMergedCells])

  const getCellValueSafe = React.useCallback((row: number, col: number): string => {
    return getCellValue(row, col, cellData)
  }, [cellData])

  return {
    updateCell,
    getCellValueSafe
  }
}
