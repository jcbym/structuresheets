import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Structure, StructureMap, PositionMap } from '../../types'

// Context information about cursor position in formula
interface CursorContext {
  canInsertReference: boolean
  expectedReferenceType: 'cell' | 'range' | 'structure' | 'any'
  insertionPoint: number
  syntaxContext: 'function_arg' | 'operator' | 'start' | 'invalid' | 'string_literal'
  beforeCursor: string
  afterCursor: string
}

interface FormulaBarProps {
  // Current cell information
  selectedCell: { row: number; col: number } | null
  cellValue: string
  cellFormula: string
  
  // Spreadsheet data for reference building
  structures: StructureMap
  positions: PositionMap
  
  // Callbacks
  onFormulaChange: (formula: string) => void
  onFormulaCommit: (formula: string) => void
  onCellFocus: (row: number, col: number) => void
  
  // State from parent
  isFormulaBarFocused: boolean
  onFormulaBarFocus: (focused: boolean) => void
}

export const FormulaBar = forwardRef<FormulaBarRef, FormulaBarProps>(({
  selectedCell,
  cellValue,
  cellFormula,
  structures,
  positions,
  onFormulaChange,
  onFormulaCommit,
  onCellFocus,
  isFormulaBarFocused,
  onFormulaBarFocus
}, ref) => {
  const [formula, setFormula] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [cursorContext, setCursorContext] = useState<CursorContext | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update formula when cell changes or when editing starts
  useEffect(() => {
    const displayValue = cellFormula || cellValue || ''
    setFormula(displayValue)
  }, [selectedCell, cellFormula, cellValue])

  // Analyze cursor context for reference insertion
  const analyzeCursorContext = useCallback((text: string, cursorPos: number): CursorContext => {
    const beforeCursor = text.slice(0, cursorPos)
    const afterCursor = text.slice(cursorPos)
    
    // Check if we're inside a string literal
    const beforeQuotes = (beforeCursor.match(/"/g) || []).length
    const inStringLiteral = beforeQuotes % 2 === 1
    
    if (inStringLiteral) {
      return {
        canInsertReference: false,
        expectedReferenceType: 'any',
        insertionPoint: cursorPos,
        syntaxContext: 'string_literal',
        beforeCursor,
        afterCursor
      }
    }

    // Parse the formula to determine if we're inside function parentheses
    const isInsideFunctionParentheses = () => {
      let parenDepth = 0
      let lastFunctionStart = -1
      let inQuotes = false
      
      // Scan backwards from cursor position
      for (let i = cursorPos - 1; i >= 0; i--) {
        const char = text[i]
        
        // Handle string literals
        if (char === '"') {
          inQuotes = !inQuotes
          continue
        }
        if (inQuotes) continue
        
        // Handle parentheses
        if (char === ')') {
          parenDepth++
        } else if (char === '(') {
          if (parenDepth === 0) {
            // Found opening paren at our level - check if it's a function
            // Look backwards for function name
            let j = i - 1
            while (j >= 0 && /\s/.test(text[j])) j-- // Skip whitespace
            
            let funcEnd = j + 1
            while (j >= 0 && /[A-Z_]/i.test(text[j])) j-- // Function name chars
            
            if (j + 1 < funcEnd) {
              const potentialFunction = text.slice(j + 1, funcEnd)
              // Check if it looks like a function name (letters/underscore only)
              if (/^[A-Z_]+$/i.test(potentialFunction)) {
                lastFunctionStart = j + 1
                break
              }
            }
            return false // Opening paren but not a function
          } else {
            parenDepth--
          }
        }
      }
      
      return lastFunctionStart >= 0
    }

    // Determine if we can insert a reference
    const insideFunctionParens = isInsideFunctionParentheses()
    
    // Additional check: make sure we're in a valid position within the function args
    let canInsert = false
    let syntaxContext: CursorContext['syntaxContext'] = 'invalid'
    
    if (insideFunctionParens) {
      // We're inside function parentheses, now check if we're in a valid position
      // Valid positions are:
      // - Right after opening paren: "SUM("
      // - After comma and optional whitespace: "SUM(A1,"
      // - After operators and optional whitespace: "SUM(A1+"
      
      const funcArgPattern = /(?:\(|,|[+\-*/])\s*$/
      if (funcArgPattern.test(beforeCursor)) {
        canInsert = true
        syntaxContext = 'function_arg'
      } else {
        // Check if we're at the very start of a function call
        const afterFunctionName = /[A-Z_]+\s*\(\s*$/i
        if (afterFunctionName.test(beforeCursor)) {
          canInsert = true
          syntaxContext = 'function_arg'
        }
      }
    } else {
      // Not inside function parentheses - only allow at very start of formula
      if (beforeCursor.trim() === '' || beforeCursor.trim() === '=') {
        canInsert = true
        syntaxContext = 'start'
      }
    }

    return {
      canInsertReference: canInsert,
      expectedReferenceType: 'any',
      insertionPoint: cursorPos,
      syntaxContext,
      beforeCursor,
      afterCursor
    }
  }, [])

  // Update cursor context when formula or cursor position changes
  useEffect(() => {
    const context = analyzeCursorContext(formula, cursorPosition)
    setCursorContext(context)
  }, [formula, cursorPosition, analyzeCursorContext])

  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setFormula(newValue)
    onFormulaChange(newValue)
  }, [onFormulaChange])

  // Handle cursor position changes
  const handleCursorPositionChange = useCallback(() => {
    if (inputRef.current) {
      setCursorPosition(inputRef.current.selectionStart || 0)
    }
  }, [])

  // Handle focus/blur
  const handleFocus = useCallback(() => {
    onFormulaBarFocus(true)
  }, [onFormulaBarFocus])

  const handleBlur = useCallback(() => {
    onFormulaBarFocus(false)
    
    // Save the formula if it's not empty
    if (formula.trim() !== '') {
      onFormulaCommit(formula)
    }
  }, [onFormulaBarFocus, formula, onFormulaCommit])

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        onFormulaCommit(formula)
        break
      case 'Escape':
        e.preventDefault()
        // Reset to original value
        const originalValue = cellFormula || cellValue || ''
        setFormula(originalValue)
        onFormulaChange(originalValue)
        inputRef.current?.blur()
        break
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'Home':
      case 'End':
        // Let the cursor movement happen naturally, then update position
        setTimeout(handleCursorPositionChange, 0)
        break
    }
  }, [formula, cellFormula, cellValue, onFormulaCommit, onFormulaChange, handleCursorPositionChange])

  // Insert reference at cursor position
  const insertReference = useCallback((reference: string) => {
    if (!cursorContext?.canInsertReference) {
      return false
    }

    const newFormula = 
      cursorContext.beforeCursor + 
      reference + 
      cursorContext.afterCursor

    setFormula(newFormula)
    onFormulaChange(newFormula)
    
    // Move cursor to end of inserted reference and ensure input stays focused
    const newCursorPos = cursorContext.beforeCursor.length + reference.length
    setTimeout(() => {
      if (inputRef.current) {
        // Ensure the input is focused first, then set cursor position
        inputRef.current.focus()
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos)
        setCursorPosition(newCursorPos)
      }
    }, 0)

    return true
  }, [cursorContext, onFormulaChange])

  // Convert position to cell reference (A1 notation)
  const positionToCellRef = useCallback((row: number, col: number): string => {
    let colRef = ''
    let tempCol = col
    while (tempCol >= 0) {
      colRef = String.fromCharCode(65 + (tempCol % 26)) + colRef
      tempCol = Math.floor(tempCol / 26) - 1
    }
    return colRef + (row + 1)
  }, [])

  // Get structure name at position
  const getStructureNameAtPosition = useCallback((row: number, col: number): string | null => {
    const positionKey = `${row}-${col}`
    const structureIds = positions.get(positionKey) || []
    
    // Look for named structures, prefer the most specific (last in array)
    for (let i = structureIds.length - 1; i >= 0; i--) {
      const structure = structures.get(structureIds[i])
      if (structure?.name) {
        return structure.name
      }
    }
    
    return null
  }, [structures, positions])

  // Public method to handle grid clicks (called from parent)
  const handleGridClick = useCallback((row: number, col: number, structure?: Structure) => {
    if (!isFormulaBarFocused || !cursorContext?.canInsertReference) {
      return false
    }

    let reference: string

    // Determine the best reference type
    if (structure?.name) {
      // Use structure name if available
      reference = structure.name
    } else {
      // Check for any named structure at this position
      const structureName = getStructureNameAtPosition(row, col)
      if (structureName) {
        reference = structureName
      } else {
        // Fall back to cell reference
        reference = positionToCellRef(row, col)
      }
    }

    return insertReference(reference)
  }, [isFormulaBarFocused, cursorContext, getStructureNameAtPosition, positionToCellRef, insertReference])

  // Expose the grid click handler to parent
  useImperativeHandle(ref, () => ({
    handleGridClick,
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur()
  }), [handleGridClick])

  // Format cell reference for display
  const getCellReference = useCallback(() => {
    if (!selectedCell) return ''
    return positionToCellRef(selectedCell.row, selectedCell.col)
  }, [selectedCell, positionToCellRef])

  return (
    <div className="flex items-center border-b border-gray-300 bg-white px-4 py-2 gap-3">
      {/* Cell Reference Display */}
      <div className="flex items-center min-w-0">
        <span className="text-sm font-medium text-gray-600 mr-2">
          {getCellReference()}
        </span>
      </div>

      {/* Formula Input */}
      <div className="flex-1 relative">
        <input
          ref={inputRef}
          type="text"
          value={formula}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onSelect={handleCursorPositionChange}
          onClick={handleCursorPositionChange}
          placeholder="Enter formula or value..."
          className={`w-full px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
            cursorContext?.canInsertReference && isFormulaBarFocused
              ? 'border-blue-300 bg-blue-50'
              : 'border-gray-300'
          }`}
        />
        
        {/* Context indicator */}
        {isFormulaBarFocused && cursorContext && (
          <div className="absolute top-full left-0 text-xs text-gray-500 bg-white px-2 py-1 shadow-sm border rounded-b-md z-10">
            {cursorContext.canInsertReference ? (
              <span className="text-green-600">
                Click cells or structures to insert references
              </span>
            ) : (
              <span className="text-gray-400">
                {cursorContext.syntaxContext === 'string_literal' 
                  ? 'Inside string literal'
                  : 'Cannot insert reference here'
                }
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

// Export the ref type for parent components
export interface FormulaBarRef {
  handleGridClick: (row: number, col: number, structure?: Structure) => boolean
  focus: () => void
  blur: () => void
}
