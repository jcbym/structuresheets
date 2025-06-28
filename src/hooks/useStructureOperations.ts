import React from 'react'
import { Structure, Cell, Array, Table, MergedCell } from '../types'
import { getStructureKey, getCellKey, getCellValue, getStructureAtPosition } from '../utils'
import { MAX_ROWS, MAX_COLS } from '../constants'

export const useStructureOperations = (
  cellData: Map<string, string>,
  structures: Map<string, Structure>,
  setStructures: React.Dispatch<React.SetStateAction<Map<string, Structure>>>,
  selectedCell: {row: number, col: number} | null,
  selectedRange: {start: {row: number, col: number}, end: {row: number, col: number}} | null
) => {
  const createStructure = React.useCallback((type: Structure['type'], name: string, dimensions?: {rows: number, cols: number}) => {
    if (!selectedCell) return

    const { row, col } = selectedCell
    const position = { row, col }

    let newStructure: Structure

    switch (type) {
      case 'cell':
        newStructure = {
          type: 'cell',
          position,
          name,
          value: getCellValue(row, col, cellData)
        }
        break
      
      case 'array':
        const cells: Cell[] = []
        const arrayDims = dimensions || { rows: 1, cols: 1 }
        
        for (let r = 0; r < arrayDims.rows; r++) {
          for (let c = 0; c < arrayDims.cols; c++) {
            const cellRow = row + r
            const cellCol = col + c
            if (cellRow < MAX_ROWS && cellCol < MAX_COLS) {
              cells.push({
                type: 'cell',
                position: { row: cellRow, col: cellCol },
                value: getCellValue(cellRow, cellCol, cellData)
              })
            }
          }
        }

        newStructure = {
          type: 'array',
          position,
          startPosition: { row, col },
          endPosition: { row: row + arrayDims.rows - 1, col: col + arrayDims.cols - 1 },
          name,
          cells,
          dimensions: arrayDims
        }
        break

      case 'table':
        const arrays: Array[] = []
        const tableDims = dimensions || { rows: 1, cols: 1 }
        
        // Create arrays for the table (simplified - each row becomes an array)
        for (let r = 0; r < tableDims.rows; r++) {
          const rowCells: Cell[] = []
          for (let c = 0; c < tableDims.cols; c++) {
            const cellRow = row + r
            const cellCol = col + c
            if (cellRow < MAX_ROWS && cellCol < MAX_COLS) {
              rowCells.push({
                type: 'cell',
                position: { row: cellRow, col: cellCol },
                value: getCellValue(cellRow, cellCol, cellData)
              })
            }
          }
          
          arrays.push({
            type: 'array',
            position: { row: row + r, col },
            startPosition: { row: row + r, col },
            endPosition: { row: row + r, col: col + tableDims.cols - 1 },
            cells: rowCells,
            dimensions: { rows: 1, cols: tableDims.cols }
          })
        }

        newStructure = {
          type: 'table',
          position,
          startPosition: { row, col },
          endPosition: { row: row + tableDims.rows - 1, col: col + tableDims.cols - 1 },
          name,
          arrays,
          dimensions: tableDims,
          hasHeaderRow: true,
          hasHeaderCol: false,
          headerRows: 1,
          headerCols: 1
        }
        break
    }

    // Set the main structure
    setStructures(prev => {
      const newStructures = new Map(prev)
      newStructures.set(getStructureKey(row, col), newStructure)
      
      // For arrays and tables, also mark the constituent cells
      if (type === 'array' || type === 'table') {
        const dims = dimensions || { rows: 1, cols: 1 }
        for (let r = 0; r < dims.rows; r++) {
          for (let c = 0; c < dims.cols; c++) {
            const cellRow = row + r
            const cellCol = col + c
            if (cellRow < MAX_ROWS && cellCol < MAX_COLS && !(r === 0 && c === 0)) {
              newStructures.set(getStructureKey(cellRow, cellCol), newStructure)
            }
          }
        }
      }
      
      return newStructures
    })
  }, [selectedCell, cellData, setStructures])

  // Create structure from toolbar (works with selected range)
  const createStructureFromToolbar = React.useCallback((type: Structure['type']) => {
    let startRow: number, endRow: number, startCol: number, endCol: number

    if (selectedRange) {
      // Use selected range
      startRow = Math.min(selectedRange.start.row, selectedRange.end.row)
      endRow = Math.max(selectedRange.start.row, selectedRange.end.row)
      startCol = Math.min(selectedRange.start.col, selectedRange.end.col)
      endCol = Math.max(selectedRange.start.col, selectedRange.end.col)
    } else if (selectedCell) {
      // Use single selected cell
      startRow = endRow = selectedCell.row
      startCol = endCol = selectedCell.col
    } else {
      return // No selection
    }

    const position = { row: startRow, col: startCol }
    const dimensions = { rows: endRow - startRow + 1, cols: endCol - startCol + 1 }
    const name = `${type}_${startRow}_${startCol}` // Auto-generate name

    let newStructure: Structure

    switch (type) {
      case 'cell':
        // For cell type, create individual cell structures for each selected cell
        setStructures(prev => {
          const newStructures = new Map(prev)
          for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
              const cellStructure: Structure = {
                type: 'cell',
                position: { row: r, col: c },
                name: `cell_${r}_${c}`,
                value: getCellValue(r, c, cellData)
              }
              newStructures.set(getStructureKey(r, c), cellStructure)
            }
          }
          return newStructures
        })
        return

      case 'array':
        const cells: Cell[] = []
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            if (r < MAX_ROWS && c < MAX_COLS) {
              cells.push({
                type: 'cell',
                position: { row: r, col: c },
                value: getCellValue(r, c, cellData)
              })
            }
          }
        }

        newStructure = {
          type: 'array',
          position,
          startPosition: { row: startRow, col: startCol },
          endPosition: { row: endRow, col: endCol },
          name,
          cells,
          dimensions
        }
        break

      case 'table':
        const arrays: Array[] = []
        
        // Create arrays for each row in the selection
        for (let r = startRow; r <= endRow; r++) {
          const rowCells: Cell[] = []
          for (let c = startCol; c <= endCol; c++) {
            if (r < MAX_ROWS && c < MAX_COLS) {
              rowCells.push({
                type: 'cell',
                position: { row: r, col: c },
                value: getCellValue(r, c, cellData)
              })
            }
          }
          
          arrays.push({
            type: 'array',
            position: { row: r, col: startCol },
            startPosition: { row: r, col: startCol },
            endPosition: { row: r, col: endCol },
            cells: rowCells,
            dimensions: { rows: 1, cols: dimensions.cols }
          })
        }

        newStructure = {
          type: 'table',
          position,
          startPosition: { row: startRow, col: startCol },
          endPosition: { row: endRow, col: endCol },
          name,
          arrays,
          dimensions,
          hasHeaderRow: true,
          hasHeaderCol: false,
          headerRows: 1,
          headerCols: 1
        }
        break
    }

    // Set the main structure
    setStructures(prev => {
      const newStructures = new Map(prev)
      newStructures.set(getStructureKey(startRow, startCol), newStructure)
      
      // For arrays and tables, mark all constituent cells
      if (type === 'array' || type === 'table') {
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            if (r < MAX_ROWS && c < MAX_COLS && !(r === startRow && c === startCol)) {
              newStructures.set(getStructureKey(r, c), newStructure)
            }
          }
        }
      }
      
      return newStructures
    })
  }, [selectedRange, selectedCell, cellData, setStructures])

  // Function to update table header settings
  const updateTableHeaders = React.useCallback((row: number, col: number, hasHeaderRow: boolean, hasHeaderCol: boolean, headerRows?: number, headerCols?: number) => {
    const structureKey = getStructureKey(row, col)
    const structure = structures.get(structureKey)
    
    if (structure && structure.type === 'table') {
      const updatedTable = { 
        ...structure, 
        hasHeaderRow, 
        hasHeaderCol,
        headerRows: headerRows || 1,
        headerCols: headerCols || 1
      }
      
      setStructures(prev => {
        const newStructures = new Map(prev)
        newStructures.set(structureKey, updatedTable)
        
        // Update all cells that belong to this table
        const { startPosition, endPosition } = structure
        for (let r = startPosition.row; r <= endPosition.row; r++) {
          for (let c = startPosition.col; c <= endPosition.col; c++) {
            if (!(r === startPosition.row && c === startPosition.col)) {
              newStructures.set(getStructureKey(r, c), updatedTable)
            }
          }
        }
        
        return newStructures
      })
    }
  }, [structures, setStructures])

  const getStructureAtPositionSafe = React.useCallback((row: number, col: number) => {
    return getStructureAtPosition(row, col, structures)
  }, [structures])

  return {
    createStructure,
    createStructureFromToolbar,
    updateTableHeaders,
    getStructureAtPositionSafe
  }
}
