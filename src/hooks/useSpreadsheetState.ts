import React from 'react'
import { SpreadsheetState, Position, Structure, MergedCell, SelectionRange, ResizeType } from '../types'

const initialState: SpreadsheetState = {
  cellData: new Map(),
  structures: new Map(),
  mergedCells: new Map(),
  selectedCell: null,
  selectedRange: null,
  selectedStructure: null,
  isDragging: false,
  dragStart: null,
  scrollTop: 0,
  scrollLeft: 0,
  contextMenu: null,
  hoveredHeaderCell: null,
  showAddColumnButton: false,
  columnWidths: new Map(),
  rowHeights: new Map(),
  isResizing: false,
  resizeType: null,
  resizeIndex: null,
  resizeStartPos: 0,
  resizeStartSize: 0,
  shouldStartEditing: null,
}

export const useSpreadsheetState = () => {
  // Individual state hooks for better granular control
  const [cellData, setCellData] = React.useState<Map<string, string>>(new Map())
  const [structures, setStructures] = React.useState<Map<string, Structure>>(new Map())
  const [mergedCells, setMergedCells] = React.useState<Map<string, MergedCell>>(new Map())
  const [selectedCell, setSelectedCell] = React.useState<{row: number, col: number} | null>(null)
  const [selectedRange, setSelectedRange] = React.useState<SelectionRange | null>(null)
  const [selectedStructure, setSelectedStructure] = React.useState<Structure | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragStart, setDragStart] = React.useState<Position | null>(null)
  const [scrollTop, setScrollTop] = React.useState(0)
  const [scrollLeft, setScrollLeft] = React.useState(0)
  const [contextMenu, setContextMenu] = React.useState<{x: number, y: number} | null>(null)
  const [hoveredHeaderCell, setHoveredHeaderCell] = React.useState<{row: number, col: number} | null>(null)
  const [showAddColumnButton, setShowAddColumnButton] = React.useState(false)
  const [columnWidths, setColumnWidths] = React.useState<Map<number, number>>(new Map())
  const [rowHeights, setRowHeights] = React.useState<Map<number, number>>(new Map())
  const [isResizing, setIsResizing] = React.useState(false)
  const [resizeType, setResizeType] = React.useState<ResizeType | null>(null)
  const [resizeIndex, setResizeIndex] = React.useState<number | null>(null)
  const [resizeStartPos, setResizeStartPos] = React.useState(0)
  const [resizeStartSize, setResizeStartSize] = React.useState(0)
  const [shouldStartEditing, setShouldStartEditing] = React.useState<{row: number, col: number} | null>(null)

  return {
    // State values
    cellData,
    structures,
    mergedCells,
    selectedCell,
    selectedRange,
    selectedStructure,
    isDragging,
    dragStart,
    scrollTop,
    scrollLeft,
    contextMenu,
    hoveredHeaderCell,
    showAddColumnButton,
    columnWidths,
    rowHeights,
    isResizing,
    resizeType,
    resizeIndex,
    resizeStartPos,
    resizeStartSize,
    shouldStartEditing,

    // State setters
    setCellData,
    setStructures,
    setMergedCells,
    setSelectedCell,
    setSelectedRange,
    setSelectedStructure,
    setIsDragging,
    setDragStart,
    setScrollTop,
    setScrollLeft,
    setContextMenu,
    setHoveredHeaderCell,
    setShowAddColumnButton,
    setColumnWidths,
    setRowHeights,
    setIsResizing,
    setResizeType,
    setResizeIndex,
    setResizeStartPos,
    setResizeStartSize,
    setShouldStartEditing,
  }
}
