import React from 'react'
import { EditableCell } from './EditableCell'
import { Structure, MergedCell } from '../../types'
import { 
  calculateVisibleCols, 
  calculateVisibleRows, 
  getColumnPosition, 
  getRowPosition, 
  getColumnWidth, 
  getRowHeight, 
  shouldRenderCell, 
  getMergedCellContaining,
  isCellInRange,
  isTableHeader,
  getHeaderHeight,
  getHeaderWidth,
  getColumnHeight,
  isGhostedColumn,
  getHeaderLevel
} from '../../utils'
import { COLUMN_LETTERS, Z_INDEX, MIN_CELL_SIZE } from '../../constants'

interface SpreadsheetGridProps {
  // State
  cellData: Map<string, string>
  structures: Map<string, Structure>
  mergedCells: Map<string, MergedCell>
  selectedCell: {row: number, col: number} | null
  selectedRange: {start: {row: number, col: number}, end: {row: number, col: number}} | null
  selectedStructure: Structure | null
  scrollTop: number
  scrollLeft: number
  columnWidths: Map<number, number>
  rowHeights: Map<number, number>
  shouldStartEditing: {row: number, col: number} | null
  hoveredHeaderCell: {row: number, col: number} | null
  showAddColumnButton: boolean
  isResizing: boolean
  resizeType: 'column' | 'row' | null
  resizeIndex: number | null
  
  // Event handlers
  onCellUpdate: (row: number, col: number, value: string) => void
  onCellFocus: (row: number, col: number) => void
  onCellEnterPress: (row: number, col: number) => void
  onArrowKeyNavigation: (row: number, col: number, direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => void
  onEditingStarted: () => void
  onMouseDown: (row: number, col: number, e: React.MouseEvent) => void
  onMouseEnter: (row: number, col: number) => void
  onMouseUp: () => void
  onRightClick: (row: number, col: number, e: React.MouseEvent) => void
  onHeaderHover: (row: number, col: number, isEntering: boolean) => void
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void
  onResizeMouseDown: (type: 'column' | 'row', index: number, e: React.MouseEvent) => void
  onAddColumn: (tableRow: number, tableCol: number, insertAfterCol: number) => void
  
  // Container ref
  containerRef: React.RefObject<HTMLDivElement>
}

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  cellData,
  structures,
  mergedCells,
  selectedCell,
  selectedRange,
  selectedStructure,
  scrollTop,
  scrollLeft,
  columnWidths,
  rowHeights,
  shouldStartEditing,
  hoveredHeaderCell,
  showAddColumnButton,
  isResizing,
  resizeType,
  resizeIndex,
  onCellUpdate,
  onCellFocus,
  onCellEnterPress,
  onArrowKeyNavigation,
  onEditingStarted,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
  onRightClick,
  onHeaderHover,
  onScroll,
  onResizeMouseDown,
  onAddColumn,
  containerRef
}) => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  const visibleCols = calculateVisibleCols(scrollLeft, viewportWidth, columnWidths)
  const visibleRows = calculateVisibleRows(scrollTop, viewportHeight, rowHeights)
  const { startCol, endCol } = visibleCols
  const { startRow, endRow } = visibleRows

  // Render merged cell overlays
  const renderMergedCellOverlays = () => {
    const overlays = []

    for (const [key, mergedCell] of mergedCells) {
      if (mergedCell.endRow >= startRow && mergedCell.startRow < endRow &&
          mergedCell.endCol >= startCol && mergedCell.startCol < endCol) {
        
        const overlayLeft = getColumnPosition(mergedCell.startCol, columnWidths)
        const overlayTop = getRowPosition(mergedCell.startRow, rowHeights)
        
        let overlayWidth = 0
        for (let c = mergedCell.startCol; c <= mergedCell.endCol; c++) {
          overlayWidth += getColumnWidth(c, columnWidths)
        }
        
        let overlayHeight = 0
        for (let r = mergedCell.startRow; r <= mergedCell.endRow; r++) {
          overlayHeight += getRowHeight(r, rowHeights)
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
              zIndex: Z_INDEX.MERGED_CELL
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
      if (processedStructures.has(key)) continue

      let startPosition, endPosition
      if (structure.type === 'cell') {
        startPosition = endPosition = structure.position
      } else {
        startPosition = structure.startPosition
        endPosition = structure.endPosition
      }
      
      if (endPosition.row >= startRow && startPosition.row < endRow &&
          endPosition.col >= startCol && startPosition.col < endCol) {
        
        const overlayLeft = getColumnPosition(startPosition.col, columnWidths)
        const overlayTop = getRowPosition(startPosition.row, rowHeights)
        
        let overlayWidth = 0
        for (let c = startPosition.col; c <= endPosition.col; c++) {
          overlayWidth += getColumnWidth(c, columnWidths)
        }
        
        let overlayHeight = 0
        for (let r = startPosition.row; r <= endPosition.row; r++) {
          overlayHeight += getRowHeight(r, rowHeights)
        }

        // Check if this structure is selected
        const isSelected = selectedStructure && (
          (selectedStructure.type === 'cell' && 
           structure.type === 'cell' && 
           selectedStructure.position.row === structure.position.row && 
           selectedStructure.position.col === structure.position.col) ||
          (selectedStructure.type !== 'cell' && 
           structure.type !== 'cell' && 
           selectedStructure.startPosition.row === structure.startPosition.row && 
           selectedStructure.startPosition.col === structure.startPosition.col &&
           selectedStructure.endPosition.row === structure.endPosition.row && 
           selectedStructure.endPosition.col === structure.endPosition.col)
        )

        const borderColor = structure.type === 'cell' ? 'border-black' :
                           structure.type === 'array' ? 'border-blue-500' : 'border-green-500'

        overlays.push(
          <div
            key={`overlay-${key}`}
            className={`absolute pointer-events-none ${isSelected ? `border-4 ${borderColor}` : `border-2 ${borderColor}`}`}
            style={{
              left: overlayLeft,
              top: overlayTop,
              width: overlayWidth,
              height: overlayHeight,
              zIndex: isSelected ? Z_INDEX.STRUCTURE_OVERLAY + 1 : Z_INDEX.STRUCTURE_OVERLAY
            }}
            title={structure.name ? `${structure.type}: ${structure.name}` : structure.type}
          />
        )

        // Mark all cells of this structure as processed
        for (let r = startPosition.row; r <= endPosition.row; r++) {
          for (let c = startPosition.col; c <= endPosition.col; c++) {
            processedStructures.add(`struct-${r}-${c}`)
          }
        }
      }
    }

    return overlays
  }

  // Render column headers
  const renderColumnHeaders = () => {
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
            onMouseDown={(e) => onResizeMouseDown('column', colIndex, e)}
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

  // Render visible rows
  const renderRows = () => {
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
            onMouseDown={(e) => onResizeMouseDown('row', rowIndex, e)}
            style={{
              marginBottom: '-2px',
              zIndex: Z_INDEX.RESIZE_HANDLE
            }}
          />
        </div>
      )

      // Data cells
      for (let colIndex = startCol; colIndex < endCol; colIndex++) {
        if (!shouldRenderCell(rowIndex, colIndex, mergedCells)) {
          continue
        }

        const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex
        const isInRange = isCellInRange(rowIndex, colIndex, selectedRange)
        const structure = structures.get(`struct-${rowIndex}-${colIndex}`)
        const mergedCell = getMergedCellContaining(rowIndex, colIndex, mergedCells)
        
        // Calculate cell dimensions for merged cells
        let cellWidth = getColumnWidth(colIndex, columnWidths)
        let cellHeight = getRowHeight(rowIndex, rowHeights)
        
        if (mergedCell) {
          cellWidth = 0
          for (let c = mergedCell.startCol; c <= mergedCell.endCol; c++) {
            cellWidth += getColumnWidth(c, columnWidths)
          }
          cellHeight = 0
          for (let r = mergedCell.startRow; r <= mergedCell.endRow; r++) {
            cellHeight += getRowHeight(r, rowHeights)
          }
        }
        
        cells.push(
          <div
            key={`cell-${rowIndex}-${colIndex}`}
            className={`border border-gray-300 ${isInRange ? 'bg-blue-100' : ''} ${mergedCell ? 'bg-orange-50' : ''}`}
            style={{
              position: 'absolute',
              left: getColumnPosition(colIndex, columnWidths),
              top: getRowPosition(rowIndex, rowHeights),
              width: cellWidth,
              height: cellHeight,
              minWidth: cellWidth,
              minHeight: cellHeight,
              zIndex: mergedCell ? Z_INDEX.MERGED_CELL : Z_INDEX.CELL,
            }}
            onMouseEnter={() => {
              onMouseEnter(rowIndex, colIndex)
              if (isTableHeader(rowIndex, colIndex, structures)) {
                onHeaderHover(rowIndex, colIndex, true)
              }
            }}
            onMouseLeave={() => {
              if (isTableHeader(rowIndex, colIndex, structures)) {
                onHeaderHover(rowIndex, colIndex, false)
              }
            }}
          >
            <EditableCell
              value={mergedCell ? mergedCell.value : cellData.get(`${rowIndex}-${colIndex}`) || ''}
              onChange={(value) => onCellUpdate(rowIndex, colIndex, value)}
              isSelected={isSelected}
              onFocus={() => onCellFocus(rowIndex, colIndex)}
              onEnterPress={() => onCellEnterPress(rowIndex, colIndex)}
              onArrowKeyPress={(direction) => onArrowKeyNavigation(rowIndex, colIndex, direction)}
              shouldStartEditing={shouldStartEditing?.row === rowIndex && shouldStartEditing?.col === colIndex}
              onEditingStarted={onEditingStarted}
              structure={structure}
              onMouseDown={(e) => onMouseDown(rowIndex, colIndex, e)}
              onMouseEnter={() => onMouseEnter(rowIndex, colIndex)}
              onMouseUp={onMouseUp}
              onRightClick={(e) => onRightClick(rowIndex, colIndex, e)}
              onHeaderHover={(isEntering) => onHeaderHover(rowIndex, colIndex, isEntering)}
              row={rowIndex}
              col={colIndex}
              isMergedCell={!!mergedCell}
            />
          </div>
        )
      }

      rows.push(...cells)
    }
    return rows
  }

  // // Render add column button overlay
  // const renderAddColumnButton = () => {
  //   if (!showAddColumnButton || !hoveredHeaderCell) return null

  //   const { row, col } = hoveredHeaderCell

  //   // Check if the button position is visible in current viewport
  //   if (row >= startRow && row < endRow && col >= startCol && col < endCol) {
  //     const buttonWidth = 20
  //     const buttonLeft = getColumnPosition(col, columnWidths)
  //     const buttonTop = getRowPosition(row, rowHeights)

  //     return (
  //       <button
  //         className="absolute bg-green-500 bg-opacity-100 border border-white flex items-center justify-center text-white font-bold text-sm hover:bg-opacity-90 transition-all duration-200"
  //         onClick={() => {
  //           // Find the table structure to add column to
  //           for (const [key, structure] of structures) {
  //             if (structure.type === 'table') {
  //               const table = structure as any
  //               const headerLevel = getHeaderLevel(row, table)
                
  //               // For both top-level and sub-level headers, add column after the hovered cell
  //               if (headerLevel >= 0 && row >= table.startPosition.row && 
  //                   row < table.startPosition.row + (table.headerRows || 1) &&
  //                   col === hoveredHeaderCell?.col) {
                  
  //                 onAddColumn(table.position.row, table.position.col, col - 1)
  //                 break
  //               }
  //             }
  //           }
  //         }}
  //         style={{
  //           left: buttonLeft - buttonWidth,
  //           top: buttonTop,
  //           width: buttonWidth,
  //           height: getColumnHeight(row, col, structures),
  //           minWidth: buttonWidth,
  //           minHeight: getColumnHeight(row, col, structures),
  //           zIndex: 50
  //         }}
  //         title="Add column"
  //       >
  //         +
  //       </button>
  //     )
  //   }

  //   return null
  // }

  return (
    <div 
      ref={containerRef}
      className="overflow-auto h-full w-full rounded-lg"
      style={{ position: 'relative' }}
      onScroll={onScroll}
    >
      {/* Virtual container to enable scrolling */}
      <div
        style={{
          height: 1000 * 32 + 32, // MAX_ROWS * DEFAULT_CELL_HEIGHT + DEFAULT_HEADER_HEIGHT
          width: 26 * 82 + 52, // MAX_COLS * DEFAULT_CELL_WIDTH + DEFAULT_HEADER_WIDTH
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
        {/* {renderAddColumnButton()} */}
      </div>
    </div>
  )
}
