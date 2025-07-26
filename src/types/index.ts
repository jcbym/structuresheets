// Core data structure types
export type Position = {
  row: number
  col: number
}

export type Dimensions = {
  rows: number
  cols: number
}

export type Cell = {
  type: 'cell'
  id: string
  startPosition: Position
  endPosition: Position
  name?: string
  value: string
}

export type StructureArray = {
  type: 'array'
  id: string
  startPosition: Position
  endPosition: Position
  name?: string
  cells: Cell[]
  size: number
  direction: 'horizontal' | 'vertical'
}

export type Column = {
  type: 'column'
  id: string
  startPosition: Position
  endPosition: Position
  columnIndex: number
  name?: string
}

export type Table = {
  type: 'table'
  id: string
  startPosition: Position
  endPosition: Position
  name?: string
  arrays: StructureArray[]
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

export type Structure = Cell | StructureArray | Table | Column

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
  rotateArray: (arrayId: string) => void
  canMerge: boolean
  canUnmerge: boolean
  canCreateStructures: boolean
}

export type ToolbarProps = {
  selectedCell: {row: number, col: number} | null
  selectedRange: {start: Position, end: Position} | null
  onCreateStructure: (type: Structure['type']) => void
}

export type StructurePanelProps = {
  structures: Map<string, Structure>
  selectedStructure: Structure | null
  selectedColumn: {tableId: string, columnIndex: number} | null
  expandedTableColumns: Set<string>
  onUpdateTableHeaders: (row: number, col: number, hasHeaderRow: boolean, hasHeaderCol: boolean, headerRows?: number, headerCols?: number) => void
  onSelectColumn: (tableId: string, columnIndex: number) => void
  onToggleTableColumns: (tableKey: string) => void
  onUpdateStructureName: (structureId: string, name: string) => void
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

export type ResizeType = 'column' | 'row'
