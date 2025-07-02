import React from 'react'
import { SpreadsheetGrid } from './spreadsheet/SpreadsheetGrid'
import { Toolbar } from './ui/Toolbar'
import { StructurePanel } from './ui/StructurePanel'
import { ContextMenu } from './ui/ContextMenu'
import { useSpreadsheetState } from '../hooks/useSpreadsheetState'
import { useCellOperations } from '../hooks/useCellOperations'
import { useMergeOperations } from '../hooks/useMergeOperations'
import { useStructureOperations } from '../hooks/useStructureOperations'
import { getNextCell, isTableHeader, getStructureAtPosition, getHeaderLevel } from '../utils'
import { MIN_CELL_SIZE, MAX_ROWS, MAX_COLS } from '../constants'

export const App: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  
  // Use custom hooks for state management
  const state = useSpreadsheetState()
  
  // Use custom hooks for operations
  const { updateCell, getCellValueSafe } = useCellOperations(
    state.cellData, 
    state.setCellData, 
    state.structures, 
    state.setStructures, 
    state.mergedCells, 
    state.setMergedCells
  )
  
  const { mergeCells, unmergeCells, canMergeCells, canUnmergeCells } = useMergeOperations(
    state.cellData,
    state.setCellData,
    state.mergedCells,
    state.setMergedCells,
    state.selectedRange,
    state.selectedCell,
    state.setSelectedRange,
    state.setContextMenu
  )
  
  const { 
    createStructure, 
    createStructureFromToolbar, 
    updateTableHeaders, 
    getStructureAtPositionSafe 
  } = useStructureOperations(
    state.cellData,
    state.structures,
    state.setStructures,
    state.selectedCell,
    state.selectedRange
  )

  // Event handlers
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    state.setScrollTop(target.scrollTop)
    state.setScrollLeft(target.scrollLeft)
  }

  const handleCellFocus = (row: number, col: number) => {
    state.setSelectedCell({ row, col })
  }

  const handleCellEnterPress = (row: number, col: number) => {
    const nextRow = row + 1
    if (nextRow < MAX_ROWS) {
      state.setSelectedCell({ row: nextRow, col })
      state.setShouldStartEditing({ row: nextRow, col })
    }
  }

  const handleArrowKeyNavigation = (row: number, col: number, direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => {
    const { row: newRow, col: newCol } = getNextCell(row, col, direction)
    state.setSelectedCell({ row: newRow, col: newCol })
    state.setShouldStartEditing({ row: newRow, col: newCol })
  }

  const handleMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    if (e.button !== 0) return // Only handle left-click

    // Check if the clicked cell is part of a structure
    const structure = getStructureAtPosition(row, col, state.structures)
    
    if (structure) {
      // Check if this structure is already selected
      const isSameStructureSelected = state.selectedStructure && (
        (state.selectedStructure.type === 'cell' && 
         structure.type === 'cell' && 
         state.selectedStructure.position.row === structure.position.row && 
         state.selectedStructure.position.col === structure.position.col) ||
        (state.selectedStructure.type !== 'cell' && 
         structure.type !== 'cell' && 
         state.selectedStructure.startPosition.row === structure.startPosition.row && 
         state.selectedStructure.startPosition.col === structure.startPosition.col &&
         state.selectedStructure.endPosition.row === structure.endPosition.row && 
         state.selectedStructure.endPosition.col === structure.endPosition.col)
      )

      if (isSameStructureSelected) {
        // Second click on already selected structure - start editing the cell
        state.setSelectedCell({ row, col })
        state.setShouldStartEditing({ row, col })
        // Keep the structure selected
      } else {
        // First click on structure - select the structure
        state.setSelectedStructure(structure)
        state.setSelectedCell(null)
        state.setShouldStartEditing(null)
        state.setSelectedRange(null)
      }
    } else {
      // Click on empty cell - clear structure selection and select cell normally
      state.setSelectedStructure(null)
      state.setSelectedCell({ row, col })
      state.setShouldStartEditing(null)
      
      e.preventDefault()
      state.setIsDragging(true)
      state.setDragStart({ row, col })
      state.setSelectedRange(null)
    }
  }

  const handleMouseEnter = (row: number, col: number) => {
    if (state.isDragging && state.dragStart) {
      state.setSelectedRange({
        start: state.dragStart,
        end: { row, col }
      })
    }
  }

  const handleMouseUp = () => {
    state.setIsDragging(false)
    state.setDragStart(null)
  }

  const handleRightClick = (row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault()
    state.setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleHeaderHover = (row: number, col: number, isEntering: boolean) => {
    if (isEntering && isTableHeader(row, col, state.structures)) {
      const structure = getStructureAtPosition(row, col, state.structures)
      if (structure && structure.type === 'table') {
        const table = structure as any
        const headerLevel = getHeaderLevel(row, table)
        
        if (headerLevel >= 0) {
          // Check if this cell is part of a merged cell
          const mergedCell = state.mergedCells.get(`${row}-${col}`) || 
            Array.from(state.mergedCells.values()).find(mc => 
              row >= mc.startRow && row <= mc.endRow && 
              col >= mc.startCol && col <= mc.endCol
            )
          let rightmostCol = col
          
          if (mergedCell) {
            rightmostCol = mergedCell.endCol
          }
          
          // Show button to the right of the rightmost cell
          state.setHoveredHeaderCell({ row, col: rightmostCol + 1 })
          state.setShowAddColumnButton(true)
        }
      }
    } else if (!isEntering) {
      state.setHoveredHeaderCell(null)
      state.setShowAddColumnButton(false)
    }
  }

  const handleAddColumn = (tableRow: number, tableCol: number, insertAfterCol: number) => {
    const structureKey = `struct-${tableRow}-${tableCol}`
    const structure = state.structures.get(structureKey)
    
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
    state.setStructures(prev => {
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
    state.setCellData(prev => {
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
    state.setShowAddColumnButton(false)
    state.setHoveredHeaderCell(null)
  }

  const handleResizeMouseDown = (type: 'column' | 'row', index: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    state.setIsResizing(true)
    state.setResizeType(type)
    state.setResizeIndex(index)
    state.setResizeStartPos(type === 'column' ? e.clientX : e.clientY)
    
    const currentSize = type === 'column' 
      ? state.columnWidths.get(index) || 82 
      : state.rowHeights.get(index) || 32
    state.setResizeStartSize(currentSize)
  }

  // Global mouse event handlers for resizing
  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      state.setIsDragging(false)
      state.setDragStart(null)
      state.setIsResizing(false)
      state.setResizeType(null)
      state.setResizeIndex(null)
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (state.isResizing && state.resizeType && state.resizeIndex !== null) {
        const currentPos = state.resizeType === 'column' ? e.clientX : e.clientY
        const delta = currentPos - state.resizeStartPos
        const newSize = Math.max(MIN_CELL_SIZE, state.resizeStartSize + delta)
        
        if (state.resizeType === 'column') {
          state.setColumnWidths(prev => {
            const newWidths = new Map(prev)
            newWidths.set(state.resizeIndex!, newSize)
            return newWidths
          })
        } else {
          state.setRowHeights(prev => {
            const newHeights = new Map(prev)
            newHeights.set(state.resizeIndex!, newSize)
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
    state.isResizing, 
    state.resizeType, 
    state.resizeIndex, 
    state.resizeStartPos, 
    state.resizeStartSize,
    state.setIsDragging,
    state.setDragStart,
    state.setIsResizing,
    state.setResizeType,
    state.setResizeIndex,
    state.setColumnWidths,
    state.setRowHeights
  ])

  // Context menu handlers
  const canAddHeaderLevels = (): boolean => {
    if (!state.selectedCell) return false
    const structure = getStructureAtPositionSafe(state.selectedCell.row, state.selectedCell.col)
    return structure?.type === 'table'
  }

  const addColumnHeaderLevel = () => {
    if (!state.selectedCell) return
    const structure = getStructureAtPositionSafe(state.selectedCell.row, state.selectedCell.col)
    if (!structure || structure.type !== 'table') return
    
    const table = structure
    const newHeaderRows = (table.headerRows || 1) + 1
    
    updateTableHeaders(
      state.selectedCell.row,
      state.selectedCell.col,
      true,
      table.hasHeaderCol || false,
      newHeaderRows,
      table.headerCols
    )
    state.setContextMenu(null)
  }

  const addRowHeaderLevel = () => {
    if (!state.selectedCell) return
    const structure = getStructureAtPositionSafe(state.selectedCell.row, state.selectedCell.col)
    if (!structure || structure.type !== 'table') return
    
    const table = structure
    const newHeaderCols = (table.headerCols || 1) + 1
    
    updateTableHeaders(
      state.selectedCell.row,
      state.selectedCell.col,
      table.hasHeaderRow || false,
      true,
      table.headerRows,
      newHeaderCols
    )
    state.setContextMenu(null)
  }

  return (
    <div className="flex flex-col h-screen">
      <Toolbar
        selectedCell={state.selectedCell}
        selectedRange={state.selectedRange}
        onCreateStructure={createStructureFromToolbar}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Spreadsheet container */}
        <div className="flex-1 bg-gray-50 p-4 min-w-0">
          <div className="h-full bg-white border border-gray-300 rounded-lg shadow-lg">
            <SpreadsheetGrid
              cellData={state.cellData}
              structures={state.structures}
              mergedCells={state.mergedCells}
              selectedCell={state.selectedCell}
              selectedRange={state.selectedRange}
              selectedStructure={state.selectedStructure}
              scrollTop={state.scrollTop}
              scrollLeft={state.scrollLeft}
              columnWidths={state.columnWidths}
              rowHeights={state.rowHeights}
              shouldStartEditing={state.shouldStartEditing}
              hoveredHeaderCell={state.hoveredHeaderCell}
              showAddColumnButton={state.showAddColumnButton}
              isResizing={state.isResizing}
              resizeType={state.resizeType}
              resizeIndex={state.resizeIndex}
              onCellUpdate={updateCell}
              onCellFocus={handleCellFocus}
              onCellEnterPress={handleCellEnterPress}
              onArrowKeyNavigation={handleArrowKeyNavigation}
              onEditingStarted={() => state.setShouldStartEditing(null)}
              onMouseDown={handleMouseDown}
              onMouseEnter={handleMouseEnter}
              onMouseUp={handleMouseUp}
              onRightClick={handleRightClick}
              onHeaderHover={handleHeaderHover}
              onScroll={handleScroll}
              onResizeMouseDown={handleResizeMouseDown}
              onAddColumn={handleAddColumn}
              containerRef={containerRef}
            />
          </div>
        </div>

        {/* Structure Panel */}
        <div className="flex-shrink-0">
          <StructurePanel
            structures={state.structures}
            selectedStructure={state.selectedStructure}
            onCreateStructure={createStructure}
            onUpdateTableHeaders={updateTableHeaders}
          />
        </div>
      </div>

      {/* Context Menu */}
      {state.contextMenu && (
        <ContextMenu
          x={state.contextMenu.x}
          y={state.contextMenu.y}
          onClose={() => state.setContextMenu(null)}
          onMergeCells={mergeCells}
          onUnmergeCells={unmergeCells}
          onCreateArray={() => {
            createStructureFromToolbar('array')
            state.setContextMenu(null)
          }}
          onCreateTable={() => {
            createStructureFromToolbar('table')
            state.setContextMenu(null)
          }}
          onAddColumnHeaderLevel={addColumnHeaderLevel}
          onAddRowHeaderLevel={addRowHeaderLevel}
          canMerge={canMergeCells()}
          canUnmerge={canUnmergeCells()}
          canCreateStructures={state.selectedCell !== null || state.selectedRange !== null}
          canAddHeaderLevels={canAddHeaderLevels()}
        />
      )}
    </div>
  )
}
