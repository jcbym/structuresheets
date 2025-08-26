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
  getEndPosition,
  getCellKey
} from '../../utils/structureUtils'
import { COLUMN_LETTERS, Z_INDEX, MAX_ROWS, CELL_COLOR, TABLE_COLOR, ARRAY_COLOR, TEMPLATE_COLOR } from '../../constants'
import { 
  instantiateTemplate as createTemplateInstance, 
  validateTemplateInstantiation, 
  addInstantiatedTemplateToStructures 
} from '../../utils/templateInstantiation'
import { getTemplateDragState, clearTemplateDragState } from '../../utils/templateDragState'

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
  renderGridOverlays,
  StructureRenderProps 
} from './structureRenderers'

// Import modular cell renderers
import { 
  isHeaderCell,
  getCellClasses,
  getCellStyle,
  isCellCoveredByResizedCell,
  renderCellContent,
  CellContentProps
} from './cellRenderers'

// Import modular grid renderers
import { 
  renderColumnHeaders,
  renderRows,
  GridRenderProps
} from './gridRenderers'

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
  // Templates for version tracking
  templates?: any[]
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
  templates,
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
  
  // State for tracking template drag from sidebar
  const [isDraggingTemplateFromSidebar, setIsDraggingTemplateFromSidebar] = React.useState(false)
  const [templateDragData, setTemplateDragData] = React.useState<{
    templateId: string
    name: string
    dimensions: { rows: number, cols: number }
  } | null>(null)
  const [templateDropTarget, setTemplateDropTarget] = React.useState<Position | null>(null)
  
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
    getCellKey,
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

  // Scroll handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    setScrollTop(target.scrollTop)
    setScrollLeft(target.scrollLeft)
  }

  // Function to process template drag movement and calculate drop target
  const processTemplateDragMove = React.useCallback((e: React.DragEvent) => {
    if (!isDraggingTemplateFromSidebar || !templateDragData || !containerRef.current) return

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
    
    const newDropTarget = { row: targetRow, col: targetCol }
    
    // Validate the drop location before updating the visual indicator
    const validation = validateTemplateInstantiation(
      templateDragData.templateId,
      newDropTarget,
      templateDragData.dimensions,
      structures,
      positions
    )
    
    if (validation.isValid) {
      // Valid location: update the drop target for visual indicator
      setTemplateDropTarget(newDropTarget)
    }
    // For invalid locations: don't update templateDropTarget, so indicator stays at last valid position
    // This provides consistent behavior with structure dragging
  }, [isDraggingTemplateFromSidebar, templateDragData, containerRef, scrollLeft, scrollTop, rowHeights, columnWidths, structures, positions])

  // Template drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    // Check if this is a template being dragged
    if (e.dataTransfer.types.includes('application/template')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      
      // Try to get the real template data during dragover (works in some browsers)
      try {
        const templateData = e.dataTransfer.getData('application/template')
        if (templateData && templateData.trim() && templateDragData?.templateId === 'unknown') {
          const { templateId, name, dimensions } = JSON.parse(templateData)
          setTemplateDragData({ templateId, name, dimensions })
        }
      } catch (error) {
        // If we can't get the data, keep the current data
      }
      
      // Process the drag movement to update drop target
      processTemplateDragMove(e)
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/template')) {
      e.preventDefault()
      
      // Set dragging flag immediately
      setIsDraggingTemplateFromSidebar(true)
      
      // Get real template data from shared state (set by sidebar during drag start)
      const sharedDragState = getTemplateDragState()
      if (sharedDragState.isDragging && sharedDragState.templateData) {
        // Use real template dimensions from shared state
        setTemplateDragData(sharedDragState.templateData)
      } else {
        // Try to get the real template data from dataTransfer (may work in some browsers)
        try {
          const templateData = e.dataTransfer.getData('application/template')
          if (templateData && templateData.trim()) {
            const { templateId, name, dimensions } = JSON.parse(templateData)
            setTemplateDragData({ templateId, name, dimensions })
          } else {
            // Fallback to placeholder if we can't get real data
            setTemplateDragData({
              templateId: 'unknown',
              name: 'Template',
              dimensions: { rows: 2, cols: 2 }
            })
          }
        } catch (error) {
          // Fallback to placeholder data
          setTemplateDragData({
            templateId: 'unknown',
            name: 'Template',
            dimensions: { rows: 2, cols: 2 }
          })
        }
      }
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear state if we're actually leaving the grid container
    if (e.currentTarget === e.target) {
      setIsDraggingTemplateFromSidebar(false)
      setTemplateDragData(null)
      setTemplateDropTarget(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    
    // Check if this is a template
    const templateData = e.dataTransfer.getData('application/template')
    if (templateData) {
      try {
        const { templateId, name, dimensions } = JSON.parse(templateData)
        
        // Use the calculated drop target from drag over, or fall back to mouse position
        let targetPosition = templateDropTarget
        
        if (!targetPosition && containerRef.current) {
          // Fallback: Calculate the drop position based on mouse coordinates
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
          
          targetPosition = { row: targetRow, col: targetCol }
        }
        
        // Call template instantiation function with actual template data
        if (targetPosition) {
          instantiateTemplate(templateId, targetPosition, dimensions, name)
        }
        
      } catch (error) {
        console.error('Failed to parse template data:', error)
        // Show user-friendly error message
        alert('Failed to drop template. Please try again.')
      } finally {
        // Clean up template drag state
        setIsDraggingTemplateFromSidebar(false)
        setTemplateDragData(null)
        setTemplateDropTarget(null)
      }
    }
  }

  // Template instantiation function
  const instantiateTemplate = (templateId: string, position: Position, dimensions: { rows: number, cols: number }, templateName?: string) => {
    try {
      // Validate the drop location
      const validation = validateTemplateInstantiation(
        templateId,
        position,
        dimensions,
        structures,
        positions
      )
      
      if (!validation.isValid) {
        console.warn('Cannot instantiate template: conflicts detected at positions:', validation.conflicts)
        // Show user-friendly error message
        const conflictCount = validation.conflicts.length
        alert(`Cannot place template here. ${conflictCount} cell${conflictCount > 1 ? 's' : ''} would overlap with existing content.`)
        return
      }
      
      // Find the current template to get its version
      const currentTemplate = templates?.find(t => t.id === templateId)
      const templateVersion = currentTemplate?.version || 1
      
      // Create the template instance with current version
      const instantiationResult = createTemplateInstance(templateId, position, dimensions, templateVersion)
      
      // Update the template structure name if provided
      if (templateName) {
        instantiationResult.templateStructure.name = templateName
      }
      
      // Add the instantiated template to the structures
      const { newStructures, newPositions } = addInstantiatedTemplateToStructures(
        instantiationResult,
        structures,
        positions,
        onCellUpdate
      )
      
      // Update the state
      setStructures(newStructures)
      setPositions(newPositions)
      
      // Select the newly created template structure
      selectStructure(instantiationResult.templateStructure)
      
      // Success feedback
      console.log(`Successfully instantiated template "${templateName || templateId}" at position ${position.row}, ${position.col}`)
      
    } catch (error) {
      console.error('Failed to instantiate template:', error)
      // Show user-friendly error message
      alert('Failed to create template instance. Please try again.')
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

  const renderCell = (
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

    const cellContentProps: CellContentProps = {
      row,
      col,
      value,
      isSelected,
      structure,
      isInRange,
      cellKey,
      isEditing,
      cellValue,
      handleMouseEnter,
      handleMouseUp,
      handleRightClick,
      handleCellDoubleClick,
      handleCellKeyDownGeneral,
      handleCellBlur,
      handleCellFocusChange,
      handleCellKeyDown,
      setCellValues
    }

    return renderCellContent(cellContentProps)
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


  return (
    <div 
      ref={containerRef}
      className="overflow-auto h-full w-full rounded-lg"
      style={{ position: 'relative' }}
      onScroll={handleScroll}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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
        {renderColumnHeaders({
          startRow,
          endRow,
          startCol,
          endCol,
          columnWidths,
          rowHeights,
          structures,
          positions,
          selectedRange,
          handleResizeMouseDown,
          handleMouseEnter,
          handleHeaderHover,
          handleColumnHeaderClick,
          handleColumnHeaderMouseDown,
          handleMouseDown,
          setHoveredStructure,
          renderCell
        })}
        
        {/* Rows and cells */}
        {renderRows({
          startRow,
          endRow,
          startCol,
          endCol,
          columnWidths,
          rowHeights,
          structures,
          positions,
          selectedRange,
          handleResizeMouseDown,
          handleMouseEnter,
          handleHeaderHover,
          handleColumnHeaderClick,
          handleColumnHeaderMouseDown,
          handleMouseDown,
          setHoveredStructure,
          renderCell
        })}
        
        {/* Structure overlays */}
        {renderStructureOverlays()}
        
        {/* Grid overlays (column selections, drag indicators, etc.) */}
        {renderGridOverlays(
          columnWidths,
          rowHeights,
          startRow,
          endRow,
          startCol,
          endCol,
          selectedColumn,
          structures,
          isDraggingStructure,
          draggedStructure,
          dropTarget,
          isDraggingTemplateFromSidebar,
          templateDropTarget,
          templateDragData
        )}
        
        {/* Structure name tabs */}
        {renderStructureNameTabs()}
        
        {/* Add buttons overlay */}
        {renderAddButtons()}
      </div>
    </div>
  )
}
