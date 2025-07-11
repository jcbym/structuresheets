import React from 'react'
import { SpreadsheetGrid } from './spreadsheet/SpreadsheetGrid'
import { Toolbar } from './ui/Toolbar'
import { StructurePanel } from './ui/StructurePanel'
import { ContextMenu } from './ui/ContextMenu'
import { useSpreadsheetState } from '../hooks/useSpreadsheetState'
import { useCellOperations } from '../hooks/useCellOperations'
import { useMergeOperations } from '../hooks/useMergeOperations'
import { useStructureOperations } from '../hooks/useStructureOperations'

export const App: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  
  // Use custom hooks for state management
  const state = useSpreadsheetState()
  
  // Use custom hooks for operations
  const { updateCell } = useCellOperations(
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
              selectedColumn={state.selectedColumn}
              scrollTop={state.scrollTop}
              scrollLeft={state.scrollLeft}
              columnWidths={state.columnWidths}
              rowHeights={state.rowHeights}
              startEditing={state.startEditing}
              hoveredHeaderCell={state.hoveredHeaderCell}
              showAddColumnButton={state.showAddColumnButton}
              isResizing={state.isResizing}
              resizeType={state.resizeType}
              resizeIndex={state.resizeIndex}
              isDragging={state.isDragging}
              dragStart={state.dragStart}
              resizeStartPos={state.resizeStartPos}
              resizeStartSize={state.resizeStartSize}
              isResizingStructure={state.isResizingStructure}
              structureResizeDirection={state.structureResizeDirection}
              structureResizeStartDimensions={state.structureResizeStartDimensions}
              setIsResizingStructure={state.setIsResizingStructure}
              setStructureResizeDirection={state.setStructureResizeDirection}
              setStructureResizeStartDimensions={state.setStructureResizeStartDimensions}
              setCellData={state.setCellData}
              setStructures={state.setStructures}
              setSelectedCell={state.setSelectedCell}
              setSelectedRange={state.setSelectedRange}
              setSelectedStructure={state.setSelectedStructure}
              setSelectedColumn={state.setSelectedColumn}
              setScrollTop={state.setScrollTop}
              setScrollLeft={state.setScrollLeft}
              setStartEditing={state.setStartEditing}
              setContextMenu={state.setContextMenu}
              setIsDragging={state.setIsDragging}
              setDragStart={state.setDragStart}
              setHoveredHeaderCell={state.setHoveredHeaderCell}
              setShowAddColumnButton={state.setShowAddColumnButton}
              setIsResizing={state.setIsResizing}
              setResizeType={state.setResizeType}
              setResizeIndex={state.setResizeIndex}
              setResizeStartPos={state.setResizeStartPos}
              setResizeStartSize={state.setResizeStartSize}
              setColumnWidths={state.setColumnWidths}
              setRowHeights={state.setRowHeights}
              onCellUpdate={updateCell}
              containerRef={containerRef}
            />
          </div>
        </div>

        {/* Structure Panel */}
        <StructurePanel
          structures={state.structures}
          selectedStructure={state.selectedStructure}
          selectedColumn={state.selectedColumn}
          expandedTableColumns={state.expandedTableColumns}
          onCreateStructure={createStructure}
          onUpdateTableHeaders={updateTableHeaders}
          onSelectColumn={(tablePosition, columnIndex) => {
            state.setSelectedColumn({ tablePosition, columnIndex })
            // Also select the table structure when a column is selected
            // Find the table structure at the given position
            let tableStructure = null
            for (const [id, structure] of state.structures) {
              if (structure.type === 'table' && 
                  structure.position.row === tablePosition.row && 
                  structure.position.col === tablePosition.col) {
                tableStructure = structure
                break
              }
            }
            if (tableStructure) {
              state.setSelectedStructure(tableStructure)
            }
          }}
          onToggleTableColumns={(tableKey) => {
            state.setExpandedTableColumns(prev => {
              const newSet = new Set(prev)
              if (newSet.has(tableKey)) {
                newSet.delete(tableKey)
              } else {
                newSet.add(tableKey)
              }
              return newSet
            })
          }}
          isCollapsed={state.structurePanelCollapsed}
          width={state.structurePanelWidth}
          onToggleCollapse={() => state.setStructurePanelCollapsed(!state.structurePanelCollapsed)}
          onWidthChange={state.setStructurePanelWidth}
        />
      </div>

      {/* Context Menu */}
      {state.contextMenu && (
        <ContextMenu
          x={state.contextMenu.x}
          y={state.contextMenu.y}
          onClose={() => state.setContextMenu(null)}
          onMergeCells={mergeCells}
          onUnmergeCells={unmergeCells}
          selectedCell={state.selectedCell}
          selectedRange={state.selectedRange}
          selectedStructure={state.selectedStructure}
          setContextMenu={state.setContextMenu}
          getStructureAtPositionSafe={getStructureAtPositionSafe}
          updateTableHeaders={updateTableHeaders}
          createStructureFromToolbar={createStructureFromToolbar}
          canMerge={canMergeCells()}
          canUnmerge={canUnmergeCells()}
          canCreateStructures={state.selectedCell !== null || state.selectedRange !== null}
        />
      )}
    </div>
  )
}
