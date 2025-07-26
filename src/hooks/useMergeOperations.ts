import React from 'react'
import { MergedCell, SelectionRange, Structure } from '../types'
import { getCellKey, getMergedCellKey, getMergedCellContaining, getCellValue } from '../utils/structureUtils'

export const useMergeOperations = (
  cellData: Map<string, string>,
  setCellData: React.Dispatch<React.SetStateAction<Map<string, string>>>,
  structures: Map<string, Structure>,
  mergedCells: Map<string, MergedCell>,
  setMergedCells: React.Dispatch<React.SetStateAction<Map<string, MergedCell>>>,
  selectedRange: SelectionRange | null,
  selectedCell: {row: number, col: number} | null,
  setSelectedRange: React.Dispatch<React.SetStateAction<SelectionRange | null>>,
  setContextMenu: React.Dispatch<React.SetStateAction<{x: number, y: number} | null>>
) => {
  // Merge selected cells
  const mergeCells = React.useCallback(() => {
    if (!selectedRange) return

    const minRow = Math.min(selectedRange.start.row, selectedRange.end.row)
    const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row)
    const minCol = Math.min(selectedRange.start.col, selectedRange.end.col)
    const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col)

    // Collect all values from the range and use the first non-empty value
    let mergedValue = ''
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const value = getCellValue(r, c, structures)
        if (value && !mergedValue) {
          mergedValue = value
        }
      }
    }

    const newMergedCell: MergedCell = {
      startRow: minRow,
      startCol: minCol,
      endRow: maxRow,
      endCol: maxCol,
      value: mergedValue
    }

    const key = getMergedCellKey(minRow, minCol, maxRow, maxCol)
    setMergedCells(prev => {
      const newMerged = new Map(prev)
      newMerged.set(key, newMergedCell)
      return newMerged
    })

    // Update the cell data to store the merged value in the top-left cell
    setCellData(prev => {
      const newData = new Map(prev)
      newData.set(getCellKey(minRow, minCol), mergedValue)
      
      // Clear other cells in the merged range
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          if (!(r === minRow && c === minCol)) {
            newData.delete(getCellKey(r, c))
          }
        }
      }
      return newData
    })

    setContextMenu(null)
    setSelectedRange(null)
  }, [selectedRange, cellData, setCellData, setMergedCells, setContextMenu, setSelectedRange])

  // Unmerge cells
  const unmergeCells = React.useCallback(() => {
    if (!selectedCell) return

    const mergedCell = getMergedCellContaining(selectedCell.row, selectedCell.col, mergedCells)
    if (!mergedCell) return

    // Find and remove the merged cell
    setMergedCells(prev => {
      const newMerged = new Map(prev)
      for (const [key, cell] of prev) {
        if (cell === mergedCell) {
          newMerged.delete(key)
          break
        }
      }
      return newMerged
    })

    setContextMenu(null)
  }, [selectedCell, mergedCells, setMergedCells, setContextMenu])

  // Check if cells can be merged
  const canMergeCells = React.useCallback((): boolean => {
    if (!selectedRange) return false
    
    const minRow = Math.min(selectedRange.start.row, selectedRange.end.row)
    const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row)
    const minCol = Math.min(selectedRange.start.col, selectedRange.end.col)
    const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col)

    // Can't merge if it's just a single cell
    if (minRow === maxRow && minCol === maxCol) return false

    // Check if any cell in the range is already part of a merged cell
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (getMergedCellContaining(r, c, mergedCells)) {
          return false
        }
      }
    }

    return true
  }, [selectedRange, mergedCells])

  // Check if cells can be unmerged
  const canUnmergeCells = React.useCallback((): boolean => {
    if (!selectedCell) return false
    return getMergedCellContaining(selectedCell.row, selectedCell.col, mergedCells) !== null
  }, [selectedCell, mergedCells])

  return {
    mergeCells,
    unmergeCells,
    canMergeCells,
    canUnmergeCells
  }
}
