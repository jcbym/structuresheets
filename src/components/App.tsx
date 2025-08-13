import React from 'react'
import { SpreadsheetGrid } from './spreadsheet/SpreadsheetGrid'
import { Toolbar } from './ui/Toolbar'
import { StructurePanel } from './ui/StructurePanel'
import { ContextMenu } from './ui/ContextMenu'
import { ConflictDialog } from './ui/ConflictDialog'
import { useSpreadsheetState } from '../hooks/useSpreadsheetState'
import { useCellOperations } from '../hooks/useCellOperations'
import { useStructureOperations } from '../hooks/useStructureOperations'
import { moveStructure, removeStructureFromPositionMap, getTableCells, getArrayCells } from '../utils/structureUtils'

export const App: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  
  // Use custom hooks for state management
  const state = useSpreadsheetState()
  
  // Use custom hooks for operations
  const { updateCell } = useCellOperations(
    state.structures, 
    state.setStructures,
    state.positions,
    state.setPositions
  )
  
  const { 
    createStructureFromToolbar, 
    updateTableHeaders,
    updateStructureName,
    rotateArray,
    deleteStructure
  } = useStructureOperations(
    state.structures,
    state.setStructures,
    state.positions,
    state.setPositions,
    state.selectedRange,
    state.setSelectedStructure
  )

  // Conflict dialog handlers with proper dependency management
  const handleConflictClose = React.useCallback(() => {
    // Clean up drag state without performing move
    state.setIsDraggingStructure(false)
    state.setDraggedStructure(null)
    state.setDragOffset(null)
    state.setDropTarget(null)
    state.setShowConflictDialog(false)
    state.setConflictDialogData(null)
  }, [
    state.setIsDraggingStructure,
    state.setDraggedStructure,
    state.setDragOffset,
    state.setDropTarget,
    state.setShowConflictDialog,
    state.setConflictDialogData
  ])

  const handleKeepExisting = React.useCallback(() => {
    if (state.conflictDialogData && state.conflictDialogData.draggedStructure) {
      // Keep existing values means cancel the move - delete the dragged structure entirely
      const newStructures = new Map(state.structures)
      let newPositions = state.positions
      
      // Remove the dragged structure completely
      const draggedStructure = state.conflictDialogData.draggedStructure
      newStructures.delete(draggedStructure.id)
      
      // Remove from position map
      newPositions = removeStructureFromPositionMap(draggedStructure, newPositions)
      
      // For tables and arrays, also clean up their cell references
      if ((draggedStructure.type === 'table' || draggedStructure.type === 'array') && 'cellIds' in draggedStructure) {
        const cellsToRemove: any[] = []
        
        if (draggedStructure.type === 'table') {
          cellsToRemove.push(...getTableCells(draggedStructure.id, state.structures))
        } else if (draggedStructure.type === 'array') {
          cellsToRemove.push(...getArrayCells(draggedStructure.id, state.structures))
        }
        
        // Remove individual cell structures
        for (const cell of cellsToRemove) {
          newStructures.delete(cell.id)
          newPositions = removeStructureFromPositionMap(cell, newPositions)
        }
      }

      state.setStructures(newStructures)
      state.setPositions(newPositions)
      
      // Clear selection since the structure was deleted
      state.setSelectedStructure(null)
    }
    
    // Clean up drag state
    handleConflictClose()
  }, [
    state.conflictDialogData,
    state.structures,
    state.positions,
    state.setStructures,
    state.setPositions,
    state.setSelectedStructure,
    handleConflictClose
  ])

  const handleReplaceWithNew = React.useCallback(() => {
    if (state.conflictDialogData && state.conflictDialogData.draggedStructure) {
      // Move structure with new values taking priority
      const {structures: newStructures, positions: newPositions} = moveStructure(
        state.conflictDialogData.draggedStructure,
        state.conflictDialogData.targetPosition,
        state.structures,
        state.positions,
        true
      )

      state.setStructures(newStructures)
      state.setPositions(newPositions)
      
      // Update selected structure with the moved structure
      const updatedStructure = newStructures.get(state.conflictDialogData.draggedStructure.id)
      if (updatedStructure) {
        state.setSelectedStructure(updatedStructure)
      }
    }
    
    // Clean up drag state
    handleConflictClose()
  }, [
    state.conflictDialogData,
    state.structures,
    state.positions,
    state.setStructures,
    state.setPositions,
    state.setSelectedStructure,
    handleConflictClose
  ])

  return (
    <div className="flex flex-col h-screen">
      <Toolbar
        selectedRange={state.selectedRange}
        onCreateStructure={createStructureFromToolbar}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Spreadsheet container */}
        <div className="flex-1 bg-gray-50 p-4 min-w-0">
          <div className="h-full bg-white border border-gray-300 rounded-lg shadow-lg">
            <SpreadsheetGrid
              structures={state.structures}
              positions={state.positions}
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
              isResizingSheetHeader={state.isResizingSheetHeader}
              sheetHeaderResizeType={state.sheetHeaderResizeType}
              sheetHeaderResizeIndex={state.sheetHeaderResizeIndex}
              isDraggingSheetHeader={state.isDraggingSheetHeader}
              sheetHeaderDragStart={state.sheetHeaderDragStart}
              sheetHeaderResizeStartPos={state.sheetHeaderResizeStartPos}
              sheetHeaderResizeStartSize={state.sheetHeaderResizeStartSize}
              isDraggingColumn={state.isDraggingColumn}
              draggedColumn={state.draggedColumn}
              columnDragStartX={state.columnDragStartX}
              columnDropTarget={state.columnDropTarget}
              isResizingStructure={state.isResizingStructure}
              structureResizeDirection={state.structureResizeDirection}
              structureResizeStartDimensions={state.structureResizeStartDimensions}
              structureResizeStartX={state.structureResizeStartX}
              structureResizeStartY={state.structureResizeStartY}
              isDraggingStructure={state.isDraggingStructure}
              draggedStructure={state.draggedStructure}
              dragOffset={state.dragOffset}
              dropTarget={state.dropTarget}
              lastValidDropTarget={state.lastValidDropTarget}
              showConflictDialog={state.showConflictDialog}
              conflictDialogData={state.conflictDialogData}
              setIsResizingStructure={state.setIsResizingStructure}
              setStructureResizeDirection={state.setStructureResizeDirection}
              setStructureResizeStartDimensions={state.setStructureResizeStartDimensions}
              setStructureResizeStartX={state.setStructureResizeStartX}
              setStructureResizeStartY={state.setStructureResizeStartY}
              setStructures={state.setStructures}
              setPositions={state.setPositions}
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
              setIsResizingSheetHeader={state.setIsResizingSheetHeader}
              setSheetHeaderResizeType={state.setSheetHeaderResizeType}
              setSheetHeaderResizeIndex={state.setSheetHeaderResizeIndex}
              setSheetHeaderResizeStartPos={state.setSheetHeaderResizeStartPos}
              setSheetHeaderResizeStartSize={state.setSheetHeaderResizeStartSize}
              setIsDraggingColumn={state.setIsDraggingColumn}
              setDraggedColumn={state.setDraggedColumn}
              setColumnDragStartX={state.setColumnDragStartX}
              setColumnDropTarget={state.setColumnDropTarget}
              setColumnWidths={state.setColumnWidths}
              setRowHeights={state.setRowHeights}
              setIsDraggingStructure={state.setIsDraggingStructure}
              setDraggedStructure={state.setDraggedStructure}
              setDragOffset={state.setDragOffset}
              setDropTarget={state.setDropTarget}
              setLastValidDropTarget={state.setLastValidDropTarget}
              setShowConflictDialog={state.setShowConflictDialog}
              setConflictDialogData={state.setConflictDialogData}
              onCellUpdate={updateCell}
              onDeleteStructure={deleteStructure}
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
          onUpdateTableHeaders={updateTableHeaders}
          onUpdateStructureName={updateStructureName}
          onSelectColumn={(tableId, columnIndex) => {
            state.setSelectedColumn({ tableId, columnIndex })
            // Also select the table structure when a column is selected
            // Find the table structure by ID
            let tableStructure = state.structures.get(tableId)
            if (tableStructure && tableStructure.type === 'table') {
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
          selectedRange={state.selectedRange}
          selectedStructure={state.selectedStructure}
          setContextMenu={state.setContextMenu}
          updateTableHeaders={updateTableHeaders}
          createStructureFromToolbar={createStructureFromToolbar}
          rotateArray={rotateArray}
          canCreateStructures={state.selectedRange !== null}
        />
      )}

      {/* Conflict Dialog */}
      {state.showConflictDialog && state.conflictDialogData && (
        <ConflictDialog
          isOpen={state.showConflictDialog}
          onClose={handleConflictClose}
          onKeepExisting={handleKeepExisting}
          onReplaceWithNew={handleReplaceWithNew}
          conflictingCells={state.conflictDialogData.conflictingCells}
          targetPosition={state.conflictDialogData.targetPosition}
        />
      )}
    </div>
  )
}
