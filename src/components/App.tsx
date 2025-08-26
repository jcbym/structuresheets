import React from 'react'
import { SpreadsheetGrid } from './spreadsheet/SpreadsheetGrid'
import { TemplateBoundary } from './spreadsheet/TemplateBoundary'
import { Toolbar } from './ui/Toolbar'
import { StructurePanel } from './ui/StructurePanel'
import { ContextMenu } from './ui/ContextMenu'
import { TemplatesSidebar } from './ui/TemplatesSidebar'
import { useSpreadsheetState } from '../hooks/useSpreadsheetState'
import { useCellOperations } from '../hooks/useCellOperations'
import { useStructureOperations } from '../hooks/useStructureOperations'
import { useTemplateOperations } from '../hooks/useTemplateOperations'
import { useTemplateStructureOperations } from '../hooks/useTemplateStructureOperations'

export const App: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  
  // Use custom hooks for state management
  const state = useSpreadsheetState()
  
  const { 
    createStructureFromToolbar, 
    updateTableHeaders,
    updateStructureName,
    updateStructureFormula,
    triggerRecalculation,
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

  // Use custom hooks for operations
  const { updateCell } = useCellOperations(
    state.structures, 
    state.setStructures,
    state.positions,
    state.setPositions,
    triggerRecalculation
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

  return (
    <div className="flex flex-col h-screen">
      <Toolbar
        selectedRange={state.selectedRange}
        onCreateStructure={state.isEditingTemplate ? createTemplateStructureFromToolbar : createStructureFromToolbar}
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
                onCellUpdate={updateCell}
                onDeleteStructure={deleteStructure}
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
