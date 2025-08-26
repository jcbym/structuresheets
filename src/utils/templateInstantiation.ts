import { Structure, TemplateStructure, Position, StructureMap, PositionMap } from '../types'
import { getTemplateStructures, getTemplateCellData } from './templateStorage'
import { addStructureToPositionMap } from './structureUtils'

export interface TemplateInstantiationResult {
  templateStructure: TemplateStructure
  nestedStructures: Structure[]
  cellData: { [position: string]: string }
}

export const instantiateTemplate = (
  templateId: string,
  targetPosition: Position,
  dimensions: { rows: number, cols: number },
  templateVersion?: number
): TemplateInstantiationResult => {
  // Load template data
  const templateStructures = getTemplateStructures(templateId)
  const templateCellData = getTemplateCellData(templateId)
  
  // Create the main template structure
  const templateStructure: TemplateStructure = {
    type: 'template',
    id: `template-instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    startPosition: targetPosition,
    dimensions,
    templateId,
    sourceTemplateVersion: templateVersion || 1,
    overrides: {
      structures: {},
      cellData: {},
      deletedStructures: [],
      addedStructures: []
    },
    name: `Template Instance`
  }
  
  // Create copies of all nested structures with adjusted positions and new IDs
  const nestedStructures: Structure[] = []
  const idMap = new Map<string, string>() // Map old IDs to new IDs
  
  for (const [originalId, originalStructure] of templateStructures) {
    const newId = `${originalStructure.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    idMap.set(originalId, newId)
    
    // Calculate new position relative to template position
    const newPosition: Position = {
      row: targetPosition.row + originalStructure.startPosition.row,
      col: targetPosition.col + originalStructure.startPosition.col
    }
    
    // Create a copy of the structure with new ID and position
    const newStructure: Structure = {
      ...originalStructure,
      id: newId,
      startPosition: newPosition
    }
    
    nestedStructures.push(newStructure)
  }
  
  // Adjust cell data positions
  const adjustedCellData: { [position: string]: string } = {}
  for (const [positionKey, value] of Object.entries(templateCellData)) {
    const [rowStr, colStr] = positionKey.split('-')
    const originalRow = parseInt(rowStr, 10)
    const originalCol = parseInt(colStr, 10)
    
    const newRow = targetPosition.row + originalRow
    const newCol = targetPosition.col + originalCol
    const newPositionKey = `${newRow}-${newCol}`
    
    adjustedCellData[newPositionKey] = value
  }
  
  return {
    templateStructure,
    nestedStructures,
    cellData: adjustedCellData
  }
}

export const validateTemplateInstantiation = (
  templateId: string,
  targetPosition: Position,
  dimensions: { rows: number, cols: number },
  existingStructures: StructureMap,
  existingPositions: PositionMap
): { isValid: boolean, conflicts: Position[] } => {
  const conflicts: Position[] = []
  
  // Check if the template area conflicts with existing structures
  // Use the same validation logic as structure movements for consistency
  for (let row = targetPosition.row; row < targetPosition.row + dimensions.rows; row++) {
    for (let col = targetPosition.col; col < targetPosition.col + dimensions.cols; col++) {
      const positionKey = `${row}-${col}`
      const existingStructureIds = existingPositions.get(positionKey)
      
      if (existingStructureIds && existingStructureIds.length > 0) {
        // Check each existing structure at this position
        for (const structureId of existingStructureIds) {
          const existingStructure = existingStructures.get(structureId)
          if (existingStructure) {
            // Templates cannot be placed on top of any existing structures
            // This is consistent with how other structures prevent overlaps
            conflicts.push({ row, col })
            break // No need to check more structures at this position
          }
        }
      }
    }
  }
  
  return {
    isValid: conflicts.length === 0,
    conflicts
  }
}

export const addInstantiatedTemplateToStructures = (
  instantiationResult: TemplateInstantiationResult,
  structures: StructureMap,
  positions: PositionMap,
  onCellUpdate: (row: number, col: number, value: string) => void
): { newStructures: StructureMap, newPositions: PositionMap } => {
  const newStructures = new Map(structures)
  let newPositions = new Map(positions)
  
  // Add the template structure
  newStructures.set(instantiationResult.templateStructure.id, instantiationResult.templateStructure)
  newPositions = addStructureToPositionMap(instantiationResult.templateStructure, newPositions)
  
  // Add all nested structures
  for (const nestedStructure of instantiationResult.nestedStructures) {
    newStructures.set(nestedStructure.id, nestedStructure)
    newPositions = addStructureToPositionMap(nestedStructure, newPositions)
  }
  
  // Apply cell data updates
  for (const [positionKey, value] of Object.entries(instantiationResult.cellData)) {
    const [rowStr, colStr] = positionKey.split('-')
    const row = parseInt(rowStr, 10)
    const col = parseInt(colStr, 10)
    
    if (value) {
      onCellUpdate(row, col, value)
    }
  }
  
  return { newStructures, newPositions }
}
