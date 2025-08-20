import React from 'react'
import { Structure, Position, StructureMap, PositionMap, ArrayStructure, TableStructure, CellStructure } from '../types'
import { 
  getEndPosition,
  removeStructureFromPositionMap,
  addStructureToPositionMap,
  getStructureAtPosition,
  getCellValue,
  getStructuresAtPosition
} from '../utils/structureUtils'
import { 
  getColumnPosition,
  getRowPosition,  
  getColumnWidth,
  getRowHeight,
  getHeaderHeight,
  getHeaderWidth
} from '../utils/sheetUtils'
import { MIN_CELL_SIZE, MAX_ROWS } from '../constants'

interface ResizeHandlersProps {
  selectedStructure: Structure | null
  isResizingSheetHeader: boolean
  sheetHeaderResizeType: 'column' | 'row' | null
  sheetHeaderResizeIndex: number | null
  sheetHeaderResizeStartPos: number
  sheetHeaderResizeStartSize: number
  isResizingStructure: boolean
  structureResizeDirection: 'left' | 'right' | 'top' | 'bottom' | 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br' | null
  structureResizeStartDimensions: { rows: number, cols: number } | null
  structureResizeStartX: number
  structureResizeStartY: number
  structures: StructureMap
  positions: PositionMap
  columnWidths: Map<number, number>
  rowHeights: Map<number, number>
  containerRef: React.RefObject<HTMLDivElement>
  scrollLeft: number
  scrollTop: number
  
  // State setters
  setIsResizingSheetHeader: React.Dispatch<React.SetStateAction<boolean>>
  setSheetHeaderResizeType: React.Dispatch<React.SetStateAction<'column' | 'row' | null>>
  setSheetHeaderResizeIndex: React.Dispatch<React.SetStateAction<number | null>>
  setSheetHeaderResizeStartPos: React.Dispatch<React.SetStateAction<number>>
  setSheetHeaderResizeStartSize: React.Dispatch<React.SetStateAction<number>>
  setIsResizingStructure: React.Dispatch<React.SetStateAction<boolean>>
  setStructureResizeDirection: React.Dispatch<React.SetStateAction<'left' | 'right' | 'top' | 'bottom' | 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br' | null>>
  setStructureResizeStartDimensions: React.Dispatch<React.SetStateAction<{ rows: number, cols: number } | null>>
  setStructureResizeStartX: React.Dispatch<React.SetStateAction<number>>
  setStructureResizeStartY: React.Dispatch<React.SetStateAction<number>>
  setColumnWidths: React.Dispatch<React.SetStateAction<Map<number, number>>>
  setRowHeights: React.Dispatch<React.SetStateAction<Map<number, number>>>
  setStructures: React.Dispatch<React.SetStateAction<StructureMap>>
  setPositions: React.Dispatch<React.SetStateAction<PositionMap>>
  setSelectedStructure: React.Dispatch<React.SetStateAction<Structure | null>>
}

export const useResizeHandlers = ({
  selectedStructure,
  isResizingSheetHeader,
  sheetHeaderResizeType,
  sheetHeaderResizeIndex,
  sheetHeaderResizeStartPos,
  sheetHeaderResizeStartSize,
  isResizingStructure,
  structureResizeDirection,
  structureResizeStartDimensions,
  structureResizeStartX,
  structureResizeStartY,
  structures,
  positions,
  columnWidths,
  rowHeights,
  containerRef,
  scrollLeft,
  scrollTop,
  setIsResizingSheetHeader,
  setSheetHeaderResizeType,
  setSheetHeaderResizeIndex,
  setSheetHeaderResizeStartPos,
  setSheetHeaderResizeStartSize,
  setIsResizingStructure,
  setStructureResizeDirection,
  setStructureResizeStartDimensions,
  setStructureResizeStartX,
  setStructureResizeStartY,
  setColumnWidths,
  setRowHeights,
  setStructures,
  setPositions,
  setSelectedStructure
}: ResizeHandlersProps) => {

  // Utility to select structure and update state
  const selectStructure = React.useCallback((structure: Structure) => {
    setSelectedStructure(structure)
  }, [setSelectedStructure])

  // Helper function to check for collisions during resize
  const checkResizeCollision = React.useCallback((
    proposedStartPosition: Position,
    proposedEndPosition: Position,
    resizingStructure: Structure
  ): { hasCollision: boolean, limitedStartPosition: Position, limitedEndPosition: Position } => {
    const currentStart = resizingStructure.startPosition
    const currentEnd = getEndPosition(resizingStructure.startPosition, resizingStructure.dimensions)
    
    let limitedStart = { ...proposedStartPosition }
    let limitedEnd = { ...proposedEndPosition }
    let hasCollision = false

    // Check each position in the proposed area
    for (let row = proposedStartPosition.row; row <= proposedEndPosition.row; row++) {
      for (let col = proposedStartPosition.col; col <= proposedEndPosition.col; col++) {
        // Skip positions that are part of the current structure being resized
        if (row >= currentStart.row && row <= currentEnd.row && 
            col >= currentStart.col && col <= currentEnd.col) {
          continue
        }

        const conflictingStructures = getStructuresAtPosition(row, col, positions, structures)
        
        for (const conflictingStructure of conflictingStructures) {
          // Skip the structure being resized
          if (conflictingStructure.id === resizingStructure.id) continue

          // Found a collision - adjust boundaries to stop at the edge
          hasCollision = true

          // Adjust based on resize direction to stop before the conflicting structure
          const conflictStart = conflictingStructure.startPosition
          const conflictEnd = getEndPosition(conflictingStructure.startPosition, conflictingStructure.dimensions)

          // For left/top resize directions, limit the start position
          if (row < currentStart.row) {
            // Resizing upward - limit to one row below the conflicting structure
            limitedStart.row = Math.max(limitedStart.row, conflictEnd.row + 1)
          }
          if (col < currentStart.col) {
            // Resizing leftward - limit to one column right of the conflicting structure
            limitedStart.col = Math.max(limitedStart.col, conflictEnd.col + 1)
          }

          // For right/bottom resize directions, limit the end position
          if (row > currentEnd.row) {
            // Resizing downward - limit to one row above the conflicting structure
            limitedEnd.row = Math.min(limitedEnd.row, conflictStart.row - 1)
          }
          if (col > currentEnd.col) {
            // Resizing rightward - limit to one column left of the conflicting structure
            limitedEnd.col = Math.min(limitedEnd.col, conflictStart.col - 1)
          }
        }
      }
    }

    // Ensure we don't end up with invalid dimensions
    if (limitedEnd.row < limitedStart.row) {
      limitedEnd.row = limitedStart.row
    }
    if (limitedEnd.col < limitedStart.col) {
      limitedEnd.col = limitedStart.col
    }

    return { hasCollision, limitedStartPosition: limitedStart, limitedEndPosition: limitedEnd }
  }, [positions, structures])

  // Handle sheet header resize mouse down
  const handleResizeMouseDown = React.useCallback((type: 'column' | 'row', index: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsResizingSheetHeader(true)
    setSheetHeaderResizeType(type)
    setSheetHeaderResizeIndex(index)
    setSheetHeaderResizeStartPos(type === 'column' ? e.clientX : e.clientY)
    
    const currentSize = type === 'column' 
      ? columnWidths.get(index) || 82 
      : rowHeights.get(index) || 32
    setSheetHeaderResizeStartSize(currentSize)
  }, [
    setIsResizingSheetHeader, setSheetHeaderResizeType, setSheetHeaderResizeIndex,
    setSheetHeaderResizeStartPos, setSheetHeaderResizeStartSize, columnWidths, rowHeights
  ])

  // Handle structure resize mouse down
  const handleStructureResizeMouseDown = React.useCallback((direction: 'left' | 'right' | 'top' | 'bottom' | 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br', e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!selectedStructure) {
      return // Only allow resizing for arrays, tables, and cells
    }

    setIsResizingStructure(true)
    setStructureResizeDirection(direction)
    
    // Store both X and Y coordinates for corner resizing
    setStructureResizeStartX(e.clientX)
    setStructureResizeStartY(e.clientY)
    
    // Store the current dimensions
    setStructureResizeStartDimensions(selectedStructure.dimensions)
  }, [
    selectedStructure, setIsResizingStructure, setStructureResizeDirection,
    setStructureResizeStartX, setStructureResizeStartY, setStructureResizeStartDimensions
  ])

  // Process sheet header resizing
  const processSheetHeaderResize = React.useCallback((e: MouseEvent) => {
    if (isResizingSheetHeader && sheetHeaderResizeType && sheetHeaderResizeIndex !== null) {
      const currentPos = sheetHeaderResizeType === 'column' ? e.clientX : e.clientY
      const delta = currentPos - sheetHeaderResizeStartPos
      const newSize = Math.max(MIN_CELL_SIZE, sheetHeaderResizeStartSize + delta)
      
      if (sheetHeaderResizeType === 'column') {
        setColumnWidths(prev => {
          const newWidths = new Map(prev)
          newWidths.set(sheetHeaderResizeIndex!, newSize)
          return newWidths
        })
      } else {
        setRowHeights(prev => {
          const newHeights = new Map(prev)
          newHeights.set(sheetHeaderResizeIndex!, newSize)
          return newHeights
        })
      }
    }
  }, [
    isResizingSheetHeader, sheetHeaderResizeType, sheetHeaderResizeIndex,
    sheetHeaderResizeStartPos, sheetHeaderResizeStartSize, setColumnWidths, setRowHeights
  ])

  // Process structure resizing
  const processStructureResize = React.useCallback((e: MouseEvent) => {
    if (isResizingStructure && structureResizeDirection && selectedStructure && containerRef.current) {
      if (selectedStructure.type !== 'table' && selectedStructure.type !== 'array' && selectedStructure.type !== 'cell') return

      const containerRect = containerRef.current.getBoundingClientRect()
      const relativeX = e.clientX - containerRect.left + scrollLeft
      const relativeY = e.clientY - containerRect.top + scrollTop
      
      // Convert current mouse position to grid coordinates
      let targetCol = 0
      let targetRow = 0
      
      // Calculate target column based on mouse position
      let currentX = getHeaderWidth()
      while (targetCol < 26 && currentX + getColumnWidth(targetCol, columnWidths) < relativeX) {
        currentX += getColumnWidth(targetCol, columnWidths)
        targetCol++
      }
      
      // Calculate target row based on mouse position  
      let currentY = getHeaderHeight()
      while (targetRow < MAX_ROWS && currentY + getRowHeight(targetRow, rowHeights) < relativeY) {
        currentY += getRowHeight(targetRow, rowHeights)
        targetRow++
      }
      
      // Get current dimensions
      const { rows: currentRows, cols: currentCols } = selectedStructure.dimensions
      const originalStartPosition = selectedStructure.startPosition
      const originalEndPosition = getEndPosition(selectedStructure.startPosition, selectedStructure.dimensions)
      
      // Calculate new boundaries based on resize direction
      let newStartPosition = { ...originalStartPosition }
      let newEndPosition = { ...originalEndPosition }
      
      // Handle horizontal resizing based on target column
      if (structureResizeDirection === 'left' || structureResizeDirection === 'corner-tl' || structureResizeDirection === 'corner-bl') {
        // Resize from left edge - adjust start position
        newStartPosition.col = Math.max(0, Math.min(targetCol, originalEndPosition.col))
      } else if (structureResizeDirection === 'right' || structureResizeDirection === 'corner-tr' || structureResizeDirection === 'corner-br') {
        // Resize from right edge - adjust end position
        newEndPosition.col = Math.max(originalStartPosition.col, Math.min(targetCol, 25))
      }
      
      // Handle vertical resizing based on target row
      if (structureResizeDirection === 'top' || structureResizeDirection === 'corner-tl' || structureResizeDirection === 'corner-tr') {
        // Resize from top edge - adjust start position
        newStartPosition.row = Math.max(0, Math.min(targetRow, originalEndPosition.row))
      } else if (structureResizeDirection === 'bottom' || structureResizeDirection === 'corner-bl' || structureResizeDirection === 'corner-br') {
        // Resize from bottom edge - adjust end position
        newEndPosition.row = Math.max(originalStartPosition.row, Math.min(targetRow, MAX_ROWS - 1))
      }
      
      // Apply collision detection to limit the resize boundaries
      const { limitedStartPosition, limitedEndPosition } = checkResizeCollision(
        newStartPosition,
        newEndPosition,
        selectedStructure
      )
      
      // Use the collision-limited boundaries
      newStartPosition = limitedStartPosition
      newEndPosition = limitedEndPosition
      
      // Calculate new dimensions after collision detection
      const newRows = newEndPosition.row - newStartPosition.row + 1
      const newCols = newEndPosition.col - newStartPosition.col + 1
      
      // Only update if dimensions actually changed and are valid
      if ((newRows !== currentRows || newCols !== currentCols) && newRows >= 1 && newCols >= 1) {
        // For arrays, ensure we maintain direction constraints
        if (selectedStructure.type === 'array') {
          const arrayStructure = selectedStructure as ArrayStructure
          if (arrayStructure.direction === 'horizontal' && newRows !== 1) {
            // Horizontal arrays must stay at 1 row
            if (structureResizeDirection === 'top' || structureResizeDirection === 'corner-tl' || structureResizeDirection === 'corner-tr') {
              newStartPosition.row = originalEndPosition.row
            } else {
              newEndPosition.row = originalStartPosition.row
            }
          } else if (arrayStructure.direction === 'vertical' && newCols !== 1) {
            // Vertical arrays must stay at 1 column
            if (structureResizeDirection === 'left' || structureResizeDirection === 'corner-tl' || structureResizeDirection === 'corner-bl') {
              newStartPosition.col = originalEndPosition.col
            } else {
              newEndPosition.col = originalStartPosition.col
            }
          }
          
          // Recalculate final dimensions after constraints
          const finalRows = newEndPosition.row - newStartPosition.row + 1
          const finalCols = newEndPosition.col - newStartPosition.col + 1
          
          if (finalRows !== currentRows || finalCols !== currentCols) {
            // Handle array resizing with proper cell substructure management
            const array = arrayStructure as ArrayStructure
            const originalSize = array.cellIds.length
            const finalSize = arrayStructure.direction === 'horizontal' ? finalCols : finalRows
            
            // Create new cellIds array for the resized array
            const newCellIds: (string | null)[] = []
            
            // Track cells that need to be removed from the array (and placed back on grid)
            const cellsToRemove: { cell: CellStructure, newPosition: Position }[] = []
            
            for (let i = 0; i < finalSize; i++) {
              let cellRow, cellCol
              if (arrayStructure.direction === 'horizontal') {
                cellRow = newStartPosition.row
                cellCol = newStartPosition.col + i
              } else {
                cellRow = newStartPosition.row + i
                cellCol = newStartPosition.col
              }
              
              let cellId: string | null = null
              
              // Check if this position was within the original array bounds
              if (i < originalSize && array.cellIds[i]) {
                // This cell was already in the array - keep its reference
                cellId = array.cellIds[i]
                
                // Update the cell's position if the array moved
                if (cellId) {
                  const existingCell = structures.get(cellId) as CellStructure
                  if (existingCell && (existingCell.startPosition.row !== cellRow || existingCell.startPosition.col !== cellCol)) {
                    setStructures((prev: StructureMap) => {
                      const newStructures = new Map(prev)
                      const updatedCell = {
                        ...existingCell,
                        startPosition: { row: cellRow, col: cellCol }
                      }
                      newStructures.set(cellId!, updatedCell)
                      return newStructures
                    })
                  }
                }
              } else {
                // This is a new position - check if there's an existing cell structure there
                const existingStructure = getStructureAtPosition(cellRow, cellCol, positions, structures)
                if (existingStructure && existingStructure.type === 'cell') {
                  // Existing cell - add it to the array
                  cellId = existingStructure.id
                } else {
                  // No existing cell - check if there's a value from any other structure
                  const existingValue = getCellValue(cellRow, cellCol, structures, positions)
                  if (existingValue) {
                    // Create a new cell with the existing value
                    const newCellId = `cell-${cellRow}-${cellCol}-${Date.now()}`
                    const newCell: CellStructure = {
                      type: 'cell',
                      id: newCellId,
                      startPosition: { row: cellRow, col: cellCol },
                      dimensions: { rows: 1, cols: 1 },
                      value: existingValue
                    }
                    setStructures((prev: StructureMap) => {
                      const newStructures = new Map(prev)
                      newStructures.set(newCellId, newCell)
                      return newStructures
                    })
                    cellId = newCellId
                  }
                }
              }
              
              newCellIds.push(cellId)
            }
            
            // Handle cells that are now outside the array bounds (shrinking case)
            if (array.cellIds) {
              for (let i = 0; i < array.cellIds.length; i++) {
                const cellId = array.cellIds[i]
                if (cellId && i >= finalSize) {
                  // This cell is now outside the array - remove it from array and place on grid
                  const cell = structures.get(cellId) as CellStructure
                  if (cell) {
                    // Calculate the new position for the removed cell
                    let newPosition: Position
                    if (arrayStructure.direction === 'horizontal') {
                      newPosition = {
                        row: originalStartPosition.row,
                        col: originalStartPosition.col + i
                      }
                    } else {
                      newPosition = {
                        row: originalStartPosition.row + i,
                        col: originalStartPosition.col
                      }
                    }
                    cellsToRemove.push({ cell, newPosition })
                  }
                }
              }
            }
            
            const updatedStructure = {
              ...arrayStructure,
              startPosition: newStartPosition,
              endPosition: newEndPosition,
              dimensions: { rows: finalRows, cols: finalCols },
              cellIds: newCellIds
            } as ArrayStructure
            
            // Update structures map
            setStructures((prev: StructureMap) => {
              const newStructures = new Map(prev)
              newStructures.set(selectedStructure.id, updatedStructure)
              
              // Update positions for removed cells
              for (const { cell, newPosition } of cellsToRemove) {
                const updatedCell = {
                  ...cell,
                  startPosition: newPosition
                }
                newStructures.set(cell.id, updatedCell)
              }
              
              return newStructures
            })
            
            // Update position map
            setPositions((prev: PositionMap) => {
              let newPositions = prev
              
              // Update position map for the resized array
              newPositions = removeStructureFromPositionMap(selectedStructure, newPositions)
              newPositions = addStructureToPositionMap(updatedStructure, newPositions)
              
              // Update position map for removed cells
              for (const { cell, newPosition } of cellsToRemove) {
                newPositions = removeStructureFromPositionMap(cell, newPositions)
                const updatedCell = {
                  ...cell,
                  startPosition: newPosition
                }
                newPositions = addStructureToPositionMap(updatedCell, newPositions)
              }
              
              return newPositions
            })
            
            // Update selected structure
            selectStructure(updatedStructure)
          }
        } else if (selectedStructure.type === 'table') {
          // Handle table resizing with proper cell substructure management
          const table = selectedStructure as TableStructure
          const originalRows = table.dimensions.rows
          const originalCols = table.dimensions.cols
          const finalRows = newEndPosition.row - newStartPosition.row + 1
          const finalCols = newEndPosition.col - newStartPosition.col + 1
          
          // Create new cellIds array for the resized table
          const newCellIds: (string | null)[][] = []
          
          // Track cells that need to be removed from the table (and placed back on grid)
          const cellsToRemove: { cell: CellStructure, newPosition: Position }[] = []
          
          for (let r = 0; r < finalRows; r++) {
            const rowCells: (string | null)[] = []
            for (let c = 0; c < finalCols; c++) {
              const cellRow = newStartPosition.row + r
              const cellCol = newStartPosition.col + c
              
              let cellId: string | null = null
              
              // Check if this position was within the original table bounds
              const originalTableRow = cellRow - originalStartPosition.row
              const originalTableCol = cellCol - originalStartPosition.col
              
              if (originalTableRow >= 0 && originalTableRow < originalRows && 
                  originalTableCol >= 0 && originalTableCol < originalCols &&
                  table.cellIds && table.cellIds[originalTableRow] && 
                  table.cellIds[originalTableRow][originalTableCol]) {
                // This cell was already in the table - keep its reference
                cellId = table.cellIds[originalTableRow][originalTableCol]
                
                // Update the cell's position if the table moved
                if (cellId) {
                  const existingCell = structures.get(cellId) as CellStructure
                  if (existingCell && (existingCell.startPosition.row !== cellRow || existingCell.startPosition.col !== cellCol)) {
                    setStructures((prev: StructureMap) => {
                      const newStructures = new Map(prev)
                      const updatedCell = {
                        ...existingCell,
                        startPosition: { row: cellRow, col: cellCol }
                      }
                      newStructures.set(cellId!, updatedCell)
                      return newStructures
                    })
                  }
                }
              } else {
                // This is a new position - check if there's an existing cell structure there
                const existingStructure = getStructureAtPosition(cellRow, cellCol, positions, structures)
                if (existingStructure && existingStructure.type === 'cell') {
                  // Existing cell - add it to the table
                  cellId = existingStructure.id
                } else {
                  // No existing cell - check if there's a value from any other structure
                  const existingValue = getCellValue(cellRow, cellCol, structures, positions)
                  if (existingValue) {
                    // Create a new cell with the existing value
                    const newCellId = `cell-${cellRow}-${cellCol}-${Date.now()}`
                    const newCell: CellStructure = {
                      type: 'cell',
                      id: newCellId,
                      startPosition: { row: cellRow, col: cellCol },
                      dimensions: { rows: 1, cols: 1 },
                      value: existingValue
                    }
                    setStructures((prev: StructureMap) => {
                      const newStructures = new Map(prev)
                      newStructures.set(newCellId, newCell)
                      return newStructures
                    })
                    cellId = newCellId
                  }
                }
              }
              
              rowCells.push(cellId)
            }
            newCellIds.push(rowCells)
          }
          
          // Handle cells that are now outside the table bounds (shrinking case)
          if (table.cellIds) {
            for (let r = 0; r < table.cellIds.length; r++) {
              for (let c = 0; c < table.cellIds[r].length; c++) {
                const cellId = table.cellIds[r][c]
                if (cellId) {
                  const cellRow = originalStartPosition.row + r
                  const cellCol = originalStartPosition.col + c
                  
                  // Check if this cell position is still within the new table bounds
                  const newTableRow = cellRow - newStartPosition.row
                  const newTableCol = cellCol - newStartPosition.col
                  
                  const isStillInTable = newTableRow >= 0 && newTableRow < finalRows && 
                                       newTableCol >= 0 && newTableCol < finalCols
                  
                  if (!isStillInTable) {
                    // This cell is now outside the table - remove it from table and place on grid
                    const cell = structures.get(cellId) as CellStructure
                    if (cell) {
                      // Calculate the new position for the removed cell
                      const newPosition: Position = {
                        row: cellRow,
                        col: cellCol
                      }
                      cellsToRemove.push({ cell, newPosition })
                    }
                  }
                }
              }
            }
          }
          
          // Create updated table structure
          const updatedStructure = {
            ...selectedStructure,
            startPosition: newStartPosition,
            endPosition: newEndPosition,
            dimensions: { rows: finalRows, cols: finalCols },
            cellIds: newCellIds
          } as TableStructure
            
          // Update structures map
          setStructures((prev: StructureMap) => {
            const newStructures = new Map(prev)
            newStructures.set(selectedStructure.id, updatedStructure)
            
            // Update positions for removed cells
            for (const { cell, newPosition } of cellsToRemove) {
              const updatedCell = {
                ...cell,
                startPosition: newPosition
              }
              newStructures.set(cell.id, updatedCell)
            }
            
            return newStructures
          })
          
          // Update position map
          setPositions((prev: PositionMap) => {
            let newPositions = prev
            
            // Update position map for the resized table
            newPositions = removeStructureFromPositionMap(selectedStructure, newPositions)
            newPositions = addStructureToPositionMap(updatedStructure, newPositions)
            
            // Update position map for removed cells
            for (const { cell, newPosition } of cellsToRemove) {
              newPositions = removeStructureFromPositionMap(cell, newPositions)
              const updatedCell = {
                ...cell,
                startPosition: newPosition
              }
              newPositions = addStructureToPositionMap(updatedCell, newPositions)
            }
            
            return newPositions
          })
          
          // Update selected structure
          selectStructure(updatedStructure)
        } else if (selectedStructure.type === 'cell') {
          // Handle cell resizing - cells can resize in both directions
          const finalRows = newEndPosition.row - newStartPosition.row + 1
          const finalCols = newEndPosition.col - newStartPosition.col + 1
          
          // Create updated cell structure
          const updatedStructure = {
            ...selectedStructure,
            startPosition: newStartPosition,
            endPosition: newEndPosition,
            dimensions: { rows: finalRows, cols: finalCols }
          }
          
          // Update structures map
          setStructures((prev: StructureMap) => {
            const newStructures = new Map(prev)
            newStructures.set(selectedStructure.id, updatedStructure)
            return newStructures
          })
          
          // Update selected structure
          selectStructure(updatedStructure)
        }
      }
    }
  }, [
    isResizingStructure, structureResizeDirection, selectedStructure, containerRef,
    scrollLeft, scrollTop, columnWidths, rowHeights, structures, positions,
    setStructures, setPositions, selectStructure, checkResizeCollision
  ])

  return {
    handlers: {
      handleResizeMouseDown,
      handleStructureResizeMouseDown,
      processSheetHeaderResize,
      processStructureResize
    }
  }
}
