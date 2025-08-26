import React from 'react'
import { Position, Structure, SelectionRange, ResizeType, StructureMap, PositionMap } from '../types'
import { buildPositionMapFromStructures } from '../utils/structureUtils'
import { Template } from '../components/ui/TemplatesSidebar'

export const useSpreadsheetState = () => {
  // Individual state hooks for better granular control
  const [structures, setStructures] = React.useState<StructureMap>(new Map())
  const [positions, setPositions] = React.useState<PositionMap>(new Map())
  const [selectedRange, setSelectedRange] = React.useState<SelectionRange | null>(null)
  const [selectedStructure, setSelectedStructure] = React.useState<Structure | null>(null)
  const [selectedColumn, setSelectedColumn] = React.useState<{tableId: string, columnIndex: number} | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragStart, setDragStart] = React.useState<Position | null>(null)
  const [scrollTop, setScrollTop] = React.useState(0)
  const [scrollLeft, setScrollLeft] = React.useState(0)
  const [contextMenu, setContextMenu] = React.useState<{x: number, y: number} | null>(null)
  const [hoveredHeaderCell, setHoveredHeaderCell] = React.useState<{row: number, col: number} | null>(null)
  const [showAddColumnButton, setShowAddColumnButton] = React.useState(false)
  const [columnWidths, setColumnWidths] = React.useState<Map<number, number>>(new Map())
  const [rowHeights, setRowHeights] = React.useState<Map<number, number>>(new Map())
  const [isResizingSheetHeader, setIsResizingSheetHeader] = React.useState(false)
  const [sheetHeaderResizeType, setSheetHeaderResizeType] = React.useState<ResizeType | null>(null)
  const [sheetHeaderResizeIndex, setSheetHeaderResizeIndex] = React.useState<number | null>(null)
  const [sheetHeaderResizeStartPos, setSheetHeaderResizeStartPos] = React.useState(0)
  const [sheetHeaderResizeStartSize, setSheetHeaderResizeStartSize] = React.useState(0)
  const [isResizingStructure, setIsResizingStructure] = React.useState(false)
  const [structureResizeDirection, setStructureResizeDirection] = React.useState<'left' | 'right' | 'top' | 'bottom' | 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br' | null>(null)
  const [structureResizeStartDimensions, setStructureResizeStartDimensions] = React.useState<{ rows: number, cols: number } | null>(null)
  const [structureResizeStartX, setStructureResizeStartX] = React.useState(0)
  const [structureResizeStartY, setStructureResizeStartY] = React.useState(0)
  const [startEditing, setStartEditing] = React.useState<{row: number, col: number} | null>(null)
  const [expandedTableColumns, setExpandedTableColumns] = React.useState<Set<string>>(new Set())
  const [structurePanelCollapsed, setStructurePanelCollapsed] = React.useState(false)
  const [structurePanelWidth, setStructurePanelWidth] = React.useState(320)
  const [isDraggingStructure, setIsDraggingStructure] = React.useState(false)
  const [draggedStructure, setDraggedStructure] = React.useState<Structure | null>(null)
  const [dragOffset, setDragOffset] = React.useState<Position | null>(null)
  const [dropTarget, setDropTarget] = React.useState<Position | null>(null)
  const [lastValidDropTarget, setLastValidDropTarget] = React.useState<Position | null>(null)
  const [showConflictDialog, setShowConflictDialog] = React.useState(false)
  const [conflictDialogData, setConflictDialogData] = React.useState<{
    targetPosition: Position
    conflictingCells: Array<{row: number, col: number, existingValue: string, newValue: string}>
    draggedStructure: Structure
  } | null>(null)
  const [isDraggingColumn, setIsDraggingColumn] = React.useState(false)
  const [draggedColumn, setDraggedColumn] = React.useState<{tableId: string, columnIndex: number} | null>(null)
  const [columnDragStartX, setColumnDragStartX] = React.useState(0)
  const [columnDropTarget, setColumnDropTarget] = React.useState<{tableId: string, targetColumnIndex: number} | null>(null)

  // Template-related state
  const [templates, setTemplates] = React.useState<Template[]>([])
  const [templatesSidebarCollapsed, setTemplatesSidebarCollapsed] = React.useState(false)
  const [templatesSidebarWidth, setTemplatesSidebarWidth] = React.useState(280)
  const [isEditingTemplate, setIsEditingTemplate] = React.useState(false)
  const [currentTemplate, setCurrentTemplate] = React.useState<Template | null>(null)
  const [templateStructures, setTemplateStructures] = React.useState<StructureMap>(new Map())
  const [templatePositions, setTemplatePositions] = React.useState<PositionMap>(new Map())

  // Keep position map in sync with structures
  React.useEffect(() => {
    setPositions(buildPositionMapFromStructures(structures))
  }, [structures])

  // Keep template position map in sync with template structures
  React.useEffect(() => {
    setTemplatePositions(buildPositionMapFromStructures(templateStructures))
  }, [templateStructures])

  return {
    // State values
    structures,
    positions,
    selectedRange,
    selectedStructure,
    selectedColumn,
    isDraggingSheetHeader: isDragging,
    sheetHeaderDragStart: dragStart,
    scrollTop,
    scrollLeft,
    contextMenu,
    hoveredHeaderCell,
    showAddColumnButton,
    columnWidths,
    rowHeights,
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
    startEditing,
    expandedTableColumns,
    structurePanelCollapsed,
    structurePanelWidth,
    isDraggingStructure,
    draggedStructure,
    dragOffset,
    dropTarget,
    lastValidDropTarget,
    showConflictDialog,
    conflictDialogData,
    isDraggingColumn,
    draggedColumn,
    columnDragStartX,
    columnDropTarget,

    // Template state values
    templates,
    templatesSidebarCollapsed,
    templatesSidebarWidth,
    isEditingTemplate,
    currentTemplate,
    templateStructures,
    templatePositions,

    // State setters
    setStructures,
    setPositions,
    setSelectedRange,
    setSelectedStructure,
    setSelectedColumn,
    setIsDragging,
    setDragStart,
    setScrollTop,
    setScrollLeft,
    setContextMenu,
    setHoveredHeaderCell,
    setShowAddColumnButton,
    setColumnWidths,
    setRowHeights,
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
    setStartEditing,
    setExpandedTableColumns,
    setStructurePanelCollapsed,
    setStructurePanelWidth,
    setIsDraggingStructure,
    setDraggedStructure,
    setDragOffset,
    setDropTarget,
    setLastValidDropTarget,
    setShowConflictDialog,
    setConflictDialogData,
    setIsDraggingColumn,
    setDraggedColumn,
    setColumnDragStartX,
    setColumnDropTarget,

    // Template state setters
    setTemplates,
    setTemplatesSidebarCollapsed,
    setTemplatesSidebarWidth,
    setIsEditingTemplate,
    setCurrentTemplate,
    setTemplateStructures,
    setTemplatePositions,
  }
}
