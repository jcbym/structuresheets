// Core data structure types
export type Position = {
  row: number
  col: number
}

export type Cell = {
  type: 'cell'
  id: string
  position: Position
  name?: string
  value: string
}

export type Array = {
  type: 'array'
  id: string
  position: Position
  startPosition: Position
  endPosition: Position
  name?: string
  cells: Cell[]
  dimensions: { rows: number, cols: number }
}

export type Column = {
  type: 'column'
  id: string
  position: Position
  tablePosition: Position
  columnIndex: number
  name?: string
}

export type Table = {
  type: 'table'
  id: string
  position: Position
  startPosition: Position
  endPosition: Position
  name?: string
  arrays: Array[]
  dimensions: { rows: number, cols: number }
  hasHeaderRow?: boolean
  hasHeaderCol?: boolean
  headerRows?: number
  headerCols?: number
  columns?: Column[]
}

export type MergedCell = {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
  value: string
}

export type Structure = Cell | Array | Table | Column

// Component prop types
export type ContextMenuProps = {
  x: number
  y: number
  onClose: () => void
  onMergeCells: () => void
  onUnmergeCells: () => void
  selectedCell: {row: number, col: number} | null
  selectedRange: SelectionRange | null
  selectedStructure: Structure | null
  setContextMenu: React.Dispatch<React.SetStateAction<{x: number, y: number} | null>>
  getStructureAtPositionSafe: (row: number, col: number) => Structure | undefined
  updateTableHeaders: (row: number, col: number, hasHeaderRow: boolean, hasHeaderCol: boolean, headerRows?: number, headerCols?: number) => void
  createStructureFromToolbar: (type: Structure['type']) => void
  canMerge: boolean
  canUnmerge: boolean
  canCreateStructures: boolean
}

export type EditableCellProps = {
  value: string
  onChange: (value: string) => void
  isSelected: boolean
  onFocus: () => void
  onEnterPress?: () => void
  onArrowKeyPress?: (direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => void
  startEditing?: boolean
  onEditingStarted?: () => void
  structure?: Structure
  onMouseDown?: (e: React.MouseEvent) => void
  onMouseEnter?: () => void
  onMouseUp?: () => void
  onRightClick?: (e: React.MouseEvent) => void
  onHeaderHover?: (isEntering: boolean) => void
  onAddColumn?: () => void
  row: number
  col: number
  isMergedCell?: boolean
}

export type ToolbarProps = {
  selectedCell: {row: number, col: number} | null
  selectedRange: {start: Position, end: Position} | null
  onCreateStructure: (type: Structure['type']) => void
}

export type StructurePanelProps = {
  structures: Map<string, Structure>
  selectedStructure: Structure | null
  selectedColumn: {tablePosition: Position, columnIndex: number} | null
  expandedTableColumns: Set<string>
  onCreateStructure: (type: Structure['type'], name: string, dimensions?: {rows: number, cols: number}) => void
  onUpdateTableHeaders: (row: number, col: number, hasHeaderRow: boolean, hasHeaderCol: boolean, headerRows?: number, headerCols?: number) => void
  onSelectColumn: (tablePosition: Position, columnIndex: number) => void
  onToggleTableColumns: (tableKey: string) => void
  isCollapsed: boolean
  width: number
  onToggleCollapse: () => void
  onWidthChange: (width: number) => void
}

// Selection and interaction types
export type SelectionRange = {
  start: Position
  end: Position
}

export type ResizeType = 'column' | 'row' | 'structure'

// State management types
export type SpreadsheetState = {
  cellData: Map<string, string>
  structures: Map<string, Structure>
  mergedCells: Map<string, MergedCell>
  selectedCell: {row: number, col: number} | null
  selectedRange: SelectionRange | null
  selectedStructure: Structure | null
  selectedColumn: {tablePosition: Position, columnIndex: number} | null
  isDragging: boolean
  dragStart: Position | null
  scrollTop: number
  scrollLeft: number
  contextMenu: {x: number, y: number} | null
  hoveredHeaderCell: {row: number, col: number} | null
  showAddColumnButton: boolean
  columnWidths: Map<number, number>
  rowHeights: Map<number, number>
  isResizing: boolean
  resizeType: ResizeType | null
  resizeIndex: number | null
  resizeStartPos: number
  resizeStartSize: number
  isResizingStructure: boolean
  structureResizeDirection: 'left' | 'right' | 'top' | 'bottom' | 'corner' | null
  structureResizeStartDimensions: { rows: number, cols: number } | null
  startEditing: {row: number, col: number} | null
  expandedTableColumns: Set<string>
  structurePanelCollapsed: boolean
  structurePanelWidth: number
}
