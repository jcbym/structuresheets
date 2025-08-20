// Core data structure types
export type Position = {
  row: number
  col: number
}

export type Dimensions = {
  rows: number
  cols: number
}

export interface BaseStructure {
  type: string
  id: string
  startPosition: Position
  dimensions: Dimensions
  name?: string

  formula?: string
  formulaValue?: string
  formulaError?: string
}

export interface CellStructure extends BaseStructure {
  type: 'cell'

  value: string
}

export interface ArrayStructure extends BaseStructure {
  type: 'array'

  direction: 'horizontal' | 'vertical'
  cellIds: (string | null)[] // Array of cell IDs, null for empty cells
}

export interface TableStructure extends BaseStructure {
  type: 'table'

  // Values
  cellIds: (string | null)[][] // 2D array of cell IDs, null for empty cells

  // Column and row headers
  colHeaderLevels: number
  colNames?: { [name: string]: number }
  colGroups?: { [name: string]: number[] } // Maps group name to array of column indices

  rowHeaderLevels: number
  rowNames?: { [name: string]: number }
  rowGroups?: { [name: string]: number[] } // Maps group name to array of row indices
}

export type Structure = CellStructure | ArrayStructure | TableStructure

// Structure maps
export type StructureMap = Map<string, Structure> // Maps structure ID to Structure object
export type PositionMap = Map<string, string[]> // Maps position key (row-col) to array of structure IDs

// Component prop types
export type ContextMenuProps = {
  x: number
  y: number
  onClose: () => void
  selectedRange: SelectionRange | null
  selectedStructure: Structure | null
  setContextMenu: React.Dispatch<React.SetStateAction<{x: number, y: number} | null>>
  updateTableHeaders: (row: number, col: number, headerRows: number, headerCols: number) => void
  createStructureFromToolbar: (type: Structure['type']) => void
  rotateArray: (arrayId: string) => void
  canCreateStructures: boolean
}

export type ToolbarProps = {
  selectedRange: {start: Position, end: Position} | null
  onCreateStructure: (type: Structure['type']) => void
}

export type StructurePanelProps = {
  structures: StructureMap
  selectedStructure: Structure | null
  selectedColumn: {tableId: string, columnIndex: number} | null
  expandedTableColumns: Set<string>
  onUpdateTableHeaders: (row: number, col: number, headerRows: number, headerCols: number) => void
  onSelectColumn: (tableId: string, columnIndex: number) => void
  onToggleTableColumns: (tableKey: string) => void
  onUpdateStructureName: (structureId: string, name: string) => void
  onUpdateStructureFormula: (structureId: string, formula: string) => void
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
