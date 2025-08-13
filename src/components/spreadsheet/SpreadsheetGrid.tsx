import React from 'react'
import { Structure, Position, ArrayStructure, TableStructure, CellStructure, StructureMap, PositionMap } from '../../types'
import { 
  calculateVisibleCols, 
  calculateVisibleRows, 
  getColumnPosition, 
  getRowPosition, 
  getColumnWidth, 
  getRowHeight, 
  getHeaderHeight,
  getHeaderWidth,
  getNextCell
} from '../../utils/sheetUtils'
import {
  isCellInRange,
  isTableHeader,
  getHeaderLevel,
  getStructureAtPosition,
  moveStructure,
  getCellValue,
  getEndPosition,
  removeStructureFromPositionMap,
  addStructureToPositionMap,
  isValidMoveTarget
} from '../../utils/structureUtils'
import { COLUMN_LETTERS, Z_INDEX, MIN_CELL_SIZE, MAX_ROWS, CELL_COLOR, TABLE_COLOR, ARRAY_COLOR } from '../../constants'

interface SpreadsheetGridProps {
  // State
  structures: StructureMap
  positions: PositionMap
  selectedRange: {start: {row: number, col: number}, end: {row: number, col: number}} | null
  selectedStructure: Structure | null
  selectedColumn: {tableId: string, columnIndex: number} | null
  scrollTop: number
  scrollLeft: number
  columnWidths: Map<number, number>
  rowHeights: Map<number, number>
  startEditing: {row: number, col: number} | null
  hoveredHeaderCell: {row: number, col: number} | null
  showAddColumnButton: boolean
  isResizingSheetHeader: boolean
  sheetHeaderResizeType: 'column' | 'row' | null
  sheetHeaderResizeIndex: number | null
  isDraggingSheetHeader: boolean
  sheetHeaderDragStart: {row: number, col: number} | null
  sheetHeaderResizeStartPos: number
  sheetHeaderResizeStartSize: number
  isDraggingColumn: boolean
  draggedColumn: {tableId: string, columnIndex: number} | null
  columnDragStartX: number
  columnDropTarget: {tableId: string, targetColumnIndex: number} | null
  isResizingStructure: boolean
  structureResizeDirection: 'left' | 'right' | 'top' | 'bottom' | 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br' | null
  structureResizeStartDimensions: { rows: number, cols: number } | null
  structureResizeStartX: number
  structureResizeStartY: number
  isDraggingStructure: boolean
  draggedStructure: Structure | null
  dragOffset: Position | null
  dropTarget: Position | null
  lastValidDropTarget: Position | null
  showConflictDialog: boolean
  conflictDialogData: {
    targetPosition: Position
    conflictingCells: Array<{row: number, col: number, existingValue: string, newValue: string}>
    draggedStructure: Structure
  } | null
  
  // State setters
  setStructures: React.Dispatch<React.SetStateAction<StructureMap>>
  setPositions: React.Dispatch<React.SetStateAction<PositionMap>>
  setSelectedRange: React.Dispatch<React.SetStateAction<{start: {row: number, col: number}, end: {row: number, col: number}} | null>>
  setSelectedStructure: React.Dispatch<React.SetStateAction<Structure | null>>
  setSelectedColumn: React.Dispatch<React.SetStateAction<{tableId: string, columnIndex: number} | null>>
  setScrollTop: React.Dispatch<React.SetStateAction<number>>
  setScrollLeft: React.Dispatch<React.SetStateAction<number>>
  setStartEditing: React.Dispatch<React.SetStateAction<{row: number, col: number} | null>>
  setContextMenu: React.Dispatch<React.SetStateAction<{x: number, y: number} | null>>
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>
  setDragStart: React.Dispatch<React.SetStateAction<{row: number, col: number} | null>>
  setHoveredHeaderCell: React.Dispatch<React.SetStateAction<{row: number, col: number} | null>>
  setShowAddColumnButton: React.Dispatch<React.SetStateAction<boolean>>
  setIsResizingSheetHeader: React.Dispatch<React.SetStateAction<boolean>>
  setSheetHeaderResizeType: React.Dispatch<React.SetStateAction<'column' | 'row' | null>>
  setSheetHeaderResizeIndex: React.Dispatch<React.SetStateAction<number | null>>
  setSheetHeaderResizeStartPos: React.Dispatch<React.SetStateAction<number>>
  setSheetHeaderResizeStartSize: React.Dispatch<React.SetStateAction<number>>
  setIsDraggingColumn: React.Dispatch<React.SetStateAction<boolean>>
  setDraggedColumn: React.Dispatch<React.SetStateAction<{tableId: string, columnIndex: number} | null>>
  setColumnDragStartX: React.Dispatch<React.SetStateAction<number>>
  setColumnDropTarget: React.Dispatch<React.SetStateAction<{tableId: string, targetColumnIndex: number} | null>>
  setIsResizingStructure: React.Dispatch<React.SetStateAction<boolean>>
  setStructureResizeDirection: React.Dispatch<React.SetStateAction<'left' | 'right' | 'top' | 'bottom' | 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br' | null>>
  setStructureResizeStartDimensions: React.Dispatch<React.SetStateAction<{ rows: number, cols: number } | null>>
  setStructureResizeStartX: React.Dispatch<React.SetStateAction<number>>
  setStructureResizeStartY: React.Dispatch<React.SetStateAction<number>>
  setColumnWidths: React.Dispatch<React.SetStateAction<Map<number, number>>>
  setRowHeights: React.Dispatch<React.SetStateAction<Map<number, number>>>
  setIsDraggingStructure: React.Dispatch<React.SetStateAction<boolean>>
  setDraggedStructure: React.Dispatch<React.SetStateAction<Structure | null>>
  setDragOffset: React.Dispatch<React.SetStateAction<Position | null>>
  setDropTarget: React.Dispatch<React.SetStateAction<Position | null>>
  setLastValidDropTarget: React.Dispatch<React.SetStateAction<Position | null>>
  setShowConflictDialog: React.Dispatch<React.SetStateAction<boolean>>
  setConflictDialogData: React.Dispatch<React.SetStateAction<{
    targetPosition: Position
    conflictingCells: Array<{row: number, col: number, existingValue: string, newValue: string}>
    draggedStructure: Structure
  } | null>>
  
  // Event handlers
  onCellUpdate: (row: number, col: number, value: string) => void
  onDeleteStructure?: (structureId: string) => void
  
  // Container ref
  containerRef: React.RefObject<HTMLDivElement>
}

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  structures,
  positions,
  selectedRange,
  selectedStructure,
  selectedColumn,
  scrollTop,
  scrollLeft,
  columnWidths,
  rowHeights,
  startEditing,
  hoveredHeaderCell,
  showAddColumnButton,
  isResizingSheetHeader,
  sheetHeaderResizeType,
  sheetHeaderResizeIndex,
  isDraggingSheetHeader,
  sheetHeaderDragStart,
  sheetHeaderResizeStartPos,
  sheetHeaderResizeStartSize,
  isDraggingColumn,
  draggedColumn,
  columnDragStartX,
  columnDropTarget,
  isResizingStructure,
  structureResizeDirection,
  structureResizeStartDimensions,
  structureResizeStartX,
  structureResizeStartY,
  isDraggingStructure,
  draggedStructure,
  dragOffset,
  dropTarget,
  lastValidDropTarget,
  showConflictDialog,
  conflictDialogData: _conflictDialogData,
  setIsResizingStructure,
  setStructureResizeDirection,
  setStructureResizeStartDimensions,
  setStructureResizeStartX,
  setStructureResizeStartY,
  setStructures,
  setPositions,
  setSelectedRange,
  setSelectedStructure,
  setSelectedColumn,
  setScrollTop,
  setScrollLeft,
  setStartEditing,
  setContextMenu,
  setIsDragging,
  setDragStart,
  setHoveredHeaderCell,
  setShowAddColumnButton,
  setIsResizingSheetHeader,
  setSheetHeaderResizeType,
  setSheetHeaderResizeIndex,
  setSheetHeaderResizeStartPos,
  setSheetHeaderResizeStartSize,
  setIsDraggingColumn,
  setDraggedColumn,
  setColumnDragStartX,
  setColumnDropTarget,
  setColumnWidths,
  setRowHeights,
  setIsDraggingStructure,
  setDraggedStructure,
  setDragOffset,
  setDropTarget,
  setLastValidDropTarget,
  setShowConflictDialog,
  setConflictDialogData,
  onCellUpdate,
  onDeleteStructure,
  containerRef
}) => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  const visibleCols = calculateVisibleCols(scrollLeft, viewportWidth, columnWidths)
  const visibleRows = calculateVisibleRows(scrollTop, viewportHeight, rowHeights)
  const { startCol, endCol } = visibleCols
  const { startRow, endRow } = visibleRows

  // State for editing structure names
  const [editingStructureName, setEditingStructureName] = React.useState<string | null>(null)
  const [editingNameValue, setEditingNameValue] = React.useState('')
  // State for tracking hovered structure
  const [hoveredStructure, setHoveredStructure] = React.useState<Structure | null>(null)
  
  // State for add button hover tracking
  const [hoveredAddButton, setHoveredAddButton] = React.useState<{
    type: 'column' | 'row'
    position: 'left' | 'right' | 'bottom' | 'top'
    structureId: string
    insertIndex: number
    x: number
    y: number
  } | null>(null)
  
  // Cell editing state
  const [cellValues, setCellValues] = React.useState<Map<string, string>>(new Map())
  const [editingCells, setEditingCells] = React.useState<Set<string>>(new Set())
  
  // Flag to prevent double handling of column header clicks
  const [columnHeaderHandledInMouseDown, setColumnHeaderHandledInMouseDown] = React.useState(false)

  // Cell rendering utilities
  const getCellKey = (row: number, col: number) => `${row}-${col}`
  
  const isHeaderCell = (row: number, col: number, structure?: Structure): boolean => {
    if (!structure || structure.type !== 'table') return false
    
    const table = structure as TableStructure
    const { startPosition } = table
    const headerRows = table.colHeaderLevels || 0
    const headerCols = table.rowHeaderLevels || 0
    
    // Check if cell is within header row range (column headers)
    const isInHeaderRows = headerRows > 0 && 
      row >= startPosition.row && 
      row < startPosition.row + headerRows
    
    // Check if cell is within header column range (row headers)
    const isInHeaderCols = headerCols > 0 && 
      col >= startPosition.col && 
      col < startPosition.col + headerCols
    
    return isInHeaderRows || isInHeaderCols
  }

  const getCellClasses = (row: number, col: number, structure?: Structure): string => {
    let classes = 'w-full h-full px-2 py-1 cursor-cell flex items-center'
    
    if (structure && isHeaderCell(row, col, structure)) {
      classes += ' font-bold'
    }
    
    // Center content for resized cells (merged cells)
    if (structure && structure.type === 'cell') {
      const { startPosition, dimensions } = structure
      if (dimensions.rows > 1 || dimensions.cols > 1) {
        classes += ' justify-center text-center'
      }
    }
    
    return classes
  }

  const getCellStyle = (row: number, col: number, structure?: Structure, isInRange?: boolean): React.CSSProperties => {
    const baseStyle: React.CSSProperties = { 
      width: '100%', 
      height: '100%'
    }
    
    // Default background
    baseStyle.backgroundColor = '#F3F4F6'
    
    if (structure && isHeaderCell(row, col, structure) && structure.type === 'table') {
      // Use green background to match table border color
      return { ...baseStyle, backgroundColor: 'rgba(0, 166, 62, 0.8)' }
    }
    
    // Add transparent background colors for structure types
    if (structure?.type === 'table') {
      return { ...baseStyle, backgroundColor: 'rgba(0, 166, 62, 0.1)' } // Transparent light green
    }
    
    if (structure?.type === 'array') {
      return { ...baseStyle, backgroundColor: 'rgba(43, 127, 255, 0.1)' } // Transparent light blue
    }

    if (structure?.type === 'cell') {
      return { ...baseStyle, backgroundColor: 'rgba(255, 255, 255, 1)' }
    }

    // If cell is in selected range, use blue background
    if (isInRange) {
      return { ...baseStyle, backgroundColor: '#dbeafe' } // bg-blue-100 equivalent
    }
    
    return baseStyle
  }

  const handleCellBlur = (row: number, col: number, e?: React.FocusEvent<HTMLInputElement>) => {
    const cellKey = getCellKey(row, col)
    
    // Get the value from the input element - be very explicit about this
    let cellValue: string
    if (e?.target) {
      // Primary: get from the blur event target
      cellValue = e.target.value
    } else {
      // Fallback: try to find the input element directly by its data attribute
      const inputElement = document.querySelector(`input[data-cell-key="${cellKey}"]`) as HTMLInputElement
      if (inputElement) {
        cellValue = inputElement.value
      } else {
        // Final fallback: use React state
        cellValue = cellValues.get(cellKey) || ''
      }
    }

    // Check if there's already a structure at this position
    const existingStructure = getStructureAtPosition(row, col, positions, structures)
    
    // Update logic:
    // - If there's an existing structure: ALWAYS update (allows clearing to empty string)
    // - If no existing structure: only update if value is not empty (prevents creating empty cells)
    if (existingStructure) {
      // Always update existing structures, even with empty values
      onCellUpdate(row, col, cellValue)
    } else if (cellValue !== '') {
      // Only create new structures for non-empty values
      onCellUpdate(row, col, cellValue)
    }
    
    // Stop editing immediately
    setEditingCells(prev => {
      const newSet = new Set(prev)
      newSet.delete(cellKey)
      return newSet
    })
  }

  const handleCellFocusChange = (row: number, col: number) => {
    handleCellFocus(row, col)
    const cellKey = getCellKey(row, col)
    setEditingCells(prev => {
      const newSet = new Set(prev)
      newSet.add(cellKey)
      return newSet
    })
  }

  const handleCellDoubleClick = (row: number, col: number) => {
    const cellKey = getCellKey(row, col)
    setEditingCells(prev => {
      const newSet = new Set(prev)
      newSet.add(cellKey)
      return newSet
    })
  }

  const handleCellKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const cellKey = getCellKey(row, col)
      const cellValue = cellValues.get(cellKey) || ''
      
      onCellUpdate(row, col, cellValue)
      setEditingCells(prev => {
        const newSet = new Set(prev)
        newSet.delete(cellKey)
        return newSet
      })
      handleCellEnterPress(row, col)
    }
  }
  
  const handleCellKeyDownGeneral = (e: React.KeyboardEvent, row: number, col: number) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      handleArrowKeyNavigation(row, col, e.key as 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight')
    } else if (e.key === 'Enter' || e.key === 'F2') {
      // Start editing on Enter or F2
      e.preventDefault()
      const cellKey = getCellKey(row, col)
      setEditingCells(prev => {
        const newSet = new Set(prev)
        newSet.add(cellKey)
        return newSet
      })
    }
  }

  // Selecting a structure should also clear text editing and range
  const selectStructure = (structure: Structure) => {
    setSelectedStructure(structure)
    setStartEditing(null)
    setSelectedRange(null)
    setEditingCells(new Set())
  }

  // Shared function to start structure dragging with precise offset calculation
  const startStructureDrag = (structure: Structure, e: React.MouseEvent, fallbackRow: number = 0, fallbackCol: number = 0) => {
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
  }

  // Sync cell values with structures
  React.useEffect(() => {
    setCellValues(prev => {
      const newMap = new Map()
      
      // First, preserve ALL editing cell values exactly as they are
      for (const cellKey of editingCells) {
        if (prev.has(cellKey)) {
          newMap.set(cellKey, prev.get(cellKey)!)
        }
      }
      
      // Add values from structures for ALL positions that have structures
      // (not just visible viewport) to ensure old cached values are cleared
      for (const [, structure] of structures) {
        const { startPosition, dimensions } = structure
        const endPosition = getEndPosition(startPosition, dimensions)
        
        for (let row = startPosition.row; row <= endPosition.row; row++) {
          for (let col = startPosition.col; col <= endPosition.col; col++) {
            const cellKey = getCellKey(row, col)
            
            // Skip if this cell is currently being edited - already handled above
            if (editingCells.has(cellKey)) {
              continue
            }
            
            // Only sync from structures for non-editing cells
            const structureValue = getCellValue(row, col, structures, positions)
            if (structureValue !== '') {
              newMap.set(cellKey, structureValue)
            }
          }
        }
      }
      
      return newMap
    })
  }, [structures, editingCells, positions])

  // Begin editing when startEditing is set
  React.useEffect(() => {
    if (startEditing) {
      const cellKey = getCellKey(startEditing.row, startEditing.col)
      setEditingCells(prev => {
        const newSet = new Set(prev)
        newSet.add(cellKey)
        return newSet
      })
      setStartEditing(null)
    }
  }, [startEditing, setStartEditing])

  const renderCellContent = (
    row: number, 
    col: number, 
    value: string, 
    isSelected: boolean, 
    structure?: Structure,
    isInRange?: boolean
  ) => {
    const cellKey = getCellKey(row, col)
    const isEditing = editingCells.has(cellKey)
    const cellValue = cellValues.has(cellKey) ? cellValues.get(cellKey)! : value

    return (
      <div 
        className={`w-full h-full relative`}
        onMouseEnter={() => handleMouseEnter(row, col)}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => handleRightClick(row, col, e)}
        onDoubleClick={() => handleCellDoubleClick(row, col)}
        onKeyDown={(e) => handleCellKeyDownGeneral(e, row, col)}
        tabIndex={isSelected ? 0 : -1}
      >
        {isEditing ? (
          <input
            type="text"
            value={cellValue}
            data-cell-key={cellKey}
            onChange={(e) => {
              setCellValues(prev => {
                const newMap = new Map(prev)
                newMap.set(cellKey, e.target.value)
                return newMap
              })
            }}
            onBlur={(e) => handleCellBlur(row, col, e)}
            onFocus={() => handleCellFocusChange(row, col)}
            onKeyDown={(e) => handleCellKeyDown(e, row, col)}
            className="w-full h-full outline-none px-2 py-1"
            style={{ 
              minWidth: '80px', 
              minHeight: '30px',
              backgroundColor: isInRange ? '#dbeafe' : 'transparent'
            }}
            autoFocus
          />
        ) : (
          <div 
            className={getCellClasses(row, col, structure)}
            style={getCellStyle(row, col, structure, isInRange)}
            title={structure?.name ? `${structure.type}: ${structure.name}` : undefined}
          >
            {cellValue || '\u00A0'}
          </div>
        )}
      </div>
    )
  }

  // Handle structure name editing
  const handleStructureNameDoubleClick = (structure: Structure) => {
    setEditingStructureName(structure.id)
    setEditingNameValue(structure.name || '')
  }

  const handleStructureNameChange = (value: string) => {
    setEditingNameValue(value)
  }

  const handleStructureNameSubmit = () => {
    if (editingStructureName) {
      // Update the structure name (or remove it if empty)
      setStructures((prev: StructureMap) => {
        const newStructures = new Map<string, Structure>(prev)
        const structure = newStructures.get(editingStructureName)
        
        if (structure) {
          const trimmedName = editingNameValue.trim()
          const updatedStructure = { 
            ...structure, 
            name: trimmedName || undefined  // Set to undefined if empty to remove the name
          }
          
          // Update the main structure
          newStructures.set(editingStructureName, updatedStructure)
          
          // Update selected structure if it's the same one
          if (selectedStructure && selectedStructure.id === structure.id) {
            selectStructure(updatedStructure)
          }
        }
        
        return newStructures
      })
    }
    
    setEditingStructureName(null)
    setEditingNameValue('')
  }

  const handleStructureNameCancel = () => {
    setEditingStructureName(null)
    setEditingNameValue('')
  }

  // Event handlers
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    setScrollTop(target.scrollTop)
    setScrollLeft(target.scrollLeft)
  }

  const handleCellFocus = (row: number, col: number) => {
    setSelectedRange({ start: { row, col }, end: { row, col } })
  }

  const handleCellEnterPress = (row: number, col: number) => {
    const nextRow = row + 1
    if (nextRow < MAX_ROWS) {
      setSelectedRange({ start: { row: nextRow, col }, end: { row: nextRow, col } })
      setStartEditing({ row: nextRow, col })
    }
  }

  const handleArrowKeyNavigation = (row: number, col: number, direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => {
    const { row: newRow, col: newCol } = getNextCell(row, col, direction)
    setSelectedRange({ start: { row: newRow, col: newCol }, end: { row: newRow, col: newCol } })
    setStartEditing({ row: newRow, col: newCol })
  }

  const handleMouseDown = (row: number, col: number, e: React.MouseEvent) => {
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
  }

  const handleMouseEnter = (row: number, col: number) => {
    if (isDraggingSheetHeader && sheetHeaderDragStart) {
      setSelectedRange({
        start: sheetHeaderDragStart,
        end: { row, col }
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragStart(null)
  }

  const handleRightClick = (_row: number, _col: number, e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleColumnHeaderClick = (row: number, col: number) => {
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
  }

  const handleColumnHeaderMouseDown = (row: number, col: number, e: React.MouseEvent) => {
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
  }

  const handleHeaderHover = (row: number, col: number, isEntering: boolean) => {
    if (isEntering && isTableHeader(row, col, structures, positions)) {
      const structure = getStructureAtPosition(row, col, positions, structures)
      if (structure && structure.type === 'table') {
        const table = structure as any
        const headerLevel = getHeaderLevel(row, table)
        
        if (headerLevel >= 0) {
          // Show button to the right of the rightmost cell
          setHoveredHeaderCell({ row, col: col + 1 })
          setShowAddColumnButton(true)
        }
      }
    } else if (!isEntering) {
      setHoveredHeaderCell(null)
      setShowAddColumnButton(false)
    }
  }

  const handleAddTableColumn = (tableId: string, _insertAfterCol: number, position: 'left' | 'right') => {
    // Find the table structure by ID
    const table = structures.get(tableId)
    
    if (!table || table.type !== 'table') return
    
    const tableStructure = table as TableStructure
    
    // Update table dimensions
    const newDimensions = { 
      rows: tableStructure.dimensions.rows, 
      cols: tableStructure.dimensions.cols + 1 
    }
    
    // Calculate new table positions based on insert position
    let newStartPosition = { ...tableStructure.startPosition }
    
    if (position === 'left') {
      // Adding to the left: move start position left
      newStartPosition.col = tableStructure.startPosition.col - 1
    }
    // For adding to the right, start position stays the same
    
    // Update cellIds array to accommodate the new column
    const newCellIds: (string | null)[][] = []
    for (let r = 0; r < tableStructure.dimensions.rows; r++) {
      const row: (string | null)[] = []
      for (let c = 0; c < newDimensions.cols; c++) {
        if (position === 'left' && c === 0) {
          // Insert null for new column at the beginning
          row.push(null)
        } else if (position === 'right' && c === newDimensions.cols - 1) {
          // Insert null for new column at the end
          row.push(null)
        } else {
          // Copy existing cell IDs, adjusting for insertion
          const sourceCol = position === 'left' ? c - 1 : c
          if (tableStructure.cellIds && tableStructure.cellIds[r] && sourceCol >= 0 && sourceCol < tableStructure.cellIds[r].length) {
            row.push(tableStructure.cellIds[r][sourceCol])
          } else {
            row.push(null)
          }
        }
      }
      newCellIds.push(row)
    }
    
    // Update table structure
    const updatedTable = {
      ...tableStructure,
      dimensions: newDimensions,
      startPosition: newStartPosition,
      cellIds: newCellIds
    }
    
    // Update the table structure
    setStructures((prev: StructureMap) => {
      const newStructures = new Map(prev)
      newStructures.set(tableStructure.id, updatedTable)
      return newStructures
    })
    
    // Update selected structure if it's the same table
    if (selectedStructure && selectedStructure.id === tableStructure.id) {
      selectStructure(updatedTable)
    }
  }

  const handleAddArrayColumn = (arrayId: string, _insertAfterCol: number, position: 'left' | 'right') => { // TODO: abstract column and row additions
    // Find the array structure by ID
    const array = structures.get(arrayId)
    
    if (!array || array.type !== 'array') return
    
    const arrayStructure = array as ArrayStructure
    
    // Calculate new array dimensions based on insert position
    let newStartPosition = { ...arrayStructure.startPosition }
    let newDimensions = { ...arrayStructure.dimensions }
    
    if (position === 'left') {
      // Adding to the left: move start position left
      newStartPosition.col = arrayStructure.startPosition.col - 1
    }
    // For adding to the right, start position stays the same
    
    // Increase column count
    newDimensions.cols += 1
    
    // Update cellIds array to accommodate the new column
    const newCellIds: (string | null)[] = []
    for (let i = 0; i < newDimensions.cols; i++) {
      if (position === 'left' && i === 0) {
        // Insert null for new column at the beginning
        newCellIds.push(null)
      } else if (position === 'right' && i === newDimensions.cols - 1) {
        // Insert null for new column at the end
        newCellIds.push(null)
      } else {
        // Copy existing cell IDs, adjusting for insertion
        const sourceIndex = position === 'left' ? i - 1 : i
        if (arrayStructure.cellIds && sourceIndex >= 0 && sourceIndex < arrayStructure.cellIds.length) {
          newCellIds.push(arrayStructure.cellIds[sourceIndex])
        } else {
          newCellIds.push(null)
        }
      }
    }
    
    // Update array structure
    const updatedArray = {
      ...arrayStructure,
      startPosition: newStartPosition,
      dimensions: newDimensions,
      cellIds: newCellIds
    }
    
    // Update the array structure
    setStructures((prev: StructureMap) => {
      const newStructures = new Map(prev)
      newStructures.set(arrayStructure.id, updatedArray)
      return newStructures
    })
    
    
    // Update selected structure if it's the same array
    if (selectedStructure && selectedStructure.id === arrayStructure.id) {
      selectStructure(updatedArray)
    }
  }

  const handleAddArrayRow = (arrayId: string, insertAfterRow: number, _position: 'bottom') => {
    // Find the array structure by ID
    const array = structures.get(arrayId)
    
    if (!array || array.type !== 'array') return
    
    const arrayStructure = array as ArrayStructure
    
    // Update array structure with increased row count
    const newDimensions = {
      rows: arrayStructure.dimensions.rows + 1,
      cols: arrayStructure.dimensions.cols
    }
    
    // Update cellIds array to accommodate the new row
    const newCellIds: (string | null)[] = []
    for (let i = 0; i < newDimensions.rows; i++) {
      if (i === newDimensions.rows - 1) {
        // Insert null for new row at the end
        newCellIds.push(null)
      } else {
        // Copy existing cell IDs
        if (arrayStructure.cellIds && i < arrayStructure.cellIds.length) {
          newCellIds.push(arrayStructure.cellIds[i])
        } else {
          newCellIds.push(null)
        }
      }
    }
    
    // Update array structure
    const updatedArray = {
      ...arrayStructure,
      dimensions: newDimensions,
      cellIds: newCellIds
    }
    
    // Update the array structure
    setStructures((prev: StructureMap) => {
      const newStructures = new Map(prev)
      newStructures.set(arrayStructure.id, updatedArray)
      return newStructures
    })
    
    
    // Update selected structure if it's the same array
    if (selectedStructure && selectedStructure.id === arrayStructure.id) {
      selectStructure(updatedArray)
    }
  }

  const handleAddRow = (structureId: string, insertAfterRow: number, position: 'top' | 'bottom') => {
    // Find the structure by ID
    const structure = structures.get(structureId)
    
    if (!structure) return
    
    if (structure.type === 'table') {
      return handleAddTableRow(structureId, insertAfterRow, position)
    } else if (structure.type === 'array') {
      return handleAddArrayRow(structureId, insertAfterRow, 'bottom')
    }
  }

  const handleAddColumn = (structureId: string, insertAfterCol: number, position: 'left' | 'right') => {
    // Find the structure by ID
    const structure = structures.get(structureId)
    
    if (!structure) return
    
    if (structure.type === 'table') {
      return handleAddTableColumn(structureId, insertAfterCol, position)
    } else if (structure.type === 'array') {
      return handleAddArrayColumn(structureId, insertAfterCol, position)
    }
  }

  const handleAddTableRow = (tableId: string, insertAfterRow: number, position: 'top' | 'bottom') => {
    // Find the table structure by ID
    const table = structures.get(tableId)
    
    if (!table || table.type !== 'table') return
    
    const tableStructure = table as TableStructure
    
    // Update table dimensions
    const newDimensions = { 
      rows: tableStructure.dimensions.rows + 1, 
      cols: tableStructure.dimensions.cols
    }
    
    // Update cellIds array to accommodate the new row
    const newCellIds: (string | null)[][] = []
    for (let r = 0; r < newDimensions.rows; r++) {
      if ((position === 'bottom' && r === newDimensions.rows - 1) || 
          (position === 'top' && r === 0)) {
        // Insert row of nulls for new row
        const newRow: (string | null)[] = new Array(newDimensions.cols).fill(null)
        newCellIds.push(newRow)
      } else {
        // Copy existing row, adjusting for insertion
        const sourceRow = position === 'top' ? r - 1 : r
        if (tableStructure.cellIds && sourceRow >= 0 && sourceRow < tableStructure.cellIds.length) {
          newCellIds.push([...tableStructure.cellIds[sourceRow]])
        } else {
          const newRow: (string | null)[] = new Array(newDimensions.cols).fill(null)
          newCellIds.push(newRow)
        }
      }
    }
    
    // Update table structure
    const updatedTable = {
      ...tableStructure,
      dimensions: newDimensions,
      cellIds: newCellIds
    }
    
    // Update the table structure
    setStructures((prev: StructureMap) => {
      const newStructures = new Map(prev)
      newStructures.set(tableStructure.id, updatedTable)
      return newStructures
    })
    
    
    // Update selected structure if it's the same table
    if (selectedStructure && selectedStructure.id === tableStructure.id) {
      selectStructure(updatedTable)
    }
  }

  const handleResizeMouseDown = (type: 'column' | 'row', index: number, e: React.MouseEvent) => {
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
  }

  // Handle structure resize mouse down
  const handleStructureResizeMouseDown = (direction: 'left' | 'right' | 'top' | 'bottom' | 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br', e: React.MouseEvent) => {
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
  }

  // Global keydown event handler for column header editing
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
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
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [selectedRange, selectedColumn, isDraggingColumn, isResizingSheetHeader, isResizingStructure, isDraggingStructure, editingCells, structures, setCellValues, setEditingCells, setSelectedRange, setStructures])

  // Global keydown event handler for Enter and Backspace behaviors
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
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
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [selectedRange, selectedStructure, editingCells, isDraggingColumn, isResizingSheetHeader, isResizingStructure, isDraggingStructure, structures, onDeleteStructure])

  // Global mouse event handlers for resizing and dragging
  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
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
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      
      // Handle structure dragging
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

      // Handle sheet header resizing
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

      // Handle column drag detection and real-time reordering
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
              // For tables, column reordering is handled through the position map
              // No explicit array manipulation needed with the new structure
              
              // TODO Update each array in the table
              // for (const array of tableArrays) {
              //   const arrayCells = getArrayCells(array.id, structures)
                
              //   if (arrayCells.length > currentColumnIndex && arrayCells.length > targetColumnIndex) {
              //     // Create new cellIds array with reordered cells
              //     const newCellIds = [...array.cellIds]
              //     const sourceCellId = newCellIds[currentColumnIndex]
              //     newCellIds.splice(currentColumnIndex, 1)
              //     newCellIds.splice(targetColumnIndex, 0, sourceCellId)
                  
              //     // Update the array structure
              //     setStructures((prev: StructureMap) => {
              //       const newStructures = new Map(prev)
              //       const updatedArray = {
              //         ...array,
              //         cellIds: newCellIds
              //       }
              //       newStructures.set(array.id, updatedArray)
              //       return newStructures
              //     })
              //   }
              // }
              
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

      // Handle structure resizing
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
        
        // Calculate new dimensions
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
    }

    document.addEventListener('mouseup', handleGlobalMouseUp)
    document.addEventListener('mousemove', handleGlobalMouseMove)
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [
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
    selectedStructure,
    isDraggingStructure,
    draggedStructure,
    dragOffset,
    dropTarget,
    showConflictDialog,
    isDraggingColumn,
    draggedColumn,
    columnDragStartX,
    columnDropTarget,
    structures,
    scrollLeft,
    scrollTop,
    columnWidths,
    rowHeights,
    containerRef,
    setIsDragging,
    setDragStart,
    setIsResizingSheetHeader,
    setSheetHeaderResizeType,
    setSheetHeaderResizeIndex,
    setIsResizingStructure,
    setStructureResizeDirection,
    setStructureResizeStartDimensions,
    setColumnWidths,
    setRowHeights,
    setStructures,
    setSelectedStructure,
    setSelectedColumn,
    setIsDraggingStructure,
    setDraggedStructure,
    setDragOffset,
    setDropTarget,
    setShowConflictDialog,
    setConflictDialogData,
    setIsDraggingColumn,
    setDraggedColumn,
    setColumnDragStartX,
    setColumnDropTarget,
  ])

  // Render structure overlays
  const renderStructureOverlays = () => {
    const overlays = []
    const processedStructures = new Set<string>()

    for (const [key, structure] of structures) {
      if (processedStructures.has(key)) continue

      let startPosition, endPosition
      startPosition = structure.startPosition
      endPosition = getEndPosition(structure.startPosition, structure.dimensions)
      
      if (endPosition.row >= startRow && startPosition.row < endRow &&
          endPosition.col >= startCol && startPosition.col < endCol) {
        
        const overlayLeft = getColumnPosition(startPosition.col, columnWidths)
        const overlayTop = getRowPosition(startPosition.row, rowHeights)
        
        let overlayWidth = 0
        for (let c = startPosition.col; c <= endPosition.col; c++) {
          overlayWidth += getColumnWidth(c, columnWidths)
        }
        
        let overlayHeight = 0
        for (let r = startPosition.row; r <= endPosition.row; r++) {
          overlayHeight += getRowHeight(r, rowHeights)
        }

        // Check if this structure is selected
        const isSelected = selectedStructure && selectedStructure.id === structure.id

        // Use subtle gray borders that integrate with the grid
        const borderColor = structure.type === 'cell' ? CELL_COLOR.BORDER :
                           structure.type === 'array' ? ARRAY_COLOR.BORDER : TABLE_COLOR.BORDER
        const borderWidth = isSelected ? 'border-3' : structure.type === 'cell' ? '' : 'border-2' // Don't give cells borders until they're selected

        overlays.push(
          <div
            key={`overlay-${key}`}
            className={`absolute ${borderWidth} ${borderColor}`}
            style={{
              left: overlayLeft,
              top: overlayTop,
              width: overlayWidth,
              height: overlayHeight,
              zIndex: isSelected ? Z_INDEX.STRUCTURE_OVERLAY + 1 : Z_INDEX.STRUCTURE_OVERLAY,
              pointerEvents: 'none' // Don't intercept clicks - let them pass through to cells
            }}
            title={structure.name ? `${structure.type}: ${structure.name}` : structure.type}
            onMouseEnter={() => {
              // Set hovered structure when hovering over the entire structure overlay
              setHoveredStructure(structure)
            }}
            onMouseLeave={() => {
              // Clear hovered structure when leaving the structure overlay
              setHoveredStructure(null)
            }}
          />
        )

        // Add clickable border areas for structure selection and dragging
        const borderWidth_px = isSelected ? 3 : (structure.type === 'cell' ? 1 : 2)
        
        // Top border
        overlays.push(
          <div
            key={`border-top-${key}`}
            className="absolute cursor-move"
            style={{
              left: overlayLeft,
              top: overlayTop,
              width: overlayWidth,
              height: borderWidth_px,
              zIndex: isSelected ? Z_INDEX.STRUCTURE_OVERLAY + 2 : Z_INDEX.STRUCTURE_OVERLAY + 1,
              pointerEvents: 'auto'
            }}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedColumn(null)
              if (!selectedStructure || selectedStructure.id !== structure.id) {
                selectStructure(structure)
                setStartEditing(null)
                setSelectedRange(null)
              }
            }}
            onMouseDown={(e) => {
              if (e.button !== 0) return
              startStructureDrag(structure, e, 0, 0)
            }}
          />
        )
        
        // Bottom border
        overlays.push(
          <div
            key={`border-bottom-${key}`}
            className="absolute cursor-move"
            style={{
              left: overlayLeft,
              top: overlayTop + overlayHeight - borderWidth_px,
              width: overlayWidth,
              height: borderWidth_px,
              zIndex: isSelected ? Z_INDEX.STRUCTURE_OVERLAY + 2 : Z_INDEX.STRUCTURE_OVERLAY + 1,
              pointerEvents: 'auto'
            }}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedColumn(null)
              if (!selectedStructure || selectedStructure.id !== structure.id) {
                selectStructure(structure)
                setStartEditing(null)
                setSelectedRange(null)
              }
            }}
            onMouseDown={(e) => {
              if (e.button !== 0) return
              startStructureDrag(structure, e, endPosition.row - startPosition.row, 0)
            }}
          />
        )
        
        // Left border
        overlays.push(
          <div
            key={`border-left-${key}`}
            className="absolute cursor-move"
            style={{
              left: overlayLeft,
              top: overlayTop + borderWidth_px,
              width: borderWidth_px,
              height: overlayHeight - 2 * borderWidth_px,
              zIndex: isSelected ? Z_INDEX.STRUCTURE_OVERLAY + 2 : Z_INDEX.STRUCTURE_OVERLAY + 1,
              pointerEvents: 'auto'
            }}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedColumn(null)
              if (!selectedStructure || selectedStructure.id !== structure.id) {
                selectStructure(structure)
                setStartEditing(null)
                setSelectedRange(null)
              }
            }}
            onMouseDown={(e) => {
              if (e.button !== 0) return
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
                setDragOffset({ row: 0, col: 0 })
              }
              
              if (!selectedStructure || selectedStructure.id !== structure.id) {
                selectStructure(structure)
                setStartEditing(null)
                setSelectedRange(null)
              }
            }}
          />
        )
        
        // Right border
        overlays.push(
          <div
            key={`border-right-${key}`}
            className="absolute cursor-move"
            style={{
              left: overlayLeft + overlayWidth - borderWidth_px,
              top: overlayTop + borderWidth_px,
              width: borderWidth_px,
              height: overlayHeight - 2 * borderWidth_px,
              zIndex: isSelected ? Z_INDEX.STRUCTURE_OVERLAY + 2 : Z_INDEX.STRUCTURE_OVERLAY + 1,
              pointerEvents: 'auto'
            }}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedColumn(null)
              if (!selectedStructure || selectedStructure.id !== structure.id) {
                selectStructure(structure)
                setStartEditing(null)
                setSelectedRange(null)
              }
            }}
            onMouseDown={(e) => {
              if (e.button !== 0) return
              startStructureDrag(structure, e, 0, endPosition.col - startPosition.col)
            }}
          />
        )

        // Add invisible resize areas for selected structures
        if (isSelected) {
          const edgeWidth = 4 // Width of the draggable edge area
          
          // For arrays, only show resize handles for the direction they can expand
          const isArray = structure.type === 'array'
          const arrayDirection = isArray ? (structure as ArrayStructure).direction : null
          
          // Left edge resize area - show for tables or horizontal arrays
          if (!isArray || arrayDirection === 'horizontal') {
            overlays.push(
              <div
                key={`resize-left-${key}`}
                className="absolute cursor-ew-resize"
                style={{
                  left: overlayLeft,
                  top: overlayTop,
                  width: edgeWidth,
                  height: overlayHeight,
                  zIndex: Z_INDEX.STRUCTURE_RESIZE_HANDLE,
                  pointerEvents: 'auto'
                }}
                onMouseDown={(e) => handleStructureResizeMouseDown('left', e)}
                title="Resize horizontally"
              />
            )
          }
          
          // Right edge resize area - show for tables or horizontal arrays
          if (!isArray || arrayDirection === 'horizontal') {
            overlays.push(
              <div
                key={`resize-right-${key}`}
                className="absolute cursor-ew-resize"
                style={{
                  left: overlayLeft + overlayWidth - edgeWidth,
                  top: overlayTop,
                  width: edgeWidth,
                  height: overlayHeight,
                  zIndex: Z_INDEX.STRUCTURE_RESIZE_HANDLE,
                  pointerEvents: 'auto'
                }}
                onMouseDown={(e) => handleStructureResizeMouseDown('right', e)}
                title="Resize horizontally"
              />
            )
          }
          
          // Top edge resize area - show for tables or vertical arrays
          if (!isArray || arrayDirection === 'vertical') {
            overlays.push(
              <div
                key={`resize-top-${key}`}
                className="absolute cursor-ns-resize"
                style={{
                  left: overlayLeft,
                  top: overlayTop,
                  width: overlayWidth,
                  height: edgeWidth,
                  zIndex: Z_INDEX.STRUCTURE_RESIZE_HANDLE,
                  pointerEvents: 'auto'
                }}
                onMouseDown={(e) => handleStructureResizeMouseDown('top', e)}
                title="Resize vertically"
              />
            )
          }
          
          // Bottom edge resize area - show for tables or vertical arrays
          if (!isArray || arrayDirection === 'vertical') {
            overlays.push(
              <div
                key={`resize-bottom-${key}`}
                className="absolute cursor-ns-resize"
                style={{
                  left: overlayLeft,
                  top: overlayTop + overlayHeight - edgeWidth,
                  width: overlayWidth,
                  height: edgeWidth,
                  zIndex: Z_INDEX.STRUCTURE_RESIZE_HANDLE,
                  pointerEvents: 'auto'
                }}
                onMouseDown={(e) => handleStructureResizeMouseDown('bottom', e)}
                title="Resize vertically"
              />
            )
          }
          
          // Corner resize areas - only show for tables (arrays can't resize in both directions)
          if (!isArray) {
            // Top-left corner
            overlays.push(
              <div
                key={`resize-corner-tl-${key}`}
                className="absolute cursor-nw-resize"
                style={{
                  left: overlayLeft,
                  top: overlayTop,
                  width: edgeWidth,
                  height: edgeWidth,
                  zIndex: Z_INDEX.STRUCTURE_RESIZE_HANDLE + 1, // Higher priority than edges
                  pointerEvents: 'auto'
                }}
                onMouseDown={(e) => handleStructureResizeMouseDown('corner-tl', e)}
                title="Resize both directions"
              />
            )
            
            // Top-right corner
            overlays.push(
              <div
                key={`resize-corner-tr-${key}`}
                className="absolute cursor-ne-resize"
                style={{
                  left: overlayLeft + overlayWidth - edgeWidth,
                  top: overlayTop,
                  width: edgeWidth,
                  height: edgeWidth,
                  zIndex: Z_INDEX.STRUCTURE_RESIZE_HANDLE + 1, // Higher priority than edges
                  pointerEvents: 'auto'
                }}
                onMouseDown={(e) => handleStructureResizeMouseDown('corner-tr', e)}
                title="Resize both directions"
              />
            )
            
            // Bottom-left corner
            overlays.push(
              <div
                key={`resize-corner-bl-${key}`}
                className="absolute cursor-sw-resize"
                style={{
                  left: overlayLeft,
                  top: overlayTop + overlayHeight - edgeWidth,
                  width: edgeWidth,
                  height: edgeWidth,
                  zIndex: Z_INDEX.STRUCTURE_RESIZE_HANDLE + 1, // Higher priority than edges
                  pointerEvents: 'auto'
                }}
                onMouseDown={(e) => handleStructureResizeMouseDown('corner-bl', e)}
                title="Resize both directions"
              />
            )
            
            // Bottom-right corner
            overlays.push(
              <div
                key={`resize-corner-br-${key}`}
                className="absolute cursor-nw-resize"
                style={{
                  left: overlayLeft + overlayWidth - edgeWidth,
                  top: overlayTop + overlayHeight - edgeWidth,
                  width: edgeWidth,
                  height: edgeWidth,
                  zIndex: Z_INDEX.STRUCTURE_RESIZE_HANDLE + 1, // Higher priority than edges
                  pointerEvents: 'auto'
                }}
                onMouseDown={(e) => handleStructureResizeMouseDown('corner-br', e)}
                title="Resize both directions"
              />
            )
          }
        }

        // Add invisible hover areas for add buttons when this structure is selected
        if (isSelected && (structure.type === 'table' || structure.type === 'array')) {
          const buttonWidth = 20
          
          // For arrays, only show buttons for the direction they can expand
          const isArray = structure.type === 'array'
          const arrayDirection = isArray ? (structure as ArrayStructure).direction : null
          
          // Left edge hover area - show for tables or horizontal arrays
          if (startPosition.col > 0 && (!isArray || arrayDirection === 'horizontal')) {
            overlays.push(
              <div
                key={`add-hover-left-${key}`}
                className="absolute"
                style={{
                  left: overlayLeft - buttonWidth,
                  top: overlayTop,
                  width: buttonWidth,
                  height: overlayHeight,
                  zIndex: Z_INDEX.STRUCTURE_OVERLAY + 15,
                  pointerEvents: 'auto'
                }}
                onMouseEnter={() => {
                  setHoveredAddButton({
                    type: 'column',
                    position: 'left',
                    structureId: structure.id,
                    insertIndex: startPosition.col,
                    x: overlayLeft - buttonWidth,
                    y: overlayTop
                  })
                }}
                onMouseLeave={() => setHoveredAddButton(null)}
              />
            )
          }
          
          // Right edge hover area - show for tables or horizontal arrays
          if (endPosition.col < 25 && (!isArray || arrayDirection === 'horizontal')) { // 26 columns total (0-25)
            overlays.push(
              <div
                key={`add-hover-right-${key}`}
                className="absolute"
                style={{
                  left: overlayLeft + overlayWidth,
                  top: overlayTop,
                  width: buttonWidth,
                  height: overlayHeight,
                  zIndex: Z_INDEX.STRUCTURE_OVERLAY + 15,
                  pointerEvents: 'auto'
                }}
                onMouseEnter={() => {
                  setHoveredAddButton({
                    type: 'column',
                    position: 'right',
                    structureId: structure.id,
                    insertIndex: endPosition.col,
                    x: overlayLeft + overlayWidth,
                    y: overlayTop
                  })
                }}
                onMouseLeave={() => setHoveredAddButton(null)}
              />
            )
          }
          
          // Bottom edge hover area - show for tables or vertical arrays
          if (endPosition.row < MAX_ROWS - 1 && (!isArray || arrayDirection === 'vertical')) {
            overlays.push(
              <div
                key={`add-hover-bottom-${key}`}
                className="absolute"
                style={{
                  left: overlayLeft,
                  top: overlayTop + overlayHeight,
                  width: overlayWidth,
                  height: buttonWidth,
                  zIndex: Z_INDEX.STRUCTURE_OVERLAY + 15,
                  pointerEvents: 'auto'
                }}
                onMouseEnter={() => {
                  setHoveredAddButton({
                    type: 'row',
                    position: 'bottom',
                    structureId: structure.id,
                    insertIndex: endPosition.row,
                    x: overlayLeft,
                    y: overlayTop + overlayHeight
                  })
                }}
                onMouseLeave={() => setHoveredAddButton(null)}
              />
            )
          }
        }

        // Mark this structure as processed
        processedStructures.add(structure.id)
      }
    }

    return overlays
  }

  // Render column selection overlays
  const renderColumnSelectionOverlays = () => {
    if (!selectedColumn || !selectedColumn.tableId) return []

    const overlays = []
    
    // Find the table structure for the selected column by ID
    const tableStructure = structures.get(selectedColumn.tableId)
    
    if (tableStructure && tableStructure.type === 'table') {
      const table = tableStructure as any
      const selectedColIndex = table.startPosition.col + selectedColumn.columnIndex
      
      // Check if the selected column is visible in the current viewport
      if (selectedColIndex >= startCol && selectedColIndex < endCol) {
        const columnLeft = getColumnPosition(selectedColIndex, columnWidths)
        const columnWidth = getColumnWidth(selectedColIndex, columnWidths)
        
        // Calculate the full height of the table for this column
        const tableTop = getRowPosition(table.startPosition.row, rowHeights)
        let tableHeight = 0
        for (let r = table.startPosition.row; r <= getEndPosition(table.startPosition, table.dimensions).row; r++) {
          tableHeight += getRowHeight(r, rowHeights)
        }
        
        // Create the column selection overlay
        overlays.push(
          <div
            key={`column-selection-${selectedColIndex}`}
            className="absolute pointer-events-none border-3 border-green-700"
            style={{
              left: columnLeft,
              top: tableTop,
              width: columnWidth,
              height: tableHeight,
              zIndex: Z_INDEX.STRUCTURE_OVERLAY + 2 // Higher than structure overlays
            }}
            title={`Selected column ${selectedColumn.columnIndex + 1}`}
          />
        )
      }
    }

    return overlays
  }

  // Render structure name tabs
  const renderStructureNameTabs = () => {
    const tabs = []
    const processedStructures = new Set<string>()

    // Show name tab when structure is selected (for both named and unnamed structures)
    if (selectedStructure && !(selectedStructure.type === 'cell' && selectedStructure.name === undefined)) { // Exclude cells without names
      const startPosition = selectedStructure.startPosition
      const endPosition = getEndPosition(selectedStructure.startPosition, selectedStructure.dimensions)

      const overlayLeft = getColumnPosition(startPosition.col, columnWidths)
      const overlayTop = getRowPosition(startPosition.row, rowHeights)
      
      // Calculate structure width
      let structureWidth = 0
      for (let c = startPosition.col; c <= endPosition.col; c++) {
        structureWidth += getColumnWidth(c, columnWidths)
      }
      
      // Check if this structure is being edited
      const isEditing = editingStructureName === selectedStructure.id
      
      // Calculate tab dimensions - constrain to structure width
      const tabHeight = 24
      const tabPadding = 8
      const maxTabWidth = structureWidth
      
      // Determine what to display
      let displayText: string
      let isPrompt = false
      
      if (isEditing) {
        displayText = editingNameValue
      } else if (selectedStructure.name) {
        displayText = selectedStructure.name
      } else {
        displayText = `Add a name`
        isPrompt = true
      }
      
      const textWidth = displayText.length * 8 // Approximate character width
      const minTabWidth = 80 // Minimum tab width for usability
      const tabWidth = Math.min(Math.max(textWidth + tabPadding * 2, minTabWidth), maxTabWidth)
      
      // Position tab above the structure, extending from the top border
      const tabLeft = overlayLeft
      const tabTop = overlayTop - tabHeight
      
      // Choose tab color based on structure type (same for both named and unnamed structures)
      const tabBgColor = selectedStructure.type === 'cell' ? CELL_COLOR.TAB :
                        selectedStructure.type === 'array' ? ARRAY_COLOR.TAB : TABLE_COLOR.TAB
      const borderColor = selectedStructure.type === 'cell' ? CELL_COLOR.BORDER :
                         selectedStructure.type === 'array' ? ARRAY_COLOR.BORDER : TABLE_COLOR.BORDER


      tabs.push(
        <div
          key={`name-tab-selected-${selectedStructure.id}`}
          className={`absolute ${tabBgColor} text-white text-xs font-medium flex items-center justify-center border-t-2 border-l-2 border-r-2 ${borderColor} cursor-pointer`}
          style={{
            left: tabLeft,
            top: tabTop,
            width: tabWidth,
            height: tabHeight,
            zIndex: Z_INDEX.STRUCTURE_NAME_TAB,
            pointerEvents: 'auto'
          }}
          title={isPrompt ? `Click to add ${selectedStructure.type} name` : selectedStructure.name} // Show appropriate tooltip
          onClick={() => {
            if (!isEditing) {
              handleStructureNameDoubleClick(selectedStructure)
            }
          }}
          onDoubleClick={() => handleStructureNameDoubleClick(selectedStructure)}
        >
          {isEditing ? (
            <input
              type="text"
              value={editingNameValue}
              onChange={(e) => handleStructureNameChange(e.target.value)}
              onBlur={handleStructureNameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleStructureNameSubmit()
                } else if (e.key === 'Escape') {
                  handleStructureNameCancel()
                }
              }}
              autoFocus
              className="bg-transparent text-white text-xs font-medium outline-none border-none w-full text-center"
              style={{
                paddingLeft: tabPadding,
                paddingRight: tabPadding
              }}
            />
          ) : (
            <span 
              className={isPrompt ? 'italic' : ''}
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                paddingLeft: tabPadding,
                paddingRight: tabPadding
              }}
            >
              {displayText}
            </span>
          )}
        </div>
      )
      
      processedStructures.add(selectedStructure.id)
    }

    // Show name tab when structure is hovered (only if it has a name and is not already selected)
    if (hoveredStructure && hoveredStructure.name && (!selectedStructure || hoveredStructure.id !== selectedStructure.id)) {
      const startPosition = hoveredStructure.startPosition
      const endPosition = getEndPosition(hoveredStructure.startPosition, hoveredStructure.dimensions)

      const overlayLeft = getColumnPosition(startPosition.col, columnWidths)
      const overlayTop = getRowPosition(startPosition.row, rowHeights)
      
      // Calculate structure width
      let structureWidth = 0
      for (let c = startPosition.col; c <= endPosition.col; c++) {
        structureWidth += getColumnWidth(c, columnWidths)
      }
      
      // Calculate tab dimensions - constrain to structure width
      const tabHeight = 24
      const tabPadding = 8
      const maxTabWidth = structureWidth
      
      const displayText = hoveredStructure.name
      const textWidth = displayText.length * 8 // Approximate character width
      const minTabWidth = 80 // Minimum tab width for usability
      const tabWidth = Math.min(Math.max(textWidth + tabPadding * 2, minTabWidth), maxTabWidth)
      
      // Position tab above the structure, extending from the top border
      const tabLeft = overlayLeft
      const tabTop = overlayTop - tabHeight
      
      // Choose tab color based on structure type (same as selected structure tabs)
      const tabBgColor = hoveredStructure.type === 'cell' ? 'bg-gray-500' :
                        hoveredStructure.type === 'array' ? 'bg-blue-500' : 'bg-green-600'
      const borderColor = hoveredStructure.type === 'cell' ? 'border-gray-500' :
                         hoveredStructure.type === 'array' ? 'border-blue-500' : 'border-green-600'
      
      tabs.push(
        <div
          key={`name-tab-hovered-${hoveredStructure.id}`}
          className={`absolute ${tabBgColor} text-white text-xs font-medium flex items-center justify-center border-t-2 border-l-2 border-r-2 ${borderColor}`}
          style={{
            left: tabLeft,
            top: tabTop,
            width: tabWidth,
            height: tabHeight,
            zIndex: Z_INDEX.STRUCTURE_NAME_TAB - 1, // Lower than selected structure tab
            pointerEvents: 'none' // Don't interfere with hover detection
          }}
          title={hoveredStructure.name}
        >
          <span 
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              paddingLeft: tabPadding,
              paddingRight: tabPadding
            }}
          >
            {displayText}
          </span>
        </div>
      )
    }

    return tabs
  }

  // Render column headers
  const renderColumnHeaders = () => {
    const headers = []
    
    // Empty corner cell
    headers.push(
      <div
        key="corner"
        className="border border-gray-300 bg-gray-100 font-bold text-center sticky left-0 top-0"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: getHeaderWidth(),
          height: getHeaderHeight(),
          minWidth: getHeaderWidth(),
          minHeight: getHeaderHeight(),
          zIndex: Z_INDEX.STICKY_CORNER
        }}
      />
    )

    // Column headers
    for (let colIndex = startCol; colIndex < endCol; colIndex++) {
      headers.push(
        <div
          key={`col-header-${colIndex}`}
          className="border border-gray-300 bg-gray-100 font-bold text-center flex items-center justify-center sticky top-0 relative"
          style={{
            position: 'absolute',
            left: getColumnPosition(colIndex, columnWidths),
            top: 0,
            width: getColumnWidth(colIndex, columnWidths),
            height: getHeaderHeight(),
            minWidth: getColumnWidth(colIndex, columnWidths),
            minHeight: getHeaderHeight(),
            zIndex: Z_INDEX.HEADER
          }}
        >
          {COLUMN_LETTERS[colIndex]}
          {/* Column resize handle */}
          <div
            className="absolute right-0 top-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500"
            onMouseDown={(e) => handleResizeMouseDown('column', colIndex, e)}
            style={{
              marginRight: '-2px',
              zIndex: Z_INDEX.RESIZE_HANDLE
            }}
          />
        </div>
      )
    }
    return headers
  }

  // Check if a cell position is covered by a resized cell
  const isCellCoveredByResizedCell = (row: number, col: number): boolean => {
    for (const [, structure] of structures) {
      if (structure.type === 'cell') {
        const { startPosition, dimensions } = structure
        const endPosition = getEndPosition(startPosition, dimensions)
        const rows = endPosition.row - startPosition.row + 1
        const cols = endPosition.col - startPosition.col + 1
        if (rows > 1 || cols > 1) {
          // This is a resized cell
          if (row >= startPosition.row && row < startPosition.row + rows &&
              col >= startPosition.col && col < startPosition.col + cols &&
              !(row === startPosition.row && col === startPosition.col)) {
            // This position is covered by the resized cell (but not the top-left corner)
            return true
          }
        }
      }
    }
    return false
  }

  // Render visible rows
  const renderRows = () => {
    const rows = []
    for (let rowIndex = startRow; rowIndex < endRow; rowIndex++) {
      const cells = []
      
      // Row header
      cells.push(
        <div
          key={`row-header-${rowIndex}`}
          className="border border-gray-300 bg-gray-100 font-bold text-center flex items-center justify-center sticky left-0 relative"
          style={{
            position: 'absolute',
            left: 0,
            top: getRowPosition(rowIndex, rowHeights),
            width: getHeaderWidth(),
            height: getRowHeight(rowIndex, rowHeights),
            minWidth: getHeaderWidth(),
            minHeight: getRowHeight(rowIndex, rowHeights),
            zIndex: Z_INDEX.HEADER
          }}
        >
          {rowIndex + 1}
          {/* Row resize handle */}
          <div
            className="absolute bottom-0 left-0 w-full h-1 cursor-row-resize bg-transparent hover:bg-blue-500"
            onMouseDown={(e) => handleResizeMouseDown('row', rowIndex, e)}
            style={{
              marginBottom: '-2px',
              zIndex: Z_INDEX.RESIZE_HANDLE
            }}
          />
        </div>
      )

      // Data cells
      for (let colIndex = startCol; colIndex < endCol; colIndex++) {
        // Skip cells that are covered by resized cells
        if (isCellCoveredByResizedCell(rowIndex, colIndex)) {
          continue
        }

        const isSelected = selectedRange?.start.row === rowIndex && selectedRange?.start.col === colIndex && selectedRange?.end.row === rowIndex && selectedRange?.end.col === colIndex
        const isInRange = isCellInRange(rowIndex, colIndex, selectedRange)
        const structure = getStructureAtPosition(rowIndex, colIndex, positions, structures)
        
        let cellWidth = getColumnWidth(colIndex, columnWidths)
        let cellHeight = getRowHeight(rowIndex, rowHeights)
        
        // If this is a resized cell, calculate the total width and height
        if (structure && structure.type === 'cell') {
          const { startPosition, dimensions } = structure
          const endPosition = getEndPosition(startPosition, dimensions)
          const rows = endPosition.row - startPosition.row + 1
          const cols = endPosition.col - startPosition.col + 1
          if ((rows > 1 || cols > 1) && 
              rowIndex === structure.startPosition.row && 
              colIndex === structure.startPosition.col) {
            // This is the top-left corner of a resized cell - calculate total dimensions
            cellWidth = 0
            for (let c = 0; c < cols; c++) {
              cellWidth += getColumnWidth(colIndex + c, columnWidths)
            }
            cellHeight = 0
            for (let r = 0; r < rows; r++) {
              cellHeight += getRowHeight(rowIndex + r, rowHeights)
            }
          }
        }
        
        // Add green column borders for tables (but not individual cell selection borders)
        let borderClass = 'border border-gray-200'
        if (structure && structure.type === 'table') {
          borderClass = `border-l-1 border-r-1 border-t border-b ${TABLE_COLOR.BORDER} border-t-gray-200 border-b-gray-200`
        }

        cells.push(
          <div
            key={`cell-${rowIndex}-${colIndex}`}
            className={`${borderClass}`}
            style={{
              position: 'absolute',
              left: getColumnPosition(colIndex, columnWidths),
              top: getRowPosition(rowIndex, rowHeights),
              width: cellWidth,
              height: cellHeight,
              minWidth: cellWidth,
              minHeight: cellHeight,
              zIndex: structure && structure.type === 'cell' && (structure.dimensions.rows > 1 || structure.dimensions.cols > 1) ? Z_INDEX.MERGED_CELL : Z_INDEX.CELL,
            }}
            onMouseEnter={() => {
              handleMouseEnter(rowIndex, colIndex)
              if (isTableHeader(rowIndex, colIndex, structures, positions)) {
                handleHeaderHover(rowIndex, colIndex, true)
              }
              // Set hovered structure if this cell is part of a structure
              if (structure) {
                setHoveredStructure(structure)
              }
            }}
            onMouseLeave={() => {
              if (isTableHeader(rowIndex, colIndex, structures, positions)) {
                handleHeaderHover(rowIndex, colIndex, false)
              }
              // Clear hovered structure when leaving any cell
              setHoveredStructure(null)
            }}
            onClick={(e) => {
              if (isTableHeader(rowIndex, colIndex, structures, positions)) {
                e.stopPropagation()
                handleColumnHeaderClick(rowIndex, colIndex)
              }
            }}
            onMouseDown={(e) => {
              if (isTableHeader(rowIndex, colIndex, structures, positions)) {
                e.stopPropagation()
                handleColumnHeaderMouseDown(rowIndex, colIndex, e)
              } else {
                handleMouseDown(rowIndex, colIndex, e)
              }
            }}
          >
            {renderCellContent(
              rowIndex,
              colIndex,
              getCellValue(rowIndex, colIndex, structures, positions),
              isSelected,
              structure,
              isInRange
            )}
          </div>
        )
      }

      rows.push(...cells)
    }
    return rows
  }

  // Render add button overlay
  const renderAddButtons = () => {
    if (isResizingStructure || isDraggingStructure || isDraggingColumn || !hoveredAddButton) return null // Disable add buttons during dragging operations

    const { type, position, structureId, insertIndex } = hoveredAddButton
    
    // Find the structure to get its dimensions
    const structure = structures.get(structureId)
    if (!structure || (structure.type !== 'table' && structure.type !== 'array')) return null
    
    const structureData = structure as any
    const buttonWidth = 20
    
    // Calculate structure position and dimensions
    const structureLeft = getColumnPosition(structureData.startPosition.col, columnWidths)
    const structureTop = getRowPosition(structureData.startPosition.row, rowHeights)
    
    let structureWidth = 0
    for (let c = structureData.startPosition.col; c <= getEndPosition(structureData.startPosition, structureData.dimensions).col; c++) {
      structureWidth += getColumnWidth(c, columnWidths)
    }
    
    let structureHeight = 0
    for (let r = structureData.startPosition.row; r <= getEndPosition(structureData.startPosition, structureData.dimensions).row; r++) {
      structureHeight += getRowHeight(r, rowHeights)
    }

    let buttonLeft: number
    let buttonTop: number
    let buttonWidthFinal: number
    let buttonHeightFinal: number
    let buttonTitle: string

    if (type === 'column') {
      // Column buttons extend the full height of the structure
      buttonWidthFinal = buttonWidth
      buttonHeightFinal = structureHeight
      buttonTop = structureTop
      
      if (position === 'left') {
        buttonLeft = structureLeft - buttonWidth
        buttonTitle = 'Add column to the left'
      } else {
        buttonLeft = structureLeft + structureWidth
        buttonTitle = 'Add column to the right'
      }
    } else {
      // Row button extends the full width of the structure
      buttonWidthFinal = structureWidth
      buttonHeightFinal = buttonWidth
      buttonLeft = structureLeft
      buttonTop = structureTop + structureHeight
      buttonTitle = 'Add row below'
    }

    // Choose button color based on structure type
    const buttonColor = structure.type === 'array' ? 'bg-blue-500' : 'bg-green-600'

    return (
      <button
        className={`absolute ${buttonColor} bg-opacity-100 flex items-center justify-center text-white font-bold text-sm hover:bg-opacity-90 transition-all duration-200`}
        onMouseEnter={() => {
          // Maintain hover state when hovering over the button itself
          setHoveredAddButton({
            type,
            position,
            structureId,
            insertIndex,
            x: buttonLeft,
            y: buttonTop
          })
        }}
        onMouseLeave={() => {
          // Only clear hover state when leaving the button
          setHoveredAddButton(null)
        }}
        onClick={() => {
          if (type === 'column') {
            handleAddColumn(structureId, insertIndex, position as 'left' | 'right')
          } else {
            handleAddRow(structureId, insertIndex, 'bottom')
          }
          setHoveredAddButton(null)
        }}
        style={{
          left: buttonLeft,
          top: buttonTop,
          width: buttonWidthFinal,
          height: buttonHeightFinal,
          minWidth: buttonWidthFinal,
          minHeight: buttonHeightFinal,
          zIndex: Z_INDEX.STRUCTURE_OVERLAY + 20
        }}
        title={buttonTitle}
      >
        +
      </button>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="overflow-auto h-full w-full rounded-lg"
      style={{ position: 'relative' }}
      onScroll={handleScroll}
    >
      {/* Virtual container to enable scrolling */}
      <div
        style={{
          height: 1000 * 32 + 32, // MAX_ROWS * DEFAULT_CELL_HEIGHT + DEFAULT_HEADER_HEIGHT
          width: 26 * 82 + 52, // MAX_COLS * DEFAULT_CELL_WIDTH + DEFAULT_HEADER_WIDTH
          position: 'relative'
        }}
      >
        {/* Column headers */}
        {renderColumnHeaders()}
        
        {/* Rows and cells */}
        {renderRows()}
        
        {/* Structure overlays */}
        {renderStructureOverlays()}
        
        {/* Column selection overlays */}
        {renderColumnSelectionOverlays()}
        
        {/* Structure name tabs */}
        {renderStructureNameTabs()}
        
        {/* Drop target overlay for structure dragging */}
        {isDraggingStructure && dropTarget && draggedStructure && (
          <div
            className="absolute border-4 border-dashed border-blue-600 pointer-events-none"
            style={{
              left: getColumnPosition(dropTarget.col, columnWidths),
              top: getRowPosition(dropTarget.row, rowHeights),
              width: (() => {
                let width = 0
                for (let c = dropTarget.col; c < dropTarget.col + draggedStructure.dimensions.cols; c++) {
                  width += getColumnWidth(c, columnWidths)
                }
                return width
              })(),
              height: (() => {
                let height = 0
                for (let r = dropTarget.row; r < dropTarget.row + draggedStructure.dimensions.rows; r++) {
                  height += getRowHeight(r, rowHeights)
                }
                return height
              })(),
              zIndex: Z_INDEX.STRUCTURE_OVERLAY + 10
            }}
            title={`Drop ${draggedStructure.type} here`}
          />
        )}
        
        {/* Add buttons overlay */}
        {renderAddButtons()}
        

      </div>
    </div>
  )
}
