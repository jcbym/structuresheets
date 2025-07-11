import React from 'react'
import { Structure, Cell, Array } from '../types'
import { getCellValue, getStructureAtPosition, generateUUID } from '../utils'
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
          id: generateUUID(),
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
                id: generateUUID(),
                position: { row: cellRow, col: cellCol },
                value: getCellValue(cellRow, cellCol, cellData)
              })
            }
          }
        }

        newStructure = {
          type: 'array',
          id: generateUUID(),
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
                id: generateUUID(),
                position: { row: cellRow, col: cellCol },
                value: getCellValue(cellRow, cellCol, cellData)
              })
            }
          }
          
          arrays.push({
            type: 'array',
            id: generateUUID(),
            position: { row: row + r, col },
            startPosition: { row: row + r, col },
            endPosition: { row: row + r, col: col + tableDims.cols - 1 },
            cells: rowCells,
            dimensions: { rows: 1, cols: tableDims.cols }
          })
        }

        newStructure = {
          type: 'table',
          id: generateUUID(),
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

    // Set the main structure using UUID as key
    setStructures(prev => {
      const newStructures = new Map(prev)
      newStructures.set(newStructure.id, newStructure)
      
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
                id: generateUUID(),
                position: { row: r, col: c },
                name: `cell_${r}_${c}`,
                value: getCellValue(r, c, cellData)
              }
              newStructures.set(cellStructure.id, cellStructure)
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
                id: generateUUID(),
                position: { row: r, col: c },
                value: getCellValue(r, c, cellData)
              })
            }
          }
        }

        newStructure = {
          type: 'array',
          id: generateUUID(),
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
                id: generateUUID(),
                position: { row: r, col: c },
                value: getCellValue(r, c, cellData)
              })
            }
          }
          
          arrays.push({
            type: 'array',
            id: generateUUID(),
            position: { row: r, col: startCol },
            startPosition: { row: r, col: startCol },
            endPosition: { row: r, col: endCol },
            cells: rowCells,
            dimensions: { rows: 1, cols: dimensions.cols }
          })
        }

        newStructure = {
          type: 'table',
          id: generateUUID(),
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

    // Set the main structure using UUID as key
    setStructures(prev => {
      const newStructures = new Map(prev)
      newStructures.set(newStructure.id, newStructure)
      
      return newStructures
    })
  }, [selectedRange, selectedCell, cellData, setStructures])

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

  return {
    createStructure,
    createStructureFromToolbar,
    updateTableHeaders,
    getStructureAtPositionSafe
  }
}
