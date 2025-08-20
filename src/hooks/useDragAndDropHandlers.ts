import React from 'react'
import { Structure, Position, StructureMap, PositionMap, ArrayStructure, TableStructure, CellStructure } from '../types'
import { 
  getStructureAtPosition, 
  isTableHeader,
  moveStructure,
  isValidMoveTarget,
  getEndPosition,
  removeStructureFromPositionMap,
  addStructureToPositionMap
} from '../utils/structureUtils'
import { 
  getColumnPosition,
  getRowPosition,  
  getColumnWidth,
  getRowHeight,
  getHeaderHeight,
  getHeaderWidth
} from '../utils/sheetUtils'
import { MAX_ROWS } from '../constants'

interface DragAndDropHandlersProps {
  structures: StructureMap
  positions: PositionMap
  selectedStructure: Structure | null
  selectedColumn: {tableId: string, columnIndex: number} | null
  isDraggingStructure: boolean
  draggedStructure: Structure | null
  dragOffset: Position | null
  dropTarget: Position | null
  lastValidDropTarget: Position | null
  isDraggingColumn: boolean
  draggedColumn: {tableId: string, columnIndex: number} | null
  columnDragStartX: number
  columnDropTarget: {tableId: string, targetColumnIndex: number} | null
  columnHeaderHandledInMouseDown: boolean
  scrollLeft: number
  scrollTop: number
  columnWidths: Map<number, number>
  rowHeights: Map<number, number>
  containerRef: React.RefObject<HTMLDivElement>
  
  // State setters
  setSelectedStructure: React.Dispatch<React.SetStateAction<Structure | null>>
  setSelectedColumn: React.Dispatch<React.SetStateAction<{tableId: string, columnIndex: number} | null>>
  setSelectedRange: React.Dispatch<React.SetStateAction<{start: {row: number, col: number}, end: {row: number, col: number}} | null>>
  setStartEditing: React.Dispatch<React.SetStateAction<{row: number, col: number} | null>>
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
  setColumnHeaderHandledInMouseDown: React.Dispatch<React.SetStateAction<boolean>>
  setStructures: React.Dispatch<React.SetStateAction<StructureMap>>
  setPositions: React.Dispatch<React.SetStateAction<PositionMap>>
  setEditingCells: React.Dispatch<React.SetStateAction<Set<string>>>
}

export const useDragAndDropHandlers = ({
  structures,
  positions,
  selectedStructure,
  selectedColumn,
  isDraggingStructure,
  draggedStructure,
  dragOffset,
  dropTarget,
  lastValidDropTarget,
  isDraggingColumn,
  draggedColumn,
  columnDragStartX,
  columnDropTarget,
  columnHeaderHandledInMouseDown,
  scrollLeft,
  scrollTop,
  columnWidths,
  rowHeights,
  containerRef,
  setSelectedStructure,
  setSelectedColumn,
  setSelectedRange,
  setStartEditing,
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
  setColumnHeaderHandledInMouseDown,
  setStructures,
  setPositions,
  setEditingCells
}: DragAndDropHandlersProps) => {

  // Selecting a structure should also clear text editing and range
  const selectStructure = React.useCallback((structure: Structure) => {
    setSelectedStructure(structure)
    setStartEditing(null)
    setSelectedRange(null)
    setEditingCells(new Set())
  }, [setSelectedStructure, setStartEditing, setSelectedRange, setEditingCells])

  // Shared function to start structure dragging with precise offset calculation
  const startStructureDrag = React.useCallback((structure: Structure, e: React.MouseEvent, fallbackRow: number = 0, fallbackCol: number = 0) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedColumn(null)
    setIsDraggingStructure(true)
    setDraggedStructure(structure)
    
    // Calculate precise drag offset based on where user clicked within the structure
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const relativeX = e.clientX - containerRect.left + scrollLeft
      const relativeY = e.clientY - containerRect.top + scrollTop
      
      // Convert pixel position to cell position
      let clickRow = 0
      let clickCol = 0
      
      // Calculate click row
      let currentY = getHeaderHeight()
      while (clickRow < MAX_ROWS && currentY + getRowHeight(clickRow, rowHeights) < relativeY) {
        currentY += getRowHeight(clickRow, rowHeights)
        clickRow++
      }
      
      // Calculate click column
      let currentX = getHeaderWidth()
      while (clickCol < 26 && currentX + getColumnWidth(clickCol, columnWidths) < relativeX) {
        currentX += getColumnWidth(clickCol, columnWidths)
        clickCol++
      }
      
      setDragOffset({ 
        row: clickRow - structure.startPosition.row, 
        col: clickCol - structure.startPosition.col 
      })
    } else {
      setDragOffset({ row: fallbackRow, col: fallbackCol })
    }
    
    if (!selectedStructure || selectedStructure.id !== structure.id) {
      selectStructure(structure)
      setStartEditing(null)
      setSelectedRange(null)
    }
  }, [
    containerRef, scrollLeft, scrollTop, rowHeights, columnWidths, selectedStructure,
    setSelectedColumn, setIsDraggingStructure, setDraggedStructure, setDragOffset,
    selectStructure, setStartEditing, setSelectedRange
  ])

  // Handle mouse down for drag detection
  const handleMouseDown = React.useCallback((row: number, col: number, e: React.MouseEvent) => {
    if (e.button !== 0) return // Only handle left-click

    // Clear any stale drag state before processing new interactions
    setIsDraggingStructure(false)
    setDraggedStructure(null)
    setDragOffset(null)
    setDropTarget(null)
    setLastValidDropTarget(null)

    // Check if this is a table header - if so, don't handle mouse down here
    // Let the column header click handler take care of it
    if (isTableHeader(row, col, structures, positions)) {
      return // Don't handle mouse down for table headers
    }

    // Check if the clicked cell is part of a structure
    const structure = getStructureAtPosition(row, col, positions, structures)
    
    if (structure) {
      // Always clear column selection when clicking on any structure cell (including table cells)
      setSelectedColumn(null)
      
      // Start dragging immediately for any structure (selected or not)
      e.preventDefault()
      setIsDraggingStructure(true)
      setDraggedStructure(structure)
      
      // For merged cells (cells that span multiple grid positions), calculate the precise click position
      if (structure.type === 'cell' && 
          (structure.dimensions.rows > 1 || structure.dimensions.cols > 1)) {
        
        // This is a merged cell - calculate precise offset based on mouse position
        if (containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect()
          const relativeX = e.clientX - containerRect.left + scrollLeft
          const relativeY = e.clientY - containerRect.top + scrollTop
          
          // Convert pixel position to cell position
          let clickRow = 0
          let clickCol = 0
          
          // Calculate click row
          let currentY = getHeaderHeight()
          while (clickRow < MAX_ROWS && currentY + getRowHeight(clickRow, rowHeights) < relativeY) {
            currentY += getRowHeight(clickRow, rowHeights)
            clickRow++
          }
          
          // Calculate click column
          let currentX = getHeaderWidth()
          while (clickCol < 26 && currentX + getColumnWidth(clickCol, columnWidths) < relativeX) {
            currentX += getColumnWidth(clickCol, columnWidths)
            clickCol++
          }
          
          // Use the precise click position for offset calculation
          setDragOffset({ 
            row: clickRow - structure.startPosition.row, 
            col: clickCol - structure.startPosition.col 
          })
        } else {
          // Fallback to using the provided row/col (top-left corner)
          setDragOffset({ 
            row: row - structure.startPosition.row, 
            col: col - structure.startPosition.col 
          })
        }
      } else {
        // For non-merged cells or other structures, use the simple calculation
        setDragOffset({ 
          row: row - structure.startPosition.row, 
          col: col - structure.startPosition.col 
        })
      }
      
      // Also select the structure if it wasn't already selected
      if (!selectedStructure || selectedStructure.id !== structure.id) {
        selectStructure(structure)
      }
      
      return
    } else {
      // Click on empty cell - clear all selections and select cell normally
      setSelectedStructure(null)
      setSelectedColumn(null) // Clear column selection when clicking outside tables
      setSelectedRange({ start: { row, col }, end: { row, col } })
      setStartEditing({ row, col }) // Start editing immediately for non-structure cells
      
      e.preventDefault()
      setIsDragging(true)
      setDragStart({ row, col })
    }
  }, [
    structures, positions, selectedStructure, containerRef, scrollLeft, scrollTop, 
    rowHeights, columnWidths, setIsDraggingStructure, setDraggedStructure, setDragOffset,
    setDropTarget, setLastValidDropTarget, setSelectedColumn, selectStructure,
    setSelectedStructure, setSelectedRange, setStartEditing, setIsDragging, setDragStart
  ])

  // Handle column header clicks
  const handleColumnHeaderClick = React.useCallback((row: number, col: number) => {
    // Check if this was already handled in mouse down
    if (columnHeaderHandledInMouseDown) {
      setColumnHeaderHandledInMouseDown(false)
      return
    }

    // Check if this is a table header cell
    const structure = getStructureAtPosition(row, col, positions, structures)
    if (structure && structure.type === 'table') {
      const table = structure as any
      const columnIndex = col - table.startPosition.col
      
      // Check if this column is already selected
      const isSameColumnSelected = selectedColumn &&
        selectedColumn.tableId === table.id &&
        selectedColumn.columnIndex === columnIndex
      
      if (isSameColumnSelected) {
        // Second click on already selected column - start editing the cell
        setSelectedRange({ start: { row, col }, end: { row, col } })
        setStartEditing({ row, col })
      } else {
        // First click on column - select the column and table
        setSelectedColumn({ tableId: table.id, columnIndex })
        selectStructure(table)
        setSelectedRange(null)
      }
    }
  }, [
    columnHeaderHandledInMouseDown, positions, structures, selectedColumn,
    setColumnHeaderHandledInMouseDown, setSelectedRange, setStartEditing,
    setSelectedColumn, selectStructure
  ])

  // Handle column header mouse down
  const handleColumnHeaderMouseDown = React.useCallback((row: number, col: number, e: React.MouseEvent) => {
    if (e.button !== 0) return // Only handle left-click

    // Check if this is a table header cell
    const structure = getStructureAtPosition(row, col, positions, structures)
    if (structure && structure.type === 'table') {
      const table = structure as any
      const columnIndex = col - table.startPosition.col
      
      // Always prevent default and prepare for potential drag
      e.preventDefault()
      setColumnHeaderHandledInMouseDown(true)
      
      // Check if this column is already selected
      const isSameColumnSelected = selectedColumn &&
        selectedColumn.tableId === table.id &&
        selectedColumn.columnIndex === columnIndex
      
      if (!isSameColumnSelected) {
        // First select the column
        setSelectedColumn({ tableId: table.id, columnIndex })
        selectStructure(table)
        setSelectedRange(null)
      }
      
      // Prepare for drag
      setDraggedColumn({ tableId: table.id, columnIndex })
      setColumnDragStartX(e.clientX)
      setColumnDropTarget(null)
    }
  }, [
    positions, structures, selectedColumn, setColumnHeaderHandledInMouseDown,
    setSelectedColumn, selectStructure, setSelectedRange, setDraggedColumn,
    setColumnDragStartX, setColumnDropTarget
  ])

  // Process structure drag and drop movement and targeting
  const processStructureDragMove = React.useCallback((e: MouseEvent) => {
    if (isDraggingStructure && draggedStructure && dragOffset && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const relativeX = e.clientX - containerRect.left + scrollLeft
      const relativeY = e.clientY - containerRect.top + scrollTop
      
      // Convert pixel position to cell position
      let targetRow = 0
      let targetCol = 0
      
      // Calculate target row
      let currentY = getHeaderHeight()
      while (targetRow < MAX_ROWS && currentY + getRowHeight(targetRow, rowHeights) < relativeY) {
        currentY += getRowHeight(targetRow, rowHeights)
        targetRow++
      }
      
      // Calculate target column
      let currentX = getHeaderWidth()
      while (targetCol < 26 && currentX + getColumnWidth(targetCol, columnWidths) < relativeX) {
        currentX += getColumnWidth(targetCol, columnWidths)
        targetCol++
      }
      
      // Adjust for drag offset
      const newDropTarget = {
        row: Math.max(0, targetRow - dragOffset.row),
        col: Math.max(0, targetCol - dragOffset.col)
      }
      
      // Validate the new drop target
      const isValid = isValidMoveTarget(draggedStructure, newDropTarget, structures, positions)
      
      if (isValid) {
        // Valid location: update both drop target and last valid drop target
        setDropTarget(newDropTarget)
        setLastValidDropTarget(newDropTarget)
      }
      // For invalid locations: don't update dropTarget, so indicator stays at last valid position
      // lastValidDropTarget also remains unchanged (keeps the last valid position)
    }
  }, [
    isDraggingStructure, draggedStructure, dragOffset, containerRef, scrollLeft, scrollTop,
    rowHeights, columnWidths, structures, positions, setDropTarget, setLastValidDropTarget
  ])

  // Process column drag and drop movement  
  const processColumnDragMove = React.useCallback((e: MouseEvent) => {
    if (draggedColumn && containerRef.current) {
      const deltaX = e.clientX - columnDragStartX
      const dragThreshold = 5 // Pixels before starting drag
      
      // Check if we should start dragging
      if (!isDraggingColumn && Math.abs(deltaX) > dragThreshold) {
        setIsDraggingColumn(true)
      }
      
      // Handle real-time reordering once dragging has started
      if (isDraggingColumn) {
        // Find the table structure
        const table = structures.get(draggedColumn.tableId)
        if (table && table.type === 'table') {
          const tableStructure = table as any
          const currentColumnIndex = draggedColumn.columnIndex
          
          // Calculate target column based on mouse position relative to table
          const containerRect = containerRef.current.getBoundingClientRect()
          const relativeX = e.clientX - containerRect.left + scrollLeft
          
          // Find which column we're over within the table
          let targetColumnIndex = currentColumnIndex
          let currentX = getColumnPosition(tableStructure.startPosition.col, columnWidths)
          
          for (let c = 0; c < tableStructure.dimensions.cols; c++) {
            const colWidth = getColumnWidth(tableStructure.startPosition.col + c, columnWidths)
            if (relativeX >= currentX && relativeX < currentX + colWidth) {
              targetColumnIndex = c
              break
            }
            currentX += colWidth
          }
        
          // Perform real-time column reordering if target changed
          if (targetColumnIndex !== currentColumnIndex) {
            const updatedTable = {
              ...tableStructure
            }
            
            // Update the table structure in real-time
            setStructures((prev: StructureMap) => {
              const newStructures = new Map(prev)
              newStructures.set(tableStructure.id, updatedTable)
              return newStructures
            })
            
            // Update the dragged column index to track the new position
            setDraggedColumn({ 
              tableId: draggedColumn.tableId, 
              columnIndex: targetColumnIndex 
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
    }
  }, [
    draggedColumn, containerRef, columnDragStartX, isDraggingColumn, structures,
    scrollLeft, columnWidths, setIsDraggingColumn, setStructures, setDraggedColumn,
    setSelectedColumn, selectStructure
  ])

  return {
    handlers: {
      startStructureDrag,
      handleMouseDown,
      handleColumnHeaderClick,
      handleColumnHeaderMouseDown,
      processStructureDragMove,
      processColumnDragMove
    },
    utils: {
      selectStructure
    }
  }
}
