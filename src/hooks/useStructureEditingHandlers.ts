import React from 'react'
import { Structure, StructureMap, PositionMap, ArrayStructure, TableStructure } from '../types'

interface StructureEditingHandlersProps {
  structures: StructureMap
  selectedStructure: Structure | null
  hoveredHeaderCell: {row: number, col: number} | null
  showAddColumnButton: boolean
  
  // State setters
  setStructures: React.Dispatch<React.SetStateAction<StructureMap>>
  setSelectedStructure: React.Dispatch<React.SetStateAction<Structure | null>>
  setHoveredHeaderCell: React.Dispatch<React.SetStateAction<{row: number, col: number} | null>>
  setShowAddColumnButton: React.Dispatch<React.SetStateAction<boolean>>
  
  // External callbacks
  selectStructure: (structure: Structure) => void
}

export const useStructureEditingHandlers = ({
  structures,
  selectedStructure,
  hoveredHeaderCell,
  showAddColumnButton,
  setStructures,
  setSelectedStructure,
  setHoveredHeaderCell,
  setShowAddColumnButton,
  selectStructure
}: StructureEditingHandlersProps) => {

  // State for editing structure names
  const [editingStructureName, setEditingStructureName] = React.useState<string | null>(null)
  const [editingNameValue, setEditingNameValue] = React.useState('')

  // Handle header hover for add button display
  const handleHeaderHover = React.useCallback((row: number, col: number, isEntering: boolean) => {
    if (isEntering) {
      // Implementation would need to check if this is a table header
      setHoveredHeaderCell({ row, col: col + 1 })
      setShowAddColumnButton(true)
    } else if (!isEntering) {
      setHoveredHeaderCell(null)
      setShowAddColumnButton(false)
    }
  }, [setHoveredHeaderCell, setShowAddColumnButton])

  // Unified function to add columns to any structure type
  const handleAddColumn = React.useCallback((structureId: string, insertAfterCol: number, position: 'left' | 'right') => {
    // Find the structure by ID
    const structure = structures.get(structureId)
    
    if (!structure) return
    
    if (structure.type === 'table') {
      return handleAddTableColumn(structureId, insertAfterCol, position)
    } else if (structure.type === 'array') {
      return handleAddArrayColumn(structureId, insertAfterCol, position)
    }
  }, [structures])

  // Unified function to add rows to any structure type
  const handleAddRow = React.useCallback((structureId: string, insertAfterRow: number, position: 'top' | 'bottom') => {
    // Find the structure by ID
    const structure = structures.get(structureId)
    
    if (!structure) return
    
    if (structure.type === 'table') {
      return handleAddTableRow(structureId, insertAfterRow, position)
    } else if (structure.type === 'array') {
      return handleAddArrayRow(structureId, insertAfterRow, 'bottom')
    }
  }, [structures])

  // Add column to table
  const handleAddTableColumn = React.useCallback((tableId: string, _insertAfterCol: number, position: 'left' | 'right') => {
    // Find the table structure by ID
    const table = structures.get(tableId)
    
    if (!table || table.type !== 'table') return
    
    const tableStructure = table as TableStructure
    
    // Update table dimensions
    const newDimensions = { 
      rows: tableStructure.dimensions.rows, 
      cols: tableStructure.dimensions.cols + 1 
    }
    
    // Calculate new table positions based on insert position
    let newStartPosition = { ...tableStructure.startPosition }
    
    if (position === 'left') {
      // Adding to the left: move start position left
      newStartPosition.col = tableStructure.startPosition.col - 1
    }
    // For adding to the right, start position stays the same
    
    // Update cellIds array to accommodate the new column
    const newCellIds: (string | null)[][] = []
    for (let r = 0; r < tableStructure.dimensions.rows; r++) {
      const row: (string | null)[] = []
      for (let c = 0; c < newDimensions.cols; c++) {
        if (position === 'left' && c === 0) {
          // Insert null for new column at the beginning
          row.push(null)
        } else if (position === 'right' && c === newDimensions.cols - 1) {
          // Insert null for new column at the end
          row.push(null)
        } else {
          // Copy existing cell IDs, adjusting for insertion
          const sourceCol = position === 'left' ? c - 1 : c
          if (tableStructure.cellIds && tableStructure.cellIds[r] && sourceCol >= 0 && sourceCol < tableStructure.cellIds[r].length) {
            row.push(tableStructure.cellIds[r][sourceCol])
          } else {
            row.push(null)
          }
        }
      }
      newCellIds.push(row)
    }
    
    // Update table structure
    const updatedTable = {
      ...tableStructure,
      dimensions: newDimensions,
      startPosition: newStartPosition,
      cellIds: newCellIds
    }
    
    // Update the table structure
    setStructures((prev: StructureMap) => {
      const newStructures = new Map(prev)
      newStructures.set(tableStructure.id, updatedTable)
      return newStructures
    })
    
    // Update selected structure if it's the same table
    if (selectedStructure && selectedStructure.id === tableStructure.id) {
      selectStructure(updatedTable)
    }
  }, [structures, selectedStructure, setStructures, selectStructure])

  // Add column to array
  const handleAddArrayColumn = React.useCallback((arrayId: string, _insertAfterCol: number, position: 'left' | 'right') => {
    // Find the array structure by ID
    const array = structures.get(arrayId)
    
    if (!array || array.type !== 'array') return
    
    const arrayStructure = array as ArrayStructure
    
    // Calculate new array dimensions based on insert position
    let newStartPosition = { ...arrayStructure.startPosition }
    let newDimensions = { ...arrayStructure.dimensions }
    
    if (position === 'left') {
      // Adding to the left: move start position left
      newStartPosition.col = arrayStructure.startPosition.col - 1
    }
    // For adding to the right, start position stays the same
    
    // Increase column count
    newDimensions.cols += 1
    
    // Update cellIds array to accommodate the new column
    const newCellIds: (string | null)[] = []
    for (let i = 0; i < newDimensions.cols; i++) {
      if (position === 'left' && i === 0) {
        // Insert null for new column at the beginning
        newCellIds.push(null)
      } else if (position === 'right' && i === newDimensions.cols - 1) {
        // Insert null for new column at the end
        newCellIds.push(null)
      } else {
        // Copy existing cell IDs, adjusting for insertion
        const sourceIndex = position === 'left' ? i - 1 : i
        if (arrayStructure.cellIds && sourceIndex >= 0 && sourceIndex < arrayStructure.cellIds.length) {
          newCellIds.push(arrayStructure.cellIds[sourceIndex])
        } else {
          newCellIds.push(null)
        }
      }
    }
    
    // Update array structure
    const updatedArray = {
      ...arrayStructure,
      startPosition: newStartPosition,
      dimensions: newDimensions,
      cellIds: newCellIds
    }
    
    // Update the array structure
    setStructures((prev: StructureMap) => {
      const newStructures = new Map(prev)
      newStructures.set(arrayStructure.id, updatedArray)
      return newStructures
    })
    
    // Update selected structure if it's the same array
    if (selectedStructure && selectedStructure.id === arrayStructure.id) {
      selectStructure(updatedArray)
    }
  }, [structures, selectedStructure, setStructures, selectStructure])

  // Add row to array
  const handleAddArrayRow = React.useCallback((arrayId: string, insertAfterRow: number, _position: 'bottom') => {
    // Find the array structure by ID
    const array = structures.get(arrayId)
    
    if (!array || array.type !== 'array') return
    
    const arrayStructure = array as ArrayStructure
    
    // Update array structure with increased row count
    const newDimensions = {
      rows: arrayStructure.dimensions.rows + 1,
      cols: arrayStructure.dimensions.cols
    }
    
    // Update cellIds array to accommodate the new row
    const newCellIds: (string | null)[] = []
    for (let i = 0; i < newDimensions.rows; i++) {
      if (i === newDimensions.rows - 1) {
        // Insert null for new row at the end
        newCellIds.push(null)
      } else {
        // Copy existing cell IDs
        if (arrayStructure.cellIds && i < arrayStructure.cellIds.length) {
          newCellIds.push(arrayStructure.cellIds[i])
        } else {
          newCellIds.push(null)
        }
      }
    }
    
    // Update array structure
    const updatedArray = {
      ...arrayStructure,
      dimensions: newDimensions,
      cellIds: newCellIds
    }
    
    // Update the array structure
    setStructures((prev: StructureMap) => {
      const newStructures = new Map(prev)
      newStructures.set(arrayStructure.id, updatedArray)
      return newStructures
    })
    
    // Update selected structure if it's the same array
    if (selectedStructure && selectedStructure.id === arrayStructure.id) {
      selectStructure(updatedArray)
    }
  }, [structures, selectedStructure, setStructures, selectStructure])

  // Add row to table
  const handleAddTableRow = React.useCallback((tableId: string, insertAfterRow: number, position: 'top' | 'bottom') => {
    // Find the table structure by ID
    const table = structures.get(tableId)
    
    if (!table || table.type !== 'table') return
    
    const tableStructure = table as TableStructure
    
    // Update table dimensions
    const newDimensions = { 
      rows: tableStructure.dimensions.rows + 1, 
      cols: tableStructure.dimensions.cols
    }
    
    // Update cellIds array to accommodate the new row
    const newCellIds: (string | null)[][] = []
    for (let r = 0; r < newDimensions.rows; r++) {
      if ((position === 'bottom' && r === newDimensions.rows - 1) || 
          (position === 'top' && r === 0)) {
        // Insert row of nulls for new row
        const newRow: (string | null)[] = new Array(newDimensions.cols).fill(null)
        newCellIds.push(newRow)
      } else {
        // Copy existing row, adjusting for insertion
        const sourceRow = position === 'top' ? r - 1 : r
        if (tableStructure.cellIds && sourceRow >= 0 && sourceRow < tableStructure.cellIds.length) {
          newCellIds.push([...tableStructure.cellIds[sourceRow]])
        } else {
          const newRow: (string | null)[] = new Array(newDimensions.cols).fill(null)
          newCellIds.push(newRow)
        }
      }
    }
    
    // Update table structure
    const updatedTable = {
      ...tableStructure,
      dimensions: newDimensions,
      cellIds: newCellIds
    }
    
    // Update the table structure
    setStructures((prev: StructureMap) => {
      const newStructures = new Map(prev)
      newStructures.set(tableStructure.id, updatedTable)
      return newStructures
    })
    
    // Update selected structure if it's the same table
    if (selectedStructure && selectedStructure.id === tableStructure.id) {
      selectStructure(updatedTable)
    }
  }, [structures, selectedStructure, setStructures, selectStructure])

  // Handle structure name editing
  const handleStructureNameDoubleClick = React.useCallback((structure: Structure) => {
    setEditingStructureName(structure.id)
    setEditingNameValue(structure.name || '')
  }, [])

  const handleStructureNameChange = React.useCallback((value: string) => {
    setEditingNameValue(value)
  }, [])

  const handleStructureNameSubmit = React.useCallback(() => {
    if (editingStructureName) {
      // Update the structure name (or remove it if empty)
      setStructures((prev: StructureMap) => {
        const newStructures = new Map<string, Structure>(prev)
        const structure = newStructures.get(editingStructureName)
        
        if (structure) {
          const trimmedName = editingNameValue.trim()
          const updatedStructure = { 
            ...structure, 
            name: trimmedName || undefined  // Set to undefined if empty to remove the name
          }
          
          // Update the main structure
          newStructures.set(editingStructureName, updatedStructure)
          
          // Update selected structure if it's the same one
          if (selectedStructure && selectedStructure.id === structure.id) {
            selectStructure(updatedStructure)
          }
        }
        
        return newStructures
      })
    }
    
    setEditingStructureName(null)
    setEditingNameValue('')
  }, [editingStructureName, editingNameValue, selectedStructure, setStructures, selectStructure])

  const handleStructureNameCancel = React.useCallback(() => {
    setEditingStructureName(null)
    setEditingNameValue('')
  }, [])

  return {
    handlers: {
      handleHeaderHover,
      handleAddColumn,
      handleAddRow,
      handleAddTableColumn,
      handleAddArrayColumn,
      handleAddArrayRow,
      handleAddTableRow,
      handleStructureNameDoubleClick,
      handleStructureNameChange,
      handleStructureNameSubmit,
      handleStructureNameCancel
    },
    state: {
      editingStructureName,
      editingNameValue
    },
    utils: {
      setEditingStructureName,
      setEditingNameValue
    }
  }
}
