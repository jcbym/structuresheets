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
  getHeaderWidth
} from '../../utils/sheetUtils'
import {
  isCellInRange,
  isTableHeader,
  getStructureAtPosition,
  getCellValue,
  getEndPosition
} from '../../utils/structureUtils'
import { COLUMN_LETTERS, Z_INDEX, MAX_ROWS, CELL_COLOR, TABLE_COLOR, ARRAY_COLOR } from '../../constants'

// Import modular hooks
import { useGridEventHandlers } from '../../hooks/useGridEventHandlers'
import { useDragAndDropHandlers } from '../../hooks/useDragAndDropHandlers'
import { useResizeHandlers } from '../../hooks/useResizeHandlers'
import { useStructureEditingHandlers } from '../../hooks/useStructureEditingHandlers'
import { useGlobalEventHandlers } from '../../hooks/useGlobalEventHandlers'

// Import modular structure renderers
import { 
  renderStructure, 
  renderStructureNameTab, 
  renderAddButton, 
  renderDraggedStructure,
  StructureRenderProps 
} from './structureRenderers'

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

  // Initialize modular hooks
  const gridEventHandlers = useGridEventHandlers({
    structures,
    positions,
    selectedStructure,
    selectedColumn,
    isDraggingSheetHeader,
    sheetHeaderDragStart,
    editingCells,
    cellValues,
    setSelectedRange,
    setStartEditing,
    setContextMenu,
    setEditingCells,
    setCellValues,
    onCellUpdate
  })

  const dragAndDropHandlers = useDragAndDropHandlers({
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
  })

  const resizeHandlers = useResizeHandlers({
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
  })

  const structureEditingHandlers = useStructureEditingHandlers({
    structures,
    selectedStructure,
    hoveredHeaderCell,
    showAddColumnButton,
    setStructures,
    setSelectedStructure,
    setHoveredHeaderCell,
    setShowAddColumnButton,
    selectStructure: dragAndDropHandlers.utils.selectStructure
  })

  // Initialize global event handlers (this manages its own event listeners)
  useGlobalEventHandlers({
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
    processStructureDragMove: dragAndDropHandlers.handlers.processStructureDragMove,
    processColumnDragMove: dragAndDropHandlers.handlers.processColumnDragMove,
    processSheetHeaderResize: resizeHandlers.handlers.processSheetHeaderResize,
    processStructureResize: resizeHandlers.handlers.processStructureResize,
    selectStructure: dragAndDropHandlers.utils.selectStructure,
    getCellKey: gridEventHandlers.utils.getCellKey,
    onDeleteStructure
  })

  // Extract handler references from hooks
  const { 
    handleCellBlur,
    handleCellFocusChange, 
    handleCellDoubleClick,
    handleCellKeyDown,
    handleCellKeyDownGeneral,
    handleMouseEnter,
    handleMouseUp,
    handleRightClick
  } = gridEventHandlers.handlers

  const {
    startStructureDrag,
    handleMouseDown,
    handleColumnHeaderClick,
    handleColumnHeaderMouseDown
  } = dragAndDropHandlers.handlers

  const {
    handleResizeMouseDown,
    handleStructureResizeMouseDown
  } = resizeHandlers.handlers

  const {
    handleHeaderHover,
    handleAddColumn,
    handleAddRow,
    handleStructureNameDoubleClick,
    handleStructureNameChange,
    handleStructureNameSubmit,
    handleStructureNameCancel
  } = structureEditingHandlers.handlers

  // Get structure editing state
  const { editingStructureName, editingNameValue } = structureEditingHandlers.state

  // Use shared selectStructure function from drag and drop handlers
  const selectStructure = dragAndDropHandlers.utils.selectStructure
  const getCellKey = gridEventHandlers.utils.getCellKey

  // Scroll handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    setScrollTop(target.scrollTop)
    setScrollLeft(target.scrollLeft)
  }

  // Cell rendering utilities
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
    
    // // Add transparent background colors for structure types
    // if (structure?.type === 'table') {
    //   return { ...baseStyle, backgroundColor: 'rgba(0, 166, 62, 0.1)' } // Transparent light green
    // }
    
    // if (structure?.type === 'array') {
    //   return { ...baseStyle, backgroundColor: 'rgba(43, 127, 255, 0.1)' } // Transparent light blue
    // }

    if (structure?.type === 'cell') {
      return { ...baseStyle, backgroundColor: 'rgba(255, 255, 255, 1)' }
    }

    // If cell is in selected range, use blue background
    if (isInRange) {
      return { ...baseStyle, backgroundColor: '#dbeafe' } // bg-blue-100 equivalent
    }
    
    return baseStyle
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
  }, [structures, editingCells, positions, getCellKey])

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
  }, [startEditing, setStartEditing, getCellKey])

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

  // Render structure overlays using modular renderers
  const renderStructureOverlays = () => {
    const overlays = []
    const processedStructures = new Set<string>()

    // Prepare render props that will be used by all structure renderers
    const baseRenderProps: Omit<StructureRenderProps, 'structure'> = {
      startRow,
      endRow,
      startCol,
      endCol,
      columnWidths,
      rowHeights,
      selectedStructure,
      selectedColumn,
      hoveredStructure,
      isResizingStructure,
      isDraggingStructure,
      isDraggingColumn,
      draggedStructure,
      dropTarget,
      editingStructureName,
      editingNameValue,
      hoveredAddButton,
      setSelectedColumn,
      setSelectedRange,
      setStartEditing,
      selectStructure,
      startStructureDrag,
      handleStructureResizeMouseDown,
      handleStructureNameDoubleClick,
      handleStructureNameChange,
      handleStructureNameSubmit,
      handleStructureNameCancel,
      setHoveredAddButton,
      handleAddColumn,
      handleAddRow
    }

    for (const [key, structure] of structures) {
      if (processedStructures.has(key)) continue

      // Create props for this specific structure
      const structureRenderProps: StructureRenderProps = {
        ...baseRenderProps,
        structure
      }

      // Use the modular structure renderer
      const structureOverlays = renderStructure(structureRenderProps)
      overlays.push(...structureOverlays)

      processedStructures.add(structure.id)
    }

    return overlays
  }

  // Render column selection overlays
  const renderColumnSelectionOverlays = () => {
    if (!selectedColumn || !selectedColumn.tableId) return []

    const overlays = []
    const tableStructure = structures.get(selectedColumn.tableId)
    
    if (tableStructure && tableStructure.type === 'table') {
      const table = tableStructure as any
      const selectedColIndex = table.startPosition.col + selectedColumn.columnIndex
      
      if (selectedColIndex >= startCol && selectedColIndex < endCol) {
        const columnLeft = getColumnPosition(selectedColIndex, columnWidths)
        const columnWidth = getColumnWidth(selectedColIndex, columnWidths)
        
        const tableTop = getRowPosition(table.startPosition.row, rowHeights)
        let tableHeight = 0
        for (let r = table.startPosition.row; r <= getEndPosition(table.startPosition, table.dimensions).row; r++) {
          tableHeight += getRowHeight(r, rowHeights)
        }
        
        overlays.push(
          <div
            key={`column-selection-${selectedColIndex}`}
            className="absolute pointer-events-none border-3 border-green-700"
            style={{
              left: columnLeft,
              top: tableTop,
              width: columnWidth,
              height: tableHeight,
              zIndex: Z_INDEX.STRUCTURE_OVERLAY + 2
            }}
            title={`Selected column ${selectedColumn.columnIndex + 1}`}
          />
        )
      }
    }

    return overlays
  }

  // Render structure name tabs using modular renderers
  const renderStructureNameTabs = () => {
    const tabs = []

    // Prepare base render props
    const baseRenderProps: Omit<StructureRenderProps, 'structure'> = {
      startRow,
      endRow,
      startCol,
      endCol,
      columnWidths,
      rowHeights,
      selectedStructure,
      selectedColumn,
      hoveredStructure,
      isResizingStructure,
      isDraggingStructure,
      isDraggingColumn,
      draggedStructure,
      dropTarget,
      editingStructureName,
      editingNameValue,
      hoveredAddButton,
      setSelectedColumn,
      setSelectedRange,
      setStartEditing,
      selectStructure,
      startStructureDrag,
      handleStructureResizeMouseDown,
      handleStructureNameDoubleClick,
      handleStructureNameChange,
      handleStructureNameSubmit,
      handleStructureNameCancel,
      setHoveredAddButton,
      handleAddColumn,
      handleAddRow
    }

    // Render name tab for selected structure
    if (selectedStructure) {
      const selectedTab = renderStructureNameTab({
        ...baseRenderProps,
        structure: selectedStructure
      })
      if (selectedTab) tabs.push(selectedTab)
    }

    // Render name tab for hovered structure (if different from selected)
    if (hoveredStructure && (!selectedStructure || hoveredStructure.id !== selectedStructure.id)) {
      const hoveredTab = renderStructureNameTab({
        ...baseRenderProps,
        structure: hoveredStructure
      })
      if (hoveredTab) tabs.push(hoveredTab)
    }

    return tabs
  }

  // Render add button overlay using modular renderer
  const renderAddButtons = () => {
    if (!hoveredAddButton) return null

    const structure = structures.get(hoveredAddButton.structureId)
    if (!structure) return null

    // Prepare render props for the hovered structure
    const renderProps: StructureRenderProps = {
      structure,
      startRow,
      endRow,
      startCol,
      endCol,
      columnWidths,
      rowHeights,
      selectedStructure,
      selectedColumn,
      hoveredStructure,
      isResizingStructure,
      isDraggingStructure,
      isDraggingColumn,
      draggedStructure,
      dropTarget,
      editingStructureName,
      editingNameValue,
      hoveredAddButton,
      setSelectedColumn,
      setSelectedRange,
      setStartEditing,
      selectStructure,
      startStructureDrag,
      handleStructureResizeMouseDown,
      handleStructureNameDoubleClick,
      handleStructureNameChange,
      handleStructureNameSubmit,
      handleStructureNameCancel,
      setHoveredAddButton,
      handleAddColumn,
      handleAddRow
    }

    return renderAddButton(renderProps)
  }

  // Render dragged structure overlay
  const renderDraggedStructure = () => {
    if (!isDraggingStructure || !dropTarget || !draggedStructure) return null

    const overlayLeft = getColumnPosition(dropTarget.col, columnWidths)
    const overlayTop = getRowPosition(dropTarget.row, rowHeights)
    
    let overlayWidth = 0
    for (let c = dropTarget.col; c < dropTarget.col + draggedStructure.dimensions.cols; c++) {
      overlayWidth += getColumnWidth(c, columnWidths)
    }
    
    let overlayHeight = 0
    for (let r = dropTarget.row; r < dropTarget.row + draggedStructure.dimensions.rows; r++) {
      overlayHeight += getRowHeight(r, rowHeights)
    }

    // Use the same border styling as regular structures but with transparency
    const borderColor = draggedStructure.type === 'cell' ? CELL_COLOR.BORDER :
                       draggedStructure.type === 'array' ? ARRAY_COLOR.BORDER : TABLE_COLOR.BORDER
    const borderWidth = 'border-3'

    return (
      <div
        className={`absolute ${borderWidth} ${borderColor} pointer-events-none`}
        style={{
          left: overlayLeft,
          top: overlayTop,
          width: overlayWidth,
          height: overlayHeight,
          zIndex: Z_INDEX.STRUCTURE_OVERLAY + 10,
          opacity: 0.7,
          backgroundColor: draggedStructure.type === 'cell' ? 'rgba(156, 163, 175, 0.3)' :
                           draggedStructure.type === 'array' ? 'rgba(59, 130, 246, 0.3)' : 
                           'rgba(34, 197, 94, 0.3)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}
        title={`Moving ${draggedStructure.type}${draggedStructure.name ? `: ${draggedStructure.name}` : ''}`}
      />
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
        
        {/* Dragged structure overlay */}
        {renderDraggedStructure()}
        
        {/* Add buttons overlay */}
        {renderAddButtons()}
      </div>
    </div>
  )
}
