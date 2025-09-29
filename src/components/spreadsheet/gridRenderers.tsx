import React from 'react'
import { Structure, Position, PositionMap, StructureMap } from '../../types'
import { 
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
  getStructuresAtPosition,
  getCellValue,
  getEndPosition,
  getCellKey
} from '../../utils/structureUtils'
import { COLUMN_LETTERS, Z_INDEX, TABLE_COLOR } from '../../constants'
import { isCellCoveredByResizedCell } from './cellRenderers'

// Types for grid rendering props
export interface GridRenderProps {
  // Viewport data
  startRow: number
  endRow: number
  startCol: number
  endCol: number
  
  // Layout data
  columnWidths: Map<number, number>
  rowHeights: Map<number, number>
  
  // Structures and state
  structures: StructureMap
  positions: PositionMap
  selectedRange: {start: {row: number, col: number}, end: {row: number, col: number}} | null
  
  // Event handlers
  handleResizeMouseDown: (type: 'column' | 'row', index: number, e: React.MouseEvent) => void
  handleMouseEnter: (row: number, col: number) => void
  handleHeaderHover: (row: number, col: number, isEntering: boolean) => void
  handleColumnHeaderClick: (row: number, col: number) => void
  handleColumnHeaderMouseDown: (row: number, col: number, e: React.MouseEvent) => void
  handleMouseDown: (row: number, col: number, e: React.MouseEvent) => void
  setHoveredStructure: React.Dispatch<React.SetStateAction<Structure | null>>
  setSelectedRange: React.Dispatch<React.SetStateAction<{start: {row: number, col: number}, end: {row: number, col: number}} | null>>
  setStartEditing: React.Dispatch<React.SetStateAction<{row: number, col: number} | null>>
  
  // Cell content renderer
  renderCell: (
    row: number, 
    col: number, 
    value: string, 
    isSelected: boolean, 
    structures?: Structure[],
    isInRange?: boolean
  ) => React.ReactElement
  
  // Cell editing handlers
  handleCellClick?: (row: number, col: number) => void
  handleCellDoubleClick?: (row: number, col: number) => void
}

/**
 * Render column headers for the spreadsheet grid
 */
export function renderColumnHeaders(props: GridRenderProps): React.ReactElement[] {
  const { 
    startCol, 
    endCol, 
    columnWidths, 
    handleResizeMouseDown 
  } = props
  
  const headers = []
  
  // Empty corner cell
  headers.push(
    <div
      key="corner"
      className="border border-gray-300 bg-gray-100 font-bold text-center sticky left-0 top-0"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: getHeaderWidth(),
        height: getHeaderHeight(),
        minWidth: getHeaderWidth(),
        minHeight: getHeaderHeight(),
        zIndex: Z_INDEX.STICKY_CORNER
      }}
    />
  )

  // Column headers
  for (let colIndex = startCol; colIndex < endCol; colIndex++) {
    headers.push(
      <div
        key={`col-header-${colIndex}`}
        className="border border-gray-300 bg-gray-100 font-bold text-center flex items-center justify-center sticky top-0 relative"
        style={{
          position: 'absolute',
          left: getColumnPosition(colIndex, columnWidths),
          top: 0,
          width: getColumnWidth(colIndex, columnWidths),
          height: getHeaderHeight(),
          minWidth: getColumnWidth(colIndex, columnWidths),
          minHeight: getHeaderHeight(),
          zIndex: Z_INDEX.HEADER
        }}
      >
        {COLUMN_LETTERS[colIndex]}
        {/* Column resize handle */}
        <div
          className="absolute right-0 top-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500"
          onMouseDown={(e) => handleResizeMouseDown('column', colIndex, e)}
          style={{
            marginRight: '-2px',
            zIndex: Z_INDEX.RESIZE_HANDLE
          }}
        />
      </div>
    )
  }
  
  return headers
}

/**
 * Render visible rows and cells for the spreadsheet grid
 */
export function renderRows(props: GridRenderProps): React.ReactElement[] {
  const {
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
    setSelectedRange,
    setStartEditing,
    renderCell
  } = props
  
  const rows = []
  
  for (let rowIndex = startRow; rowIndex < endRow; rowIndex++) {
    const cells = []
    
    // Row header
    cells.push(
      <div
        key={`row-header-${rowIndex}`}
        className="border border-gray-300 bg-gray-100 font-bold text-center flex items-center justify-center sticky left-0 relative"
        style={{
          position: 'absolute',
          left: 0,
          top: getRowPosition(rowIndex, rowHeights),
          width: getHeaderWidth(),
          height: getRowHeight(rowIndex, rowHeights),
          minWidth: getHeaderWidth(),
          minHeight: getRowHeight(rowIndex, rowHeights),
          zIndex: Z_INDEX.HEADER
        }}
      >
        {rowIndex + 1}
        {/* Row resize handle */}
        <div
          className="absolute bottom-0 left-0 w-full h-1 cursor-row-resize bg-transparent hover:bg-blue-500"
          onMouseDown={(e) => handleResizeMouseDown('row', rowIndex, e)}
          style={{
            marginBottom: '-2px',
            zIndex: Z_INDEX.RESIZE_HANDLE
          }}
        />
      </div>
    )

    // Data cells
    for (let colIndex = startCol; colIndex < endCol; colIndex++) {
      const isSelected = selectedRange?.start.row === rowIndex && selectedRange?.start.col === colIndex && selectedRange?.end.row === rowIndex && selectedRange?.end.col === colIndex
      const isInRange = isCellInRange(rowIndex, colIndex, selectedRange)
      const structuresAtPosition = getStructuresAtPosition(rowIndex, colIndex, positions, structures)
      
      // Skip cells that are covered by resized cells - use enhanced function with structures at position
      if (isCellCoveredByResizedCell(rowIndex, colIndex, structures, structuresAtPosition)) {
        continue
      }
      
      // Get primary structure for layout calculations - prioritize cell structures for merged cell handling
      let primaryStructure: Structure | undefined = undefined
      if (structuresAtPosition.length > 0) {
        // First, look for cell structures (needed for merged cell layout calculations)
        const cellStructure = structuresAtPosition.find(s => s.type === 'cell')
        if (cellStructure) {
          primaryStructure = cellStructure
        } else {
          // Fall back to first structure if no cell structure found
          primaryStructure = structuresAtPosition[0]
        }
      }
      
      let cellWidth = getColumnWidth(colIndex, columnWidths)
      let cellHeight = getRowHeight(rowIndex, rowHeights)
      
      // If this is a resized cell, calculate the total width and height
      if (primaryStructure && primaryStructure.type === 'cell') {
        const { startPosition, dimensions } = primaryStructure
        const endPosition = getEndPosition(startPosition, dimensions)
        const rows = endPosition.row - startPosition.row + 1
        const cols = endPosition.col - startPosition.col + 1
        if ((rows > 1 || cols > 1) && 
            rowIndex === primaryStructure.startPosition.row && 
            colIndex === primaryStructure.startPosition.col) {
          // This is the top-left corner of a resized cell - calculate total dimensions
          cellWidth = 0
          for (let c = 0; c < cols; c++) {
            cellWidth += getColumnWidth(colIndex + c, columnWidths)
          }
          cellHeight = 0
          for (let r = 0; r < rows; r++) {
            cellHeight += getRowHeight(rowIndex + r, rowHeights)
          }
        }
      }
      
      // Add green column borders for tables (but not individual cell selection borders)
      let borderClass = 'border border-gray-200'
      // Check if any structure at this position is a table for border styling
      const hasTableStructure = structuresAtPosition.some(s => s.type === 'table')
      if (hasTableStructure) {
        borderClass = `border-l-1 border-r-1 border-t border-b ${TABLE_COLOR.BORDER} border-t-gray-200 border-b-gray-200`
      }

      cells.push(
        <div
          key={`cell-${rowIndex}-${colIndex}`}
          className={`${borderClass}`}
          style={{
            position: 'absolute',
            left: getColumnPosition(colIndex, columnWidths),
            top: getRowPosition(rowIndex, rowHeights),
            width: cellWidth,
            height: cellHeight,
            minWidth: cellWidth,
            minHeight: cellHeight,
            zIndex: primaryStructure && primaryStructure.type === 'cell' && (primaryStructure.dimensions.rows > 1 || primaryStructure.dimensions.cols > 1) ? Z_INDEX.MERGED_CELL : Z_INDEX.CELL,
          }}
          onMouseEnter={() => {
            handleMouseEnter(rowIndex, colIndex)
            if (isTableHeader(rowIndex, colIndex, structures, positions)) {
              handleHeaderHover(rowIndex, colIndex, true)
            }
            // Set hovered structure if this cell is part of a structure (use primary structure)
            if (primaryStructure) {
              setHoveredStructure(primaryStructure)
            }
          }}
          onMouseLeave={() => {
            if (isTableHeader(rowIndex, colIndex, structures, positions)) {
              handleHeaderHover(rowIndex, colIndex, false)
            }
            // Clear hovered structure when leaving any cell
            setHoveredStructure(null)
          }}
          onClick={(e) => {
            if (isTableHeader(rowIndex, colIndex, structures, positions)) {
              e.stopPropagation()
              handleColumnHeaderClick(rowIndex, colIndex)
            } else {
              // Call the new cell editing system for regular cells
              if (props.handleCellClick) {
                props.handleCellClick(rowIndex, colIndex)
              }
            }
          }}
          onDoubleClick={(e) => {
            if (isTableHeader(rowIndex, colIndex, structures, positions)) {
              e.stopPropagation()
              // Allow double-click to start editing header cells directly
              setSelectedRange({ start: { row: rowIndex, col: colIndex }, end: { row: rowIndex, col: colIndex } })
              setStartEditing({ row: rowIndex, col: colIndex })
            } else {
              // Call the new cell editing system for regular cells
              if (props.handleCellDoubleClick) {
                props.handleCellDoubleClick(rowIndex, colIndex)
              }
            }
          }}
          onMouseDown={(e) => {
            if (isTableHeader(rowIndex, colIndex, structures, positions)) {
              e.stopPropagation()
              handleColumnHeaderMouseDown(rowIndex, colIndex, e)
            } else {
              // Let the new cell editing system handle the click through its renderCell function
              // But still call the old handler for drag-and-drop functionality
              handleMouseDown(rowIndex, colIndex, e)
            }
          }}
        >
          {renderCell(
            rowIndex,
            colIndex,
            getCellValue(rowIndex, colIndex, structures, positions),
            isSelected,
            structuresAtPosition,
            isInRange
          )}
        </div>
      )
    }

    rows.push(...cells)
  }
  
  return rows
}
