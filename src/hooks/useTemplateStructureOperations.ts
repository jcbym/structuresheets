import React from 'react'
import { Structure, CellStructure, ArrayStructure, TableStructure, Position, Dimensions, StructureMap, PositionMap } from '../types'
import { generateUUID } from '../utils/sheetUtils'
import { addStructureToPositionMap, removeStructureFromPositionMap, getStructureAtPosition, getDimensions, initializeCellIdsFromRange } from '../utils/structureUtils'

export const useTemplateStructureOperations = (
  templateStructures: StructureMap,
  setTemplateStructures: React.Dispatch<React.SetStateAction<StructureMap>>,
  templatePositions: PositionMap,
  setTemplatePositions: React.Dispatch<React.SetStateAction<PositionMap>>,
  selectedRange: {start: Position, end: Position} | null,
  setSelectedStructure: React.Dispatch<React.SetStateAction<Structure | null>>
) => {

  const createStructure = (type: Structure['type'], name: string, startPosition: Position, dimensions: Dimensions) => {
    let newStructure: Structure

    switch (type) {
      case 'cell':
        newStructure = {
          type: 'cell',
          id: generateUUID(),
          startPosition: startPosition,
          dimensions: dimensions,
          name,
          value: ''
        }
        return newStructure
      
      case 'array':
        let direction: 'horizontal' | 'vertical';

        if (dimensions.cols == 1) {
          direction = 'vertical'
        } else if (dimensions.rows == 1) {
          direction = 'horizontal'
        } else {
          console.warn('Invalid array dimensions:', dimensions)
          return
        }

        const arrayCellIds = initializeCellIdsFromRange(
          startPosition, dimensions, templatePositions, templateStructures, 'array'
        ) as (string | null)[]

        newStructure = {
          type: 'array',
          id: generateUUID(),
          startPosition: startPosition,
          dimensions: dimensions,
          name,
          direction,
          cellIds: arrayCellIds
        }
        return newStructure

      case 'table':
        const tableCellIds = initializeCellIdsFromRange(
          startPosition, dimensions, templatePositions, templateStructures, 'table'
        ) as (string | null)[][]
        
        newStructure = {
          type: 'table',
          id: generateUUID(),
          startPosition: startPosition,
          dimensions: dimensions,
          name,
          colHeaderLevels: 1,
          rowHeaderLevels: 0,
          cellIds: tableCellIds
        }
        return newStructure
    }
  }

  // Create structure from toolbar (works with selected range) - Template version
  const createTemplateStructureFromToolbar = React.useCallback((type: Structure['type']) => {
    let startRow: number, endRow: number, startCol: number, endCol: number

    if (selectedRange) {
      // Use selected range
      startRow = Math.min(selectedRange.start.row, selectedRange.end.row)
      endRow = Math.max(selectedRange.start.row, selectedRange.end.row)
      startCol = Math.min(selectedRange.start.col, selectedRange.end.col)
      endCol = Math.max(selectedRange.start.col, selectedRange.end.col)
    } else {
      return // No selection
    }

    const newStructure = createStructure(type, '', {row: startRow, col: startCol}, getDimensions({row: startRow, col: startCol}, {row: endRow, col: endCol}))

    if (!newStructure) return // Invalid structure type or dimensions

    // Set the main structure in template structures map and update position map
    setTemplateStructures((prev: StructureMap) => {
      const newStructures = new Map(prev)
      newStructures.set(newStructure.id, newStructure)
      
      return newStructures
    })
    
    // Update template position map
    setTemplatePositions(prev => addStructureToPositionMap(newStructure, prev))
    
    // Select the newly created structure
    setSelectedStructure(newStructure)
  }, [selectedRange, templateStructures, templatePositions, setTemplateStructures, setSelectedStructure, setTemplatePositions])

  const deleteTemplateStructure = React.useCallback((structureId: string) => {
    const structureToDelete = templateStructures.get(structureId)
    
    setTemplateStructures((prev: StructureMap) => {
      const newStructures = new Map(prev)
      newStructures.delete(structureId)
      return newStructures
    })
    
    // Remove from template position map
    if (structureToDelete) {
      setTemplatePositions(prev => removeStructureFromPositionMap(structureToDelete, prev))
    }
    
    // Clear selected structure if it was the deleted one
    setSelectedStructure(current => {
      if (current && current.id === structureId) {
        return null
      }
      return current
    })
  }, [templateStructures, setTemplateStructures, setTemplatePositions, setSelectedStructure])

  const updateTemplateStructureName = React.useCallback((structureId: string, name: string) => {
    setTemplateStructures((prev: StructureMap) => {
      const newStructures = new Map(prev)
      const structure = newStructures.get(structureId)
      if (structure) {
        // Set name to undefined if empty string is passed to delete the name
        const updatedStructure = { ...structure, name: name || undefined }
        newStructures.set(structureId, updatedStructure)
        
        // Also update the selected structure if it's the same one
        setSelectedStructure(current => {
          if (current && current.id === structureId) {
            return updatedStructure as Structure
          }
          return current
        })
      }
      return newStructures
    })
  }, [setTemplateStructures, setSelectedStructure])

  const updateTemplateStructureFormula = React.useCallback((structureId: string, formula: string) => {
    setTemplateStructures((prev: StructureMap) => {
      const newStructures = new Map(prev);
      const structure = newStructures.get(structureId);
      
      if (!structure) {
        return newStructures;
      }

      // For templates, we store the formula but don't execute it
      // Templates are meant to be structures without computed values
      let updatedStructure: Structure;
      if (structure.type === 'cell') {
        updatedStructure = {
          ...structure,
          formula: formula || undefined,
          formulaError: undefined,
          formulaValue: undefined
        } as CellStructure;
      } else if (structure.type === 'array') {
        updatedStructure = {
          ...structure,
          formula: formula || undefined,
          formulaError: undefined,
          formulaValue: undefined
        } as ArrayStructure;
      } else if (structure.type === 'table') {
        updatedStructure = {
          ...structure,
          formula: formula || undefined,
          formulaError: undefined,
          formulaValue: undefined
        } as TableStructure;
      } else {
        return newStructures;
      }

      newStructures.set(structureId, updatedStructure);

      setSelectedStructure(current => {
        if (current && current.id === structureId) {
          return updatedStructure;
        }
        return current;
      });

      return newStructures;
    });
  }, [setTemplateStructures, setSelectedStructure]);

  const rotateTemplateArray = React.useCallback((arrayId: string) => {
    // Template version of array rotation - similar logic but operates on template structures
    // For now, keeping as placeholder similar to main operations
    console.log('Template array rotation not yet implemented')
  }, [])

  const getTemplateStructureAtPosition = React.useCallback((row: number, col: number) => {
    return getStructureAtPosition(row, col, templatePositions, templateStructures)
  }, [templatePositions, templateStructures])

  return {
    createTemplateStructureFromToolbar,
    deleteTemplateStructure,
    updateTemplateStructureName,
    updateTemplateStructureFormula,
    rotateTemplateArray,
    getTemplateStructureAtPosition
  }
}
