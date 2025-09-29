import React from 'react'
import { Structure, Position, StructureMap, PositionMap, ArrayStructure, TableStructure, CellStructure } from '../types'
import { 
  getStructureAtPosition, 
  isTableHeader,
  moveStructure,
  isValidMoveTarget,
  getEndPosition,
  removeStructureFromPositionMap,
  addStructureToPositionMap,
  getStructureHierarchy,
  getNextStructureInHierarchy,
  isSamePosition
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

interface StructureClickHandlersProps {
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
  
  // Recursive selection state
  selectedStructureLevel: number
  lastClickedPosition: Position | null
  
  // Cell editing function to stop editing when structure dragging starts
  stopCellEditing: (saveValue?: boolean) => void
  
  // Function to check if a cell is currently being edited
  isCellBeingEdited: (row: number, col: number) => boolean
  
  // Grid click handler for reference insertion
  onGridClick?: (row: number, col: number, structure?: Structure) => boolean
  
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
  setSelectedStructureLevel: React.Dispatch<React.SetStateAction<number>>
  setLastClickedPosition: React.Dispatch<React.SetStateAction<Position | null>>
}

export const useStructureClickHandlers = ({
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
  selectedStructureLevel,
  lastClickedPosition,
  stopCellEditing,
  isCellBeingEdited,
  onGridClick,
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
  setSelectedStructureLevel,
  setLastClickedPosition
}: StructureClickHandlersProps) => {

  // Selecting a structure should also clear text editing and range
  const selectStructure = React.useCallback((structure: Structure) => {
    setSelectedStructure(structure)
    setStartEditing(null)
    setSelectedRange(null)
  }, [setSelectedStructure, setStartEditing, setSelectedRange])

  // Helper function to check if two positions are within the same structure at a given hierarchy level
  const isInSameStructureAtLevel = React.useCallback((pos1: Position, pos2: Position, level: number) => {
    const hierarchy1 = getStructureHierarchy(pos1.row, pos1.col, positions, structures)
    const hierarchy2 = getStructureHierarchy(pos2.row, pos2.col, positions, structures)
    
    // Both positions must have structures at the specified level
    if (hierarchy1.length <= level || hierarchy2.length <= level) {
      return false
    }
    
    // Check if the structure at the specified level is the same
    return hierarchy1[level].id === hierarchy2[level].id
  }, [positions, structures])

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

    // Try reference insertion first if onGridClick is available
    if (onGridClick) {
      const structure = getStructureAtPosition(row, col, positions, structures)
      const handled = onGridClick(row, col, structure)
      if (handled) return // Stop here if reference was inserted - no selection should happen
    }

    // Get all structures at this position for hierarchical selection
    const hierarchy = getStructureHierarchy(row, col, positions, structures)
    
    if (hierarchy.length > 0) {
      // Always clear column selection when clicking on any structure cell (including table cells)
      setSelectedColumn(null)
      
      // Check if this is a click on the same position as the last click
      const clickedPosition = { row, col }
      const isSamePositionClick = isSamePosition(clickedPosition, lastClickedPosition)
      
      let structureToSelect: Structure
      let newLevel: number
      let shouldStartEditing = false
      
      if (isSamePositionClick && selectedStructure && hierarchy.some(s => s.id === selectedStructure.id)) {
        // Same position click with selected structure in hierarchy
        if (selectedStructureLevel === hierarchy.length - 1) {
          // We're at the bottom of the hierarchy - start editing instead of advancing
          shouldStartEditing = true
          structureToSelect = selectedStructure
          newLevel = selectedStructureLevel
        } else {
          // Not at bottom yet - advance to next level
          const nextResult = getNextStructureInHierarchy(selectedStructure, hierarchy, selectedStructureLevel)
          structureToSelect = nextResult.structure!
          newLevel = nextResult.level
        }
      } else if (lastClickedPosition && 
                 selectedStructure && 
                 selectedStructureLevel < hierarchy.length &&
                 isInSameStructureAtLevel(clickedPosition, lastClickedPosition, selectedStructureLevel)) {
        // Different position but within the same structure at current level - maintain level
        structureToSelect = hierarchy[selectedStructureLevel]
        newLevel = selectedStructureLevel
      } else {
        // Different position or no current selection - start at level 0 (outermost)
        structureToSelect = hierarchy[0]
        newLevel = 0
      }
      
      // Update the tracking state
      setLastClickedPosition(clickedPosition)
      setSelectedStructureLevel(newLevel)
      
      if (shouldStartEditing) {
        // Check if this cell is already being edited
        if (isCellBeingEdited(row, col)) {
          // Don't disrupt editing - just return early
          return
        }
        
        // Start editing the cell instead of dragging the structure
        setSelectedRange({ start: { row, col }, end: { row, col } })
        setStartEditing({ row, col })
        e.preventDefault()
        setIsDragging(true)
        setDragStart({ row, col })
        return
      }
      
      // Start dragging for the selected structure (normal hierarchy selection)
      // Stop any cell editing before starting structure drag
      stopCellEditing(true)
      
      e.preventDefault()
      setIsDraggingStructure(true)
      setDraggedStructure(structureToSelect)
      
      // For merged cells (cells that span multiple grid positions), calculate the precise click position
      if (structureToSelect.type === 'cell' && 
          (structureToSelect.dimensions.rows > 1 || structureToSelect.dimensions.cols > 1)) {
        
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
            row: clickRow - structureToSelect.startPosition.row, 
            col: clickCol - structureToSelect.startPosition.col 
          })
        } else {
          // Fallback to using the provided row/col (top-left corner)
          setDragOffset({ 
            row: row - structureToSelect.startPosition.row, 
            col: col - structureToSelect.startPosition.col 
          })
        }
      } else {
        // For non-merged cells or other structures, use the simple calculation
        setDragOffset({ 
          row: row - structureToSelect.startPosition.row, 
          col: col - structureToSelect.startPosition.col 
        })
      }
      
      // Select the structure (this will clear other selections)
      selectStructure(structureToSelect)
      
      return
    } else {
      // Click on empty cell - clear all selections and select cell normally
      
      // Check if this cell is already being edited
      if (isCellBeingEdited(row, col)) {
        // Don't disrupt editing - just return early
        return
      }
      
      setSelectedStructure(null)
      setSelectedColumn(null) // Clear column selection when clicking outside tables
      setLastClickedPosition({ row, col }) // Track this position for consistency
      setSelectedStructureLevel(0) // Reset level when clicking empty space
      setSelectedRange({ start: { row, col }, end: { row, col } })
      setStartEditing({ row, col }) // Start editing immediately for non-structure cells
      
      e.preventDefault()
      setIsDragging(true)
      setDragStart({ row, col })
    }
  }, [
    structures, positions, selectedStructure, selectedStructureLevel, lastClickedPosition,
    containerRef, scrollLeft, scrollTop, rowHeights, columnWidths, setIsDraggingStructure, 
    setDraggedStructure, setDragOffset, setDropTarget, setLastValidDropTarget, 
    setSelectedColumn, selectStructure, setSelectedStructure, setSelectedRange, 
    setStartEditing, setIsDragging, setDragStart, setLastClickedPosition, setSelectedStructureLevel,
    isInSameStructureAtLevel, stopCellEditing, onGridClick
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
        // Second click on already selected column - start editing the header cell
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

  // Process cell range selection during drag
  const processCellRangeSelection = React.useCallback((e: MouseEvent, isDragging: boolean, dragStart: {row: number, col: number} | null) => {
    if (!isDragging || !dragStart || !containerRef.current) return
    
    const containerRect = containerRef.current.getBoundingClientRect()
    const relativeX = e.clientX - containerRect.left + scrollLeft
    const relativeY = e.clientY - containerRect.top + scrollTop
    
    // Convert pixel position to cell position
    let currentRow = 0
    let currentCol = 0
    
    // Calculate current row
    let currentY = getHeaderHeight()
    while (currentRow < MAX_ROWS && currentY + getRowHeight(currentRow, rowHeights) < relativeY) {
      currentY += getRowHeight(currentRow, rowHeights)
      currentRow++
    }
    
    // Calculate current column
    let currentX = getHeaderWidth()
    while (currentCol < 26 && currentX + getColumnWidth(currentCol, columnWidths) < relativeX) {
      currentX += getColumnWidth(currentCol, columnWidths)
      currentCol++
    }
    
    // Update selected range to span from drag start to current position
    setSelectedRange({
      start: dragStart,
      end: { row: currentRow, col: currentCol }
    })
  }, [containerRef, scrollLeft, scrollTop, rowHeights, columnWidths, setSelectedRange])

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
      processCellRangeSelection,
      processColumnDragMove
    },
    utils: {
      selectStructure
    }
  }
}
