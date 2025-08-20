import React from 'react'
import { Structure, Position, StructureMap, PositionMap, CellStructure, ArrayStructure, TableStructure } from '../types'
import { 
  moveStructure,
  removeStructureFromPositionMap,
  addStructureToPositionMap,
  getStructureAtPosition
} from '../utils/structureUtils'

interface GlobalEventHandlersProps {
  // Drag and drop state
  isDraggingStructure: boolean
  draggedStructure: Structure | null
  lastValidDropTarget: Position | null
  isDraggingColumn: boolean
  draggedColumn: {tableId: string, columnIndex: number} | null
  columnDropTarget: {tableId: string, targetColumnIndex: number} | null
  
  // Resize state
  isResizingSheetHeader: boolean
  isResizingStructure: boolean
  
  // Selection state
  selectedRange: {start: {row: number, col: number}, end: {row: number, col: number}} | null
  selectedColumn: {tableId: string, columnIndex: number} | null
  selectedStructure: Structure | null
  
  // Data state
  structures: StructureMap
  positions: PositionMap
  editingCells: Set<string>
  cellValues: Map<string, string>
  
  // State setters - drag/drop
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>
  setDragStart: React.Dispatch<React.SetStateAction<{row: number, col: number} | null>>
  setIsDraggingStructure: React.Dispatch<React.SetStateAction<boolean>>
  setDraggedStructure: React.Dispatch<React.SetStateAction<Structure | null>>
  setDragOffset: React.Dispatch<React.SetStateAction<Position | null>>
  setDropTarget: React.Dispatch<React.SetStateAction<Position | null>>
  setLastValidDropTarget: React.Dispatch<React.SetStateAction<Position | null>>
  setIsDraggingColumn: React.Dispatch<React.SetStateAction<boolean>>
  setDraggedColumn: React.Dispatch<React.SetStateAction<{tableId: string, columnIndex: number} | null>>
  setColumnDragStartX: React.Dispatch<React.SetStateAction<number>>
  setColumnDropTarget: React.Dispatch<React.SetStateAction<{tableId: string, targetColumnIndex: number} | null>>
  
  // State setters - resize
  setIsResizingSheetHeader: React.Dispatch<React.SetStateAction<boolean>>
  setSheetHeaderResizeType: React.Dispatch<React.SetStateAction<'column' | 'row' | null>>
  setSheetHeaderResizeIndex: React.Dispatch<React.SetStateAction<number | null>>
  setIsResizingStructure: React.Dispatch<React.SetStateAction<boolean>>
  setStructureResizeDirection: React.Dispatch<React.SetStateAction<'left' | 'right' | 'top' | 'bottom' | 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br' | null>>
  setStructureResizeStartDimensions: React.Dispatch<React.SetStateAction<{ rows: number, cols: number } | null>>
  
  // State setters - data
  setStructures: React.Dispatch<React.SetStateAction<StructureMap>>
  setPositions: React.Dispatch<React.SetStateAction<PositionMap>>
  setSelectedRange: React.Dispatch<React.SetStateAction<{start: {row: number, col: number}, end: {row: number, col: number}} | null>>
  setSelectedColumn: React.Dispatch<React.SetStateAction<{tableId: string, columnIndex: number} | null>>
  setEditingCells: React.Dispatch<React.SetStateAction<Set<string>>>
  setCellValues: React.Dispatch<React.SetStateAction<Map<string, string>>>
  
  // External processors
  processStructureDragMove: (e: MouseEvent) => void
  processColumnDragMove: (e: MouseEvent) => void
  processSheetHeaderResize: (e: MouseEvent) => void
  processStructureResize: (e: MouseEvent) => void
  
  // External utilities
  selectStructure: (structure: Structure) => void
  getCellKey: (row: number, col: number) => string
  
  // Callbacks
  onDeleteStructure?: (structureId: string) => void
}

export const useGlobalEventHandlers = ({
  isDraggingStructure,
  draggedStructure,
  lastValidDropTarget,
  isDraggingColumn,
  draggedColumn,
  columnDropTarget,
  isResizingSheetHeader,
  isResizingStructure,
  selectedRange,
  selectedColumn,
  selectedStructure,
  structures,
  positions,
  editingCells,
  cellValues,
  setIsDragging,
  setDragStart,
  setIsDraggingStructure,
  setDraggedStructure,
  setDragOffset,
  setDropTarget,
  setLastValidDropTarget,
  setIsDraggingColumn,
  setDraggedColumn,
  setColumnDragStartX,
  setColumnDropTarget,
  setIsResizingSheetHeader,
  setSheetHeaderResizeType,
  setSheetHeaderResizeIndex,
  setIsResizingStructure,
  setStructureResizeDirection,
  setStructureResizeStartDimensions,
  setStructures,
  setPositions,
  setSelectedRange,
  setSelectedColumn,
  setEditingCells,
  setCellValues,
  processStructureDragMove,
  processColumnDragMove,
  processSheetHeaderResize,
  processStructureResize,
  selectStructure,
  getCellKey,
  onDeleteStructure
}: GlobalEventHandlersProps) => {

  // Global mouse move handler
  const handleGlobalMouseMove = React.useCallback((e: MouseEvent) => {
    // Handle structure dragging
    processStructureDragMove(e)
    
    // Handle sheet header resizing
    processSheetHeaderResize(e)
    
    // Handle column drag detection and real-time reordering
    processColumnDragMove(e)
    
    // Handle structure resizing
    processStructureResize(e)
  }, [
    processStructureDragMove,
    processSheetHeaderResize, 
    processColumnDragMove,
    processStructureResize
  ])

  // Global mouse up handler
  const handleGlobalMouseUp = React.useCallback(() => {
    try {
      // Only process structure drops if we're actually dragging and have valid state
      if (isDraggingStructure && draggedStructure && lastValidDropTarget) {
        // Check if the cell is being dropped into a table or array
        const targetStructure = getStructureAtPosition(lastValidDropTarget.row, lastValidDropTarget.col, positions, structures)
        
        if (draggedStructure.type === 'cell' && targetStructure && 
            (targetStructure.type === 'table' || targetStructure.type === 'array')) {
          
          // Handle cell being dropped into a table or array
          if (targetStructure.type === 'table') {
            const table = targetStructure as TableStructure
            const tableRow = lastValidDropTarget.row - table.startPosition.row
            const tableCol = lastValidDropTarget.col - table.startPosition.col
            
            // Ensure the drop position is within table bounds
            if (tableRow >= 0 && tableRow < table.dimensions.rows && 
                tableCol >= 0 && tableCol < table.dimensions.cols) {
              
              // Remove the dragged cell from structures and positions
              const newStructures = new Map(structures)
              let newPositions = removeStructureFromPositionMap(draggedStructure, positions)
              newStructures.delete(draggedStructure.id)
              
              // Create a new cell at the drop position with the dragged cell's value
              const newCellId = `cell-${lastValidDropTarget.row}-${lastValidDropTarget.col}-${Date.now()}`
              const newCell: CellStructure = {
                type: 'cell',
                id: newCellId,
                startPosition: { row: lastValidDropTarget.row, col: lastValidDropTarget.col },
                dimensions: { rows: 1, cols: 1 },
                value: draggedStructure.value
              }
              
              // Add the new cell to structures
              newStructures.set(newCellId, newCell)
              newPositions = addStructureToPositionMap(newCell, newPositions)
              
              // Update the table's cellIds to reference the new cell
              const updatedTable = { ...table }
              const newCellIds = updatedTable.cellIds.map(row => [...row]) // Deep copy
              newCellIds[tableRow][tableCol] = newCellId
              updatedTable.cellIds = newCellIds
              
              newStructures.set(table.id, updatedTable)
              
              setStructures(newStructures)
              setPositions(newPositions)
              
              // Select the table since the cell is now part of it
              selectStructure(updatedTable)
            } else {
              // If drop position is outside table bounds, perform regular move
              const {structures: newStructures, positions: newPositions} = moveStructure(draggedStructure, lastValidDropTarget, structures, positions, true)
              setStructures(newStructures)
              setPositions(newPositions)
              // Update selected structure with the moved structure
              const updatedStructure = newStructures.get(draggedStructure.id)
              if (updatedStructure) {
                selectStructure(updatedStructure)
              }
            }
          } else if (targetStructure.type === 'array') {
            const array = targetStructure as ArrayStructure
            const arrayRow = lastValidDropTarget.row - array.startPosition.row
            const arrayCol = lastValidDropTarget.col - array.startPosition.col
            
            // Ensure the drop position is within array bounds
            if (arrayRow >= 0 && arrayRow < array.dimensions.rows && 
                arrayCol >= 0 && arrayCol < array.dimensions.cols) {
              
              // Calculate the index in the array's cellIds
              let arrayIndex: number
              if (array.direction === 'horizontal') {
                arrayIndex = arrayCol
              } else {
                arrayIndex = arrayRow
              }
              
              // Ensure the index is valid
              if (arrayIndex >= 0 && arrayIndex < array.cellIds.length) {
                // Remove the dragged cell from structures and positions
                const newStructures = new Map(structures)
                let newPositions = removeStructureFromPositionMap(draggedStructure, positions)
                newStructures.delete(draggedStructure.id)
                
                // Create a new cell at the drop position with the dragged cell's value
                const newCellId = `cell-${lastValidDropTarget.row}-${lastValidDropTarget.col}-${Date.now()}`
                const newCell: CellStructure = {
                  type: 'cell',
                  id: newCellId,
                  startPosition: { row: lastValidDropTarget.row, col: lastValidDropTarget.col },
                  dimensions: { rows: 1, cols: 1 },
                  value: draggedStructure.value
                }
                
                // Add the new cell to structures
                newStructures.set(newCellId, newCell)
                newPositions = addStructureToPositionMap(newCell, newPositions)
                
                // Update the array's cellIds to reference the new cell
                const updatedArray = { ...array }
                const newCellIds = [...updatedArray.cellIds] // Copy array
                newCellIds[arrayIndex] = newCellId
                updatedArray.cellIds = newCellIds
                
                newStructures.set(array.id, updatedArray)
                
                setStructures(newStructures)
                setPositions(newPositions)
                
                // Select the array since the cell is now part of it
                selectStructure(updatedArray)
              } else {
                // If index is invalid, perform regular move
                const {structures: newStructures, positions: newPositions} = moveStructure(draggedStructure, lastValidDropTarget, structures, positions, true)
                setStructures(newStructures)
                setPositions(newPositions)
                // Update selected structure with the moved structure
                const updatedStructure = newStructures.get(draggedStructure.id)
                if (updatedStructure) {
                  selectStructure(updatedStructure)
                }
              }
            } else {
              // If drop position is outside array bounds, perform regular move
              const {structures: newStructures, positions: newPositions} = moveStructure(draggedStructure, lastValidDropTarget, structures, positions, true)
              setStructures(newStructures)
              setPositions(newPositions)
              // Update selected structure with the moved structure
              const updatedStructure = newStructures.get(draggedStructure.id)
              if (updatedStructure) {
                selectStructure(updatedStructure)
              }
            }
          }
        } else {
          // For all other cases (non-cell structures, or cells not dropped into tables/arrays), perform regular move
          const {structures: newStructures, positions: newPositions} = moveStructure(draggedStructure, lastValidDropTarget, structures, positions, true)
          setStructures(newStructures)
          setPositions(newPositions)
          // Update selected structure with the moved structure
          const updatedStructure = newStructures.get(draggedStructure.id)
          if (updatedStructure) {
            selectStructure(updatedStructure)
          }
        }
      }

      // Handle column drag drop
      if (isDraggingColumn && draggedColumn && columnDropTarget) {
        // Perform column reordering
        const table = structures.get(draggedColumn.tableId)
        if (table && table.type === 'table') {
          const tableStructure = table as any
          const sourceColumnIndex = draggedColumn.columnIndex
          const targetColumnIndex = columnDropTarget.targetColumnIndex
          
          if (sourceColumnIndex !== targetColumnIndex) {
            // For tables, column reordering is handled through the position map
            // No explicit array manipulation needed with the new structure
            
            // Table structure itself doesn't need to change for column reordering
            const updatedTable = {
              ...tableStructure
            }
            
            // Update the table structure
            setStructures((prev: StructureMap) => {
              const newStructures = new Map(prev)
              newStructures.set(tableStructure.id, updatedTable)
              return newStructures
            })
            
            // Update selected column to follow the moved column
            setSelectedColumn({ 
              tableId: draggedColumn.tableId, 
              columnIndex: targetColumnIndex 
            })
            
            // Update selected structure
            selectStructure(updatedTable)
          }
        }
      }
    } finally {
      // Always clean up drag state
      setIsDraggingStructure(false)
      setDraggedStructure(null)
      setDragOffset(null)
      setDropTarget(null)
      setIsDragging(false)
      setDragStart(null)
      setIsResizingSheetHeader(false)
      setSheetHeaderResizeType(null)
      setSheetHeaderResizeIndex(null)
      setIsResizingStructure(false)
      setStructureResizeDirection(null)
      setStructureResizeStartDimensions(null)
      setIsDraggingColumn(false)
      setDraggedColumn(null)
      setColumnDragStartX(0)
      setColumnDropTarget(null)
    }
  }, [
    isDraggingStructure,
    draggedStructure,
    lastValidDropTarget,
    isDraggingColumn,
    draggedColumn,
    columnDropTarget,
    structures,
    positions,
    setStructures,
    setPositions,
    selectStructure,
    setIsDraggingStructure,
    setDraggedStructure,
    setDragOffset,
    setDropTarget,
    setIsDragging,
    setDragStart,
    setIsResizingSheetHeader,
    setSheetHeaderResizeType,
    setSheetHeaderResizeIndex,
    setIsResizingStructure,
    setStructureResizeDirection,
    setStructureResizeStartDimensions,
    setIsDraggingColumn,
    setDraggedColumn,
    setColumnDragStartX,
    setColumnDropTarget,
    setSelectedColumn,
    setLastValidDropTarget
  ])

  // Global keyboard handler for merged cell creation and column header editing
  const handleGlobalKeyDown = React.useCallback((e: KeyboardEvent) => {
    // 1. Handle merged cell creation by typing on a selected range
    if (
      selectedRange &&
      selectedRange.start && selectedRange.end &&
      !isDraggingColumn && !isResizingSheetHeader && !isResizingStructure && !isDraggingStructure
    ) {
      const isPrintableChar = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey
      if (isPrintableChar) {
        // Calculate range bounds
        const minRow = Math.min(selectedRange.start.row, selectedRange.end.row)
        const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row)
        const minCol = Math.min(selectedRange.start.col, selectedRange.end.col)
        const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col)
        // Only create merged cell if range is more than 1 cell
        if (minRow !== maxRow || minCol !== maxCol) {
          // Create a new merged cell structure (type as 'cell' literal)
          const mergedCellId = `cell-${minRow}-${minCol}-${maxRow}-${maxCol}-${Date.now()}`
          const centerRow = Math.floor((minRow + maxRow) / 2)
          const centerCol = Math.floor((minCol + maxCol) / 2)
          const newMergedCell = {
            type: 'cell' as const,
            id: mergedCellId,
            startPosition: { row: minRow, col: minCol },
            dimensions: { rows: maxRow - minRow + 1, cols: maxCol - minCol + 1 },
            value: e.key
          }
          setStructures((prev: StructureMap) => {
            const newStructures = new Map(prev)
            newStructures.set(mergedCellId, newMergedCell)
            return newStructures
          })
          // Select the center cell and start editing
          setSelectedRange({ start: { row: centerRow, col: centerCol }, end: { row: centerRow, col: centerCol } })
          const cellKey = getCellKey(centerRow, centerCol)
          setEditingCells(prev => {
            const newSet = new Set(prev)
            newSet.add(cellKey)
            return newSet
          })
          setTimeout(() => {
            const inputElement = document.querySelector(`input[data-cell-key="${cellKey}"]`) as HTMLInputElement
            if (inputElement) {
              inputElement.value = e.key
              inputElement.focus()
              inputElement.setSelectionRange(1, 1)
              setCellValues(prev => {
                const newMap = new Map(prev)
                newMap.set(cellKey, e.key)
                return newMap
              })
            }
          }, 10)
          e.preventDefault()
          return
        }
      }
    }

    // 2. Column header editing (original logic)
    if (selectedColumn && !isDraggingColumn && !isResizingSheetHeader && !isResizingStructure) {
      const isPrintableChar = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey
      if (isPrintableChar) {
        const table = structures.get(selectedColumn.tableId)
        if (table && table.type === 'table') {
          const tableStructure = table as any
          const headerRow = tableStructure.startPosition.row
          const headerCol = tableStructure.startPosition.col + selectedColumn.columnIndex
          const cellKey = getCellKey(headerRow, headerCol)
          setSelectedRange({ start: { row: headerRow, col: headerCol }, end: { row: headerRow, col: headerCol } })
          setEditingCells(prev => {
            const newSet = new Set(prev)
            newSet.add(cellKey)
            return newSet
          })
          setTimeout(() => {
            const inputElement = document.querySelector(`input[data-cell-key="${cellKey}"]`) as HTMLInputElement
            if (inputElement) {
              inputElement.value = e.key
              inputElement.focus()
              inputElement.setSelectionRange(1, 1)
              setCellValues(prev => {
                const newMap = new Map(prev)
                newMap.set(cellKey, e.key)
                return newMap
              })
            }
          }, 10)
          e.preventDefault()
        }
      }
    }
  }, [
    selectedRange,
    selectedColumn,
    isDraggingColumn,
    isResizingSheetHeader,
    isResizingStructure,
    isDraggingStructure,
    editingCells,
    structures,
    setStructures,
    setSelectedRange,
    setEditingCells,
    setCellValues,
    getCellKey
  ])

  // Global keyboard handler for deletion
  const handleGlobalKeyDownForDeletion = React.useCallback((e: KeyboardEvent) => {
    // Only handle if not currently editing a cell and not in other drag/resize states
    if (editingCells.size > 0 || isDraggingColumn || isResizingSheetHeader || isResizingStructure || isDraggingStructure) {
      return
    }

    if (e.key === 'Backspace') {
      // Backspace key: Delete selected structure (but not when editing text)
      if (selectedStructure && onDeleteStructure) {
        e.preventDefault()
        onDeleteStructure(selectedStructure.id)
      }
    }
  }, [
    selectedRange,
    selectedStructure,
    editingCells,
    isDraggingColumn,
    isResizingSheetHeader,
    isResizingStructure,
    isDraggingStructure,
    structures,
    onDeleteStructure
  ])

  // Set up global event listeners
  React.useEffect(() => {
    document.addEventListener('mouseup', handleGlobalMouseUp)
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('keydown', handleGlobalKeyDown)
    document.addEventListener('keydown', handleGlobalKeyDownForDeletion)
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('keydown', handleGlobalKeyDown)
      document.removeEventListener('keydown', handleGlobalKeyDownForDeletion)
    }
  }, [handleGlobalMouseUp, handleGlobalMouseMove, handleGlobalKeyDown, handleGlobalKeyDownForDeletion])

  return {
    // The hooks manage their own event listeners, so no handlers need to be returned
    // This is purely for side effects
  }
}
