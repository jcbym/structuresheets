import React from 'react'
import { Structure, StructureMap, PositionMap } from '../types'
import { getStructureAtPosition, isTableHeader } from '../utils/structureUtils'
import { getNextCell } from '../utils/sheetUtils'
import { MAX_ROWS } from '../constants'

interface GridEventHandlersProps {
  structures: StructureMap
  positions: PositionMap
  selectedStructure: Structure | null
  selectedColumn: {tableId: string, columnIndex: number} | null
  isDraggingSheetHeader: boolean
  sheetHeaderDragStart: {row: number, col: number} | null
  editingCells: Set<string>
  cellValues: Map<string, string>
  setSelectedRange: React.Dispatch<React.SetStateAction<{start: {row: number, col: number}, end: {row: number, col: number}} | null>>
  setStartEditing: React.Dispatch<React.SetStateAction<{row: number, col: number} | null>>
  setContextMenu: React.Dispatch<React.SetStateAction<{x: number, y: number} | null>>
  setEditingCells: React.Dispatch<React.SetStateAction<Set<string>>>
  setCellValues: React.Dispatch<React.SetStateAction<Map<string, string>>>
  onCellUpdate: (row: number, col: number, value: string) => void
}

export const useGridEventHandlers = ({
  structures,
  positions,
  selectedStructure,
  selectedColumn,
  isDraggingSheetHeader,
  sheetHeaderDragStart,
  editingCells,
  cellValues,
  setSelectedRange,
  setStartEditing,
  setContextMenu,
  setEditingCells,
  setCellValues,
  onCellUpdate
}: GridEventHandlersProps) => {

  // Cell utilities
  const getCellKey = (row: number, col: number) => `${row}-${col}`

  // Cell focus handler
  const handleCellFocus = React.useCallback((row: number, col: number) => {
    setSelectedRange({ start: { row, col }, end: { row, col } })
  }, [setSelectedRange])

  // Cell blur handler
  const handleCellBlur = React.useCallback((row: number, col: number, e?: React.FocusEvent<HTMLInputElement>) => {
    const cellKey = getCellKey(row, col)
    
    // Get the value from the input element - be very explicit about this
    let cellValue: string
    if (e?.target) {
      // Primary: get from the blur event target
      cellValue = e.target.value
    } else {
      // Fallback: try to find the input element directly by its data attribute
      const inputElement = document.querySelector(`input[data-cell-key="${cellKey}"]`) as HTMLInputElement
      if (inputElement) {
        cellValue = inputElement.value
      } else {
        // Final fallback: use React state
        cellValue = cellValues.get(cellKey) || ''
      }
    }

    // Check if there's already a structure at this position
    const existingStructure = getStructureAtPosition(row, col, positions, structures)
    
    // Update logic:
    // - If there's an existing structure: ALWAYS update (allows clearing to empty string)
    // - If no existing structure: only update if value is not empty (prevents creating empty cells)
    if (existingStructure) {
      // Always update existing structures, even with empty values
      onCellUpdate(row, col, cellValue)
    } else if (cellValue !== '') {
      // Only create new structures for non-empty values
      onCellUpdate(row, col, cellValue)
    }
    
    // Stop editing immediately
    setEditingCells(prev => {
      const newSet = new Set(prev)
      newSet.delete(cellKey)
      return newSet
    })
  }, [cellValues, editingCells, positions, structures, onCellUpdate, setEditingCells])

  // Cell focus change handler
  const handleCellFocusChange = React.useCallback((row: number, col: number) => {
    handleCellFocus(row, col)
    const cellKey = getCellKey(row, col)
    setEditingCells(prev => {
      const newSet = new Set(prev)
      newSet.add(cellKey)
      return newSet
    })
  }, [handleCellFocus, setEditingCells])

  // Cell double click handler
  const handleCellDoubleClick = React.useCallback((row: number, col: number) => {
    const cellKey = getCellKey(row, col)
    setEditingCells(prev => {
      const newSet = new Set(prev)
      newSet.add(cellKey)
      return newSet
    })
  }, [setEditingCells])

  // Cell key down handler (for editing mode)
  const handleCellKeyDown = React.useCallback((e: React.KeyboardEvent, row: number, col: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const cellKey = getCellKey(row, col)
      const cellValue = cellValues.get(cellKey) || ''
      
      onCellUpdate(row, col, cellValue)
      setEditingCells(prev => {
        const newSet = new Set(prev)
        newSet.delete(cellKey)
        return newSet
      })
      handleCellEnterPress(row, col)
    }
  }, [cellValues, onCellUpdate, setEditingCells])

  // Cell key down handler (for general navigation)
  const handleCellKeyDownGeneral = React.useCallback((e: React.KeyboardEvent, row: number, col: number) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      handleArrowKeyNavigation(row, col, e.key as 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight')
    } else if (e.key === 'Enter' || e.key === 'F2') {
      // Start editing on Enter or F2
      e.preventDefault()
      const cellKey = getCellKey(row, col)
      setEditingCells(prev => {
        const newSet = new Set(prev)
        newSet.add(cellKey)
        return newSet
      })
    }
  }, [setEditingCells])

  // Enter press handler
  const handleCellEnterPress = React.useCallback((row: number, col: number) => {
    const nextRow = row + 1
    if (nextRow < MAX_ROWS) {
      setSelectedRange({ start: { row: nextRow, col }, end: { row: nextRow, col } })
      setStartEditing({ row: nextRow, col })
    }
  }, [setSelectedRange, setStartEditing])

  // Arrow key navigation handler
  const handleArrowKeyNavigation = React.useCallback((row: number, col: number, direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => {
    const { row: newRow, col: newCol } = getNextCell(row, col, direction)
    setSelectedRange({ start: { row: newRow, col: newCol }, end: { row: newRow, col: newCol } })
    setStartEditing({ row: newRow, col: newCol })
  }, [setSelectedRange, setStartEditing])

  // Mouse enter handler
  const handleMouseEnter = React.useCallback((row: number, col: number) => {
    if (isDraggingSheetHeader && sheetHeaderDragStart) {
      setSelectedRange({
        start: sheetHeaderDragStart,
        end: { row, col }
      })
    }
  }, [isDraggingSheetHeader, sheetHeaderDragStart, setSelectedRange])

  // Mouse up handler
  const handleMouseUp = React.useCallback(() => {
    // This will be handled by the global event handlers
  }, [])

  // Right click handler
  const handleRightClick = React.useCallback((_row: number, _col: number, e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [setContextMenu])

  // Scroll handler
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    // This will be handled by parent component directly
  }, [])

  return {
    handlers: {
      handleCellFocus,
      handleCellBlur,  
      handleCellFocusChange,
      handleCellDoubleClick,
      handleCellKeyDown,
      handleCellKeyDownGeneral,
      handleCellEnterPress,
      handleArrowKeyNavigation,
      handleMouseEnter,
      handleMouseUp,
      handleRightClick,
      handleScroll
    },
    utils: {
      getCellKey
    }
  }
}
