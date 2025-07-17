import React from 'react'
import { Structure, Cell, StructureArray } from '../types'
import { getCellValue, getStructureAtPosition, generateUUID } from '../utils'
import { MAX_ROWS, MAX_COLS } from '../constants'

const createMultipleCells = (
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  cellData: Map<string, string>
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
          value: getCellValue(r, c, cellData)
        })
      }
    }
  }
  return cells
}

export const useStructureOperations = (
  cellData: Map<string, string>,
  structures: Map<string, Structure>,
  setStructures: React.Dispatch<React.SetStateAction<Map<string, Structure>>>,
  selectedCell: {row: number, col: number} | null,
  selectedRange: {start: {row: number, col: number}, end: {row: number, col: number}} | null,
  setSelectedStructure: React.Dispatch<React.SetStateAction<Structure | null>>
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
          startPosition: position,
          endPosition: position,
          name,
          value: getCellValue(row, col, cellData)
        }
        break
      
      case 'array':
        const arrayDims = dimensions || { rows: 1, cols: 1 }
        const cells = createMultipleCells(row, row + arrayDims.rows - 1, col, col + arrayDims.cols - 1, cellData)

        newStructure = {
          type: 'array',
          id: generateUUID(),
          startPosition: { row, col },
          endPosition: { row: row + arrayDims.rows - 1, col: col + arrayDims.cols - 1 },
          name,
          cells,
          dimensions: arrayDims
        }
        break

      case 'table':
        const arrays: StructureArray[] = []
        const tableDims = dimensions || { rows: 1, cols: 1 }
        
        // Create arrays for the table (simplified - each row becomes an array)
        for (let r = 0; r < tableDims.rows; r++) {
          const rowCells = createMultipleCells(row + r, row + r, col, col + tableDims.cols - 1, cellData)
          
          arrays.push({
            type: 'array',
            id: generateUUID(),
            startPosition: { row: row + r, col },
            endPosition: { row: row + r, col: col + tableDims.cols - 1 },
            cells: rowCells,
            dimensions: { rows: 1, cols: tableDims.cols }
          })
        }

        newStructure = {
          type: 'table',
          id: generateUUID(),
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
    
    const dimensions = { rows: endRow - startRow + 1, cols: endCol - startCol + 1 }

    switch (type) {
      case 'cell':
        // For cell type, create individual cell structures for each selected cell
        const cellStructures = createMultipleCells(startRow, endRow, startCol, endCol, cellData);
        
        setStructures(prev => {
          const newStructures = new Map(prev)
          cellStructures.forEach(structure => {
            newStructures.set(structure.id, structure)
          })
          return newStructures
        })
        
        // Select the first created cell structure
        if (cellStructures.length > 0) {
          setSelectedStructure(cellStructures[0])
        }
        return

      case 'array':
        const cells = createMultipleCells(startRow, endRow, startCol, endCol, cellData)

        const newArrayStructure: Structure = {
          type: 'array',
          id: generateUUID(),
          startPosition: { row: startRow, col: startCol },
          endPosition: { row: endRow, col: endCol },
          // No name initially
          cells,
          dimensions
        }
        
        // Set the structure in structures map
        setStructures(prev => {
          const newStructures = new Map(prev)
          newStructures.set(newArrayStructure.id, newArrayStructure)
          
          return newStructures
        })
        
        // Select the newly created structure
        setSelectedStructure(newArrayStructure)
        break

      case 'table':
        const arrays: StructureArray[] = []
        
        // Create arrays for each row in the selection
        for (let r = startRow; r <= endRow; r++) {
          const rowCells = createMultipleCells(r, r, startCol, endCol, cellData)
          
          arrays.push({
            type: 'array',
            id: generateUUID(),
            startPosition: { row: r, col: startCol },
            endPosition: { row: r, col: endCol },
            cells: rowCells,
            dimensions: { rows: 1, cols: dimensions.cols }
          })
        }

        const newTableStructure: Structure = {
          type: 'table',
          id: generateUUID(),
          startPosition: { row: startRow, col: startCol },
          endPosition: { row: endRow, col: endCol },
          // No name initially
          arrays,
          dimensions,
          hasHeaderRow: true,
          hasHeaderCol: false,
          headerRows: 1,
          headerCols: 1
        }
        
        // Set the main structure in structures map
        setStructures(prev => {
          const newStructures = new Map(prev)
          newStructures.set(newTableStructure.id, newTableStructure)
          
          return newStructures
        })
        
        // Select the newly created structure
        setSelectedStructure(newTableStructure)
        break
    }
  }, [selectedRange, selectedCell, cellData, setStructures, setSelectedStructure])

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

  return {
    createStructure,
    createStructureFromToolbar,
    updateTableHeaders,
    getStructureAtPositionSafe,
    updateStructureName
  }
}
