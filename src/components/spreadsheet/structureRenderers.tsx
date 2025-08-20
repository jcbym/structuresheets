import React from 'react'
import { Structure, CellStructure, TableStructure, ArrayStructure, Position } from '../../types'
import { 
  getColumnPosition, 
  getRowPosition, 
  getColumnWidth, 
  getRowHeight
} from '../../utils/sheetUtils'
import { getEndPosition } from '../../utils/structureUtils'
import { Z_INDEX, MAX_ROWS, CELL_COLOR, TABLE_COLOR, ARRAY_COLOR } from '../../constants'

// Types for rendering props
export interface StructureRenderProps {
  structure: Structure
  startRow: number
  endRow: number
  startCol: number
  endCol: number
  columnWidths: Map<number, number>
  rowHeights: Map<number, number>
  selectedStructure: Structure | null
  selectedColumn: {tableId: string, columnIndex: number} | null
  hoveredStructure: Structure | null
  isResizingStructure: boolean
  isDraggingStructure: boolean
  isDraggingColumn: boolean
  draggedStructure: Structure | null
  dropTarget: Position | null
  editingStructureName: string | null
  editingNameValue: string
  hoveredAddButton: {
    type: 'column' | 'row'
    position: 'left' | 'right' | 'bottom' | 'top'
    structureId: string
    insertIndex: number
    x: number
    y: number
  } | null
  
  // Event handlers
  setSelectedColumn: React.Dispatch<React.SetStateAction<{tableId: string, columnIndex: number} | null>>
  setSelectedRange: React.Dispatch<React.SetStateAction<{start: Position, end: Position} | null>>
  setStartEditing: React.Dispatch<React.SetStateAction<Position | null>>
  selectStructure: (structure: Structure) => void
  startStructureDrag: (structure: Structure, e: React.MouseEvent, rowOffset: number, colOffset: number) => void
  handleStructureResizeMouseDown: (direction: 'left' | 'right' | 'top' | 'bottom' | 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br', e: React.MouseEvent) => void
  handleStructureNameDoubleClick: (structure: Structure) => void
  handleStructureNameChange: (value: string) => void
  handleStructureNameSubmit: () => void
  handleStructureNameCancel: () => void
  setHoveredAddButton: React.Dispatch<React.SetStateAction<any>>
  handleAddColumn: (structureId: string, insertIndex: number, position: 'left' | 'right') => void
  handleAddRow: (structureId: string, insertIndex: number, position: 'bottom') => void
}

// =============================================================================
// SHARED UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate the screen position and dimensions for a structure
 */
export function calculateStructureLayout(
  structure: Structure, 
  columnWidths: Map<number, number>, 
  rowHeights: Map<number, number>
) {
  const { startPosition, dimensions } = structure
  const endPosition = getEndPosition(startPosition, dimensions)
  
  const left = getColumnPosition(startPosition.col, columnWidths)
  const top = getRowPosition(startPosition.row, rowHeights)
  
  let width = 0
  for (let c = startPosition.col; c <= endPosition.col; c++) {
    width += getColumnWidth(c, columnWidths)
  }
  
  let height = 0
  for (let r = startPosition.row; r <= endPosition.row; r++) {
    height += getRowHeight(r, rowHeights)
  }
  
  return { left, top, width, height, endPosition }
}

/**
 * Check if a structure is visible in the current viewport
 */
export function isStructureVisible(
  structure: Structure,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number
): boolean {
  const endPosition = getEndPosition(structure.startPosition, structure.dimensions)
  
  return (
    endPosition.row >= startRow &&
    structure.startPosition.row < endRow &&
    endPosition.col >= startCol &&
    structure.startPosition.col < endCol
  )
}

/**
 * Get border styling for a structure type
 */
export function getStructureBorderStyle(structure: Structure, isSelected: boolean) {
  const borderColor = structure.type === 'cell' ? CELL_COLOR.BORDER :
                     structure.type === 'array' ? ARRAY_COLOR.BORDER : TABLE_COLOR.BORDER
  const borderWidth = isSelected ? 'border-3' : structure.type === 'cell' ? '' : 'border-2'
  
  return { borderColor, borderWidth }
}

// =============================================================================
// STRUCTURE-SPECIFIC RENDERING FUNCTIONS
// =============================================================================

/**
 * Render cell structure overlays
 */
export function renderCellStructure(props: StructureRenderProps): React.ReactElement[] {
  const { structure } = props
  const cellStructure = structure as CellStructure
  
  if (!isStructureVisible(structure, props.startRow, props.endRow, props.startCol, props.endCol)) {
    return []
  }
  
  const overlays = []
  const layout = calculateStructureLayout(structure, props.columnWidths, props.rowHeights)
  const isSelected = props.selectedStructure?.id === structure.id
  const { borderColor, borderWidth } = getStructureBorderStyle(structure, isSelected)
  
  // Main border overlay
  if (borderWidth) { // Only render border for non-single cells
    overlays.push(
      <div
        key={`cell-overlay-${structure.id}`}
        className={`absolute ${borderWidth} ${borderColor}`}
        style={{
          left: layout.left,
          top: layout.top,
          width: layout.width,
          height: layout.height,
          zIndex: isSelected ? Z_INDEX.STRUCTURE_OVERLAY + 1 : Z_INDEX.STRUCTURE_OVERLAY,
          pointerEvents: 'none'
        }}
        title={structure.name ? `${structure.type}: ${structure.name}` : structure.type}
      />
    )
  }
  
  // Add interactive border areas and resize handles
  overlays.push(...renderStructureInteractionAreas(props, layout))
  
  return overlays
}

/**
 * Render table structure overlays
 */
export function renderTableStructure(props: StructureRenderProps): React.ReactElement[] {
  const { structure } = props
  const tableStructure = structure as TableStructure
  
  if (!isStructureVisible(structure, props.startRow, props.endRow, props.startCol, props.endCol)) {
    return []
  }
  
  const overlays = []
  const layout = calculateStructureLayout(structure, props.columnWidths, props.rowHeights)
  const isSelected = props.selectedStructure?.id === structure.id
  const { borderColor, borderWidth } = getStructureBorderStyle(structure, isSelected)
  
  // Main border overlay
  overlays.push(
    <div
      key={`table-overlay-${structure.id}`}
      className={`absolute ${borderWidth} ${borderColor}`}
      style={{
        left: layout.left,
        top: layout.top,
        width: layout.width,
        height: layout.height,
        zIndex: isSelected ? Z_INDEX.STRUCTURE_OVERLAY + 1 : Z_INDEX.STRUCTURE_OVERLAY,
        pointerEvents: 'none'
      }}
      title={structure.name ? `${structure.type}: ${structure.name}` : structure.type}
    />
  )
  
  // Add interactive border areas and resize handles
  overlays.push(...renderStructureInteractionAreas(props, layout))
  
  // Add column selection overlay if applicable
  if (props.selectedColumn?.tableId === structure.id) {
    overlays.push(...renderColumnSelectionOverlay(props, layout))
  }
  
  // Add hover areas for add buttons when selected
  if (isSelected) {
    overlays.push(...renderTableAddButtonHoverAreas(props, layout))
  }
  
  return overlays
}

/**
 * Render array structure overlays
 */
export function renderArrayStructure(props: StructureRenderProps): React.ReactElement[] {
  const { structure } = props
  const arrayStructure = structure as ArrayStructure
  
  if (!isStructureVisible(structure, props.startRow, props.endRow, props.startCol, props.endCol)) {
    return []
  }
  
  const overlays = []
  const layout = calculateStructureLayout(structure, props.columnWidths, props.rowHeights)
  const isSelected = props.selectedStructure?.id === structure.id
  const { borderColor, borderWidth } = getStructureBorderStyle(structure, isSelected)
  
  // Main border overlay
  overlays.push(
    <div
      key={`array-overlay-${structure.id}`}
      className={`absolute ${borderWidth} ${borderColor}`}
      style={{
        left: layout.left,
        top: layout.top,
        width: layout.width,
        height: layout.height,
        zIndex: isSelected ? Z_INDEX.STRUCTURE_OVERLAY + 1 : Z_INDEX.STRUCTURE_OVERLAY,
        pointerEvents: 'none'
      }}
      title={structure.name ? `${structure.type}: ${structure.name}` : structure.type}
    />
  )
  
  // Add interactive border areas and resize handles (direction-aware)
  overlays.push(...renderArrayInteractionAreas(props, layout, arrayStructure.direction))
  
  // Add hover areas for add buttons when selected
  if (isSelected) {
    overlays.push(...renderArrayAddButtonHoverAreas(props, layout, arrayStructure.direction))
  }
  
  return overlays
}

// =============================================================================
// REUSABLE COMPONENT RENDERING FUNCTIONS
// =============================================================================

/**
 * Render interactive border areas for structure selection and dragging
 */
function renderStructureInteractionAreas(
  props: StructureRenderProps, 
  layout: ReturnType<typeof calculateStructureLayout>
): React.ReactElement[] {
  const { structure } = props
  const isSelected = props.selectedStructure?.id === structure.id
  const areas = []
  const borderWidth_px = isSelected ? 3 : (structure.type === 'cell' ? 1 : 2)
  
  // Top border
  areas.push(
    <div
      key={`border-top-${structure.id}`}
      className="absolute cursor-move"
      style={{
        left: layout.left,
        top: layout.top,
        width: layout.width,
        height: borderWidth_px,
        zIndex: isSelected ? Z_INDEX.STRUCTURE_OVERLAY + 2 : Z_INDEX.STRUCTURE_OVERLAY + 1,
        pointerEvents: 'auto'
      }}
      onClick={(e) => {
        e.stopPropagation()
        props.setSelectedColumn(null)
        if (!props.selectedStructure || props.selectedStructure.id !== structure.id) {
          props.selectStructure(structure)
          props.setStartEditing(null)
          props.setSelectedRange(null)
        }
      }}
      onMouseDown={(e) => {
        if (e.button !== 0) return
        props.startStructureDrag(structure, e, 0, 0)
      }}
    />
  )
  
  // Bottom border  
  areas.push(
    <div
      key={`border-bottom-${structure.id}`}
      className="absolute cursor-move"
      style={{
        left: layout.left,
        top: layout.top + layout.height - borderWidth_px,
        width: layout.width,
        height: borderWidth_px,
        zIndex: isSelected ? Z_INDEX.STRUCTURE_OVERLAY + 2 : Z_INDEX.STRUCTURE_OVERLAY + 1,
        pointerEvents: 'auto'
      }}
      onClick={(e) => {
        e.stopPropagation()
        props.setSelectedColumn(null)
        if (!props.selectedStructure || props.selectedStructure.id !== structure.id) {
          props.selectStructure(structure)
          props.setStartEditing(null)
          props.setSelectedRange(null)
        }
      }}
      onMouseDown={(e) => {
        if (e.button !== 0) return
        props.startStructureDrag(structure, e, layout.endPosition.row - structure.startPosition.row, 0)
      }}
    />
  )
  
  // Left border
  areas.push(
    <div
      key={`border-left-${structure.id}`}
      className="absolute cursor-move"
      style={{
        left: layout.left,
        top: layout.top + borderWidth_px,
        width: borderWidth_px,
        height: layout.height - 2 * borderWidth_px,
        zIndex: isSelected ? Z_INDEX.STRUCTURE_OVERLAY + 2 : Z_INDEX.STRUCTURE_OVERLAY + 1,
        pointerEvents: 'auto'
      }}
      onClick={(e) => {
        e.stopPropagation()
        props.setSelectedColumn(null)
        if (!props.selectedStructure || props.selectedStructure.id !== structure.id) {
          props.selectStructure(structure)
          props.setStartEditing(null)
          props.setSelectedRange(null)
        }
      }}
      onMouseDown={(e) => {
        if (e.button !== 0) return
        props.startStructureDrag(structure, e, 0, 0)
      }}
    />
  )
  
  // Right border
  areas.push(
    <div
      key={`border-right-${structure.id}`}
      className="absolute cursor-move"
      style={{
        left: layout.left + layout.width - borderWidth_px,
        top: layout.top + borderWidth_px,
        width: borderWidth_px,
        height: layout.height - 2 * borderWidth_px,
        zIndex: isSelected ? Z_INDEX.STRUCTURE_OVERLAY + 2 : Z_INDEX.STRUCTURE_OVERLAY + 1,
        pointerEvents: 'auto'
      }}
      onClick={(e) => {
        e.stopPropagation()
        props.setSelectedColumn(null)
        if (!props.selectedStructure || props.selectedStructure.id !== structure.id) {
          props.selectStructure(structure)
          props.setStartEditing(null)
          props.setSelectedRange(null)
        }
      }}
      onMouseDown={(e) => {
        if (e.button !== 0) return
        props.startStructureDrag(structure, e, 0, layout.endPosition.col - structure.startPosition.col)
      }}
    />
  )
  
  // Add resize handles for selected structures
  if (isSelected) {
    areas.push(...renderStructureResizeHandles(props, layout))
  }
  
  return areas
}

/**
 * Render resize handles for selected structures
 */
function renderStructureResizeHandles(
  props: StructureRenderProps,
  layout: ReturnType<typeof calculateStructureLayout>
): React.ReactElement[] {
  const { structure } = props
  const handles = []
  const edgeWidth = 4
  const isArray = structure.type === 'array'
  const arrayDirection = isArray ? (structure as ArrayStructure).direction : null
  
  // Left edge resize area - show for tables or horizontal arrays
  if (!isArray || arrayDirection === 'horizontal') {
    handles.push(
      <div
        key={`resize-left-${structure.id}`}
        className="absolute cursor-ew-resize"
        style={{
          left: layout.left,
          top: layout.top,
          width: edgeWidth,
          height: layout.height,
          zIndex: Z_INDEX.STRUCTURE_RESIZE_HANDLE,
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => props.handleStructureResizeMouseDown('left', e)}
        title="Resize horizontally"
      />
    )
  }
  
  // Right edge resize area - show for tables or horizontal arrays
  if (!isArray || arrayDirection === 'horizontal') {
    handles.push(
      <div
        key={`resize-right-${structure.id}`}
        className="absolute cursor-ew-resize"
        style={{
          left: layout.left + layout.width - edgeWidth,
          top: layout.top,
          width: edgeWidth,
          height: layout.height,
          zIndex: Z_INDEX.STRUCTURE_RESIZE_HANDLE,
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => props.handleStructureResizeMouseDown('right', e)}
        title="Resize horizontally"
      />
    )
  }
  
  // Top edge resize area - show for tables or vertical arrays
  if (!isArray || arrayDirection === 'vertical') {
    handles.push(
      <div
        key={`resize-top-${structure.id}`}
        className="absolute cursor-ns-resize"
        style={{
          left: layout.left,
          top: layout.top,
          width: layout.width,
          height: edgeWidth,
          zIndex: Z_INDEX.STRUCTURE_RESIZE_HANDLE,
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => props.handleStructureResizeMouseDown('top', e)}
        title="Resize vertically"
      />
    )
  }
  
  // Bottom edge resize area - show for tables or vertical arrays
  if (!isArray || arrayDirection === 'vertical') {
    handles.push(
      <div
        key={`resize-bottom-${structure.id}`}
        className="absolute cursor-ns-resize"
        style={{
          left: layout.left,
          top: layout.top + layout.height - edgeWidth,
          width: layout.width,
          height: edgeWidth,
          zIndex: Z_INDEX.STRUCTURE_RESIZE_HANDLE,
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => props.handleStructureResizeMouseDown('bottom', e)}
        title="Resize vertically"
      />
    )
  }
  
  // Corner resize areas - only show for tables
  if (!isArray) {
    const corners = [
      { key: 'tl', left: layout.left, top: layout.top, cursor: 'cursor-nw-resize', direction: 'corner-tl' },
      { key: 'tr', left: layout.left + layout.width - edgeWidth, top: layout.top, cursor: 'cursor-ne-resize', direction: 'corner-tr' },
      { key: 'bl', left: layout.left, top: layout.top + layout.height - edgeWidth, cursor: 'cursor-sw-resize', direction: 'corner-bl' },
      { key: 'br', left: layout.left + layout.width - edgeWidth, top: layout.top + layout.height - edgeWidth, cursor: 'cursor-nw-resize', direction: 'corner-br' }
    ]
    
    corners.forEach(corner => {
      handles.push(
        <div
          key={`resize-corner-${corner.key}-${structure.id}`}
          className={`absolute ${corner.cursor}`}
          style={{
            left: corner.left,
            top: corner.top,
            width: edgeWidth,
            height: edgeWidth,
            zIndex: Z_INDEX.STRUCTURE_RESIZE_HANDLE + 1,
            pointerEvents: 'auto'
          }}
          onMouseDown={(e) => props.handleStructureResizeMouseDown(corner.direction as 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br', e)}
          title="Resize both directions"
        />
      )
    })
  }
  
  return handles
}

/**
 * Render array-specific interaction areas (direction-aware resize)
 */
function renderArrayInteractionAreas(
  props: StructureRenderProps,
  layout: ReturnType<typeof calculateStructureLayout>,
  direction: 'horizontal' | 'vertical'
): React.ReactElement[] {
  // For arrays, we use the same interaction areas as other structures,
  // but the resize handles will be filtered by direction in renderStructureResizeHandles
  return renderStructureInteractionAreas(props, layout)
}

/**
 * Render column selection overlay for tables
 */
function renderColumnSelectionOverlay(
  props: StructureRenderProps,
  layout: ReturnType<typeof calculateStructureLayout>
): React.ReactElement[] {
  if (!props.selectedColumn || props.selectedColumn.tableId !== props.structure.id) {
    return []
  }
  
  const tableStructure = props.structure as TableStructure
  const selectedColIndex = tableStructure.startPosition.col + props.selectedColumn.columnIndex
  
  if (selectedColIndex >= props.startCol && selectedColIndex < props.endCol) {
    const columnLeft = getColumnPosition(selectedColIndex, props.columnWidths)
    const columnWidth = getColumnWidth(selectedColIndex, props.columnWidths)
    
    return [
      <div
        key={`column-selection-${selectedColIndex}`}
        className="absolute pointer-events-none border-3 border-green-700"
        style={{
          left: columnLeft,
          top: layout.top,
          width: columnWidth,
          height: layout.height,
          zIndex: Z_INDEX.STRUCTURE_OVERLAY + 2
        }}
        title={`Selected column ${props.selectedColumn.columnIndex + 1}`}
      />
    ]
  }
  
  return []
}

/**
 * Render hover areas for table add buttons
 */
function renderTableAddButtonHoverAreas(
  props: StructureRenderProps,
  layout: ReturnType<typeof calculateStructureLayout>
): React.ReactElement[] {
  const { structure } = props
  const areas = []
  const buttonWidth = 20
  const { startPosition } = structure
  
  // Left edge hover area
  if (startPosition.col > 0) {
    areas.push(
      <div
        key={`add-hover-left-${structure.id}`}
        className="absolute"
        style={{
          left: layout.left - buttonWidth,
          top: layout.top,
          width: buttonWidth,
          height: layout.height,
          zIndex: Z_INDEX.STRUCTURE_OVERLAY + 15,
          pointerEvents: 'auto'
        }}
        onMouseEnter={() => {
          props.setHoveredAddButton({
            type: 'column',
            position: 'left',
            structureId: structure.id,
            insertIndex: startPosition.col,
            x: layout.left - buttonWidth,
            y: layout.top
          })
        }}
        onMouseLeave={() => props.setHoveredAddButton(null)}
      />
    )
  }
  
  // Right edge hover area
  if (layout.endPosition.col < 25) {
    areas.push(
      <div
        key={`add-hover-right-${structure.id}`}
        className="absolute"
        style={{
          left: layout.left + layout.width,
          top: layout.top,
          width: buttonWidth,
          height: layout.height,
          zIndex: Z_INDEX.STRUCTURE_OVERLAY + 15,
          pointerEvents: 'auto'
        }}
        onMouseEnter={() => {
          props.setHoveredAddButton({
            type: 'column',
            position: 'right',
            structureId: structure.id,
            insertIndex: layout.endPosition.col,
            x: layout.left + layout.width,
            y: layout.top
          })
        }}
        onMouseLeave={() => props.setHoveredAddButton(null)}
      />
    )
  }
  
  // Bottom edge hover area
  if (layout.endPosition.row < MAX_ROWS - 1) {
    areas.push(
      <div
        key={`add-hover-bottom-${structure.id}`}
        className="absolute"
        style={{
          left: layout.left,
          top: layout.top + layout.height,
          width: layout.width,
          height: buttonWidth,
          zIndex: Z_INDEX.STRUCTURE_OVERLAY + 15,
          pointerEvents: 'auto'
        }}
        onMouseEnter={() => {
          props.setHoveredAddButton({
            type: 'row',
            position: 'bottom',
            structureId: structure.id,
            insertIndex: layout.endPosition.row,
            x: layout.left,
            y: layout.top + layout.height
          })
        }}
        onMouseLeave={() => props.setHoveredAddButton(null)}
      />
    )
  }
  
  return areas
}

/**
 * Render hover areas for array add buttons (direction-aware)
 */
function renderArrayAddButtonHoverAreas(
  props: StructureRenderProps,
  layout: ReturnType<typeof calculateStructureLayout>,
  direction: 'horizontal' | 'vertical'
): React.ReactElement[] {
  const { structure } = props
  const areas = []
  const buttonWidth = 20
  const { startPosition } = structure
  
  // For horizontal arrays, show left and right hover areas
  if (direction === 'horizontal') {
    // Left edge hover area
    if (startPosition.col > 0) {
      areas.push(
        <div
          key={`add-hover-left-${structure.id}`}
          className="absolute"
          style={{
            left: layout.left - buttonWidth,
            top: layout.top,
            width: buttonWidth,
            height: layout.height,
            zIndex: Z_INDEX.STRUCTURE_OVERLAY + 15,
            pointerEvents: 'auto'
          }}
          onMouseEnter={() => {
            props.setHoveredAddButton({
              type: 'column',
              position: 'left',
              structureId: structure.id,
              insertIndex: startPosition.col,
              x: layout.left - buttonWidth,
              y: layout.top
            })
          }}
          onMouseLeave={() => props.setHoveredAddButton(null)}
        />
      )
    }
    
    // Right edge hover area
    if (layout.endPosition.col < 25) {
      areas.push(
        <div
          key={`add-hover-right-${structure.id}`}
          className="absolute"
          style={{
            left: layout.left + layout.width,
            top: layout.top,
            width: buttonWidth,
            height: layout.height,
            zIndex: Z_INDEX.STRUCTURE_OVERLAY + 15,
            pointerEvents: 'auto'
          }}
          onMouseEnter={() => {
            props.setHoveredAddButton({
              type: 'column',
              position: 'right',
              structureId: structure.id,
              insertIndex: layout.endPosition.col,
              x: layout.left + layout.width,
              y: layout.top
            })
          }}
          onMouseLeave={() => props.setHoveredAddButton(null)}
        />
      )
    }
  }
  
  // For vertical arrays, show bottom hover area
  if (direction === 'vertical') {
    // Bottom edge hover area
    if (layout.endPosition.row < MAX_ROWS - 1) {
      areas.push(
        <div
          key={`add-hover-bottom-${structure.id}`}
          className="absolute"
          style={{
            left: layout.left,
            top: layout.top + layout.height,
            width: layout.width,
            height: buttonWidth,
            zIndex: Z_INDEX.STRUCTURE_OVERLAY + 15,
            pointerEvents: 'auto'
          }}
          onMouseEnter={() => {
            props.setHoveredAddButton({
              type: 'row',
              position: 'bottom',
              structureId: structure.id,
              insertIndex: layout.endPosition.row,
              x: layout.left,
              y: layout.top + layout.height
            })
          }}
          onMouseLeave={() => props.setHoveredAddButton(null)}
        />
      )
    }
  }
  
  return areas
}

/**
 * Render structure name tab
 */
export function renderStructureNameTab(props: StructureRenderProps): React.ReactElement | null {
  const { structure } = props
  const isSelected = props.selectedStructure?.id === structure.id
  const isHovered = props.hoveredStructure?.id === structure.id && !isSelected
  const isEditing = props.editingStructureName === structure.id
  
  // Don't show tab for unnamed cells or if not selected/hovered
  if (structure.type === 'cell' && !structure.name && !isSelected) return null
  if (!isSelected && !isHovered) return null
  if (!isSelected && !structure.name) return null
  
  if (!isStructureVisible(structure, props.startRow, props.endRow, props.startCol, props.endCol)) {
    return null
  }
  
  const layout = calculateStructureLayout(structure, props.columnWidths, props.rowHeights)
  
  const tabHeight = 24
  const tabPadding = 8
  const maxTabWidth = layout.width
  
  let displayText: string
  let isPrompt = false
  
  if (isEditing) {
    displayText = props.editingNameValue
  } else if (structure.name) {
    displayText = structure.name
  } else {
    displayText = `Add a name`
    isPrompt = true
  }
  
  const textWidth = displayText.length * 8
  const minTabWidth = 80
  const tabWidth = Math.min(Math.max(textWidth + tabPadding * 2, minTabWidth), maxTabWidth)
  
  const tabLeft = layout.left
  const tabTop = layout.top - tabHeight
  
  const tabBgColor = structure.type === 'cell' ? (isSelected ? CELL_COLOR.TAB : 'bg-gray-500') :
                    structure.type === 'array' ? (isSelected ? ARRAY_COLOR.TAB : 'bg-blue-500') : 
                    (isSelected ? TABLE_COLOR.TAB : 'bg-green-600')
  const borderColor = structure.type === 'cell' ? (isSelected ? CELL_COLOR.BORDER : 'border-gray-500') :
                     structure.type === 'array' ? (isSelected ? ARRAY_COLOR.BORDER : 'border-blue-500') : 
                     (isSelected ? TABLE_COLOR.BORDER : 'border-green-600')

  return (
    <div
      key={`name-tab-${isSelected ? 'selected' : 'hovered'}-${structure.id}`}
      className={`absolute ${tabBgColor} text-white text-xs font-medium flex items-center justify-center border-t-2 border-l-2 border-r-2 ${borderColor} ${isSelected ? 'cursor-pointer' : ''}`}
      style={{
        left: tabLeft,
        top: tabTop,
        width: tabWidth,
        height: tabHeight,
        zIndex: isSelected ? Z_INDEX.STRUCTURE_NAME_TAB : Z_INDEX.STRUCTURE_NAME_TAB - 1,
        pointerEvents: isSelected ? 'auto' : 'none'
      }}
      title={isPrompt ? `Click to add ${structure.type} name` : structure.name}
      onClick={() => {
        if (!isEditing && isSelected) {
          props.handleStructureNameDoubleClick(structure)
        }
      }}
      onDoubleClick={() => isSelected && props.handleStructureNameDoubleClick(structure)}
    >
      {isEditing ? (
        <input
          type="text"
          value={props.editingNameValue}
          onChange={(e) => props.handleStructureNameChange(e.target.value)}
          onBlur={props.handleStructureNameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              props.handleStructureNameSubmit()
            } else if (e.key === 'Escape') {
              props.handleStructureNameCancel()
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
          className={isPrompt ? 'italic' : ''}
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            paddingLeft: tabPadding,
            paddingRight: tabPadding
          }}
        >
          {displayText}
        </span>
      )}
    </div>
  )
}

/**
 * Render add button overlay
 */
export function renderAddButton(props: StructureRenderProps): React.ReactElement | null {
  if (props.isResizingStructure || props.isDraggingStructure || props.isDraggingColumn || !props.hoveredAddButton) {
    return null
  }

  const { type, position, structureId, insertIndex } = props.hoveredAddButton
  const structure = props.structure
  if (!structure || (structure.type !== 'table' && structure.type !== 'array')) {
    return null
  }
  
  const buttonWidth = 20
  const layout = calculateStructureLayout(structure, props.columnWidths, props.rowHeights)

  let buttonLeft: number
  let buttonTop: number
  let buttonWidthFinal: number
  let buttonHeightFinal: number
  let buttonTitle: string

  if (type === 'column') {
    buttonWidthFinal = buttonWidth
    buttonHeightFinal = layout.height
    buttonTop = layout.top
    
    if (position === 'left') {
      buttonLeft = layout.left - buttonWidth
      buttonTitle = 'Add column to the left'
    } else {
      buttonLeft = layout.left + layout.width
      buttonTitle = 'Add column to the right'
    }
  } else {
    buttonWidthFinal = layout.width
    buttonHeightFinal = buttonWidth
    buttonLeft = layout.left
    buttonTop = layout.top + layout.height
    buttonTitle = 'Add row below'
  }

  const buttonColor = structure.type === 'array' ? 'bg-blue-500' : 'bg-green-600'

  return (
    <button
      className={`absolute ${buttonColor} bg-opacity-100 flex items-center justify-center text-white font-bold text-sm hover:bg-opacity-90 transition-all duration-200`}
      onMouseEnter={() => {
        props.setHoveredAddButton({
          type,
          position,
          structureId,
          insertIndex,
          x: buttonLeft,
          y: buttonTop
        })
      }}
      onMouseLeave={() => {
        props.setHoveredAddButton(null)
      }}
      onClick={() => {
        if (type === 'column') {
          props.handleAddColumn(structureId, insertIndex, position as 'left' | 'right')
        } else {
          props.handleAddRow(structureId, insertIndex, 'bottom')
        }
        props.setHoveredAddButton(null)
      }}
      style={{
        left: buttonLeft,
        top: buttonTop,
        width: buttonWidthFinal,
        height: buttonHeightFinal,
        minWidth: buttonWidthFinal,
        minHeight: buttonHeightFinal,
        zIndex: Z_INDEX.STRUCTURE_OVERLAY + 20
      }}
      title={buttonTitle}
    >
      +
    </button>
  )
}

/**
 * Render dragged structure overlay
 */
export function renderDraggedStructure(props: StructureRenderProps): React.ReactElement | null {
  if (!props.isDraggingStructure || !props.dropTarget || !props.draggedStructure) {
    return null
  }

  const overlayLeft = getColumnPosition(props.dropTarget.col, props.columnWidths)
  const overlayTop = getRowPosition(props.dropTarget.row, props.rowHeights)
  
  let overlayWidth = 0
  for (let c = props.dropTarget.col; c < props.dropTarget.col + props.draggedStructure.dimensions.cols; c++) {
    overlayWidth += getColumnWidth(c, props.columnWidths)
  }
  
  let overlayHeight = 0
  for (let r = props.dropTarget.row; r < props.dropTarget.row + props.draggedStructure.dimensions.rows; r++) {
    overlayHeight += getRowHeight(r, props.rowHeights)
  }

  // Use the same border styling as regular structures but with transparency
  const borderColor = props.draggedStructure.type === 'cell' ? CELL_COLOR.BORDER :
                     props.draggedStructure.type === 'array' ? ARRAY_COLOR.BORDER : TABLE_COLOR.BORDER
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
        backgroundColor: props.draggedStructure.type === 'cell' ? 'rgba(156, 163, 175, 0.3)' :
                         props.draggedStructure.type === 'array' ? 'rgba(59, 130, 246, 0.3)' : 
                         'rgba(34, 197, 94, 0.3)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}
      title={`Moving ${props.draggedStructure.type}${props.draggedStructure.name ? `: ${props.draggedStructure.name}` : ''}`}
    />
  )
}

// =============================================================================
// MAIN STRUCTURE DISPATCHER FUNCTION
// =============================================================================

/**
 * Generalized dispatcher function that renders any structure type
 */
export function renderStructure(props: StructureRenderProps): React.ReactElement[] {
  const { structure } = props
  
  switch (structure.type) {
    case 'cell':
      return renderCellStructure(props)
    case 'table': 
      return renderTableStructure(props)
    case 'array':
      return renderArrayStructure(props)
    default:
      console.warn(`Unknown structure type: ${(structure as any).type}`)
      return []
  }
}
