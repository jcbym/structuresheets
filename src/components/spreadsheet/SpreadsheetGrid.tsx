import React from 'react'
import { Structure, MergedCell, Position } from '../../types'
import { 
  calculateVisibleCols, 
  calculateVisibleRows, 
  getColumnPosition, 
  getRowPosition, 
  getColumnWidth, 
  getRowHeight, 
  shouldRenderCell, 
  getMergedCellContaining,
  isCellInRange,
  isTableHeader,
  getHeaderHeight,
  getHeaderWidth,
  getHeaderLevel,
  getStructureAtPosition,
  getNextCell,
  getStructureKey,
  getCellsInStructure,
  detectConflicts,
  moveStructureCells,
  moveStructurePosition
} from '../../utils'
import { COLUMN_LETTERS, Z_INDEX, MIN_CELL_SIZE, MAX_ROWS } from '../../constants'

interface SpreadsheetGridProps {
  // State
  cellData: Map<string, string>
  structures: Map<string, Structure>
  mergedCells: Map<string, MergedCell>
  selectedCell: {row: number, col: number} | null
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
  isResizingStructure: boolean
  structureResizeDirection: 'left' | 'right' | 'top' | 'bottom' | 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br' | null
  structureResizeStartDimensions: { rows: number, cols: number } | null
  structureResizeStartX: number
  structureResizeStartY: number
  isDraggingStructure: boolean
  draggedStructure: Structure | null
  dragOffset: Position | null
  dropTarget: Position | null
  showConflictDialog: boolean
  conflictDialogData: {
    targetPosition: Position
    conflictingCells: Array<{row: number, col: number, existingValue: string, newValue: string}>
  } | null
  
  // State setters
  setCellData: React.Dispatch<React.SetStateAction<Map<string, string>>>
  setStructures: React.Dispatch<React.SetStateAction<Map<string, Structure>>>
  setSelectedCell: React.Dispatch<React.SetStateAction<{row: number, col: number} | null>>
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
  setShowConflictDialog: React.Dispatch<React.SetStateAction<boolean>>
  setConflictDialogData: React.Dispatch<React.SetStateAction<{
    targetPosition: Position
    conflictingCells: Array<{row: number, col: number, existingValue: string, newValue: string}>
  } | null>>
  
  // Event handlers
  onCellUpdate: (row: number, col: number, value: string) => void
  
  // Container ref
  containerRef: React.RefObject<HTMLDivElement>
}

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  cellData,
  structures,
  mergedCells,
  selectedCell,
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
  isResizingStructure,
  structureResizeDirection,
  structureResizeStartDimensions,
  structureResizeStartX,
  structureResizeStartY,
  isDraggingStructure,
  draggedStructure,
  dragOffset,
  dropTarget,
  showConflictDialog,
  conflictDialogData,
  setIsResizingStructure,
  setStructureResizeDirection,
  setStructureResizeStartDimensions,
  setStructureResizeStartX,
  setStructureResizeStartY,
  setCellData,
  setStructures,
  setSelectedCell,
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
  setColumnWidths,
  setRowHeights,
  setIsDraggingStructure,
  setDraggedStructure,
  setDragOffset,
  setDropTarget,
  setShowConflictDialog,
  setConflictDialogData,
  onCellUpdate,
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
  
  // Cell editing state
  const [cellValues, setCellValues] = React.useState<Map<string, string>>(new Map())
  const [editingCells, setEditingCells] = React.useState<Set<string>>(new Set())

  // Cell rendering utilities
  const getCellKey = (row: number, col: number) => `${row}-${col}`
  
  const isHeaderCell = (row: number, col: number, structure?: Structure): boolean => {
    if (!structure || structure.type !== 'table') return false
    
    const table = structure as any
    const { startPosition } = table
    const headerRows = table.headerRows || 1
    const headerCols = table.headerCols || 1
    
    // Check if cell is within header row range
    const isInHeaderRows = (table.hasHeaderRow === true) && 
      row >= startPosition.row && 
      row < startPosition.row + headerRows
    
    // Check if cell is within header column range
    const isInHeaderCols = (table.hasHeaderCol === true) && 
      col >= startPosition.col && 
      col < startPosition.col + headerCols
    
    return isInHeaderRows || isInHeaderCols
  }

  const getCellClasses = (row: number, col: number, structure?: Structure, isMergedCell?: boolean): string => {
    let classes = 'w-full h-full px-2 py-1 cursor-cell flex items-center'
    
    if (structure && isHeaderCell(row, col, structure)) {
      classes += ' font-bold'
    }
    
    // Center text in merged cells
    if (isMergedCell) {
      classes += ' justify-center'
    }
    
    return classes
  }

  const getCellStyle = (row: number, col: number, structure?: Structure): React.CSSProperties => {
    const baseStyle: React.CSSProperties = { 
      width: '100%', 
      height: '100%',
    }
    
    if (structure && isHeaderCell(row, col, structure) && structure.type === 'table') {
      // Use green background to match table border color
      return { ...baseStyle, backgroundColor: '#00A63E', opacity: 0.8 }
    }
    
    // Add transparent background colors for structure types
    if (structure?.type === 'table') {
      return { ...baseStyle, backgroundColor: '#00A63E', opacity: 0.1 } // Transparent light green
    }
    
    if (structure?.type === 'array') {
      return { ...baseStyle, backgroundColor: '#2B7FFF', opacity: 0.1 } // Transparent light blue
    }
    
    return baseStyle
  }

  const getDisplay = (isSelected: boolean): string => {
    if (isSelected) {
      return 'bg-blue-100' // Selection border
    }
    return 'border-none' // No border for array/table cells (they get overlay borders)
  }

  const handleCellBlur = (row: number, col: number) => {
    const cellKey = getCellKey(row, col)
    const cellValue = cellValues.get(cellKey) || ''
    onCellUpdate(row, col, cellValue)
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

  // Sync cell values with cellData
  React.useEffect(() => {
    setCellValues(new Map(cellData))
  }, [cellData])

  // Begin editing when startEditing is set
  React.useEffect(() => {
    if (startEditing && selectedCell && 
        startEditing.row === selectedCell.row && 
        startEditing.col === selectedCell.col) {
      const cellKey = getCellKey(startEditing.row, startEditing.col)
      setEditingCells(prev => {
        const newSet = new Set(prev)
        newSet.add(cellKey)
        return newSet
      })
      setStartEditing(null)
    }
  }, [startEditing, selectedCell, setStartEditing])

  const renderCellContent = (
    row: number, 
    col: number, 
    value: string, 
    isSelected: boolean, 
    structure?: Structure, 
    isMergedCell?: boolean
  ) => {
    const cellKey = getCellKey(row, col)
    const isEditing = editingCells.has(cellKey)
    const cellValue = cellValues.get(cellKey) || value

    return (
      <div 
        className={`w-full h-full relative ${getDisplay(isSelected)}`}
        onMouseDown={(e) => handleMouseDown(row, col, e)}
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
            onChange={(e) => {
              setCellValues(prev => {
                const newMap = new Map(prev)
                newMap.set(cellKey, e.target.value)
                return newMap
              })
            }}
            onBlur={() => handleCellBlur(row, col)}
            onFocus={() => handleCellFocusChange(row, col)}
            onKeyDown={(e) => handleCellKeyDown(e, row, col)}
            className="w-full h-full outline-none px-2 py-1 bg-transparent"
            style={{ minWidth: '80px', minHeight: '30px' }}
            autoFocus
          />
        ) : (
          <div 
            className={getCellClasses(row, col, structure, isMergedCell)}
            style={getCellStyle(row, col, structure)}
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
      setStructures(prev => {
        const newStructures = new Map(prev)
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
            setSelectedStructure(updatedStructure)
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
    setSelectedCell({ row, col })
  }

  const handleCellEnterPress = (row: number, col: number) => {
    const nextRow = row + 1
    if (nextRow < MAX_ROWS) {
      setSelectedCell({ row: nextRow, col })
      setStartEditing({ row: nextRow, col })
    }
  }

  const handleArrowKeyNavigation = (row: number, col: number, direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => {
    const { row: newRow, col: newCol } = getNextCell(row, col, direction)
    setSelectedCell({ row: newRow, col: newCol })
    setStartEditing({ row: newRow, col: newCol })
  }

  const handleMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    if (e.button !== 0) return // Only handle left-click

    // Check if this is a table header - if so, don't handle mouse down here
    // Let the column header click handler take care of it
    if (isTableHeader(row, col, structures)) {
      return // Don't handle mouse down for table headers
    }

    // Check if the clicked cell is part of a structure
    const structure = getStructureAtPosition(row, col, structures)
    
    if (structure) {
      // Always clear column selection when clicking on any structure cell (including table cells)
      setSelectedColumn(null)
      
      // Start dragging immediately for any structure (selected or not)
      e.preventDefault()
      setIsDraggingStructure(true)
      setDraggedStructure(structure)
      setDragOffset({ 
        row: row - structure.startPosition.row, 
        col: col - structure.startPosition.col 
      })
      
      // Also select the structure if it wasn't already selected
      if (!selectedStructure || selectedStructure.id !== structure.id) {
        setSelectedStructure(structure)
        setSelectedCell(null)
        setStartEditing(null)
        setSelectedRange(null)
      }
      
      return
    } else {
      // Click on empty cell - clear all selections and select cell normally
      setSelectedStructure(null)
      setSelectedColumn(null) // Clear column selection when clicking outside tables
      setSelectedCell({ row, col })
      setStartEditing({ row, col }) // Start editing immediately for non-structure cells
      
      e.preventDefault()
      setIsDragging(true)
      setDragStart({ row, col })
      setSelectedRange(null)
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

  const handleRightClick = (row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleColumnHeaderClick = (row: number, col: number) => {
    // Check if this is a table header cell
    const structure = getStructureAtPosition(row, col, structures)
    if (structure && structure.type === 'table') {
      const table = structure as any
      const columnIndex = col - table.startPosition.col
      
      // Check if this column is already selected
      const isSameColumnSelected = selectedColumn &&
        selectedColumn.tableId === table.id &&
        selectedColumn.columnIndex === columnIndex
      
      if (isSameColumnSelected) {
        // Second click on already selected column - start editing the cell
        setSelectedCell({ row, col })
        setStartEditing({ row, col })
        // Keep both the column and table selected
      } else {
        // First click on column - select the column and table
        setSelectedColumn({ tableId: table.id, columnIndex })
        setSelectedStructure(table)
        setSelectedCell(null)
        setSelectedRange(null)
      }
    }
  }

  const handleHeaderHover = (row: number, col: number, isEntering: boolean) => {
    if (isEntering && isTableHeader(row, col, structures)) {
      const structure = getStructureAtPosition(row, col, structures)
      if (structure && structure.type === 'table') {
        const table = structure as any
        const headerLevel = getHeaderLevel(row, table)
        
        if (headerLevel >= 0) {
          // Check if this cell is part of a merged cell
          const mergedCell = mergedCells.get(`${row}-${col}`) || 
            Array.from(mergedCells.values()).find(mc => 
              row >= mc.startRow && row <= mc.endRow && 
              col >= mc.startCol && col <= mc.endCol
            )
          let rightmostCol = col
          
          if (mergedCell) {
            rightmostCol = mergedCell.endCol
          }
          
          // Show button to the right of the rightmost cell
          setHoveredHeaderCell({ row, col: rightmostCol + 1 })
          setShowAddColumnButton(true)
        }
      }
    } else if (!isEntering) {
      setHoveredHeaderCell(null)
      setShowAddColumnButton(false)
    }
  }

  const handleAddColumn = (tableRow: number, tableCol: number, insertAfterCol: number) => {
    // Find the table structure at the given position
    const structure = getStructureAtPosition(tableRow, tableCol, structures)
    
    if (!structure || structure.type !== 'table') return
    
    const table = structure as any
    const newDimensions = { 
      rows: table.dimensions.rows, 
      cols: table.dimensions.cols + 1 
    }
    
    // Update table structure
    const updatedTable = {
      ...table,
      dimensions: newDimensions,
      endPosition: {
        row: table.endPosition.row,
        col: table.endPosition.col + 1
      }
    }
    
    // Update the table structure
    setStructures(prev => {
      const newStructures = new Map(prev)
      newStructures.set(table.id, updatedTable)
      return newStructures
    })
    
    // Shift cell data for columns after the insertion point
    setCellData(prev => {
      const newData = new Map(prev)
      
      // Move data from right to left to avoid overwriting
      for (let r = table.startPosition.row; r <= table.endPosition.row; r++) {
        for (let c = table.endPosition.col; c > insertAfterCol; c--) {
          const oldKey = `${r}-${c}`
          const newKey = `${r}-${c + 1}`
          const value = newData.get(oldKey)
          if (value) {
            newData.set(newKey, value)
            newData.delete(oldKey)
          }
        }
      }
      
      return newData
    })
    
    // Hide the add column button
    setShowAddColumnButton(false)
    setHoveredHeaderCell(null)
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
    
    if (!selectedStructure || selectedStructure.type === 'cell' || selectedStructure.type === 'column') {
      return // Only allow resizing for arrays and tables
    }

    setIsResizingStructure(true)
    setStructureResizeDirection(direction)
    
    // Store both X and Y coordinates for corner resizing
    setStructureResizeStartX(e.clientX)
    setStructureResizeStartY(e.clientY)
    
    // Store the current dimensions
    if ('dimensions' in selectedStructure) {
      setStructureResizeStartDimensions(selectedStructure.dimensions)
    }
  }

  // Global mouse event handlers for resizing and dragging
  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      try {
        // Handle structure drag drop only if we have all required data and no conflict dialog
        if (isDraggingStructure && draggedStructure && dropTarget && !showConflictDialog) {
          const structureCells = getCellsInStructure(draggedStructure, cellData)
          const conflicts = detectConflicts(dropTarget, structureCells, cellData, draggedStructure)
          
          if (conflicts.length > 0) {
            // Show conflict dialog
            setShowConflictDialog(true)
            setConflictDialogData({
              targetPosition: dropTarget,
              conflictingCells: conflicts
            })
            // Don't clean up drag state yet - let conflict dialog handle it
            return
          } else {

            // No conflicts, proceed with move
            const newCellData = moveStructureCells(draggedStructure, dropTarget, cellData, false)
            setCellData(newCellData)
            
            // Update structure position
            const updatedStructure = moveStructurePosition(draggedStructure, dropTarget)
            setStructures(prev => {
              const newStructures = new Map(prev)
              newStructures.set(updatedStructure.id, updatedStructure)
              return newStructures
            })
            
            // Update selected structure
            setSelectedStructure(updatedStructure)
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
      }
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      // Don't handle mouse move if conflict dialog is showing
      if (showConflictDialog) {
        return
      }
      
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
        
        setDropTarget(newDropTarget)
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

      // Handle structure resizing
      if (isResizingStructure && structureResizeDirection && structureResizeStartDimensions && selectedStructure) {
        if (selectedStructure.type === 'cell' || selectedStructure.type === 'column') return

        // Calculate separate X and Y deltas for corner resizing
        const deltaX = e.clientX - structureResizeStartX
        const deltaY = e.clientY - structureResizeStartY
        
        // Calculate new dimensions based on resize direction
        let newRows = structureResizeStartDimensions.rows
        let newCols = structureResizeStartDimensions.cols
        
        if (structureResizeDirection === 'left' || structureResizeDirection === 'right' || structureResizeDirection.startsWith('corner-')) {
          // Calculate how many columns to add/remove based on pixel delta
          const avgColumnWidth = 82 // Default column width. TODO use actual column widths
          const columnDelta = Math.round(deltaX / avgColumnWidth)
          
          if (structureResizeDirection === 'left' || structureResizeDirection === 'corner-tl' || structureResizeDirection === 'corner-bl') {
            // For left edge/corners, dragging left (negative delta) means expanding (adding columns)
            // We need to invert the delta so negative becomes positive expansion
            newCols = Math.max(1, structureResizeStartDimensions.cols - columnDelta)
          } else {
            // For right edge/corners, positive delta means expanding
            newCols = Math.max(1, structureResizeStartDimensions.cols + columnDelta)
          }
        }
        
        if (structureResizeDirection === 'top' || structureResizeDirection === 'bottom' || structureResizeDirection.startsWith('corner-')) {
          // Calculate how many rows to add/remove based on pixel delta
          const avgRowHeight = 32 // Default row height
          const rowDelta = Math.round(deltaY / avgRowHeight)
          
          if (structureResizeDirection === 'top' || structureResizeDirection === 'corner-tl' || structureResizeDirection === 'corner-tr') {
            // For top edge/corners, dragging up (negative delta) means expanding (adding rows)
            // We need to invert the delta so negative becomes positive expansion
            newRows = Math.max(1, structureResizeStartDimensions.rows - rowDelta)
          } else {
            // For bottom edge/corners, positive delta means expanding
            newRows = Math.max(1, structureResizeStartDimensions.rows + rowDelta)
          }
        }

        // Only update if dimensions actually changed
        if (newRows !== selectedStructure.dimensions.rows || newCols !== selectedStructure.dimensions.cols) {
          const originalStartPosition = selectedStructure.startPosition
          const originalEndPosition = selectedStructure.endPosition
          
          // Calculate new start and end positions based on resize direction
          let newStartPosition = { ...originalStartPosition }
          let newEndPosition = { ...originalEndPosition }
          
          // Handle horizontal resizing
          if (structureResizeDirection === 'left' || structureResizeDirection === 'corner-tl' || structureResizeDirection === 'corner-bl') {
            // Expanding left: move start position left, keep end position
            const colDiff = newCols - selectedStructure.dimensions.cols
            newStartPosition.col = originalStartPosition.col - colDiff
            newEndPosition.col = originalEndPosition.col
          } else if (structureResizeDirection === 'right' || structureResizeDirection === 'corner-tr' || structureResizeDirection === 'corner-br') {
            // Expanding right: keep start position, move end position right
            newStartPosition.col = originalStartPosition.col
            newEndPosition.col = originalStartPosition.col + newCols - 1
          }
          
          // Handle vertical resizing
          if (structureResizeDirection === 'top' || structureResizeDirection === 'corner-tl' || structureResizeDirection === 'corner-tr') {
            // Expanding top: move start position up, keep end position
            const rowDiff = newRows - selectedStructure.dimensions.rows
            newStartPosition.row = originalStartPosition.row - rowDiff
            newEndPosition.row = originalEndPosition.row
          } else if (structureResizeDirection === 'bottom' || structureResizeDirection === 'corner-bl' || structureResizeDirection === 'corner-br') {
            // Expanding bottom: keep start position, move end position down
            newStartPosition.row = originalStartPosition.row
            newEndPosition.row = originalStartPosition.row + newRows - 1
          }

          // Create updated structure
          const updatedStructure = {
            ...selectedStructure,
            startPosition: newStartPosition,
            endPosition: newEndPosition,
            dimensions: { rows: newRows, cols: newCols }
          }

          // Update arrays for tables or cells for arrays
          if (selectedStructure.type === 'table') {
            const arrays = []
            for (let r = 0; r < newRows; r++) {
              const rowCells = []
              for (let c = 0; c < newCols; c++) {
                const cellRow = newStartPosition.row + r
                const cellCol = newStartPosition.col + c
                rowCells.push({
                  type: 'cell' as const,
                  id: `cell-${cellRow}-${cellCol}`,
                  startPosition: { row: cellRow, col: cellCol },
                  endPosition: { row: cellRow, col: cellCol },
                  value: cellData.get(`${cellRow}-${cellCol}`) || ''
                })
              }
              
              arrays.push({
                type: 'array' as const,
                id: `array-${newStartPosition.row + r}-${newStartPosition.col}`,
                startPosition: { row: newStartPosition.row + r, col: newStartPosition.col },
                endPosition: { row: newStartPosition.row + r, col: newStartPosition.col + newCols - 1 },
                cells: rowCells,
                dimensions: { rows: 1, cols: newCols }
              })
            }
            ;(updatedStructure as any).arrays = arrays
          } else if (selectedStructure.type === 'array') {
            const cells = []
            for (let r = 0; r < newRows; r++) {
              for (let c = 0; c < newCols; c++) {
                const cellRow = newStartPosition.row + r
                const cellCol = newStartPosition.col + c
                cells.push({
                  type: 'cell' as const,
                  id: `cell-${cellRow}-${cellCol}`,
                  startPosition: { row: cellRow, col: cellCol },
                  endPosition: { row: cellRow, col: cellCol },
                  value: cellData.get(`${cellRow}-${cellCol}`) || ''
                })
              }
            }
            ;(updatedStructure as any).cells = cells
          }

          // Update structures map
          setStructures(prev => {
            const newStructures = new Map(prev)
            newStructures.set(selectedStructure.id, updatedStructure)
            return newStructures
          })

          // Update selected structure
          setSelectedStructure(updatedStructure)
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
    cellData,
    isDraggingStructure,
    draggedStructure,
    dragOffset,
    dropTarget,
    showConflictDialog,
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
    setIsDraggingStructure,
    setDraggedStructure,
    setDragOffset,
    setDropTarget,
    setShowConflictDialog,
    setConflictDialogData,
    setCellData
  ])

  // Render merged cell overlays
  const renderMergedCellOverlays = () => {
    const overlays = []

    for (const [key, mergedCell] of mergedCells) {
      if (mergedCell.endRow >= startRow && mergedCell.startRow < endRow &&
          mergedCell.endCol >= startCol && mergedCell.startCol < endCol) {
        
        const overlayLeft = getColumnPosition(mergedCell.startCol, columnWidths)
        const overlayTop = getRowPosition(mergedCell.startRow, rowHeights)
        
        let overlayWidth = 0
        for (let c = mergedCell.startCol; c <= mergedCell.endCol; c++) {
          overlayWidth += getColumnWidth(c, columnWidths)
        }
        
        let overlayHeight = 0
        for (let r = mergedCell.startRow; r <= mergedCell.endRow; r++) {
          overlayHeight += getRowHeight(r, rowHeights)
        }

        overlays.push(
          <div
            key={`merged-overlay-${key}`}
            className="absolute pointer-events-none border-2 border-orange-500 bg-orange-50"
            style={{
              left: overlayLeft,
              top: overlayTop,
              width: overlayWidth,
              height: overlayHeight,
              zIndex: Z_INDEX.MERGED_CELL
            }}
            title={`Merged cell: ${mergedCell.value}`}
          />
        )
      }
    }

    return overlays
  }

  // Render structure overlays
  const renderStructureOverlays = () => {
    const overlays = []
    const processedStructures = new Set<string>()

    for (const [key, structure] of structures) {
      if (processedStructures.has(key)) continue

      let startPosition, endPosition
      if (structure.type === 'cell' || structure.type === 'column') {
        startPosition = endPosition = structure.startPosition
      } else {
        startPosition = structure.startPosition
        endPosition = structure.endPosition
      }
      
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

        const borderColor = structure.type === 'cell' ? 'border-black' :
                           structure.type === 'array' ? 'border-blue-500' : 'border-green-600'

        overlays.push(
          <div
            key={`overlay-${key}`}
            className={`absolute pointer-events-none ${isSelected ? `border-4 ${borderColor}` : `border-2 ${borderColor}`}`}
            style={{
              left: overlayLeft,
              top: overlayTop,
              width: overlayWidth,
              height: overlayHeight,
              zIndex: isSelected ? Z_INDEX.STRUCTURE_OVERLAY + 1 : Z_INDEX.STRUCTURE_OVERLAY
            }}
            title={structure.name ? `${structure.type}: ${structure.name}` : structure.type}
          />
        )

        // Remove the separate hover detector since we'll handle hover at the cell level

        // Add invisible resize areas for selected structures (arrays and tables only)
        if (isSelected && (structure.type === 'array' || structure.type === 'table')) {
          const edgeWidth = 4 // Width of the draggable edge area
          
          // Left edge resize area
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
          
          // Right edge resize area
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
          
          // Top edge resize area
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
          
          // Bottom edge resize area
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
          
          // Corner resize areas
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
        for (let r = table.startPosition.row; r <= table.endPosition.row; r++) {
          tableHeight += getRowHeight(r, rowHeights)
        }
        
        // Create the column selection overlay
        overlays.push(
          <div
            key={`column-selection-${selectedColIndex}`}
            className="absolute pointer-events-none border-4 border-green-700"
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
      const endPosition = selectedStructure.endPosition

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
      const tabBgColor = selectedStructure.type === 'cell' ? 'bg-black' :
                        selectedStructure.type === 'array' ? 'bg-blue-500' : 'bg-green-600'
      const borderColor = selectedStructure.type === 'cell' ? 'border-black' :
                         selectedStructure.type === 'array' ? 'border-blue-500' : 'border-green-600'
      
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
      const endPosition = hoveredStructure.endPosition

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
      
      // Choose tab color based on structure type
      const tabBgColor = hoveredStructure.type === 'cell' ? 'bg-black' :
                        hoveredStructure.type === 'array' ? 'bg-blue-500' : 'bg-green-600'
      const borderColor = hoveredStructure.type === 'cell' ? 'border-black' :
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
        if (!shouldRenderCell(rowIndex, colIndex, mergedCells)) {
          continue
        }

        const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex
        const isInRange = isCellInRange(rowIndex, colIndex, selectedRange)
        const structure = getStructureAtPosition(rowIndex, colIndex, structures)
        const mergedCell = getMergedCellContaining(rowIndex, colIndex, mergedCells)
        
        // Calculate cell dimensions for merged cells
        let cellWidth = getColumnWidth(colIndex, columnWidths)
        let cellHeight = getRowHeight(rowIndex, rowHeights)
        
        if (mergedCell) {
          cellWidth = 0
          for (let c = mergedCell.startCol; c <= mergedCell.endCol; c++) {
            cellWidth += getColumnWidth(c, columnWidths)
          }
          cellHeight = 0
          for (let r = mergedCell.startRow; r <= mergedCell.endRow; r++) {
            cellHeight += getRowHeight(r, rowHeights)
          }
        }
        
        // Add green column borders for tables (but not individual cell selection borders)
        let borderClass = 'border border-gray-300'
        if (structure && structure.type === 'table') {
          borderClass = 'border-l-1 border-r-1 border-t border-b border-l-green-600 border-r-green-600 border-t-gray-300 border-b-gray-300'
        }

        cells.push(
          <div
            key={`cell-${rowIndex}-${colIndex}`}
            className={`${borderClass} ${isInRange ? 'bg-blue-100' : ''} ${mergedCell ? 'bg-orange-50' : ''}`}
            style={{
              position: 'absolute',
              left: getColumnPosition(colIndex, columnWidths),
              top: getRowPosition(rowIndex, rowHeights),
              width: cellWidth,
              height: cellHeight,
              minWidth: cellWidth,
              minHeight: cellHeight,
              zIndex: mergedCell ? Z_INDEX.MERGED_CELL : Z_INDEX.CELL,
            }}
            onMouseEnter={() => {
              handleMouseEnter(rowIndex, colIndex)
              if (isTableHeader(rowIndex, colIndex, structures)) {
                handleHeaderHover(rowIndex, colIndex, true)
              }
              // Set hovered structure if this cell is part of a structure
              if (structure) {
                setHoveredStructure(structure)
              }
            }}
            onMouseLeave={() => {
              if (isTableHeader(rowIndex, colIndex, structures)) {
                handleHeaderHover(rowIndex, colIndex, false)
              }
              // Clear hovered structure when leaving any cell
              setHoveredStructure(null)
            }}
            onClick={(e) => {
              if (isTableHeader(rowIndex, colIndex, structures)) {
                e.stopPropagation()
                handleColumnHeaderClick(rowIndex, colIndex)
              }
            }}
          >
            {renderCellContent(
              rowIndex,
              colIndex,
              mergedCell ? mergedCell.value : cellData.get(`${rowIndex}-${colIndex}`) || '',
              isSelected,
              structure,
              !!mergedCell
            )}
          </div>
        )
      }

      rows.push(...cells)
    }
    return rows
  }

  // // Render add column button overlay
  // const renderAddColumnButton = () => {
  //   if (!showAddColumnButton || !hoveredHeaderCell) return null

  //   const { row, col } = hoveredHeaderCell

  //   // Check if the button position is visible in current viewport
  //   if (row >= startRow && row < endRow && col >= startCol && col < endCol) {
  //     const buttonWidth = 20
  //     const buttonLeft = getColumnPosition(col, columnWidths)
  //     const buttonTop = getRowPosition(row, rowHeights)

  //     return (
  //       <button
  //         className="absolute bg-green-600 bg-opacity-100 border border-white flex items-center justify-center text-white font-bold text-sm hover:bg-opacity-90 transition-all duration-200"
  //         onClick={() => {
  //           // Find the table structure to add column to
  //           for (const [key, structure] of structures) {
  //             if (structure.type === 'table') {
  //               const table = structure as any
  //               const headerLevel = getHeaderLevel(row, table)
                
  //               // For both top-level and sub-level headers, add column after the hovered cell
  //               if (headerLevel >= 0 && row >= table.startPosition.row && 
  //                   row < table.startPosition.row + (table.headerRows || 1) &&
  //                   col === hoveredHeaderCell?.col) {
                  
  //                 onAddColumn(table.position.row, table.position.col, col - 1)
  //                 break
  //               }
  //             }
  //           }
  //         }}
  //         style={{
  //           left: buttonLeft - buttonWidth,
  //           top: buttonTop,
  //           width: buttonWidth,
  //           height: getColumnHeight(row, col, structures),
  //           minWidth: buttonWidth,
  //           minHeight: getColumnHeight(row, col, structures),
  //           zIndex: 50
  //         }}
  //         title="Add column"
  //       >
  //         +
  //       </button>
  //     )
  //   }

  //   return null
  // }

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
        
        {/* Merged cell overlays */}
        {renderMergedCellOverlays()}
        
        {/* Structure overlays */}
        {renderStructureOverlays()}
        
        {/* Column selection overlays */}
        {renderColumnSelectionOverlays()}
        
        {/* Structure name tabs */}
        {renderStructureNameTabs()}
        
        {/* Drop target overlay for structure dragging */}
        {isDraggingStructure && dropTarget && draggedStructure && (
          <div
            className="absolute border-4 border-dashed border-blue-600 bg-blue-100 bg-opacity-30 pointer-events-none"
            style={{
              left: getColumnPosition(dropTarget.col, columnWidths),
              top: getRowPosition(dropTarget.row, rowHeights),
              width: (() => {
                let width = 0
                for (let c = dropTarget.col; c < dropTarget.col + (draggedStructure.endPosition.col - draggedStructure.startPosition.col + 1); c++) {
                  width += getColumnWidth(c, columnWidths)
                }
                return width
              })(),
              height: (() => {
                let height = 0
                for (let r = dropTarget.row; r < dropTarget.row + (draggedStructure.endPosition.row - draggedStructure.startPosition.row + 1); r++) {
                  height += getRowHeight(r, rowHeights)
                }
                return height
              })(),
              zIndex: Z_INDEX.STRUCTURE_OVERLAY + 10
            }}
            title={`Drop ${draggedStructure.type} here`}
          />
        )}
        
        {/* Add column button overlay */}
        {/* {renderAddColumnButton()} */}
      </div>
    </div>
  )
}
