// Core data structure types
export type Position = {
  row: number
  col: number
}

export type Cell = {
  type: 'cell'
  position: Position
  name?: string
  value: string
}

export type Array = {
  type: 'array'
  position: Position
  startPosition: Position
  endPosition: Position
  name?: string
  cells: Cell[]
  dimensions: { rows: number, cols: number }
}

export type Table = {
  type: 'table'
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
}

export type MergedCell = {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
  value: string
}

export type Structure = Cell | Array | Table

// Component prop types
export type ContextMenuProps = {
  x: number
  y: number
  onClose: () => void
  onMergeCells: () => void
  onUnmergeCells: () => void
  selectedCell: {row: number, col: number} | null
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
  onCreateStructure: (type: Structure['type'], name: string, dimensions?: {rows: number, cols: number}) => void
  onUpdateTableHeaders: (row: number, col: number, hasHeaderRow: boolean, hasHeaderCol: boolean, headerRows?: number, headerCols?: number) => void
}

// Selection and interaction types
export type SelectionRange = {
  start: Position
  end: Position
}

export type ResizeType = 'column' | 'row'

// State management types
export type SpreadsheetState = {
  cellData: Map<string, string>
  structures: Map<string, Structure>
  mergedCells: Map<string, MergedCell>
  selectedCell: {row: number, col: number} | null
  selectedRange: SelectionRange | null
  selectedStructure: Structure | null
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
  startEditing: {row: number, col: number} | null
}
