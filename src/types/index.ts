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
  formulaError?: string
}

export interface CellStructure extends BaseStructure {
  type: 'cell'

  value: string
}

export interface ArrayStructure extends BaseStructure {
  type: 'array'

  direction: 'horizontal' | 'vertical'
  contentType: 'cells' | string // string for template IDs
  itemIds: (string | null)[] // Array of IDs, null for empty cells
  
  // Template-specific properties
  templateDimensions?: { rows: number, cols: number } // Dimensions of each template instance
  instanceCount?: number // Number of template instances in the array
}

export interface TableStructure extends BaseStructure {
  type: 'table'

  // Values
  itemIds: (string | null)[][] // 2D array of cell IDs, null for empty cells

  // Column and row headers
  colHeaderLevels: number
  colNames?: { [name: string]: number }
  colGroups?: { [name: string]: number[] } // Maps group name to array of column indices

  rowHeaderLevels: number
  rowNames?: { [name: string]: number }
  rowGroups?: { [name: string]: number[] } // Maps group name to array of row indices
}

export interface TemplateStructure extends BaseStructure {
  type: 'template'

  // Template-specific properties
  templateId: string
  sourceTemplateVersion?: number // Track template version for change detection
  overrides?: TemplateOverrides   // Track instance-specific changes
}

// Override tracking system
export interface TemplateOverrides {
  structures: { [structureId: string]: any } // Flexible partial structure data
  cellData: { [position: string]: string }
  deletedStructures: string[] // Structures removed from this instance
  addedStructures: string[]   // Structures added to this instance
}

// Template change tracking
export interface TemplateChanges {
  structures: {
    added: Structure[]
    modified: { [structureId: string]: Partial<Structure> }
    deleted: string[]
  }
  cellData: {
    added: { [position: string]: string }
    modified: { [position: string]: string }
    deleted: string[]
  }
}

export type Structure = CellStructure | ArrayStructure | TableStructure | TemplateStructure

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
  onUpdateArrayContentType: (arrayId: string, contentType: string) => void
  availableTemplates: Array<{id: string, name: string}>
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
