import React from 'react'
import { SpreadsheetGrid } from './spreadsheet/SpreadsheetGrid'
import { TemplateBoundary } from './spreadsheet/TemplateBoundary'
import { Toolbar } from './ui/Toolbar'
import { FormulaBar, FormulaBarRef } from './ui/FormulaBar'
import { StructurePanel } from './ui/StructurePanel'
import { ContextMenu } from './ui/ContextMenu'
import { TemplatesSidebar } from './ui/TemplatesSidebar'
import { useSpreadsheetState } from '../hooks/useSpreadsheetState'
import { useCellOperations } from '../hooks/useCellOperations'
import { useStructureOperations } from '../hooks/useStructureOperations'
import { useTemplateOperations } from '../hooks/useTemplateOperations'
import { useTemplateStructureOperations } from '../hooks/useTemplateStructureOperations'
import { getCellValue, getStructureAtPosition } from '../utils/structureUtils'
import { CellStructure } from '../types'

export const App: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const formulaBarRef = React.useRef<FormulaBarRef>(null)
  
  // Use custom hooks for state management
  const state = useSpreadsheetState()
  
  const { 
    createStructureFromToolbar, 
    updateTableHeaders,
    updateStructureName,
    updateStructureFormula,
    updateArrayContentType,
    triggerRecalculation,
    rotateArray,
    deleteStructure,
    dependencyManager
  } = useStructureOperations(
    state.structures,
    state.setStructures,
    state.positions,
    state.setPositions,
    state.selectedRange,
    state.setSelectedStructure
  )

  // Use custom hooks for operations
  const { updateCell } = useCellOperations(
    state.structures, 
    state.setStructures,
    state.positions,
    state.setPositions,
    triggerRecalculation,
    dependencyManager
  )

  // Template cell operations - separate from main grid
  const { updateCell: updateTemplateCell } = useCellOperations(
    state.templateStructures,
    state.setTemplateStructures,
    state.templatePositions,
    state.setTemplatePositions,
    undefined // No formula recalculation for templates yet
  )

  // Template operations
  const {
    createTemplate,
    openTemplate,
    closeTemplate,
    saveTemplate,
    saveTemplateWithPropagation,
    deleteTemplate,
    updateTemplate
  } = useTemplateOperations(
    state.templates,
    state.setTemplates,
    state.setIsEditingTemplate,
    state.setCurrentTemplate,
    state.setTemplateStructures,
    state.setTemplatePositions,
    state.setScrollTop,
    state.setScrollLeft,
    state.setSelectedRange,
    state.setSelectedStructure,
    // Additional parameters for propagation support
    state.structures,
    state.positions,
    state.setStructures,
    state.setPositions,
    updateCell
  )

  // Template structure operations - separate from main grid
  const {
    createTemplateStructureFromToolbar,
    deleteTemplateStructure,
    updateTemplateStructureName,
    updateTemplateStructureFormula,
    rotateTemplateArray
  } = useTemplateStructureOperations(
    state.templateStructures,
    state.setTemplateStructures,
    state.templatePositions,
    state.setTemplatePositions,
    state.selectedRange,
    state.setSelectedStructure
  )

  // Formula bar helpers
  const getCurrentCellInfo = React.useCallback(() => {
    // If there's a selected structure, use its formula
    if (state.selectedStructure) {
      return {
        cellValue: '', // Structures don't have a "value" in the same way cells do
        cellFormula: state.selectedStructure.formula || ''
      }
    }

    // Fall back to cell-based logic if no structure is selected
    if (!state.selectedRange || state.selectedRange.start.row !== state.selectedRange.end.row || 
        state.selectedRange.start.col !== state.selectedRange.end.col) {
      return { cellValue: '', cellFormula: '' }
    }

    const { row, col } = state.selectedRange.start
    const currentStructures = state.isEditingTemplate ? state.templateStructures : state.structures
    const currentPositions = state.isEditingTemplate ? state.templatePositions : state.positions
    
    // Get cell structure if it exists
    const cellStructure = getStructureAtPosition(row, col, currentPositions, currentStructures)
    if (cellStructure && cellStructure.type === 'cell') {
      const cell = cellStructure as CellStructure
      return {
        cellValue: cell.value || '',
        cellFormula: cell.formula || ''
      }
    }

    // Fall back to getting any value at this position
    const cellValue = getCellValue(row, col, currentStructures, currentPositions)
    return {
      cellValue: cellValue || '',
      cellFormula: ''
    }
  }, [state.selectedStructure, state.selectedRange, state.structures, state.positions, state.templateStructures, state.templatePositions, state.isEditingTemplate])

  const handleFormulaChange = React.useCallback((formula: string) => {
    state.setCurrentFormula(formula)
  }, [state.setCurrentFormula])

  const handleFormulaCommit = React.useCallback((formula: string) => {
    // If there's a selected structure, update its formula (always, even if empty to allow clearing formulas)
    if (state.selectedStructure) {
      const currentUpdateStructureFormula = state.isEditingTemplate ? updateTemplateStructureFormula : updateStructureFormula
      currentUpdateStructureFormula(state.selectedStructure.id, formula)
      
      // Clear current formula
      state.setCurrentFormula('')
      return
    }

    // Fall back to cell-based logic if no structure is selected
    if (!state.selectedRange || state.selectedRange.start.row !== state.selectedRange.end.row || 
        state.selectedRange.start.col !== state.selectedRange.end.col) {
      return
    }

    // Only create/update a cell if the formula is not empty
    if (formula.trim() !== '') {
      const { row, col } = state.selectedRange.start
      const currentUpdateCell = state.isEditingTemplate ? updateTemplateCell : updateCell
      
      // Update the cell with the new formula
      currentUpdateCell(row, col, formula)
    }
    
    // Clear current formula regardless
    state.setCurrentFormula('')
  }, [state.selectedStructure, state.selectedRange, updateCell, updateTemplateCell, updateStructureFormula, updateTemplateStructureFormula, state.isEditingTemplate, state.setCurrentFormula])

  const handleGridClick = React.useCallback((row: number, col: number, structure?: any) => {
    // If formula bar is focused, try to insert reference
    if (state.isFormulaBarFocused && formulaBarRef.current) {
      const inserted = formulaBarRef.current.handleGridClick(row, col, structure)
      if (inserted) {
        return true // Reference was inserted, stop processing
      }
    }
    
    // Normal cell selection logic would go here
    // For now, just update selected range
    state.setSelectedRange({ start: { row, col }, end: { row, col } })
    return false // No reference was inserted
  }, [state.isFormulaBarFocused, state.setSelectedRange])

  // Track previous selected structure and range for auto-save
  const prevSelectedStructureRef = React.useRef(state.selectedStructure)
  const prevSelectedRangeRef = React.useRef(state.selectedRange)
  
  // Auto-save formula when structure selection changes
  React.useEffect(() => {
    const prevStructure = prevSelectedStructureRef.current
    const currentStructure = state.selectedStructure
    
    // If structure changed and we have current formula content, save it to the previous structure
    if (prevStructure !== currentStructure && state.currentFormula.trim() !== '') {
      if (prevStructure) {
        // Save to previous structure (always update structures, even with empty formulas to allow clearing)
        const currentUpdateStructureFormula = state.isEditingTemplate ? updateTemplateStructureFormula : updateStructureFormula
        currentUpdateStructureFormula(prevStructure.id, state.currentFormula)
      } else if (!prevStructure && prevSelectedRangeRef.current && 
                 prevSelectedRangeRef.current.start.row === prevSelectedRangeRef.current.end.row && 
                 prevSelectedRangeRef.current.start.col === prevSelectedRangeRef.current.end.col) {
        // Only create/update cell if formula is not empty (don't create cells for empty formulas)
        const { row, col } = prevSelectedRangeRef.current.start
        const currentUpdateCell = state.isEditingTemplate ? updateTemplateCell : updateCell
        currentUpdateCell(row, col, state.currentFormula)
      }
      
      // Clear the formula after saving
      state.setCurrentFormula('')
    }
    
    // Update the ref for next time
    prevSelectedStructureRef.current = currentStructure
  }, [state.selectedStructure, state.currentFormula, updateStructureFormula, updateTemplateStructureFormula, updateCell, updateTemplateCell, state.isEditingTemplate, state.setCurrentFormula])

  // Auto-save formula when cell selection changes (but no structure selected)
  React.useEffect(() => {
    const prevRange = prevSelectedRangeRef.current
    const currentRange = state.selectedRange
    
    // Only handle cell-to-cell transitions when no structure is selected
    if (!state.selectedStructure && !prevSelectedStructureRef.current && state.currentFormula.trim() !== '') {
      // Check if the range actually changed
      const rangeChanged = !prevRange || !currentRange ||
        prevRange.start.row !== currentRange.start.row ||
        prevRange.start.col !== currentRange.start.col ||
        prevRange.end.row !== currentRange.end.row ||
        prevRange.end.col !== currentRange.end.col
      
      if (rangeChanged && prevRange && 
          prevRange.start.row === prevRange.end.row && 
          prevRange.start.col === prevRange.end.col) {
        // Save to the previous cell
        const { row, col } = prevRange.start
        const currentUpdateCell = state.isEditingTemplate ? updateTemplateCell : updateCell
        currentUpdateCell(row, col, state.currentFormula)
        
        // Clear the formula after saving
        state.setCurrentFormula('')
      }
    }
    
    // Update the ref for next time
    prevSelectedRangeRef.current = currentRange
  }, [state.selectedRange, state.selectedStructure, state.currentFormula, updateCell, updateTemplateCell, state.isEditingTemplate, state.setCurrentFormula])

  // Get current cell info for formula bar
  const currentCellInfo = getCurrentCellInfo()

  return (
    <div className="flex flex-col h-screen">
      <Toolbar
        selectedRange={state.selectedRange}
        onCreateStructure={state.isEditingTemplate ? createTemplateStructureFromToolbar : createStructureFromToolbar}
      />
      
      {/* Formula Bar */}
      <FormulaBar
        ref={formulaBarRef}
        selectedCell={state.selectedRange && state.selectedRange.start.row === state.selectedRange.end.row && 
                     state.selectedRange.start.col === state.selectedRange.end.col ? 
                     state.selectedRange.start : null}
        cellValue={currentCellInfo.cellValue}
        cellFormula={currentCellInfo.cellFormula}
        structures={state.isEditingTemplate ? state.templateStructures : state.structures}
        positions={state.isEditingTemplate ? state.templatePositions : state.positions}
        onFormulaChange={handleFormulaChange}
        onFormulaCommit={handleFormulaCommit}
        onCellFocus={(row, col) => state.setSelectedRange({ start: { row, col }, end: { row, col } })}
        isFormulaBarFocused={state.isFormulaBarFocused}
        onFormulaBarFocus={state.setIsFormulaBarFocused}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Templates Sidebar */}
        {!state.isEditingTemplate && (
          <TemplatesSidebar
            templates={state.templates}
            onCreateTemplate={createTemplate}
            onOpenTemplate={openTemplate}
            onDeleteTemplate={deleteTemplate}
            isCollapsed={state.templatesSidebarCollapsed}
            width={state.templatesSidebarWidth}
            onToggleCollapse={() => state.setTemplatesSidebarCollapsed(!state.templatesSidebarCollapsed)}
            onWidthChange={state.setTemplatesSidebarWidth}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 bg-gray-50 p-4 min-w-0">
          {state.isEditingTemplate ? (
            /* Template Editing View */
            <div className="h-full bg-white border border-gray-300 rounded-lg shadow-lg">
              {/* Template Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Editing: {state.currentTemplate?.name}
                  </h2>
                  <span className="ml-3 text-sm text-gray-500">
                    {state.currentTemplate?.dimensions.rows} × {state.currentTemplate?.dimensions.cols}
                  </span>
                </div>
                <button
                  onClick={() => {
                    // Save template data with propagation first
                    saveTemplateWithPropagation(state.currentTemplate, state.templateStructures, {})
                    // Then close
                    closeTemplate()
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Save & Close
                </button>
              </div>
              
              {/* Template Grid - For now, we'll use the same SpreadsheetGrid but with template data */}
              <div className="flex-1 relative">
                <SpreadsheetGrid
                  structures={state.templateStructures}
                  positions={state.templatePositions}
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
                  setStructures={state.setTemplateStructures}
                  setPositions={state.setTemplatePositions}
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
                  selectedStructureLevel={state.selectedStructureLevel}
                  lastClickedPosition={state.lastClickedPosition}
                  setSelectedStructureLevel={state.setSelectedStructureLevel}
                  setLastClickedPosition={state.setLastClickedPosition}
                  onCellUpdate={updateTemplateCell}
                  onDeleteStructure={deleteTemplateStructure}
                  containerRef={containerRef}
                />
                
                {/* Template Boundary Overlay */}
                {state.currentTemplate && (
                  <TemplateBoundary
                    template={state.currentTemplate}
                    onUpdateTemplate={updateTemplate}
                    columnWidths={state.columnWidths}
                    rowHeights={state.rowHeights}
                    startRow={Math.floor(state.scrollTop / 24)}
                    endRow={Math.floor(state.scrollTop / 24) + 50}
                    startCol={Math.floor(state.scrollLeft / 100)}
                    endCol={Math.floor(state.scrollLeft / 100) + 20}
                  />
                )}
              </div>
            </div>
          ) : (
            /* Normal Spreadsheet View */
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
                templates={state.templates}
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
                selectedStructureLevel={state.selectedStructureLevel}
                lastClickedPosition={state.lastClickedPosition}
                setSelectedStructureLevel={state.setSelectedStructureLevel}
                setLastClickedPosition={state.setLastClickedPosition}
                onCellUpdate={updateCell}
                onDeleteStructure={deleteStructure}
                onGridClick={handleGridClick}
                containerRef={containerRef}
              />
            </div>
          )}
        </div>

        {/* Structure Panel */}
        <StructurePanel
          structures={state.isEditingTemplate ? state.templateStructures : state.structures}
          selectedStructure={state.selectedStructure}
          selectedColumn={state.selectedColumn}
          expandedTableColumns={state.expandedTableColumns}
          onUpdateTableHeaders={updateTableHeaders}
          onUpdateStructureName={state.isEditingTemplate ? updateTemplateStructureName : updateStructureName}
          onUpdateStructureFormula={state.isEditingTemplate ? updateTemplateStructureFormula : updateStructureFormula}
          onUpdateArrayContentType={updateArrayContentType}
          availableTemplates={state.templates.map(t => ({ id: t.id, name: t.name }))}
          onSelectColumn={(tableId, columnIndex) => {
            state.setSelectedColumn({ tableId, columnIndex })
            // Also select the table structure when a column is selected
            // Find the table structure by ID in the appropriate structures map
            const structuresMap = state.isEditingTemplate ? state.templateStructures : state.structures
            let tableStructure = structuresMap.get(tableId)
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
          createStructureFromToolbar={state.isEditingTemplate ? createTemplateStructureFromToolbar : createStructureFromToolbar}
          rotateArray={state.isEditingTemplate ? rotateTemplateArray : rotateArray}
          canCreateStructures={state.selectedRange !== null}
        />
      )}
    </div>
  )
}
