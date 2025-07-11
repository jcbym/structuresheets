import React from 'react'
import { EditableCell } from './EditableCell'
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
  getNextCell
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
  selectedColumn: {tablePosition: Position, columnIndex: number} | null
  scrollTop: number
  scrollLeft: number
  columnWidths: Map<number, number>
  rowHeights: Map<number, number>
  startEditing: {row: number, col: number} | null
  hoveredHeaderCell: {row: number, col: number} | null
  showAddColumnButton: boolean
  isResizing: boolean
  resizeType: 'column' | 'row' | null
  resizeIndex: number | null
  isDragging: boolean
  dragStart: {row: number, col: number} | null
  resizeStartPos: number
  resizeStartSize: number
  
  // State setters
  setCellData: React.Dispatch<React.SetStateAction<Map<string, string>>>
  setStructures: React.Dispatch<React.SetStateAction<Map<string, Structure>>>
  setSelectedCell: React.Dispatch<React.SetStateAction<{row: number, col: number} | null>>
  setSelectedRange: React.Dispatch<React.SetStateAction<{start: {row: number, col: number}, end: {row: number, col: number}} | null>>
  setSelectedStructure: React.Dispatch<React.SetStateAction<Structure | null>>
  setSelectedColumn: React.Dispatch<React.SetStateAction<{tablePosition: Position, columnIndex: number} | null>>
  setScrollTop: React.Dispatch<React.SetStateAction<number>>
  setScrollLeft: React.Dispatch<React.SetStateAction<number>>
  setStartEditing: React.Dispatch<React.SetStateAction<{row: number, col: number} | null>>
  setContextMenu: React.Dispatch<React.SetStateAction<{x: number, y: number} | null>>
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>
  setDragStart: React.Dispatch<React.SetStateAction<{row: number, col: number} | null>>
  setHoveredHeaderCell: React.Dispatch<React.SetStateAction<{row: number, col: number} | null>>
  setShowAddColumnButton: React.Dispatch<React.SetStateAction<boolean>>
  setIsResizing: React.Dispatch<React.SetStateAction<boolean>>
  setResizeType: React.Dispatch<React.SetStateAction<'column' | 'row' | null>>
  setResizeIndex: React.Dispatch<React.SetStateAction<number | null>>
  setResizeStartPos: React.Dispatch<React.SetStateAction<number>>
  setResizeStartSize: React.Dispatch<React.SetStateAction<number>>
  setColumnWidths: React.Dispatch<React.SetStateAction<Map<number, number>>>
  setRowHeights: React.Dispatch<React.SetStateAction<Map<number, number>>>
  
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
  isResizing,
  resizeType,
  resizeIndex,
  isDragging,
  dragStart,
  resizeStartPos,
  resizeStartSize,
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
  setIsResizing,
  setResizeType,
  setResizeIndex,
  setResizeStartPos,
  setResizeStartSize,
  setColumnWidths,
  setRowHeights,
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

  // Handle structure name editing
  const handleStructureNameDoubleClick = (structure: Structure) => {
    let structureKey: string
    if (structure.type === 'cell' || structure.type === 'column') {
      structureKey = `struct-${structure.position.row}-${structure.position.col}`
    } else {
      structureKey = `struct-${structure.startPosition.row}-${structure.startPosition.col}`
    }
    
    setEditingStructureName(structureKey)
    setEditingNameValue(structure.name || '')
  }

  const handleStructureNameChange = (value: string) => {
    setEditingNameValue(value)
  }

  const handleStructureNameSubmit = () => {
    if (editingStructureName && editingNameValue.trim()) {
      // Update the structure name
      setStructures(prev => {
        const newStructures = new Map(prev)
        const structure = newStructures.get(editingStructureName)
        
        if (structure) {
          const updatedStructure = { ...structure, name: editingNameValue.trim() }
          
          // Update the main structure
          newStructures.set(editingStructureName, updatedStructure)
          
          // Update all related structure references for arrays and tables
          if (structure.type === 'array' || structure.type === 'table') {
            const { startPosition, endPosition } = structure
            for (let r = startPosition.row; r <= endPosition.row; r++) {
              for (let c = startPosition.col; c <= endPosition.col; c++) {
                const key = `struct-${r}-${c}`
                if (newStructures.has(key)) {
                  newStructures.set(key, updatedStructure)
                }
              }
            }
          }
          
          // Update selected structure if it's the same one
          if (selectedStructure && (
            (selectedStructure.type === 'cell' && 
             structure.type === 'cell' && 
             selectedStructure.position.row === structure.position.row && 
             selectedStructure.position.col === structure.position.col) ||
            (selectedStructure.type === 'column' && 
             structure.type === 'column' && 
             selectedStructure.position.row === structure.position.row && 
             selectedStructure.position.col === structure.position.col) ||
            ((selectedStructure.type === 'array' || selectedStructure.type === 'table') && 
             (structure.type === 'array' || structure.type === 'table') && 
             'startPosition' in selectedStructure && 'endPosition' in selectedStructure &&
             'startPosition' in structure && 'endPosition' in structure &&
             selectedStructure.startPosition.row === structure.startPosition.row && 
             selectedStructure.startPosition.col === structure.startPosition.col &&
             selectedStructure.endPosition.row === structure.endPosition.row && 
             selectedStructure.endPosition.col === structure.endPosition.col)
          )) {
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
      
      // Check if this structure is already selected
      const isSameStructureSelected = selectedStructure && (
        (selectedStructure.type === 'cell' && 
         structure.type === 'cell' && 
         selectedStructure.position.row === structure.position.row && 
         selectedStructure.position.col === structure.position.col) ||
        (selectedStructure.type === 'column' && 
         structure.type === 'column' && 
         selectedStructure.position.row === structure.position.row && 
         selectedStructure.position.col === structure.position.col) ||
        ((selectedStructure.type === 'array' || selectedStructure.type === 'table') && 
         (structure.type === 'array' || structure.type === 'table') && 
         'startPosition' in selectedStructure && 'endPosition' in selectedStructure &&
         'startPosition' in structure && 'endPosition' in structure &&
         selectedStructure.startPosition.row === structure.startPosition.row && 
         selectedStructure.startPosition.col === structure.startPosition.col &&
         selectedStructure.endPosition.row === structure.endPosition.row && 
         selectedStructure.endPosition.col === structure.endPosition.col)
      )

      if (isSameStructureSelected) {
        // Second click on already selected structure - start editing the cell
        setSelectedCell({ row, col })
        setStartEditing({ row, col })
        // Keep the structure selected
      } else {
        // First click on structure - select the structure
        setSelectedStructure(structure)
        setSelectedCell(null)
        setStartEditing(null)
        setSelectedRange(null)
      }
    } else {
      // Click on empty cell - clear all selections and select cell normally
      setSelectedStructure(null)
      setSelectedColumn(null) // Clear column selection when clicking outside tables
      setSelectedCell({ row, col })
      setStartEditing(null)
      
      e.preventDefault()
      setIsDragging(true)
      setDragStart({ row, col })
      setSelectedRange(null)
    }
  }

  const handleMouseEnter = (row: number, col: number) => {
    if (isDragging && dragStart) {
      setSelectedRange({
        start: dragStart,
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
        selectedColumn.tablePosition.row === table.position.row &&
        selectedColumn.tablePosition.col === table.position.col &&
        selectedColumn.columnIndex === columnIndex
      
      if (isSameColumnSelected) {
        // Clicking on already selected column - deselect it
        setSelectedColumn(null)
        // Keep the table selected
        setSelectedStructure(table)
      } else {
        // Select the new column and the table
        setSelectedColumn({ tablePosition: table.position, columnIndex })
        setSelectedStructure(table)
      }
      
      setSelectedCell(null)
      setSelectedRange(null)
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
    const structureKey = `struct-${tableRow}-${tableCol}`
    const structure = structures.get(structureKey)
    
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
    
    // Update all cells in the table to reference the new structure
    setStructures(prev => {
      const newStructures = new Map(prev)
      
      // Remove old structure references for cells that will shift
      for (let r = table.startPosition.row; r <= table.endPosition.row; r++) {
        for (let c = insertAfterCol + 1; c <= table.endPosition.col; c++) {
          newStructures.delete(`struct-${r}-${c}`)
        }
      }
      
      // Add the updated table structure
      newStructures.set(structureKey, updatedTable)
      
      // Add structure references for all cells in the expanded table
      for (let r = table.startPosition.row; r <= table.endPosition.row; r++) {
        for (let c = table.startPosition.col; c <= table.endPosition.col + 1; c++) {
          if (!(r === tableRow && c === tableCol)) {
            newStructures.set(`struct-${r}-${c}`, updatedTable)
          }
        }
      }
      
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
    
    setIsResizing(true)
    setResizeType(type)
    setResizeIndex(index)
    setResizeStartPos(type === 'column' ? e.clientX : e.clientY)
    
    const currentSize = type === 'column' 
      ? columnWidths.get(index) || 82 
      : rowHeights.get(index) || 32
    setResizeStartSize(currentSize)
  }

  // Global mouse event handlers for resizing
  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false)
      setDragStart(null)
      setIsResizing(false)
      setResizeType(null)
      setResizeIndex(null)
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isResizing && resizeType && resizeIndex !== null) {
        const currentPos = resizeType === 'column' ? e.clientX : e.clientY
        const delta = currentPos - resizeStartPos
        const newSize = Math.max(MIN_CELL_SIZE, resizeStartSize + delta)
        
        if (resizeType === 'column') {
          setColumnWidths(prev => {
            const newWidths = new Map(prev)
            newWidths.set(resizeIndex!, newSize)
            return newWidths
          })
        } else {
          setRowHeights(prev => {
            const newHeights = new Map(prev)
            newHeights.set(resizeIndex!, newSize)
            return newHeights
          })
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
    isResizing, 
    resizeType, 
    resizeIndex, 
    resizeStartPos, 
    resizeStartSize,
    setIsDragging,
    setDragStart,
    setIsResizing,
    setResizeType,
    setResizeIndex,
    setColumnWidths,
    setRowHeights
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
        startPosition = endPosition = structure.position
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
        const isSelected = selectedStructure && (
          (selectedStructure.type === 'cell' && 
           structure.type === 'cell' && 
           selectedStructure.position.row === structure.position.row && 
           selectedStructure.position.col === structure.position.col) ||
          (selectedStructure.type === 'column' && 
           structure.type === 'column' && 
           selectedStructure.position.row === structure.position.row && 
           selectedStructure.position.col === structure.position.col) ||
          ((selectedStructure.type === 'array' || selectedStructure.type === 'table') && 
           (structure.type === 'array' || structure.type === 'table') && 
           'startPosition' in selectedStructure && 'endPosition' in selectedStructure &&
           'startPosition' in structure && 'endPosition' in structure &&
           selectedStructure.startPosition.row === structure.startPosition.row && 
           selectedStructure.startPosition.col === structure.startPosition.col &&
           selectedStructure.endPosition.row === structure.endPosition.row && 
           selectedStructure.endPosition.col === structure.endPosition.col)
        )

        const borderColor = structure.type === 'cell' ? 'border-black' :
                           structure.type === 'array' ? 'border-blue-500' : 'border-green-500'

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

        // Mark all cells of this structure as processed
        for (let r = startPosition.row; r <= endPosition.row; r++) {
          for (let c = startPosition.col; c <= endPosition.col; c++) {
            processedStructures.add(`struct-${r}-${c}`)
          }
        }
      }
    }

    return overlays
  }

  // Render column selection overlays
  const renderColumnSelectionOverlays = () => {
    if (!selectedColumn) return []

    const overlays = []
    
    // Find the table structure for the selected column
    const tableKey = `struct-${selectedColumn.tablePosition.row}-${selectedColumn.tablePosition.col}`
    const tableStructure = structures.get(tableKey)
    
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
            className="absolute pointer-events-none border-4 border-green-600"
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

    for (const [key, structure] of structures) {
      if (processedStructures.has(key)) continue
      if (!structure.name) continue // Only show tabs for named structures

      let startPosition, endPosition
      if (structure.type === 'cell' || structure.type === 'column') {
        startPosition = endPosition = structure.position
      } else {
        startPosition = structure.startPosition
        endPosition = structure.endPosition
      }
      
      if (endPosition.row >= startRow && startPosition.row < endRow &&
          endPosition.col >= startCol && startPosition.col < endCol) {
        
        // Check if this structure is selected
        const isSelected = selectedStructure && (
          (selectedStructure.type === 'cell' && 
           structure.type === 'cell' && 
           selectedStructure.position.row === structure.position.row && 
           selectedStructure.position.col === structure.position.col) ||
          (selectedStructure.type === 'column' && 
           structure.type === 'column' && 
           selectedStructure.position.row === structure.position.row && 
           selectedStructure.position.col === structure.position.col) ||
          ((selectedStructure.type === 'array' || selectedStructure.type === 'table') && 
           (structure.type === 'array' || structure.type === 'table') && 
           'startPosition' in selectedStructure && 'endPosition' in selectedStructure &&
           'startPosition' in structure && 'endPosition' in structure &&
           selectedStructure.startPosition.row === structure.startPosition.row && 
           selectedStructure.startPosition.col === structure.startPosition.col &&
           selectedStructure.endPosition.row === structure.endPosition.row && 
           selectedStructure.endPosition.col === structure.endPosition.col)
        )

        // Only show name tab when structure is selected
        if (isSelected) {
          const overlayLeft = getColumnPosition(startPosition.col, columnWidths)
          const overlayTop = getRowPosition(startPosition.row, rowHeights)
          
          // Calculate structure width
          let structureWidth = 0
          for (let c = startPosition.col; c <= endPosition.col; c++) {
            structureWidth += getColumnWidth(c, columnWidths)
          }
          
          // Check if this structure is being edited
          const isEditing = editingStructureName === key
          
          // Calculate tab dimensions - constrain to structure width
          const tabHeight = 24
          const tabPadding = 2
          const maxTabWidth = structureWidth
          
          // Use editing value if currently editing, otherwise use structure name
          const displayText = isEditing ? editingNameValue : structure.name
          const textWidth = displayText.length * 10 // Approximate character width
          const minTabWidth = 40 // Minimum tab width for usability
          const tabWidth = Math.min(Math.max(textWidth + tabPadding * 2, minTabWidth), maxTabWidth)
          
          // Position tab above the structure, extending from the top border
          const tabLeft = overlayLeft
          const tabTop = overlayTop - tabHeight
          
          // Choose tab color based on structure type
          const tabBgColor = structure.type === 'cell' ? 'bg-black' :
                            structure.type === 'array' ? 'bg-blue-500' : 'bg-green-500'
          
          tabs.push(
            <div
              key={`name-tab-${key}`}
              className={`absolute ${tabBgColor} text-white text-xs font-medium flex items-center justify-center border-t-2 border-l-2 border-r-2 ${
                structure.type === 'cell' ? 'border-black' :
                structure.type === 'array' ? 'border-blue-500' : 'border-green-500'
              }`}
              style={{
                left: tabLeft,
                top: tabTop,
                width: tabWidth,
                height: tabHeight,
                zIndex: Z_INDEX.STRUCTURE_NAME_TAB,
                pointerEvents: 'auto'
              }}
              title={structure.name} // Show full name on hover
              onDoubleClick={() => handleStructureNameDoubleClick(structure)}
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
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    paddingLeft: tabPadding,
                    paddingRight: tabPadding
                  }}
                >
                  {structure.name}
                </span>
              )}
            </div>
          )
        }

        // Mark all cells of this structure as processed
        for (let r = startPosition.row; r <= endPosition.row; r++) {
          for (let c = startPosition.col; c <= endPosition.col; c++) {
            processedStructures.add(`struct-${r}-${c}`)
          }
        }
      }
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
        const structure = structures.get(`struct-${rowIndex}-${colIndex}`)
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
          borderClass = 'border-l-1 border-r-1 border-t border-b border-l-green-500 border-r-green-500 border-t-gray-300 border-b-gray-300'
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
            }}
            onMouseLeave={() => {
              if (isTableHeader(rowIndex, colIndex, structures)) {
                handleHeaderHover(rowIndex, colIndex, false)
              }
            }}
            onClick={(e) => {
              if (isTableHeader(rowIndex, colIndex, structures)) {
                e.stopPropagation()
                handleColumnHeaderClick(rowIndex, colIndex)
              }
            }}
          >
            <EditableCell
              value={mergedCell ? mergedCell.value : cellData.get(`${rowIndex}-${colIndex}`) || ''}
              onChange={(value) => onCellUpdate(rowIndex, colIndex, value)}
              isSelected={isSelected}
              onFocus={() => handleCellFocus(rowIndex, colIndex)}
              onEnterPress={() => handleCellEnterPress(rowIndex, colIndex)}
              onArrowKeyPress={(direction) => handleArrowKeyNavigation(rowIndex, colIndex, direction)}
              startEditing={startEditing?.row === rowIndex && startEditing?.col === colIndex}
              onEditingStarted={() => setStartEditing(null)}
              structure={structure}
              onMouseDown={(e) => handleMouseDown(rowIndex, colIndex, e)}
              onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
              onMouseUp={handleMouseUp}
              onRightClick={(e) => handleRightClick(rowIndex, colIndex, e)}
              onHeaderHover={(isEntering) => handleHeaderHover(rowIndex, colIndex, isEntering)}
              row={rowIndex}
              col={colIndex}
              isMergedCell={!!mergedCell}
            />
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
  //         className="absolute bg-green-500 bg-opacity-100 border border-white flex items-center justify-center text-white font-bold text-sm hover:bg-opacity-90 transition-all duration-200"
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
        
        {/* Add column button overlay */}
        {/* {renderAddColumnButton()} */}
      </div>
    </div>
  )
}
