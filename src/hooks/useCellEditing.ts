import React from 'react'
import { Structure, StructureMap, PositionMap, CellStructure } from '../types'
import { getCellKey, getCellValue, getStructureAtPosition } from '../utils/structureUtils'
import { getNextCell } from '../utils/sheetUtils'
import { getCellClasses, getCellStyle, isHeaderCell } from '../components/spreadsheet/cellRenderers'
import { MAX_ROWS } from '../constants'

interface UseCellEditingProps {
  structures: StructureMap
  positions: PositionMap
  selectedRange: {start: {row: number, col: number}, end: {row: number, col: number}} | null
  onCellUpdate: (row: number, col: number, value: string) => void
  setSelectedRange: React.Dispatch<React.SetStateAction<{start: {row: number, col: number}, end: {row: number, col: number}} | null>>
}

interface FocusedCell {
  row: number
  col: number
  isEditing: boolean
  value: string
}

export const useCellEditing = ({
  structures,
  positions,
  selectedRange,
  onCellUpdate,
  setSelectedRange
}: UseCellEditingProps) => {
  // Single unified state for cell focus and editing
  const [focusedCell, setFocusedCell] = React.useState<FocusedCell | null>(null)

  // Helper to get current value from structures or focused cell
  const getCurrentCellValue = React.useCallback((row: number, col: number, isEditing: boolean = false): string => {
    // When starting to edit, always check the structure for the formula, even if cell is already focused
    if (isEditing) {
      const structure = getStructureAtPosition(row, col, positions, structures)
      if (structure && structure.type === 'cell') {
        // When editing, show the formula if it exists, otherwise show the regular value
        return structure.formula || structure.value || ''
      }
    }
    
    // For non-editing states, check focused cell first
    if (focusedCell && focusedCell.row === row && focusedCell.col === col && !isEditing) {
      return focusedCell.value
    }
    
    // Get the cell structure to check for formulas
    const structure = getStructureAtPosition(row, col, positions, structures)
    if (structure && structure.type === 'cell') {
      // When not editing, show the value (which now contains formula results)
      return structure.value || ''
    }
    
    // Fallback to the regular getCellValue for non-cell structures
    return getCellValue(row, col, structures, positions)
  }, [focusedCell, structures, positions])

  // Create Cell structure when needed
  const createCellStructure = React.useCallback((row: number, col: number, value: string, forceCreate: boolean = false) => {
    // Always create Cell structure if forceCreate is true (e.g., Enter key pressed)
    // Otherwise, only create if value is not empty (regular editing end)
    if (forceCreate || value.trim() !== '') {
      onCellUpdate(row, col, value)
    }
  }, [onCellUpdate])

  // Save current cell value if editing
  const saveCurrentCell = React.useCallback(() => {
    if (focusedCell && focusedCell.isEditing) {
      createCellStructure(focusedCell.row, focusedCell.col, focusedCell.value)
    }
  }, [focusedCell, createCellStructure])

  // Focus a cell (without starting editing)
  const focusCell = React.useCallback((row: number, col: number, startEditing = false, preserveSelection = false) => {
    // Save current cell before moving
    saveCurrentCell()
    
    // Set new focus - get the appropriate value based on editing state
    const currentValue = getCurrentCellValue(row, col, startEditing)
    setFocusedCell({
      row,
      col,
      isEditing: startEditing,
      value: currentValue
    })
    
    // Only update selected range if not preserving existing selection (for multi-cell selections)
    if (!preserveSelection) {
      setSelectedRange({ start: { row, col }, end: { row, col } })
    }
  }, [saveCurrentCell, getCurrentCellValue, setSelectedRange])

  // Start editing current focused cell
  const startEditing = React.useCallback(() => {
    if (focusedCell && !focusedCell.isEditing) {
      // When starting to edit, get the appropriate value (formula if exists, otherwise value)
      const editValue = getCurrentCellValue(focusedCell.row, focusedCell.col, true)
      setFocusedCell(prev => prev ? { ...prev, isEditing: true, value: editValue } : null)
    }
  }, [focusedCell, getCurrentCellValue])

  // Stop editing current cell
  const stopEditing = React.useCallback((saveValue = true) => {
    if (focusedCell && focusedCell.isEditing) {
      if (saveValue) {
        createCellStructure(focusedCell.row, focusedCell.col, focusedCell.value)
      }
      setFocusedCell(prev => prev ? { ...prev, isEditing: false } : null)
    }
  }, [focusedCell, createCellStructure])

  // Update focused cell value
  const updateFocusedCellValue = React.useCallback((value: string) => {
    if (focusedCell) {
      setFocusedCell(prev => prev ? { ...prev, value } : null)
    }
  }, [focusedCell])

  // Handle arrow key navigation
  const handleArrowKey = React.useCallback((direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => {
    if (!focusedCell) return
    
    const { row: newRow, col: newCol } = getNextCell(focusedCell.row, focusedCell.col, direction)
    focusCell(newRow, newCol, false)
  }, [focusedCell, focusCell])

  // Handle Enter key
  const handleEnterKey = React.useCallback(() => {
    if (!focusedCell) return
    
    // Save current cell - force create Cell structure even if empty (Enter key requirement)
    if (focusedCell.isEditing) {
      createCellStructure(focusedCell.row, focusedCell.col, focusedCell.value, true)
    }
    
    // Move to cell below and start editing
    const nextRow = focusedCell.row + 1
    if (nextRow < MAX_ROWS) {
      focusCell(nextRow, focusedCell.col, true)
    }
  }, [focusedCell, createCellStructure, focusCell])

  // Handle cell click
  const handleCellClick = React.useCallback((row: number, col: number) => {
    // Check if we're clicking on the cell that's already focused and editing
    if (focusedCell && 
        focusedCell.row === row && 
        focusedCell.col === col && 
        focusedCell.isEditing) {
      // Do nothing - clicking on a cell while editing it should not disrupt the editing
      return
    }
    
    // Check if we're clicking within an existing multi-cell selection
    if (selectedRange && 
        (selectedRange.start.row !== selectedRange.end.row || selectedRange.start.col !== selectedRange.end.col)) {
      
      const minRow = Math.min(selectedRange.start.row, selectedRange.end.row)
      const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row)
      const minCol = Math.min(selectedRange.start.col, selectedRange.end.col)
      const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col)
      
      // If clicking within the existing selection, preserve it and just update focus
      if (row >= minRow && row <= maxRow && col >= minCol && col <= maxCol) {
        focusCell(row, col, false, true) // preserve selection
        return
      }
    }
    
    // Otherwise, create new single-cell selection
    focusCell(row, col, false)
  }, [focusCell, selectedRange, focusedCell])

  // Handle cell double click
  const handleCellDoubleClick = React.useCallback((row: number, col: number) => {
    focusCell(row, col, true)
  }, [focusCell])

  // Handle typing on cell
  const handleCellType = React.useCallback((row: number, col: number, char: string) => {
    // Check if this is multi-cell selection
    if (selectedRange && 
        (selectedRange.start.row !== selectedRange.end.row || selectedRange.start.col !== selectedRange.end.col)) {
      
      // Create merged cell
      const minRow = Math.min(selectedRange.start.row, selectedRange.end.row)
      const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row)
      const minCol = Math.min(selectedRange.start.col, selectedRange.end.col)
      const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col)
      
      const mergedCellId = `cell-${minRow}-${minCol}-${maxRow}-${maxCol}-${Date.now()}`
      const newMergedCell: CellStructure = {
        type: 'cell',
        id: mergedCellId,
        startPosition: { row: minRow, col: minCol },
        dimensions: { rows: maxRow - minRow + 1, cols: maxCol - minCol + 1 },
        value: char
      }
      
      // Add merged cell to structures
      // This would need to be handled through a callback
      console.log('Creating merged cell:', newMergedCell)
      
      // Focus center cell and continue editing
      const centerRow = Math.floor((minRow + maxRow) / 2)
      const centerCol = Math.floor((minCol + maxCol) / 2)
      setFocusedCell({
        row: centerRow,
        col: centerCol,
        isEditing: true,
        value: char
      })
      setSelectedRange({ start: { row: centerRow, col: centerCol }, end: { row: centerRow, col: centerCol } })
    } else {
      // Single cell - start editing with typed character
      setFocusedCell({
        row,
        col,
        isEditing: true,
        value: char
      })
      setSelectedRange({ start: { row, col }, end: { row, col } })
    }
  }, [selectedRange, setSelectedRange])

  // Handle cell blur (when cell loses focus)
  const handleCellBlur = React.useCallback(() => {
    stopEditing(true)
  }, [stopEditing])

  // Global keyboard event handler
  const handleGlobalKeyDown = React.useCallback((e: KeyboardEvent) => {
    // Don't handle if we're not in a focused state or if user is typing in an input
    if (!focusedCell || (e.target as HTMLElement)?.tagName === 'INPUT') {
      return
    }

    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        e.preventDefault()
        handleArrowKey(e.key)
        break
      
      case 'Enter':
        e.preventDefault()
        if (focusedCell.isEditing) {
          handleEnterKey()
        } else {
          startEditing()
        }
        break
      
      case 'F2':
        e.preventDefault()
        startEditing()
        break
      
      case 'Escape':
        e.preventDefault()
        stopEditing(false)
        break
      
      default:
        // Handle printable characters
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault()
          handleCellType(focusedCell.row, focusedCell.col, e.key)
        }
        break
    }
  }, [focusedCell, handleArrowKey, handleEnterKey, startEditing, stopEditing, handleCellType])

  // Set up global keyboard listener
  React.useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [handleGlobalKeyDown])

  // Sync focused cell when selectedRange changes externally
  React.useEffect(() => {
    if (selectedRange && 
        selectedRange.start.row === selectedRange.end.row && 
        selectedRange.start.col === selectedRange.end.col) {
      
      const { row, col } = selectedRange.start
      if (!focusedCell || focusedCell.row !== row || focusedCell.col !== col) {
        const currentValue = getCurrentCellValue(row, col)
        setFocusedCell({
          row,
          col,
          isEditing: false,
          value: currentValue
        })
      }
    }
  }, [selectedRange, focusedCell, getCurrentCellValue])

  // Helper to check if a cell is in the selected range
  const isCellInSelectedRange = React.useCallback((row: number, col: number): boolean => {
    if (!selectedRange) return false
    
    const minRow = Math.min(selectedRange.start.row, selectedRange.end.row)
    const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row)
    const minCol = Math.min(selectedRange.start.col, selectedRange.end.col)
    const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col)
    
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol
  }, [selectedRange])

  // Render cell content
  const renderCell = React.useCallback((row: number, col: number, isSelected: boolean) => {
    const isFocused = focusedCell?.row === row && focusedCell?.col === col
    const isEditing = isFocused && focusedCell?.isEditing
    const cellValue = getCurrentCellValue(row, col)
    const isInRange = isCellInSelectedRange(row, col)
    
    // Get structures at this position for proper styling
    // When editing an empty cell, only consider actual Cell structures for styling,
    // not parent table/array structures - those will create white background prematurely
    const structuresAtPosition: Structure[] = []
    for (const [, structure] of structures) {
      const { startPosition, dimensions } = structure
      const endRow = startPosition.row + dimensions.rows - 1
      const endCol = startPosition.col + dimensions.cols - 1
      
      if (row >= startPosition.row && row <= endRow && 
          col >= startPosition.col && col <= endCol) {
        
        // If editing, only include actual Cell structures for styling
        // This prevents white background from appearing on empty cells being edited
        if (isEditing) {
          if (structure.type === 'cell') {
            structuresAtPosition.push(structure)
          }
        } else {
          // When not editing, include all structures as normal
          structuresAtPosition.push(structure)
        }
      }
    }

    if (isEditing) {
      return React.createElement('input', {
        type: 'text',
        value: focusedCell?.value || '',
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          updateFocusedCellValue(e.target.value)
        },
        onBlur: handleCellBlur,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleEnterKey()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            stopEditing(false)
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            // Intercept arrow keys for cell navigation instead of text cursor movement
            e.preventDefault()
            e.stopPropagation()
            handleArrowKey(e.key)
          }
          // Don't call stopPropagation for other keys - let them work normally for text editing
          if (['Enter', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.stopPropagation()
          }
        },
        className: 'w-full h-full outline-none px-2 py-1',
        style: { 
          minWidth: '80px', 
          minHeight: '30px',
          backgroundColor: isInRange ? '#dbeafe' : 'transparent'
        },
        autoFocus: true
      })
    }

    return React.createElement('div', {
      className: getCellClasses(row, col, structuresAtPosition),
      style: getCellStyle(row, col, structuresAtPosition, isInRange),
      onClick: () => handleCellClick(row, col),
      onDoubleClick: () => handleCellDoubleClick(row, col)
    }, cellValue || '\u00A0')
  }, [focusedCell, getCurrentCellValue, updateFocusedCellValue, handleCellBlur, handleEnterKey, stopEditing, handleCellClick, handleCellDoubleClick, structures, isCellInSelectedRange])

  return {
    // State
    focusedCell,
    
    // Core operations
    focusCell,
    startEditing,
    stopEditing,
    updateFocusedCellValue,
    getCurrentCellValue,
    
    // Event handlers
    handleCellClick,
    handleCellDoubleClick,
    handleCellType,
    handleCellBlur,
    handleArrowKey,
    handleEnterKey,
    
    // Rendering
    renderCell,
    
    // Utilities
    isEditing: (row: number, col: number) => 
      focusedCell?.row === row && focusedCell?.col === col && focusedCell?.isEditing,
    isFocused: (row: number, col: number) => 
      focusedCell?.row === row && focusedCell?.col === col
  }
}
