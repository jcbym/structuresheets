import React from 'react'
import { SpreadsheetGrid } from './spreadsheet/SpreadsheetGrid'
import { Toolbar } from './toolbar/Toolbar'
import { StructurePanel } from './panels/StructurePanel'
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

    state.setSelectedCell({ row, col })
    
    e.preventDefault()
    state.setIsDragging(true)
    state.setDragStart({ row, col })
    state.setSelectedRange(null)
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
      state.setHoveredHeaderCell({ row, col })
      state.setShowAddColumnButton(true)
    } else if (!isEntering) {
      state.setHoveredHeaderCell(null)
      state.setShowAddColumnButton(false)
    }
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
              containerRef={containerRef}
            />
          </div>
        </div>

        {/* Structure Panel */}
        <div className="flex-shrink-0">
          <StructurePanel
            structures={state.structures}
            selectedCell={state.selectedCell}
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
