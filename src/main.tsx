import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// Structure types
type Position = {
  row: number
  col: number
}

type Cell = {
  type: 'cell'
  position: Position
  name?: string
  value: string
}

type Array = {
  type: 'array'
  position: Position
  startPosition: Position
  endPosition: Position
  name?: string
  cells: Cell[]
  dimensions: { rows: number, cols: number }
}

type Table = {
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

type MergedCell = {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
  value: string
}

type Structure = Cell | Array | Table

// Context menu component
const ContextMenu: React.FC<{
  x: number
  y: number
  onClose: () => void
  onMergeCells: () => void
  onUnmergeCells: () => void
  onCreateArray: () => void
  onCreateTable: () => void
  onAddColumnHeaderLevel: () => void
  onAddRowHeaderLevel: () => void
  canMerge: boolean
  canUnmerge: boolean
  canCreateStructures: boolean
  canAddHeaderLevels: boolean
}> = ({ x, y, onClose, onMergeCells, onUnmergeCells, onCreateArray, onCreateTable, onAddColumnHeaderLevel, onAddRowHeaderLevel, canMerge, canUnmerge, canCreateStructures, canAddHeaderLevels }) => {
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="fixed bg-white border border-gray-300 rounded shadow-lg py-1 z-50"
      style={{ left: x, top: y, minWidth: '150px' }}
    >
      <button
        className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm ${
          !canMerge ? 'text-gray-400 cursor-not-allowed' : ''
        }`}
        onClick={canMerge ? onMergeCells : undefined}
        disabled={!canMerge}
      >
        Merge Cells
      </button>
      <button
        className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm ${
          !canUnmerge ? 'text-gray-400 cursor-not-allowed' : ''
        }`}
        onClick={canUnmerge ? onUnmergeCells : undefined}
        disabled={!canUnmerge}
      >
        Unmerge Cells
      </button>
      
      <hr className="my-1 border-gray-200" />
      
      <button
        className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm ${
          !canCreateStructures ? 'text-gray-400 cursor-not-allowed' : ''
        }`}
        onClick={canCreateStructures ? onCreateArray : undefined}
        disabled={!canCreateStructures}
      >
        Create Array
      </button>
      
      <button
        className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm ${
          !canCreateStructures ? 'text-gray-400 cursor-not-allowed' : ''
        }`}
        onClick={canCreateStructures ? onCreateTable : undefined}
        disabled={!canCreateStructures}
      >
        Create Table
      </button>
      
      <hr className="my-1 border-gray-200" />
      
      <button
        className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm ${
          !canAddHeaderLevels ? 'text-gray-400 cursor-not-allowed' : ''
        }`}
        onClick={canAddHeaderLevels ? onAddColumnHeaderLevel : undefined}
        disabled={!canAddHeaderLevels}
      >
        Add Column Header Level
      </button>
      
      <button
        className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm ${
          !canAddHeaderLevels ? 'text-gray-400 cursor-not-allowed' : ''
        }`}
        onClick={canAddHeaderLevels ? onAddRowHeaderLevel : undefined}
        disabled={!canAddHeaderLevels}
      >
        Add Row Header Level
      </button>
    </div>
  )
}

// Generate column letters A-Z
const generateColumnLetters = (): string[] => {
  const letters = []
  for (let i = 0; i < 26; i++) {
    letters.push(String.fromCharCode(65 + i)) // A-Z
  }
  return letters
}

// Editable cell component
const EditableCell: React.FC<{
  value: string
  onChange: (value: string) => void
  isSelected: boolean
  onFocus: () => void
  onEnterPress?: () => void
  onArrowKeyPress?: (direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => void
  shouldStartEditing?: boolean
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
}> = ({ value, onChange, isSelected, onFocus, onEnterPress, onArrowKeyPress, shouldStartEditing, onEditingStarted, structure, onMouseDown, onMouseEnter, onMouseUp, onRightClick, onHeaderHover, onAddColumn, row, col, isMergedCell }) => {
  const [cellValue, setCellValue] = React.useState(value)
  const [isEditing, setIsEditing] = React.useState(false)

  const handleBlur = () => {
    onChange(cellValue)
    setIsEditing(false)
  }

  const handleFocus = () => {
    onFocus()
    setIsEditing(true)
  }

  const handleDoubleClick = () => {
    setIsEditing(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onChange(cellValue)
      setIsEditing(false)
      if (onEnterPress) {
        onEnterPress()
      }
    }
  }
  
  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      if (onArrowKeyPress) {
        onArrowKeyPress(e.key as 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight')
      }
    } else if (e.key === 'Enter' || e.key === 'F2') {
      // Start editing on Enter or F2
      e.preventDefault()
      setIsEditing(true)
    }
  }

  React.useEffect(() => {
    setCellValue(value)
  }, [value])

  // Auto-start editing when shouldStartEditing is true
  React.useEffect(() => {
    if (shouldStartEditing && isSelected) {
      setIsEditing(true)
      if (onEditingStarted) {
        onEditingStarted()
      }
    }
  }, [shouldStartEditing, isSelected, onEditingStarted])

  // Check if this cell is a header in a table
  const isHeaderCell = () => {
    if (!structure || structure.type !== 'table') return false
    
    const table = structure as Table
    const { startPosition } = table
    const headerRows = table.headerRows || 1
    const headerCols = table.headerCols || 1
    
    // Check if cell is within header row range
    const isInHeaderRows = table.hasHeaderRow && 
      row >= startPosition.row && 
      row < startPosition.row + headerRows
    
    // Check if cell is within header column range
    const isInHeaderCols = table.hasHeaderCol && 
      col >= startPosition.col && 
      col < startPosition.col + headerCols
    
    return isInHeaderRows || isInHeaderCols
  }

  // Get cell styling classes
  const getCellClasses = () => {
    let classes = 'w-full h-full px-2 py-1 cursor-cell flex items-center'
    
    if (isHeaderCell()) {
      classes += ' font-bold'
    }
    
    // Center text in merged cells
    if (isMergedCell) {
      classes += ' justify-center'
    }
    
    return classes
  }

  // Get cell background styling
  const getCellStyle = () => {
    const baseStyle = { 
      width: '100%', 
      height: '100%',
    }
    
    if (isHeaderCell() && structure?.type === 'table') {
      // Use green background to match table border color
      return { ...baseStyle, backgroundColor: '#10b981' }
    }
    
    return baseStyle
  }

  // Only show borders for individual cells and selection
  const getBorderClass = () => {
    if (isSelected) {
      return 'bg-blue-100' // Selection border
    }
    return 'border-none' // No border for array/table cells (they get overlay borders)
  }

  return (
    <div 
      className={`w-full h-full relative ${getBorderClass()}`}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseUp={onMouseUp}
      onContextMenu={onRightClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleCellKeyDown}
      tabIndex={isSelected ? 0 : -1}
    >
      {isEditing ? (
        <input
          type="text"
          value={cellValue}
          onChange={(e) => setCellValue(e.target.value)}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="w-full h-full outline-none px-2 py-1 bg-transparent"
          style={{ minWidth: '80px', minHeight: '30px' }}
          autoFocus
        />
      ) : (
        <div 
          className={getCellClasses()}
          style={getCellStyle()}
          title={structure?.name ? `${structure.type}: ${structure.name}` : undefined}
          onClick={() => setIsEditing(true)}
        >
          {cellValue || '\u00A0'}
        </div>
      )}
      
    </div>
  )
}

// Toolbar component
const Toolbar: React.FC<{
  selectedCell: {row: number, col: number} | null
  selectedRange: {start: Position, end: Position} | null
  onCreateStructure: (type: Structure['type']) => void
}> = ({ selectedCell, selectedRange, onCreateStructure }) => {
  const getSelectionInfo = () => {
    if (selectedRange) {
      const minRow = Math.min(selectedRange.start.row, selectedRange.end.row)
      const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row)
      const minCol = Math.min(selectedRange.start.col, selectedRange.end.col)
      const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col)
      const rows = maxRow - minRow + 1
      const cols = maxCol - minCol + 1
      return { rows, cols, isRange: true }
    } else if (selectedCell) {
      return { rows: 1, cols: 1, isRange: false }
    }
    return null
  }

  const selectionInfo = getSelectionInfo()
  const hasSelection = selectedCell || selectedRange

  return (
    <div className="bg-white border-b border-gray-300 p-2 flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Create Structure:</span>
      
      <button
        onClick={() => onCreateStructure('cell')}
        disabled={!hasSelection}
        className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
      >
        Cell
      </button>
      
      <button
        onClick={() => onCreateStructure('array')}
        disabled={!hasSelection}
        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
      >
        Array
      </button>
      
      <button
        onClick={() => onCreateStructure('table')}
        disabled={!hasSelection}
        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
      >
        Table
      </button>

      {selectionInfo && (
        <span className="text-sm text-gray-600 ml-4">
          {selectionInfo.isRange 
            ? `Selection: ${selectionInfo.rows} × ${selectionInfo.cols} cells`
            : ''
          }
        </span>
      )}
    </div>
  )
}

// Structure management panel
const StructurePanel: React.FC<{
  structures: Map<string, Structure>
  selectedCell: {row: number, col: number} | null
  onCreateStructure: (type: Structure['type'], name: string, dimensions?: {rows: number, cols: number}) => void
  onUpdateTableHeaders: (row: number, col: number, hasHeaderRow: boolean, hasHeaderCol: boolean, headerRows?: number, headerCols?: number) => void
}> = ({ structures, selectedCell, onCreateStructure, onUpdateTableHeaders }) => {
  const [structureType, setStructureType] = React.useState<Structure['type']>('cell')
  const [structureName, setStructureName] = React.useState('')
  const [arrayRows, setArrayRows] = React.useState(1)
  const [arrayCols, setArrayCols] = React.useState(1)

  const handleCreate = () => {
    if (!selectedCell || !structureName.trim()) return
    
    const dimensions = structureType !== 'cell' ? { rows: arrayRows, cols: arrayCols } : undefined
    onCreateStructure(structureType, structureName.trim(), dimensions)
    setStructureName('')
  }

  const getStructureAtPosition = (row: number, col: number) => {
    for (const [key, structure] of structures) {
      if (structure.position.row === row && structure.position.col === col) {
        return structure
      }
    }
    return null
  }

  const currentStructure = selectedCell ? getStructureAtPosition(selectedCell.row, selectedCell.col) : null

  if (currentStructure) {
    const tableStructure = currentStructure.type === 'table' ? currentStructure as Table : null
    
    return (
      <div className="h-full bg-white border-l border-gray-300 p-4 flex flex-col w-80">
        <h3 className="font-bold mb-4 text-lg">{currentStructure.type}</h3>

        {/* Table Header Options */}
        {tableStructure && (
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Headers</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={tableStructure.hasHeaderRow || false}
                  onChange={(e) => onUpdateTableHeaders(
                    currentStructure.position.row,
                    currentStructure.position.col,
                    e.target.checked,
                    tableStructure.hasHeaderCol || false,
                    tableStructure.headerRows,
                    tableStructure.headerCols
                  )}
                  className="rounded"
                />
                <span className="text-sm">Column headers</span>
              </label>
              
              {tableStructure.hasHeaderRow && (
                <div className="ml-6 flex items-center space-x-2">
                  <label className="text-xs text-gray-600">Levels:</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={tableStructure.headerRows || 1}
                    onChange={(e) => onUpdateTableHeaders(
                      currentStructure.position.row,
                      currentStructure.position.col,
                      tableStructure.hasHeaderRow || false,
                      tableStructure.hasHeaderCol || false,
                      parseInt(e.target.value) || 1,
                      tableStructure.headerCols
                    )}
                    className="w-16 px-2 py-1 text-xs border rounded"
                  />
                </div>
              )}
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={tableStructure.hasHeaderCol || false}
                  onChange={(e) => onUpdateTableHeaders(
                    currentStructure.position.row,
                    currentStructure.position.col,
                    tableStructure.hasHeaderRow || false,
                    e.target.checked,
                    tableStructure.headerRows,
                    tableStructure.headerCols
                  )}
                  className="rounded"
                />
                <span className="text-sm">Row headers</span>
              </label>
              
              {tableStructure.hasHeaderCol && (
                <div className="ml-6 flex items-center space-x-2">
                  <label className="text-xs text-gray-600">Levels:</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={tableStructure.headerCols || 1}
                    onChange={(e) => onUpdateTableHeaders(
                      currentStructure.position.row,
                      currentStructure.position.col,
                      tableStructure.hasHeaderRow || false,
                      tableStructure.hasHeaderCol || false,
                      tableStructure.headerRows,
                      parseInt(e.target.value) || 1
                    )}
                    className="w-16 px-2 py-1 text-xs border rounded"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mb-4">
          <h4 className="font-semibold mb-2">Formula</h4>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Enter formula"
              value={""} // placeholder
              onChange={() => ""} 
              className="w-full border rounded px-2 py-1"
            />
          </div>
        </div>

        <div className="mb-4">
          <h4 className="font-semibold mb-2">Constraints</h4>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Enter constraints"
              value={""} // placeholder
              onChange={() => ""} 
              className="w-full border rounded px-2 py-1"
            />
          </div>
        </div>
      </div>
    )
  }
}

function App() {
  // Default dimensions
  const DEFAULT_CELL_HEIGHT = 32
  const DEFAULT_CELL_WIDTH = 82
  const DEFAULT_HEADER_HEIGHT = 32
  const DEFAULT_HEADER_WIDTH = 52

  // Data storage
  const [cellData, setCellData] = React.useState<Map<string, string>>(new Map())
  const [structures, setStructures] = React.useState<Map<string, Structure>>(new Map())
  const [mergedCells, setMergedCells] = React.useState<Map<string, MergedCell>>(new Map())
  const [selectedCell, setSelectedCell] = React.useState<{row: number, col: number} | null>(null)
  const [selectedRange, setSelectedRange] = React.useState<{start: Position, end: Position} | null>(null)
  const [shouldStartEditing, setShouldStartEditing] = React.useState<{row: number, col: number} | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragStart, setDragStart] = React.useState<Position | null>(null)
  const [scrollTop, setScrollTop] = React.useState(0)
  const [scrollLeft, setScrollLeft] = React.useState(0)
  const [contextMenu, setContextMenu] = React.useState<{x: number, y: number} | null>(null)
  const [hoveredHeaderCell, setHoveredHeaderCell] = React.useState<{row: number, col: number} | null>(null)
  const [showAddColumnButton, setShowAddColumnButton] = React.useState(false)
  
  // Resizable dimensions
  const [columnWidths, setColumnWidths] = React.useState<Map<number, number>>(new Map())
  const [rowHeights, setRowHeights] = React.useState<Map<number, number>>(new Map())
  const [isResizing, setIsResizing] = React.useState(false)
  const [resizeType, setResizeType] = React.useState<'column' | 'row' | null>(null)
  const [resizeIndex, setResizeIndex] = React.useState<number | null>(null)
  const [resizeStartPos, setResizeStartPos] = React.useState<number>(0)
  const [resizeStartSize, setResizeStartSize] = React.useState<number>(0)

  // Helper functions to get dimensions
  const getColumnWidth = (colIndex: number): number => {
    return columnWidths.get(colIndex) || DEFAULT_CELL_WIDTH
  }

  const getRowHeight = (rowIndex: number): number => {
    return rowHeights.get(rowIndex) || DEFAULT_CELL_HEIGHT
  }

  const getHeaderHeight = (): number => {
    return DEFAULT_HEADER_HEIGHT
  }

  const getHeaderWidth = (): number => {
    return DEFAULT_HEADER_WIDTH
  }

  // Calculate cumulative positions
  const getColumnPosition = (colIndex: number): number => {
    let position = getHeaderWidth()
    for (let i = 0; i < colIndex; i++) {
      position += getColumnWidth(i)
    }
    return position
  }

  const getRowPosition = (rowIndex: number): number => {
    let position = getHeaderHeight()
    for (let i = 0; i < rowIndex; i++) {
      position += getRowHeight(i)
    }
    return position
  }

  // Calculate visible range based on scroll position
  const calculateVisibleCols = (): { startCol: number; endCol: number } => {
    let startCol = 0
    let currentPos = getHeaderWidth()
    
    // Find start column
    while (startCol < 26 && currentPos + getColumnWidth(startCol) < scrollLeft) {
      currentPos += getColumnWidth(startCol)
      startCol++
    }
    
    // Find end column
    let endCol = startCol
    const viewportWidth = window.innerWidth
    while (endCol < 26 && currentPos < scrollLeft + viewportWidth) {
      currentPos += getColumnWidth(endCol)
      endCol++
    }
    
    return { startCol: Math.max(0, startCol), endCol: Math.min(26, endCol + 2) }
  }

  const calculateVisibleRows = (): { startRow: number; endRow: number } => {
    let startRow = 0
    let currentPos = getHeaderHeight()
    
    // Find start row
    while (startRow < 1000 && currentPos + getRowHeight(startRow) < scrollTop) {
      currentPos += getRowHeight(startRow)
      startRow++
    }
    
    // Find end row
    let endRow = startRow
    const viewportHeight = window.innerHeight
    while (endRow < 1000 && currentPos < scrollTop + viewportHeight) {
      currentPos += getRowHeight(endRow)
      endRow++
    }
    
    return { startRow: Math.max(0, startRow), endRow: Math.min(1000, endRow + 5) }
  }

  const visibleCols = calculateVisibleCols()
  const visibleRows = calculateVisibleRows()
  const { startCol, endCol } = visibleCols
  const { startRow, endRow } = visibleRows
  
  const columnLetters = generateColumnLetters()
  const containerRef = React.useRef<HTMLDivElement>(null)

  const getCellKey = (row: number, col: number) => `${row}-${col}`
  const getStructureKey = (row: number, col: number) => `struct-${row}-${col}`
  const getMergedCellKey = (startRow: number, startCol: number, endRow: number, endCol: number) => 
    `merged-${startRow}-${startCol}-${endRow}-${endCol}`

  const getCellValue = (row: number, col: number) => {
    return cellData.get(getCellKey(row, col)) || ''
  }

  const getStructureAtPosition = (row: number, col: number): Structure | undefined => {
    return structures.get(getStructureKey(row, col))
  }

  // Check if a cell is part of a merged cell
  const getMergedCellContaining = (row: number, col: number): MergedCell | null => {
    for (const [key, mergedCell] of mergedCells) {
      if (row >= mergedCell.startRow && row <= mergedCell.endRow &&
          col >= mergedCell.startCol && col <= mergedCell.endCol) {
        return mergedCell
      }
    }
    return null
  }

  // Check if a cell should be rendered (not hidden by merge)
  const shouldRenderCell = (row: number, col: number): boolean => {
    const mergedCell = getMergedCellContaining(row, col)
    if (!mergedCell) return true
    return row === mergedCell.startRow && col === mergedCell.startCol
  }

  // Merge selected cells
  const mergeCells = () => {
    if (!selectedRange) return

    const minRow = Math.min(selectedRange.start.row, selectedRange.end.row)
    const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row)
    const minCol = Math.min(selectedRange.start.col, selectedRange.end.col)
    const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col)

    // Collect all values from the range and use the first non-empty value
    let mergedValue = ''
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const value = getCellValue(r, c)
        if (value && !mergedValue) {
          mergedValue = value
        }
      }
    }

    const newMergedCell: MergedCell = {
      startRow: minRow,
      startCol: minCol,
      endRow: maxRow,
      endCol: maxCol,
      value: mergedValue
    }

    const key = getMergedCellKey(minRow, minCol, maxRow, maxCol)
    setMergedCells(prev => {
      const newMerged = new Map(prev)
      newMerged.set(key, newMergedCell)
      return newMerged
    })

    // Update the cell data to store the merged value in the top-left cell
    setCellData(prev => {
      const newData = new Map(prev)
      newData.set(getCellKey(minRow, minCol), mergedValue)
      
      // Clear other cells in the merged range
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          if (!(r === minRow && c === minCol)) {
            newData.delete(getCellKey(r, c))
          }
        }
      }
      return newData
    })

    setContextMenu(null)
    setSelectedRange(null)
  }

  // Unmerge cells
  const unmergeCells = () => {
    if (!selectedCell) return

    const mergedCell = getMergedCellContaining(selectedCell.row, selectedCell.col)
    if (!mergedCell) return

    // Find and remove the merged cell
    setMergedCells(prev => {
      const newMerged = new Map(prev)
      for (const [key, cell] of prev) {
        if (cell === mergedCell) {
          newMerged.delete(key)
          break
        }
      }
      return newMerged
    })

    setContextMenu(null)
  }

  // Check if cells can be merged
  const canMergeCells = (): boolean => {
    if (!selectedRange) return false
    
    const minRow = Math.min(selectedRange.start.row, selectedRange.end.row)
    const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row)
    const minCol = Math.min(selectedRange.start.col, selectedRange.end.col)
    const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col)

    // Can't merge if it's just a single cell
    if (minRow === maxRow && minCol === maxCol) return false

    // Check if any cell in the range is already part of a merged cell
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (getMergedCellContaining(r, c)) {
          return false
        }
      }
    }

    return true
  }

  // Check if cells can be unmerged
  const canUnmergeCells = (): boolean => {
    if (!selectedCell) return false
    return getMergedCellContaining(selectedCell.row, selectedCell.col) !== null
  }

  // Check if header levels can be added to a table
  const canAddHeaderLevels = (): boolean => {
    if (!selectedCell) return false
    const structure = getStructureAtPosition(selectedCell.row, selectedCell.col)
    return structure?.type === 'table'
  }

  // Add column header level to selected table
  const addColumnHeaderLevel = () => {
    if (!selectedCell) return
    const structure = getStructureAtPosition(selectedCell.row, selectedCell.col)
    if (!structure || structure.type !== 'table') return
    
    const table = structure as Table
    const newHeaderRows = (table.headerRows || 1) + 1
    
    updateTableHeaders(
      selectedCell.row,
      selectedCell.col,
      true, // Enable column headers
      table.hasHeaderCol || false,
      newHeaderRows,
      table.headerCols
    )
    setContextMenu(null)
  }

  // Add row header level to selected table
  const addRowHeaderLevel = () => {
    if (!selectedCell) return
    const structure = getStructureAtPosition(selectedCell.row, selectedCell.col)
    if (!structure || structure.type !== 'table') return
    
    const table = structure as Table
    const newHeaderCols = (table.headerCols || 1) + 1
    
    updateTableHeaders(
      selectedCell.row,
      selectedCell.col,
      table.hasHeaderRow || false,
      true, // Enable row headers
      table.headerRows,
      newHeaderCols
    )
    setContextMenu(null)
  }

  const updateCell = (row: number, col: number, value: string) => {
    const key = getCellKey(row, col)
    setCellData(prev => {
      const newData = new Map(prev)
      if (value === '') {
        newData.delete(key)
      } else {
        newData.set(key, value)
      }
      return newData
    })

    // Update structure if it exists
    const structureKey = getStructureKey(row, col)
    const structure = structures.get(structureKey)
    if (structure && structure.type === 'cell') {
      setStructures(prev => {
        const newStructures = new Map(prev)
        newStructures.set(structureKey, { ...structure, value })
        return newStructures
      })
    }

    // Update merged cell value if this cell is part of a merged cell
    const mergedCell = getMergedCellContaining(row, col)
    if (mergedCell) {
      setMergedCells(prev => {
        const newMerged = new Map(prev)
        for (const [key, cell] of prev) {
          if (cell === mergedCell) {
            newMerged.set(key, { ...cell, value })
            break
          }
        }
        return newMerged
      })
    }
  }

  const createStructure = (type: Structure['type'], name: string, dimensions?: {rows: number, cols: number}) => {
    if (!selectedCell) return

    const { row, col } = selectedCell
    const position = { row, col }

    let newStructure: Structure

    switch (type) {
      case 'cell':
        newStructure = {
          type: 'cell',
          position,
          name,
          value: getCellValue(row, col)
        }
        break
      
      case 'array':
        const cells: Cell[] = []
        const arrayDims = dimensions || { rows: 1, cols: 1 }
        
        for (let r = 0; r < arrayDims.rows; r++) {
          for (let c = 0; c < arrayDims.cols; c++) {
            const cellRow = row + r
            const cellCol = col + c
            if (cellRow < 1000 && cellCol < 26) {
              cells.push({
                type: 'cell',
                position: { row: cellRow, col: cellCol },
                value: getCellValue(cellRow, cellCol)
              })
            }
          }
        }

        newStructure = {
          type: 'array',
          position,
          startPosition: { row, col },
          endPosition: { row: row + arrayDims.rows - 1, col: col + arrayDims.cols - 1 },
          name,
          cells,
          dimensions: arrayDims
        }
        break

      case 'table':
        const arrays: Array[] = []
        const tableDims = dimensions || { rows: 1, cols: 1 }
        
        // Create arrays for the table (simplified - each row becomes an array)
        for (let r = 0; r < tableDims.rows; r++) {
          const rowCells: Cell[] = []
          for (let c = 0; c < tableDims.cols; c++) {
            const cellRow = row + r
            const cellCol = col + c
            if (cellRow < 1000 && cellCol < 26) {
              rowCells.push({
                type: 'cell',
                position: { row: cellRow, col: cellCol },
                value: getCellValue(cellRow, cellCol)
              })
            }
          }
          
          arrays.push({
            type: 'array',
            position: { row: row + r, col },
            startPosition: { row: row + r, col },
            endPosition: { row: row + r, col: col + tableDims.cols - 1 },
            cells: rowCells,
            dimensions: { rows: 1, cols: tableDims.cols }
          })
        }

        newStructure = {
          type: 'table',
          position,
          startPosition: { row, col },
          endPosition: { row: row + tableDims.rows - 1, col: col + tableDims.cols - 1 },
          name,
          arrays,
          dimensions: tableDims,
          hasHeaderRow: true,
          hasHeaderCol: false,
          headerRows: 1,
          headerCols: 1
        }
        break
    }

    // Set the main structure
    setStructures(prev => {
      const newStructures = new Map(prev)
      newStructures.set(getStructureKey(row, col), newStructure)
      
      // For arrays and tables, also mark the constituent cells
      if (type === 'array' || type === 'table') {
        const dims = dimensions || { rows: 1, cols: 1 }
        for (let r = 0; r < dims.rows; r++) {
          for (let c = 0; c < dims.cols; c++) {
            const cellRow = row + r
            const cellCol = col + c
            if (cellRow < 1000 && cellCol < 26 && !(r === 0 && c === 0)) {
              newStructures.set(getStructureKey(cellRow, cellCol), newStructure)
            }
          }
        }
      }
      
      return newStructures
    })
  }

  // Create structure from toolbar (works with selected range)
  const createStructureFromToolbar = (type: Structure['type']) => {
    let startRow: number, endRow: number, startCol: number, endCol: number

    if (selectedRange) {
      // Use selected range
      startRow = Math.min(selectedRange.start.row, selectedRange.end.row)
      endRow = Math.max(selectedRange.start.row, selectedRange.end.row)
      startCol = Math.min(selectedRange.start.col, selectedRange.end.col)
      endCol = Math.max(selectedRange.start.col, selectedRange.end.col)
    } else if (selectedCell) {
      // Use single selected cell
      startRow = endRow = selectedCell.row
      startCol = endCol = selectedCell.col
    } else {
      return // No selection
    }

    const position = { row: startRow, col: startCol }
    const dimensions = { rows: endRow - startRow + 1, cols: endCol - startCol + 1 }
    const name = `${type}_${startRow}_${startCol}` // Auto-generate name

    let newStructure: Structure

    switch (type) {
      case 'cell':
        // For cell type, create individual cell structures for each selected cell
        setStructures(prev => {
          const newStructures = new Map(prev)
          for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
              const cellStructure: Structure = {
                type: 'cell',
                position: { row: r, col: c },
                name: `cell_${r}_${c}`,
                value: getCellValue(r, c)
              }
              newStructures.set(getStructureKey(r, c), cellStructure)
            }
          }
          return newStructures
        })
        return

      case 'array':
        const cells: Cell[] = []
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            if (r < 1000 && c < 26) {
              cells.push({
                type: 'cell',
                position: { row: r, col: c },
                value: getCellValue(r, c)
              })
            }
          }
        }

        newStructure = {
          type: 'array',
          position,
          startPosition: { row: startRow, col: startCol },
          endPosition: { row: endRow, col: endCol },
          name,
          cells,
          dimensions
        }
        break

      case 'table':
        const arrays: Array[] = []
        
        // Create arrays for each row in the selection
        for (let r = startRow; r <= endRow; r++) {
          const rowCells: Cell[] = []
          for (let c = startCol; c <= endCol; c++) {
            if (r < 1000 && c < 26) {
              rowCells.push({
                type: 'cell',
                position: { row: r, col: c },
                value: getCellValue(r, c)
              })
            }
          }
          
          arrays.push({
            type: 'array',
            position: { row: r, col: startCol },
            startPosition: { row: r, col: startCol },
            endPosition: { row: r, col: endCol },
            cells: rowCells,
            dimensions: { rows: 1, cols: dimensions.cols }
          })
        }

        newStructure = {
          type: 'table',
          position,
          startPosition: { row: startRow, col: startCol },
          endPosition: { row: endRow, col: endCol },
          name,
          arrays,
          dimensions,
          hasHeaderRow: true,
          hasHeaderCol: false,
          headerRows: 1,
          headerCols: 1
        }
        break
    }

    // Set the main structure
    setStructures(prev => {
      const newStructures = new Map(prev)
      newStructures.set(getStructureKey(startRow, startCol), newStructure)
      
      // For arrays and tables, mark all constituent cells
      if (type === 'array' || type === 'table') {
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            if (r < 1000 && c < 26 && !(r === startRow && c === startCol)) {
              newStructures.set(getStructureKey(r, c), newStructure)
            }
          }
        }
      }
      
      return newStructures
    })
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    setScrollTop(target.scrollTop)
    setScrollLeft(target.scrollLeft)
  }

  const handleCellFocus = (row: number, col: number) => {
    setSelectedCell({ row, col })
  }

  // Move to the cell below when Enter is pressed
  const handleCellEnterPress = (row: number, col: number) => {
    const nextRow = row + 1
    if (nextRow < 1000) { // Don't go beyond the maximum row limit
      setSelectedCell({ row: nextRow, col })
      // Set a flag to indicate that the next cell should start editing
      setShouldStartEditing({ row: nextRow, col })
    }
  }

  // Handle arrow key navigation
  const handleArrowKeyNavigation = (row: number, col: number, direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => {
    let newRow = row
    let newCol = col

    switch (direction) {
      case 'ArrowUp':
        newRow = Math.max(0, row - 1)
        break
      case 'ArrowDown':
        newRow = Math.min(999, row + 1)
        break
      case 'ArrowLeft':
        newCol = Math.max(0, col - 1)
        break
      case 'ArrowRight':
        newCol = Math.min(25, col + 1)
        break
    }

    setSelectedCell({ row: newRow, col: newCol })
    // Set a flag to indicate that the next cell should start editing
    setShouldStartEditing({ row: newRow, col: newCol })
  }

  // Function to update table header settings
  const updateTableHeaders = (row: number, col: number, hasHeaderRow: boolean, hasHeaderCol: boolean, headerRows?: number, headerCols?: number) => {
    const structureKey = getStructureKey(row, col)
    const structure = structures.get(structureKey)
    
    if (structure && structure.type === 'table') {
      const updatedTable = { 
        ...structure, 
        hasHeaderRow, 
        hasHeaderCol,
        headerRows: headerRows || 1,
        headerCols: headerCols || 1
      }
      
      setStructures(prev => {
        const newStructures = new Map(prev)
        newStructures.set(structureKey, updatedTable)
        
        // Update all cells that belong to this table
        const { startPosition, endPosition } = structure
        for (let r = startPosition.row; r <= endPosition.row; r++) {
          for (let c = startPosition.col; c <= endPosition.col; c++) {
            if (!(r === startPosition.row && c === startPosition.col)) {
              newStructures.set(getStructureKey(r, c), updatedTable)
            }
          }
        }
        
        return newStructures
      })
    }
  }

  // Helper function to check if a cell is in the selected range
  const isCellInRange = (row: number, col: number): boolean => {
    if (!selectedRange) return false
    
    const minRow = Math.min(selectedRange.start.row, selectedRange.end.row)
    const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row)
    const minCol = Math.min(selectedRange.start.col, selectedRange.end.col)
    const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col)
    
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol
  }

  // Check if a cell is a table header
  const isTableHeader = (row: number, col: number): boolean => {
    const structure = getStructureAtPosition(row, col)
    if (!structure || structure.type !== 'table') return false
    
    const table = structure as Table
    const { startPosition } = table
    const headerRows = table.headerRows || 1
    const headerCols = table.headerCols || 1
    
    // Check if cell is within header row range
    const isInHeaderRows = (table.hasHeaderRow === true) && 
      row >= startPosition.row && 
      row < startPosition.row + headerRows
    
    // Check if cell is within header column range  
    const isInHeaderCols = (table.hasHeaderCol === true) && 
      col >= startPosition.col && 
      col < startPosition.col + headerCols
    
    return isInHeaderRows || isInHeaderCols
  }

  // Add a column to a table
  const addColumnToTable = (tableRow: number, tableCol: number, insertAfterCol: number) => {
    const structureKey = getStructureKey(tableRow, tableCol)
    const structure = structures.get(structureKey)
    
    if (!structure || structure.type !== 'table') return
    
    const table = structure as Table
    const newDimensions = { 
      rows: table.dimensions.rows, 
      cols: table.dimensions.cols + 1 
    }
    
    // Update table structure
    const updatedTable: Table = {
      ...table,
      dimensions: newDimensions,
      endPosition: {
        row: table.endPosition.row,
        col: table.endPosition.col + 1
      }
    }
    
    // Update all cells in the table to reference the new structure
    setStructures(prev => {
      const newStructures = new Map(prev)
      
      // Remove old structure references for cells that will shift
      for (let r = table.startPosition.row; r <= table.endPosition.row; r++) {
        for (let c = insertAfterCol + 1; c <= table.endPosition.col; c++) {
          newStructures.delete(getStructureKey(r, c))
        }
      }
      
      // Add the updated table structure
      newStructures.set(structureKey, updatedTable)
      
      // Add structure references for all cells in the expanded table
      for (let r = table.startPosition.row; r <= table.endPosition.row; r++) {
        for (let c = table.startPosition.col; c <= table.endPosition.col + 1; c++) {
          if (!(r === tableRow && c === tableCol)) {
            newStructures.set(getStructureKey(r, c), updatedTable)
          }
        }
      }
      
      return newStructures
    })
    
    // Shift cell data for columns after the insertion point
    setCellData(prev => {
      const newData = new Map(prev)
      
      // Move data from right to left to avoid overwriting
      for (let r = table.startPosition.row; r <= table.endPosition.row; r++) {
        for (let c = table.endPosition.col; c > insertAfterCol; c--) {
          const oldKey = getCellKey(r, c)
          const newKey = getCellKey(r, c + 1)
          const value = newData.get(oldKey)
          if (value) {
            newData.set(newKey, value)
            newData.delete(oldKey)
          }
        }
      }
      
      return newData
    })
  }

  // Add a sub-column at a specific header level
  const addSubColumnAtLevel = (headerRow: number, insertAfterCol: number) => {
    const structure = getStructureAtPosition(headerRow, insertAfterCol)
    if (!structure || structure.type !== 'table') return
    
    const table = structure as Table
    const headerLevel = getHeaderLevel(headerRow, table)
    
    if (headerLevel < 0) return
    
    // Add column to the table
    addColumnToTable(table.position.row, table.position.col, insertAfterCol)
    
    // Create merged cells for parent headers to span the new column
    if (headerLevel > 0) {
      setMergedCells(prev => {
        const newMerged = new Map(prev)
        
        // For each header level above the current one, extend existing merged cells
        for (let level = 0; level < headerLevel; level++) {
          const parentRow = table.startPosition.row + level
          
          // Find existing merged cell containing the parent header
          for (const [key, mergedCell] of prev) {
            if (mergedCell.startRow === parentRow && 
                mergedCell.startCol <= insertAfterCol && 
                mergedCell.endCol >= insertAfterCol) {
              
              // Extend this merged cell to include the new column
              const extendedMergedCell: MergedCell = {
                ...mergedCell,
                endCol: mergedCell.endCol + 1
              }
              
              newMerged.set(key, extendedMergedCell)
              break
            }
          }
          
          // If no existing merged cell found, create one spanning the parent header
          let foundExisting = false
          for (const [key, mergedCell] of prev) {
            if (mergedCell.startRow === parentRow && 
                mergedCell.startCol <= insertAfterCol && 
                mergedCell.endCol >= insertAfterCol) {
              foundExisting = true
              break
            }
          }
          
          if (!foundExisting) {
            // Create a new merged cell for the parent header
            const parentValue = getCellValue(parentRow, insertAfterCol)
            const newMergedCell: MergedCell = {
              startRow: parentRow,
              startCol: insertAfterCol,
              endRow: parentRow,
              endCol: insertAfterCol + 1,
              value: parentValue
            }
            
            const newKey = getMergedCellKey(parentRow, insertAfterCol, parentRow, insertAfterCol + 1)
            newMerged.set(newKey, newMergedCell)
          }
        }
        
        return newMerged
      })
    }
  }

  // Get the height of the column that will be added
  const getColumnHeight = (row: number, col: number): number => {
    // Find the table this column belongs to
    for (const [key, structure] of structures) {
      if (structure.type === 'table') {
        const table = structure as Table
        const headerLevel = getHeaderLevel(row, table)
        
        // Check if this position is for adding a column to this table
        if (row >= table.startPosition.row && row <= table.endPosition.row &&
            col <= table.endPosition.col + 1 && 
            row < table.startPosition.row + (table.headerRows || 1)) {
          
          // For top-level headers, return full table height
          if (headerLevel === 0) {
            return (table.endPosition.row - table.startPosition.row + 1) * DEFAULT_CELL_HEIGHT
          }
          
          // For sub-level headers, return height from current row to bottom of table
          if (headerLevel > 0) {
            return (table.endPosition.row - row + 1) * DEFAULT_CELL_HEIGHT
          }
          
          // Default to full table height
          return (table.endPosition.row - table.startPosition.row + 1) * DEFAULT_CELL_HEIGHT
        }
      }
    }
    
    // Default to single cell height if no table found
    return DEFAULT_CELL_HEIGHT
  }

  // Get header level for a given row in a table
  const getHeaderLevel = (row: number, table: Table): number => {
    const headerRows = table.headerRows || 1
    const relativeRow = row - table.startPosition.row
    if (relativeRow < 0 || relativeRow >= headerRows) return -1
    return relativeRow
  }

  // Handle header cell hover
  const handleHeaderHover = (row: number, col: number, isEntering: boolean) => {
    if (isEntering && isTableHeader(row, col)) {
      const structure = getStructureAtPosition(row, col)
      if (structure && structure.type === 'table') {
        const table = structure as Table
        const headerLevel = getHeaderLevel(row, table)
        
        if (headerLevel >= 0) {
          // Check if this cell is part of a merged cell
          const mergedCell = getMergedCellContaining(row, col)
          let rightmostCol = col
          
          if (mergedCell) {
            // If part of a merged cell, use the rightmost column of the merged cell
            rightmostCol = mergedCell.endCol
          }
          
          // Show button to the right of the rightmost cell (merged or single)
          setHoveredHeaderCell({ row, col: rightmostCol + 1 })
          setShowAddColumnButton(true)
        }
      }
    } else if (!isEntering) {
      setHoveredHeaderCell(null)
      setShowAddColumnButton(false)
    }
  }

  // Right-click context menu handler
  const handleRightClick = (row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault()
    // Don't change selection on right-click, just show context menu
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  // Mouse event handlers for drag selection
  const handleMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    // If left-click, start selection
    if (e.button !== 0) return // Only handle left-click

    // Always set the selected cell
    setSelectedCell({ row, col })
    
    // Start drag selection
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ row, col })
    setSelectedRange(null)
  }

  const handleMouseEnter = (row: number, col: number) => {
    if (isDragging && dragStart) {
      setSelectedRange({
        start: dragStart,
        end: { row, col }
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragStart(null)
  }

  // Resize event handlers
  const handleResizeMouseDown = (type: 'column' | 'row', index: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsResizing(true)
    setResizeType(type)
    setResizeIndex(index)
    setResizeStartPos(type === 'column' ? e.clientX : e.clientY)
    setResizeStartSize(type === 'column' ? getColumnWidth(index) : getRowHeight(index))
  }

  // Add global mouse up and move listeners for resizing
  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false)
      setDragStart(null)
      setIsResizing(false)
      setResizeType(null)
      setResizeIndex(null)
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isResizing && resizeType && resizeIndex !== null) {
        const currentPos = resizeType === 'column' ? e.clientX : e.clientY
        const delta = currentPos - resizeStartPos
        const newSize = Math.max(20, resizeStartSize + delta) // Minimum size of 20px
        
        if (resizeType === 'column') {
          setColumnWidths(prev => {
            const newWidths = new Map(prev)
            newWidths.set(resizeIndex, newSize)
            return newWidths
          })
        } else {
          setRowHeights(prev => {
            const newHeights = new Map(prev)
            newHeights.set(resizeIndex, newSize)
            return newHeights
          })
        }
      }
    }

    document.addEventListener('mouseup', handleGlobalMouseUp)
    document.addEventListener('mousemove', handleGlobalMouseMove)
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [isResizing, resizeType, resizeIndex, resizeStartPos, resizeStartSize])

  // Render merged cell overlays
  const renderMergedCellOverlays = () => {
    const overlays = []

    for (const [key, mergedCell] of mergedCells) {
      // Check if the merged cell is visible in current viewport
      if (mergedCell.endRow >= startRow && mergedCell.startRow < endRow &&
          mergedCell.endCol >= startCol && mergedCell.startCol < endCol) {
        
        const overlayLeft = getColumnPosition(mergedCell.startCol)
        const overlayTop = getRowPosition(mergedCell.startRow)
        
        let overlayWidth = 0
        for (let c = mergedCell.startCol; c <= mergedCell.endCol; c++) {
          overlayWidth += getColumnWidth(c)
        }
        
        let overlayHeight = 0
        for (let r = mergedCell.startRow; r <= mergedCell.endRow; r++) {
          overlayHeight += getRowHeight(r)
        }

        overlays.push(
          <div
            key={`merged-overlay-${key}`}
            className="absolute pointer-events-none border-2 border-orange-500 bg-orange-50"
            style={{
              left: overlayLeft,
              top: overlayTop,
              width: overlayWidth,
              height: overlayHeight,
              zIndex: 3
            }}
            title={`Merged cell: ${mergedCell.value}`}
          />
        )
      }
    }

    return overlays
  }

  // Render structure overlays
  const renderStructureOverlays = () => {
    const overlays = []
    const processedStructures = new Set<string>()

    for (const [key, structure] of structures) {
      // Skip if we've already processed this structure
      if (processedStructures.has(key)) continue

      var { startPosition, endPosition } = structure as Array | Table
      if (structure.type === 'cell') {
        startPosition = structure.position
        endPosition = structure.position
      }
      
      // Check if the structure is visible in current viewport
      const structureStartRow = startPosition.row
      const structureEndRow = endPosition.row
      const structureStartCol = startPosition.col
      const structureEndCol = endPosition.col

      if (structureEndRow >= startRow && structureStartRow < endRow &&
          structureEndCol >= startCol && structureStartCol < endCol) {
        
        const overlayLeft = getColumnPosition(structureStartCol)
        const overlayTop = getRowPosition(structureStartRow)
        
        let overlayWidth = 0
        for (let c = structureStartCol; c <= structureEndCol; c++) {
          overlayWidth += getColumnWidth(c)
        }
        
        let overlayHeight = 0
        for (let r = structureStartRow; r <= structureEndRow; r++) {
          overlayHeight += getRowHeight(r)
        }

        var borderColor;
        switch (structure.type) {
          case 'cell':
            borderColor = 'border-black'
            break
          case 'array':
            borderColor = 'border-blue-500'
            break
          case 'table':
            borderColor = 'border-green-500'
            break
        }

        overlays.push(
          <div
            key={`overlay-${key}`}
            className={`absolute pointer-events-none border-2 ${borderColor}`}
            style={{
              left: overlayLeft,
              top: overlayTop,
              width: overlayWidth,
              height: overlayHeight,
              zIndex: 5
            }}
            title={structure.name ? `${structure.type}: ${structure.name}` : structure.type}
          />
        )

        // Mark all cells of this structure as processed
        for (let r = structureStartRow; r <= structureEndRow; r++) {
          for (let c = structureStartCol; c <= structureEndCol; c++) {
            processedStructures.add(getStructureKey(r, c))
          }
        }
      }
    }

    return overlays
  }

  // Render range selection overlay
  const renderRangeSelectionOverlay = () => {
    if (!selectedRange) return null

    const minRow = Math.min(selectedRange.start.row, selectedRange.end.row)
    const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row)
    const minCol = Math.min(selectedRange.start.col, selectedRange.end.col)
    const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col)

    // Check if the range is visible in current viewport
    if (maxRow >= startRow && minRow < endRow && maxCol >= startCol && minCol < endCol) {
      const overlayLeft = getColumnPosition(minCol)
      const overlayTop = getRowPosition(minRow)
      
      let overlayWidth = 0
      for (let c = minCol; c <= maxCol; c++) {
        overlayWidth += getColumnWidth(c)
      }
      
      let overlayHeight = 0
      for (let r = minRow; r <= maxRow; r++) {
        overlayHeight += getRowHeight(r)
      }

      return (
        <div
          className="absolute pointer-events-none border-2 border-blue-600 bg-blue-100 bg-opacity-30"
          style={{
            left: overlayLeft,
            top: overlayTop,
            width: overlayWidth,
            height: overlayHeight,
            zIndex: 10
          }}
        />
      )
    }

    return null
  }

  // Render add column button overlay
  const renderAddColumnButton = () => {
    if (!showAddColumnButton || !hoveredHeaderCell) return null

    const { row, col } = hoveredHeaderCell

    // Check if the button position is visible in current viewport
    if (row >= startRow && row < endRow && col >= startCol && col < endCol) {
      const buttonWidth = 20 // Math.floor(getColumnWidth(col) * 0.2) // 20% of cell width
      const buttonLeft = getColumnPosition(col) // Left-aligned to column
      const buttonTop = getRowPosition(row)

      return (
        <button
          className="absolute bg-green-500 bg-opacity-100 border border-green-700 flex items-center justify-center text-white font-bold text-sm hover:bg-opacity-90 transition-all duration-200"
          onClick={() => {
            // Find the table structure to add column to
            for (const [key, structure] of structures) {
              if (structure.type === 'table') {
                const table = structure as Table
                const headerLevel = getHeaderLevel(row, table)
                
                // For both top-level and sub-level headers, add column after the hovered cell
                if (headerLevel >= 0 && row >= table.startPosition.row && 
                    row < table.startPosition.row + (table.headerRows || 1) &&
                    col === hoveredHeaderCell?.col) {
                  
                  if (headerLevel === 0) {
                    // Top-level header - add column after the hovered cell
                    addColumnToTable(table.position.row, table.position.col, col - 1)
                  } else {
                    // Sub-level header - add sub-column after the hovered cell
                    addSubColumnAtLevel(row, col - 1)
                  }
                  break
                }
              }
            }
            setShowAddColumnButton(false)
            setHoveredHeaderCell(null)
          }}
          onMouseEnter={() => {
            // Keep the button visible when hovering over it
            setShowAddColumnButton(true)
            setHoveredHeaderCell({ row, col })
          }}
          onMouseLeave={() => {
            // Use a small delay before hiding to allow for slight mouse movement
            setTimeout(() => {
              setShowAddColumnButton(false)
              setHoveredHeaderCell(null)
            }, 150)
          }}
          style={{
            left: buttonLeft,
            top: buttonTop,
            width: buttonWidth,
            height: getColumnHeight(row, col),
            minWidth: buttonWidth,
            minHeight: getColumnHeight(row, col),
            zIndex: 50
          }}
          title="Add column"
        >
          +
        </button>
      )
    }

    return null
  }


  // Check if a position represents a ghosted column for any table
  const isGhostedColumn = (row: number, col: number): boolean => {
    if (!hoveredHeaderCell) return false
    
    for (const [key, structure] of structures) {
      if (structure.type === 'table') {
        const table = structure as Table
        const headerLevel = getHeaderLevel(hoveredHeaderCell.row, table)
        
        // Case 1: Ghosted column at end of table (top-level header)
        if (row >= table.startPosition.row && 
            row <= table.endPosition.row &&
            col === table.endPosition.col + 1 &&
            hoveredHeaderCell.col === table.endPosition.col + 1) {
          return true
        }
        
        // Case 2: Ghosted sub-column (sub-level header)
        if (headerLevel > 0 && 
            row >= table.startPosition.row && 
            row <= table.endPosition.row &&
            col === hoveredHeaderCell.col &&
            hoveredHeaderCell.row >= table.startPosition.row && 
            hoveredHeaderCell.row < table.startPosition.row + (table.headerRows || 1)) {
          return true
        }
      }
    }
    return false
  }

  // Render visible rows
  const renderRows = () => {
    const rows = []
    for (let rowIndex = startRow; rowIndex < endRow; rowIndex++) {
      const cells = []
      
      // Row header
      cells.push(
        <div
          key={`row-header-${rowIndex}`}
          className="border border-gray-300 bg-gray-100 font-bold text-center flex items-center justify-center sticky left-0 z-10 relative"
          style={{
            position: 'absolute',
            left: 0,
            top: getRowPosition(rowIndex),
            width: getHeaderWidth(),
            height: getRowHeight(rowIndex),
            minWidth: getHeaderWidth(),
            minHeight: getRowHeight(rowIndex)
          }}
        >
          {rowIndex + 1}
          {/* Row resize handle */}
          <div
            className="absolute bottom-0 left-0 w-full h-1 cursor-row-resize bg-transparent hover:bg-blue-500 z-20"
            onMouseDown={(e) => handleResizeMouseDown('row', rowIndex, e)}
            style={{
              marginBottom: '-2px' // Extend slightly beyond the header border
            }}
          />
        </div>
      )

      // Data cells
      for (let colIndex = startCol; colIndex < endCol; colIndex++) {
        if (!shouldRenderCell(rowIndex, colIndex)) {
          continue // Skip cells that are hidden by merged cells
        }

        const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex
        const isInRange = isCellInRange(rowIndex, colIndex)
        const structure = getStructureAtPosition(rowIndex, colIndex)
        const mergedCell = getMergedCellContaining(rowIndex, colIndex)
        
        // Calculate cell dimensions for merged cells
        let cellWidth = getColumnWidth(colIndex)
        let cellHeight = getRowHeight(rowIndex)
        
        if (mergedCell) {
          cellWidth = 0
          for (let c = mergedCell.startCol; c <= mergedCell.endCol; c++) {
            cellWidth += getColumnWidth(c)
          }
          cellHeight = 0
          for (let r = mergedCell.startRow; r <= mergedCell.endRow; r++) {
            cellHeight += getRowHeight(r)
          }
        }
        
        cells.push(
          <div
            key={`cell-${rowIndex}-${colIndex}`}
            className={`border border-gray-300 ${isInRange ? 'bg-blue-100' : ''} ${mergedCell ? 'bg-orange-50' : ''}`}
            style={{
              position: 'absolute',
              left: getColumnPosition(colIndex),
              top: getRowPosition(rowIndex),
              width: cellWidth,
              height: cellHeight,
              minWidth: cellWidth,
              minHeight: cellHeight,
              zIndex: mergedCell ? 2 : 1,
            }}
            onMouseEnter={() => {
              handleMouseEnter(rowIndex, colIndex)
              // Check if this is a header cell and trigger header hover
              if (isTableHeader(rowIndex, colIndex)) {
                handleHeaderHover(rowIndex, colIndex, true)
              }
            }}
            onMouseLeave={() => {
              // Check if this is a header cell and trigger header hover
              if (isTableHeader(rowIndex, colIndex)) {
                handleHeaderHover(rowIndex, colIndex, false)
              }
            }}
          >
            <EditableCell
              value={mergedCell ? mergedCell.value : getCellValue(rowIndex, colIndex)}
              onChange={(value) => updateCell(rowIndex, colIndex, value)}
              isSelected={isSelected}
              onFocus={() => handleCellFocus(rowIndex, colIndex)}
              onEnterPress={() => handleCellEnterPress(rowIndex, colIndex)}
              onArrowKeyPress={(direction) => handleArrowKeyNavigation(rowIndex, colIndex, direction)}
              shouldStartEditing={shouldStartEditing?.row === rowIndex && shouldStartEditing?.col === colIndex}
              onEditingStarted={() => setShouldStartEditing(null)}
              structure={structure}
              onMouseDown={(e) => handleMouseDown(rowIndex, colIndex, e)}
              onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
              onMouseUp={handleMouseUp}
              onRightClick={(e) => handleRightClick(rowIndex, colIndex, e)}
              onHeaderHover={(isEntering) => handleHeaderHover(rowIndex, colIndex, isEntering)}
              onAddColumn={() => addColumnToTable(rowIndex, colIndex, colIndex)}
              row={rowIndex}
              col={colIndex}
              isMergedCell={!!mergedCell}
            />
          </div>
        )
      }

      // Add invisible hover areas for ghosted columns to keep the add button visible
      for (let colIndex = startCol; colIndex < endCol; colIndex++) {
        if (isGhostedColumn(rowIndex, colIndex)) {
          cells.push(
            <div
              key={`ghosted-hover-${rowIndex}-${colIndex}`}
              className="absolute"
              style={{
                left: getColumnPosition(colIndex),
                top: getRowPosition(rowIndex),
                width: getColumnWidth(colIndex),
                height: getRowHeight(rowIndex),
                minWidth: getColumnWidth(colIndex),
                minHeight: getRowHeight(rowIndex),
                zIndex: 45, // Between regular cells and the add button
                pointerEvents: 'auto'
              }}
              onMouseEnter={() => {
                // Find the table this ghosted column belongs to and trigger header hover
                for (const [key, structure] of structures) {
                  if (structure.type === 'table') {
                    const table = structure as Table
                    if (rowIndex >= table.startPosition.row && 
                        rowIndex <= table.endPosition.row &&
                        colIndex === table.endPosition.col + 1) {
                      handleHeaderHover(rowIndex, colIndex, true)
                      break
                    }
                  }
                }
              }}
              onMouseLeave={() => {
                // Keep the button visible briefly to allow clicking
                setTimeout(() => {
                  if (!hoveredHeaderCell) {
                    setShowAddColumnButton(false)
                  }
                }, 100)
              }}
            />
          )
        }
      }

      rows.push(...cells)
    }
    return rows
  }

  // Render column headers
  const renderColumnHeaders = () => {
    const headers = []
    
    // Empty corner cell
    headers.push(
      <div
        key="corner"
        className="border border-gray-300 bg-gray-100 font-bold text-center sticky left-0 top-0 z-20"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: getHeaderWidth(),
          height: getHeaderHeight(),
          minWidth: getHeaderWidth(),
          minHeight: getHeaderHeight()
        }}
      />
    )

    // Column headers
    for (let colIndex = startCol; colIndex < endCol; colIndex++) {
      headers.push(
        <div
          key={`col-header-${colIndex}`}
          className="border border-gray-300 bg-gray-100 font-bold text-center flex items-center justify-center sticky top-0 z-10 relative"
          style={{
            position: 'absolute',
            left: getColumnPosition(colIndex),
            top: 0,
            width: getColumnWidth(colIndex),
            height: getHeaderHeight(),
            minWidth: getColumnWidth(colIndex),
            minHeight: getHeaderHeight()
          }}
        >
          {columnLetters[colIndex]}
          {/* Column resize handle */}
          <div
            className="absolute right-0 top-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 z-20"
            onMouseDown={(e) => handleResizeMouseDown('column', colIndex, e)}
            style={{
              marginRight: '-2px' // Extend slightly beyond the header border
            }}
          />
        </div>
      )
    }
    return headers
  }

  return (
    <div className="flex flex-col h-screen">
      <Toolbar
        selectedCell={selectedCell}
        selectedRange={selectedRange}
        onCreateStructure={createStructureFromToolbar}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Spreadsheet container */}
        <div className="flex-1 bg-gray-50 p-4 min-w-0">
          <div className="h-full bg-white border border-gray-300 rounded-lg shadow-lg">
            <div 
              ref={containerRef}
              className="overflow-auto h-full w-full rounded-lg"
              style={{ 
                position: 'relative'
              }}
              onScroll={handleScroll}
            >
              {/* Virtual container to enable scrolling */}
              <div
                style={{
                  height: 1000 * DEFAULT_CELL_HEIGHT + DEFAULT_HEADER_HEIGHT,
                  width: 26 * DEFAULT_CELL_WIDTH + DEFAULT_HEADER_WIDTH,
                  position: 'relative'
                }}
              >
                {/* Column headers */}
                {renderColumnHeaders()}
                
                {/* Rows and cells */}
                {renderRows()}
                
                {/* Merged cell overlays */}
                {renderMergedCellOverlays()}
                
                {/* Structure overlays */}
                {renderStructureOverlays()}
                
                {/* Add column button overlay */}
                {renderAddColumnButton()}
                
                {/* Range selection overlay */}
                {/* {renderRangeSelectionOverlay()} */}
              </div>
            </div>
          </div>
        </div>

        {/* Structure Panel - takes full vertical space on the right */}
        <div className="flex-shrink-0">
          <StructurePanel
            structures={structures}
            selectedCell={selectedCell}
            onCreateStructure={createStructure}
            onUpdateTableHeaders={updateTableHeaders}
          />
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onMergeCells={mergeCells}
          onUnmergeCells={unmergeCells}
          onCreateArray={() => {
            createStructureFromToolbar('array')
            setContextMenu(null)
          }}
          onCreateTable={() => {
            createStructureFromToolbar('table')
            setContextMenu(null)
          }}
          onAddColumnHeaderLevel={addColumnHeaderLevel}
          onAddRowHeaderLevel={addRowHeaderLevel}
          canMerge={canMergeCells()}
          canUnmerge={canUnmergeCells()}
          canCreateStructures={selectedCell !== null || selectedRange !== null}
          canAddHeaderLevels={canAddHeaderLevels()}
        />
      )}
    </div>
  )
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Failed to find the root element')

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
