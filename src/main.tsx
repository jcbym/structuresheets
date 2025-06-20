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
}

type Structure = Cell | Array | Table

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
  structure?: Structure
  onMouseDown?: (e: React.MouseEvent) => void
  onMouseEnter?: () => void
  onMouseUp?: () => void
}> = ({ value, onChange, isSelected, onFocus, structure, onMouseDown, onMouseEnter, onMouseUp }) => {
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

  React.useEffect(() => {
    setCellValue(value)
  }, [value])

  // Only show borders for individual cells and selection
  const getBorderClass = () => {
    if (isSelected) {
      return 'border-2 border-blue-600' // Selection border
    }
    return 'border-none' // No border for array/table cells (they get overlay borders)
  }

  return (
    <div 
      className={`w-full h-full relative ${getBorderClass()}`}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseUp={onMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <input
          type="text"
          value={cellValue}
          onChange={(e) => setCellValue(e.target.value)}
          onBlur={handleBlur}
          onFocus={handleFocus}
          className="w-full h-full outline-none px-2 py-1 bg-transparent"
          style={{ minWidth: '80px', minHeight: '30px' }}
          autoFocus
        />
      ) : (
        <div 
          className="w-full h-full px-2 py-1 cursor-cell flex items-center"
          style={{ minWidth: '80px', minHeight: '30px' }}
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
}> = ({ structures, selectedCell, onCreateStructure }) => {
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
    return (
      <div className="h-full bg-white border-l border-gray-300 p-4 flex flex-col w-80">
      <h3 className="font-bold mb-4 text-lg">{currentStructure.type}</h3>

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
  } else {
    return (
      <div className="h-full bg-white border-l border-gray-300 p-4 flex flex-col w-80">
      <h3 className="font-bold mb-4 text-lg">Structure Management</h3>

      <div className="mb-4">
        <h4 className="font-semibold mb-2">Create New Structure</h4>
        <div className="space-y-2">
          <select 
            value={structureType} 
            onChange={(e) => setStructureType(e.target.value as Structure['type'])}
            className="w-full border rounded px-2 py-1"
          >
            <option value="cell">Cell</option>
            <option value="array">Array</option>
            <option value="table">Table</option>
          </select>

          <input
            type="text"
            placeholder="Structure name"
            value={structureName}
            onChange={(e) => setStructureName(e.target.value)}
            className="w-full border rounded px-2 py-1"
          />

          {structureType !== 'cell' && (
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min="1"
                max="10"
                value={arrayRows}
                onChange={(e) => setArrayRows(parseInt(e.target.value) || 1)}
                className="border rounded px-2 py-1 w-16"
                placeholder="Rows"
              />
              <span>×</span>
              <input
                type="number"
                min="1"
                max="10"
                value={arrayCols}
                onChange={(e) => setArrayCols(parseInt(e.target.value) || 1)}
                className="border rounded px-2 py-1 w-16"
                placeholder="Cols"
              />
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={!selectedCell || !structureName.trim()}
            className="w-full bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Create {structureType}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <h4 className="font-semibold mb-2">All Structures ({structures.size})</h4>
        <div className="h-full overflow-y-auto border rounded p-2 bg-gray-50">
          {Array.from(structures.entries()).map(([key, structure]) => (
            <div key={key} className="text-sm p-2 border-b border-gray-200 last:border-b-0">
              <div className="font-medium">{structure.name || 'Unnamed'}</div>
              <div className="text-gray-600">
                {structure.type} at {generateColumnLetters()[structure.position.col]}{structure.position.row + 1}
              </div>
              {structure.type !== 'cell' && (
                <div className="text-xs text-gray-500">
                  {(structure as Array | Table).dimensions.rows} × {(structure as Array | Table).dimensions.cols}
                </div>
              )}
            </div>
          ))}
          {structures.size === 0 && (
            <div className="text-gray-500 text-sm text-center py-4">
              No structures created yet
            </div>
          )}
        </div>
      </div>
    </div>
    )
  }
    // <div className="h-full bg-white border-l border-gray-300 p-4 flex flex-col w-80">
    //   <h3 className="font-bold mb-4 text-lg">Structure Manager</h3>

    //   {currentStructure && (
    //     <div className="mb-4">
    //       <h4 className="font-semibold mb-2 text-lg">{currentStructure ? currentStructure.type : ""}</h4>

    //       <h4 className="font-semibold mb-2">Formula</h4>
    //       <div className="space-y-2">
    //         <input
    //           type="text"
    //           placeholder="Enter formula"
    //           value={""} // placeholder
    //           onChange={() => ""} 
    //           className="w-full border rounded px-2 py-1"
    //         />
    //       </div>

    //       <h4 className="font-semibold mb-2">Constraints</h4>
    //       <div className="space-y-2">
    //         <input
    //           type="text"
    //           placeholder="Enter constraints"
    //           value={""} // placeholder
    //           onChange={() => ""} 
    //           className="w-full border rounded px-2 py-1"
    //         />
    //       </div>
    //     </div>
    //   )}
    // </div>
}

function App() {
  // Virtualization constants
  const CELL_HEIGHT = 32
  const CELL_WIDTH = 82
  const HEADER_HEIGHT = 32
  const HEADER_WIDTH = 52
  const VISIBLE_ROWS = Math.ceil(window.innerHeight / CELL_HEIGHT) + 5
  const VISIBLE_COLS = Math.ceil(window.innerWidth / CELL_WIDTH) + 5

  // Data storage
  const [cellData, setCellData] = React.useState<Map<string, string>>(new Map())
  const [structures, setStructures] = React.useState<Map<string, Structure>>(new Map())
  const [selectedCell, setSelectedCell] = React.useState<{row: number, col: number} | null>(null)
  const [selectedRange, setSelectedRange] = React.useState<{start: Position, end: Position} | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragStart, setDragStart] = React.useState<Position | null>(null)
  const [scrollTop, setScrollTop] = React.useState(0)
  const [scrollLeft, setScrollLeft] = React.useState(0)
  
  const columnLetters = generateColumnLetters()
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Calculate visible range
  const startRow = Math.floor(scrollTop / CELL_HEIGHT)
  const endRow = Math.min(startRow + VISIBLE_ROWS, 1000)
  const startCol = Math.floor(scrollLeft / CELL_WIDTH)
  const endCol = Math.min(startCol + VISIBLE_COLS, 26)

  const getCellKey = (row: number, col: number) => `${row}-${col}`
  const getStructureKey = (row: number, col: number) => `struct-${row}-${col}`

  const getCellValue = (row: number, col: number) => {
    return cellData.get(getCellKey(row, col)) || ''
  }

  const getStructureAtPosition = (row: number, col: number): Structure | undefined => {
    return structures.get(getStructureKey(row, col))
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
          dimensions: tableDims
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
          dimensions
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

  // Helper function to check if a cell is in the selected range
  const isCellInRange = (row: number, col: number): boolean => {
    if (!selectedRange) return false
    
    const minRow = Math.min(selectedRange.start.row, selectedRange.end.row)
    const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row)
    const minCol = Math.min(selectedRange.start.col, selectedRange.end.col)
    const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col)
    
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol
  }

  // Mouse event handlers for drag selection
  const handleMouseDown = (row: number, col: number, e: React.MouseEvent) => {
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

  // Add global mouse up listener
  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false)
      setDragStart(null)
    }

    document.addEventListener('mouseup', handleGlobalMouseUp)
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [])

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
        
        const overlayLeft = HEADER_WIDTH + (structureStartCol * CELL_WIDTH)
        const overlayTop = HEADER_HEIGHT + (structureStartRow * CELL_HEIGHT)
        const overlayWidth = (structureEndCol - structureStartCol + 1) * CELL_WIDTH
        const overlayHeight = (structureEndRow - structureStartRow + 1) * CELL_HEIGHT

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
      const overlayLeft = HEADER_WIDTH + (minCol * CELL_WIDTH)
      const overlayTop = HEADER_HEIGHT + (minRow * CELL_HEIGHT)
      const overlayWidth = (maxCol - minCol + 1) * CELL_WIDTH
      const overlayHeight = (maxRow - minRow + 1) * CELL_HEIGHT

      return (
        <div
          className="absolute pointer-events-none border-2 border-blue-600"
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

  // Render visible rows
  const renderRows = () => {
    const rows = []
    for (let rowIndex = startRow; rowIndex < endRow; rowIndex++) {
      const cells = []
      
      // Row header
      cells.push(
        <div
          key={`row-header-${rowIndex}`}
          className="border border-gray-300 bg-gray-100 font-bold text-center flex items-center justify-center sticky left-0 z-10"
          style={{
            position: 'absolute',
            left: 0,
            top: (rowIndex * CELL_HEIGHT) + HEADER_HEIGHT,
            width: HEADER_WIDTH,
            height: CELL_HEIGHT,
            minWidth: HEADER_WIDTH,
            minHeight: CELL_HEIGHT
          }}
        >
          {rowIndex + 1}
        </div>
      )

      // Data cells
      for (let colIndex = startCol; colIndex < endCol; colIndex++) {
        const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex
        const isInRange = isCellInRange(rowIndex, colIndex)
        const structure = getStructureAtPosition(rowIndex, colIndex)
        
        cells.push(
          <div
            key={`cell-${rowIndex}-${colIndex}`}
            className={`border border-gray-300 ${isInRange ? 'bg-blue-100' : ''}`}
            style={{
              position: 'absolute',
              left: HEADER_WIDTH + (colIndex * CELL_WIDTH),
              top: (rowIndex * CELL_HEIGHT) + HEADER_HEIGHT,
              width: CELL_WIDTH,
              height: CELL_HEIGHT,
              minWidth: CELL_WIDTH,
              minHeight: CELL_HEIGHT
            }}
          >
            <EditableCell
              value={getCellValue(rowIndex, colIndex)}
              onChange={(value) => updateCell(rowIndex, colIndex, value)}
              isSelected={isSelected}
              onFocus={() => handleCellFocus(rowIndex, colIndex)}
              structure={structure}
              onMouseDown={(e) => handleMouseDown(rowIndex, colIndex, e)}
              onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
              onMouseUp={handleMouseUp}
            />
          </div>
        )
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
          width: HEADER_WIDTH,
          height: HEADER_HEIGHT,
          minWidth: HEADER_WIDTH,
          minHeight: HEADER_HEIGHT
        }}
      />
    )

    // Column headers
    for (let colIndex = startCol; colIndex < endCol; colIndex++) {
      headers.push(
        <div
          key={`col-header-${colIndex}`}
          className="border border-gray-300 bg-gray-100 font-bold text-center flex items-center justify-center sticky top-0 z-10"
          style={{
            position: 'absolute',
            left: HEADER_WIDTH + (colIndex * CELL_WIDTH),
            top: 0,
            width: CELL_WIDTH,
            height: HEADER_HEIGHT,
            minWidth: CELL_WIDTH,
            minHeight: HEADER_HEIGHT
          }}
        >
          {columnLetters[colIndex]}
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
                  height: 1000 * CELL_HEIGHT + HEADER_HEIGHT,
                  width: 26 * CELL_WIDTH + HEADER_WIDTH,
                  position: 'relative'
                }}
              >
                {/* Column headers */}
                {renderColumnHeaders()}
                
                {/* Rows and cells */}
                {renderRows()}
                
                {/* Structure overlays */}
                {renderStructureOverlays()}
                
                {/* Range selection overlay */}
                {renderRangeSelectionOverlay()}
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
          />
        </div>
      </div>
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
