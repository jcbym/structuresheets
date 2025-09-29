import React from 'react'
import { Structure, StructureMap, PositionMap, ArrayStructure, TableStructure } from '../types'
import { expandStructureWithPushing, isTemplateArray, calculateTemplateArrayExpansion, calculateTemplateInstancePosition } from '../utils/structureUtils'
import { instantiateTemplate } from '../utils/templateInstantiation'
import { getTemplateStructures } from '../utils/templateStorage'

interface StructureEditingHandlersProps {
  structures: StructureMap
  positions: PositionMap
  selectedStructure: Structure | null
  hoveredHeaderCell: {row: number, col: number} | null
  showAddColumnButton: boolean
  
  // State setters
  setStructures: React.Dispatch<React.SetStateAction<StructureMap>>
  setPositions: React.Dispatch<React.SetStateAction<PositionMap>>
  setSelectedStructure: React.Dispatch<React.SetStateAction<Structure | null>>
  setHoveredHeaderCell: React.Dispatch<React.SetStateAction<{row: number, col: number} | null>>
  setShowAddColumnButton: React.Dispatch<React.SetStateAction<boolean>>
  
  // External callbacks
  selectStructure: (structure: Structure) => void
}

export const useStructureEditingHandlers = ({
  structures,
  positions,
  selectedStructure,
  hoveredHeaderCell,
  showAddColumnButton,
  setStructures,
  setPositions,
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

  // Add column to table with pushing behavior
  const handleAddTableColumn = React.useCallback((tableId: string, _insertAfterCol: number, position: 'left' | 'right') => {
    const result = expandStructureWithPushing(
      tableId,
      position, // 'left' or 'right'
      1, // expand by 1 column
      structures,
      positions
    )
    
    if (result.success) {
      // Update both structures and positions
      setStructures(result.structures)
      setPositions(result.positions)
      
      // Update selected structure if it's the same table
      if (selectedStructure && selectedStructure.id === tableId) {
        const updatedStructure = result.structures.get(tableId)
        if (updatedStructure) {
          selectStructure(updatedStructure)
        }
      }
    } else {
      // Handle failure - could show a toast or alert
      console.warn('Failed to add column:', result.reason)
    }
  }, [structures, positions, selectedStructure, setStructures, setPositions, selectStructure])

  // Add column to array with pushing behavior
  const handleAddArrayColumn = React.useCallback((arrayId: string, _insertAfterCol: number, position: 'left' | 'right') => {
    const array = structures.get(arrayId) as ArrayStructure
    if (!array || array.type !== 'array') return
    
    // Check if this is a template array
    if (isTemplateArray(array) && array.templateDimensions && array.direction === 'horizontal') {
      // Template array - need to add a new template instance
      try {
        const { direction: expansionDirection, amount: expansionAmount } = calculateTemplateArrayExpansion(
          array,
          array.templateDimensions
        )
        
        // Calculate position for the new template instance
        const currentInstanceCount = array.instanceCount || 1
        const newInstancePosition = calculateTemplateInstancePosition(
          array.startPosition,
          array.direction,
          array.templateDimensions,
          currentInstanceCount
        )
        
        // Create new template instance
        const instantiationResult = instantiateTemplate(
          array.contentType,
          newInstancePosition,
          array.templateDimensions,
          1 // Template version
        )
        
        // Expand the array structure using pushing
        const result = expandStructureWithPushing(
          arrayId,
          expansionDirection,
          expansionAmount,
          structures,
          positions
        )
        
        if (result.success) {
          // Update structures with new template instance
          const newStructures = new Map(result.structures)
          
          // Add the new template instance and its nested structures
          newStructures.set(instantiationResult.templateStructure.id, instantiationResult.templateStructure)
          for (const nestedStructure of instantiationResult.nestedStructures) {
            newStructures.set(nestedStructure.id, nestedStructure)
          }
          
          // Update the array structure to include the new template instance
          const updatedArray = newStructures.get(arrayId) as ArrayStructure
          if (updatedArray) {
            const finalArray: ArrayStructure = {
              ...updatedArray,
              instanceCount: currentInstanceCount + 1,
              itemIds: [...updatedArray.itemIds, instantiationResult.templateStructure.id]
            }
            newStructures.set(arrayId, finalArray)
          }
          
          setStructures(newStructures)
          setPositions(result.positions)
          
          // Update selected structure
          if (selectedStructure && selectedStructure.id === arrayId) {
            const finalUpdatedStructure = newStructures.get(arrayId)
            if (finalUpdatedStructure) {
              selectStructure(finalUpdatedStructure)
            }
          }
          
          console.log('Successfully added template instance to array')
        } else {
          console.warn('Failed to expand array for new template instance:', result.reason)
        }
      } catch (error) {
        console.error('Failed to add template instance to array:', error)
      }
    } else {
      // Regular array - use normal expansion logic
      const result = expandStructureWithPushing(
        arrayId,
        position, // 'left' or 'right'
        1, // expand by 1 column
        structures,
        positions
      )
      
      if (result.success) {
        setStructures(result.structures)
        setPositions(result.positions)
        
        if (selectedStructure && selectedStructure.id === arrayId) {
          const updatedStructure = result.structures.get(arrayId)
          if (updatedStructure) {
            selectStructure(updatedStructure)
          }
        }
      } else {
        console.warn('Failed to add column to array:', result.reason)
      }
    }
  }, [structures, positions, selectedStructure, setStructures, setPositions, selectStructure])

  // Add row to array with pushing behavior
  const handleAddArrayRow = React.useCallback((arrayId: string, insertAfterRow: number, position: 'bottom') => {
    const array = structures.get(arrayId) as ArrayStructure
    if (!array || array.type !== 'array') return
    
    // Check if this is a template array
    if (isTemplateArray(array) && array.templateDimensions && array.direction === 'vertical') {
      // Template array - need to add a new template instance
      try {
        const { direction: expansionDirection, amount: expansionAmount } = calculateTemplateArrayExpansion(
          array,
          array.templateDimensions
        )
        
        // Calculate position for the new template instance
        const currentInstanceCount = array.instanceCount || 1
        const newInstancePosition = calculateTemplateInstancePosition(
          array.startPosition,
          array.direction,
          array.templateDimensions,
          currentInstanceCount
        )
        
        // Create new template instance
        const instantiationResult = instantiateTemplate(
          array.contentType,
          newInstancePosition,
          array.templateDimensions,
          1 // Template version
        )
        
        // Expand the array structure using pushing
        const result = expandStructureWithPushing(
          arrayId,
          expansionDirection,
          expansionAmount,
          structures,
          positions
        )
        
        if (result.success) {
          // Update structures with new template instance
          const newStructures = new Map(result.structures)
          
          // Add the new template instance and its nested structures
          newStructures.set(instantiationResult.templateStructure.id, instantiationResult.templateStructure)
          for (const nestedStructure of instantiationResult.nestedStructures) {
            newStructures.set(nestedStructure.id, nestedStructure)
          }
          
          // Update the array structure to include the new template instance
          const updatedArray = newStructures.get(arrayId) as ArrayStructure
          if (updatedArray) {
            const finalArray: ArrayStructure = {
              ...updatedArray,
              instanceCount: currentInstanceCount + 1,
              itemIds: [...updatedArray.itemIds, instantiationResult.templateStructure.id]
            }
            newStructures.set(arrayId, finalArray)
          }
          
          setStructures(newStructures)
          setPositions(result.positions)
          
          // Update selected structure
          if (selectedStructure && selectedStructure.id === arrayId) {
            const finalUpdatedStructure = newStructures.get(arrayId)
            if (finalUpdatedStructure) {
              selectStructure(finalUpdatedStructure)
            }
          }
          
          console.log('Successfully added template instance to array')
        } else {
          console.warn('Failed to expand array for new template instance:', result.reason)
        }
      } catch (error) {
        console.error('Failed to add template instance to array:', error)
      }
    } else {
      // Regular array - use normal expansion logic
      const result = expandStructureWithPushing(
        arrayId,
        'down', // rows are added downward
        1, // expand by 1 row
        structures,
        positions
      )
      
      if (result.success) {
        setStructures(result.structures)
        setPositions(result.positions)
        
        if (selectedStructure && selectedStructure.id === arrayId) {
          const updatedStructure = result.structures.get(arrayId)
          if (updatedStructure) {
            selectStructure(updatedStructure)
          }
        }
      } else {
        console.warn('Failed to add row to array:', result.reason)
      }
    }
  }, [structures, positions, selectedStructure, setStructures, setPositions, selectStructure])

  // Add row to table with pushing behavior
  const handleAddTableRow = React.useCallback((tableId: string, insertAfterRow: number, position: 'top' | 'bottom') => {
    const direction = position === 'top' ? 'up' : 'down'
    const result = expandStructureWithPushing(
      tableId,
      direction, // 'up' or 'down'
      1, // expand by 1 row
      structures,
      positions
    )
    
    if (result.success) {
      // Update both structures and positions
      setStructures(result.structures)
      setPositions(result.positions)
      
      // Update selected structure if it's the same table
      if (selectedStructure && selectedStructure.id === tableId) {
        const updatedStructure = result.structures.get(tableId)
        if (updatedStructure) {
          selectStructure(updatedStructure)
        }
      }
    } else {
      // Handle failure - could show a toast or alert
      console.warn('Failed to add row to table:', result.reason)
    }
  }, [structures, positions, selectedStructure, setStructures, setPositions, selectStructure])

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
