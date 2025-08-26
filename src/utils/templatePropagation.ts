import { 
  Structure, 
  TemplateStructure, 
  TemplateChanges, 
  StructureMap, 
  PositionMap,
  Position 
} from '../types'
import { 
  getTemplateStructures, 
  getTemplateCellData, 
  saveTemplateData,
  TemplateData 
} from './templateStorage'
import { Template } from '../components/ui/TemplatesSidebar'
import { 
  isStructureOverridden, 
  isCellOverridden, 
  isStructureDeleted, 
  isStructureAdded,
  getStructureOverride,
  getCellOverride,
  convertToAbsolutePosition,
  convertToRelativePosition
} from './templateOverrides'
import { addStructureToPositionMap, removeStructureFromPositionMap } from './structureUtils'

export interface PropagationResult {
  updatedStructures: StructureMap
  updatedPositions: PositionMap
  cellUpdates: { [position: string]: string }
  conflicts: PropagationConflict[]
}

export interface PropagationConflict {
  instanceId: string
  type: 'structure' | 'cell'
  identifier: string // structure ID or position key
  templateValue: any
  instanceValue: any
  resolution: 'keep_instance' | 'use_template'
}

/**
 * Find all template instances that need to be updated based on template changes
 */
export const findInstancesNeedingUpdate = (
  templateId: string,
  currentTemplateVersion: number,
  structures: StructureMap
): TemplateStructure[] => {
  const instances: TemplateStructure[] = []
  
  for (const structure of structures.values()) {
    if (
      structure.type === 'template' && 
      structure.templateId === templateId &&
      (structure.sourceTemplateVersion || 0) < currentTemplateVersion
    ) {
      instances.push(structure)
    }
  }
  
  return instances
}

/**
 * Apply template changes to a specific instance
 */
export const applyTemplateChangesToInstance = (
  instance: TemplateStructure,
  template: Template,
  structures: StructureMap,
  positions: PositionMap,
  onCellUpdate: (row: number, col: number, value: string) => void
): PropagationResult => {
  // Load current template data
  const templateStructures = getTemplateStructures(template.id)
  const templateCellData = getTemplateCellData(template.id)
  
  // Track changes
  let updatedStructures = new Map(structures)
  let updatedPositions = new Map(positions)
  const cellUpdates: { [position: string]: string } = {}
  const conflicts: PropagationConflict[] = []
  
  // Update the instance itself with new version
  const updatedInstance: TemplateStructure = {
    ...instance,
    sourceTemplateVersion: template.version
  }
  updatedStructures.set(instance.id, updatedInstance)
  
  // Apply structure changes
  for (const [templateStructureId, templateStructure] of templateStructures) {
    // Generate the actual structure ID that would exist in the instance
    const instanceStructureId = generateInstanceStructureId(templateStructureId, instance.id)
    
    // Check if this structure is overridden
    const isOverridden = isStructureOverridden(instance, instanceStructureId)
    const isDeleted = isStructureDeleted(instance, instanceStructureId)
    
    if (isDeleted && !isOverridden) {
      // Structure was deleted in instance and not overridden - don't restore it
      continue
    }
    
    if (isOverridden) {
      // Apply partial overrides to template structure
      const override = getStructureOverride(instance, instanceStructureId)
      const currentStructure = updatedStructures.get(instanceStructureId)
      
      if (currentStructure && override) {
        // Merge template changes with instance overrides
        const mergedStructure: Structure = {
          ...templateStructure,
          ...override,
          id: instanceStructureId,
          startPosition: convertToAbsolutePosition(
            templateStructure.startPosition,
            instance.startPosition
          )
        } as Structure
        
        updatedStructures.set(instanceStructureId, mergedStructure)
        updatedPositions = addStructureToPositionMap(mergedStructure, 
          removeStructureFromPositionMap(currentStructure, updatedPositions))
      }
    } else {
      // No override - apply template structure directly
      const instanceStructure: Structure = {
        ...templateStructure,
        id: instanceStructureId,
        startPosition: convertToAbsolutePosition(
          templateStructure.startPosition,
          instance.startPosition
        )
      }
      
      const existingStructure = updatedStructures.get(instanceStructureId)
      if (existingStructure) {
        updatedPositions = removeStructureFromPositionMap(existingStructure, updatedPositions)
      }
      
      updatedStructures.set(instanceStructureId, instanceStructure)
      updatedPositions = addStructureToPositionMap(instanceStructure, updatedPositions)
    }
  }
  
  // Apply cell data changes
  for (const [relativePositionKey, templateValue] of Object.entries(templateCellData)) {
    const [relativeRow, relativeCol] = relativePositionKey.split('-').map(Number)
    const absolutePosition = convertToAbsolutePosition(
      { row: relativeRow, col: relativeCol },
      instance.startPosition
    )
    const absolutePositionKey = `${absolutePosition.row}-${absolutePosition.col}`
    
    // Check if this cell is overridden
    const isOverridden = isCellOverridden(instance, relativePositionKey)
    
    if (isOverridden) {
      // Keep instance value - it's an override
      const overrideValue = getCellOverride(instance, relativePositionKey)
      if (overrideValue !== undefined) {
        cellUpdates[absolutePositionKey] = overrideValue
        onCellUpdate(absolutePosition.row, absolutePosition.col, overrideValue)
      }
    } else {
      // Apply template value
      cellUpdates[absolutePositionKey] = templateValue
      onCellUpdate(absolutePosition.row, absolutePosition.col, templateValue)
    }
  }
  
  return {
    updatedStructures,
    updatedPositions,
    cellUpdates,
    conflicts
  }
}

/**
 * Propagate template changes to all instances
 */
export const propagateTemplateChanges = (
  template: Template,
  structures: StructureMap,
  positions: PositionMap,
  onCellUpdate: (row: number, col: number, value: string) => void
): PropagationResult => {
  // Find all instances that need updating
  const instancesToUpdate = findInstancesNeedingUpdate(
    template.id,
    template.version,
    structures
  )
  
  let currentStructures = new Map(structures)
  let currentPositions = new Map(positions)
  const allCellUpdates: { [position: string]: string } = {}
  const allConflicts: PropagationConflict[] = []
  
  // Apply changes to each instance
  for (const instance of instancesToUpdate) {
    const result = applyTemplateChangesToInstance(
      instance,
      template,
      currentStructures,
      currentPositions,
      onCellUpdate
    )
    
    currentStructures = result.updatedStructures
    currentPositions = result.updatedPositions
    Object.assign(allCellUpdates, result.cellUpdates)
    allConflicts.push(...result.conflicts)
  }
  
  return {
    updatedStructures: currentStructures,
    updatedPositions: currentPositions,
    cellUpdates: allCellUpdates,
    conflicts: allConflicts
  }
}

/**
 * Generate a unique structure ID for an instance structure
 */
const generateInstanceStructureId = (templateStructureId: string, instanceId: string): string => {
  return `${instanceId}-${templateStructureId}`
}

/**
 * Compute differences between two template versions
 */
export const computeTemplateChanges = (
  oldTemplateId: string,
  newTemplateStructures: StructureMap,
  newTemplateCellData: { [position: string]: string }
): TemplateChanges => {
  const oldTemplateStructures = getTemplateStructures(oldTemplateId)
  const oldTemplateCellData = getTemplateCellData(oldTemplateId)
  
  const changes: TemplateChanges = {
    structures: {
      added: [],
      modified: {},
      deleted: []
    },
    cellData: {
      added: {},
      modified: {},
      deleted: []
    }
  }
  
  // Find structure changes
  const oldStructureIds = new Set(oldTemplateStructures.keys())
  const newStructureIds = new Set(newTemplateStructures.keys())
  
  // Added structures
  for (const structureId of newStructureIds) {
    if (!oldStructureIds.has(structureId)) {
      const structure = newTemplateStructures.get(structureId)
      if (structure) {
        changes.structures.added.push(structure)
      }
    }
  }
  
  // Deleted structures
  for (const structureId of oldStructureIds) {
    if (!newStructureIds.has(structureId)) {
      changes.structures.deleted.push(structureId)
    }
  }
  
  // Modified structures
  for (const structureId of oldStructureIds) {
    if (newStructureIds.has(structureId)) {
      const oldStructure = oldTemplateStructures.get(structureId)
      const newStructure = newTemplateStructures.get(structureId)
      
      if (oldStructure && newStructure && !structuresEqual(oldStructure, newStructure)) {
        changes.structures.modified[structureId] = getStructureDifferences(oldStructure, newStructure)
      }
    }
  }
  
  // Find cell data changes
  const oldPositions = new Set(Object.keys(oldTemplateCellData))
  const newPositions = new Set(Object.keys(newTemplateCellData))
  
  // Added cells
  for (const position of newPositions) {
    if (!oldPositions.has(position)) {
      changes.cellData.added[position] = newTemplateCellData[position]
    }
  }
  
  // Deleted cells
  for (const position of oldPositions) {
    if (!newPositions.has(position)) {
      changes.cellData.deleted.push(position)
    }
  }
  
  // Modified cells
  for (const position of oldPositions) {
    if (newPositions.has(position)) {
      const oldValue = oldTemplateCellData[position]
      const newValue = newTemplateCellData[position]
      
      if (oldValue !== newValue) {
        changes.cellData.modified[position] = newValue
      }
    }
  }
  
  return changes
}

/**
 * Check if two structures are equal
 */
const structuresEqual = (a: Structure, b: Structure): boolean => {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Get the differences between two structures
 */
const getStructureDifferences = (oldStructure: Structure, newStructure: Structure): Partial<Structure> => {
  const differences: any = {}
  
  // Compare all properties
  for (const key in newStructure) {
    if (newStructure.hasOwnProperty(key)) {
      const oldValue = (oldStructure as any)[key]
      const newValue = (newStructure as any)[key]
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        differences[key] = newValue
      }
    }
  }
  
  return differences
}

/**
 * Validate that a template propagation won't cause conflicts
 */
export const validateTemplatePropagation = (
  template: Template,
  structures: StructureMap
): { isValid: boolean, issues: string[] } => {
  const issues: string[] = []
  const instances = findInstancesNeedingUpdate(template.id, template.version, structures)
  
  if (instances.length === 0) {
    issues.push('No instances found to update')
  }
  
  // Check for potential conflicts
  for (const instance of instances) {
    if (!instance.overrides) continue
    
    const overrideCount = Object.keys(instance.overrides.structures).length + 
                         Object.keys(instance.overrides.cellData).length
    
    if (overrideCount > 0) {
      issues.push(`Instance ${instance.id} has ${overrideCount} overrides that may conflict`)
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  }
}
