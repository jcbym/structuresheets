import { Structure, TemplateStructure, TemplateOverrides, Position } from '../types'

/**
 * Mark a structure as overridden in a template instance
 */
export const markStructureOverride = (
  instance: TemplateStructure,
  structureId: string,
  changes: Partial<Structure>
): TemplateStructure => {
  const currentOverrides = instance.overrides || {
    structures: {},
    cellData: {},
    deletedStructures: [],
    addedStructures: []
  }

  return {
    ...instance,
    overrides: {
      ...currentOverrides,
      structures: {
        ...currentOverrides.structures,
        [structureId]: {
          ...currentOverrides.structures[structureId],
          ...changes
        }
      }
    }
  }
}

/**
 * Mark cell data as overridden in a template instance
 */
export const markCellOverride = (
  instance: TemplateStructure,
  position: string,
  value: string
): TemplateStructure => {
  const currentOverrides = instance.overrides || {
    structures: {},
    cellData: {},
    deletedStructures: [],
    addedStructures: []
  }

  return {
    ...instance,
    overrides: {
      ...currentOverrides,
      cellData: {
        ...currentOverrides.cellData,
        [position]: value
      }
    }
  }
}

/**
 * Mark a structure as deleted from a template instance
 */
export const markStructureDeleted = (
  instance: TemplateStructure,
  structureId: string
): TemplateStructure => {
  const currentOverrides = instance.overrides || {
    structures: {},
    cellData: {},
    deletedStructures: [],
    addedStructures: []
  }

  // Remove from structures overrides if it exists
  const { [structureId]: removed, ...remainingStructures } = currentOverrides.structures

  return {
    ...instance,
    overrides: {
      ...currentOverrides,
      structures: remainingStructures,
      deletedStructures: [
        ...currentOverrides.deletedStructures.filter(id => id !== structureId),
        structureId
      ]
    }
  }
}

/**
 * Mark a structure as added to a template instance
 */
export const markStructureAdded = (
  instance: TemplateStructure,
  structureId: string
): TemplateStructure => {
  const currentOverrides = instance.overrides || {
    structures: {},
    cellData: {},
    deletedStructures: [],
    addedStructures: []
  }

  return {
    ...instance,
    overrides: {
      ...currentOverrides,
      addedStructures: [
        ...currentOverrides.addedStructures.filter(id => id !== structureId),
        structureId
      ]
    }
  }
}

/**
 * Check if a specific structure is overridden in a template instance
 */
export const isStructureOverridden = (
  instance: TemplateStructure,
  structureId: string
): boolean => {
  if (!instance.overrides) return false
  return structureId in instance.overrides.structures
}

/**
 * Check if a specific cell is overridden in a template instance
 */
export const isCellOverridden = (
  instance: TemplateStructure,
  position: string
): boolean => {
  if (!instance.overrides) return false
  return position in instance.overrides.cellData
}

/**
 * Check if a structure was deleted from a template instance
 */
export const isStructureDeleted = (
  instance: TemplateStructure,
  structureId: string
): boolean => {
  if (!instance.overrides) return false
  return instance.overrides.deletedStructures.includes(structureId)
}

/**
 * Check if a structure was added to a template instance
 */
export const isStructureAdded = (
  instance: TemplateStructure,
  structureId: string
): boolean => {
  if (!instance.overrides) return false
  return instance.overrides.addedStructures.includes(structureId)
}

/**
 * Get the override value for a specific structure property
 */
export const getStructureOverride = (
  instance: TemplateStructure,
  structureId: string
): Partial<Structure> | undefined => {
  if (!instance.overrides) return undefined
  return instance.overrides.structures[structureId]
}

/**
 * Get the override value for a specific cell
 */
export const getCellOverride = (
  instance: TemplateStructure,
  position: string
): string | undefined => {
  if (!instance.overrides) return undefined
  return instance.overrides.cellData[position]
}

/**
 * Remove all overrides from a template instance (reset to template)
 */
export const clearAllOverrides = (instance: TemplateStructure): TemplateStructure => {
  return {
    ...instance,
    overrides: {
      structures: {},
      cellData: {},
      deletedStructures: [],
      addedStructures: []
    }
  }
}

/**
 * Remove a specific structure override (revert to template value)
 */
export const clearStructureOverride = (
  instance: TemplateStructure,
  structureId: string
): TemplateStructure => {
  const currentOverrides = instance.overrides || {
    structures: {},
    cellData: {},
    deletedStructures: [],
    addedStructures: []
  }

  const { [structureId]: removed, ...remainingStructures } = currentOverrides.structures

  return {
    ...instance,
    overrides: {
      ...currentOverrides,
      structures: remainingStructures
    }
  }
}

/**
 * Remove a specific cell override (revert to template value)
 */
export const clearCellOverride = (
  instance: TemplateStructure,
  position: string
): TemplateStructure => {
  const currentOverrides = instance.overrides || {
    structures: {},
    cellData: {},
    deletedStructures: [],
    addedStructures: []
  }

  const { [position]: removed, ...remainingCellData } = currentOverrides.cellData

  return {
    ...instance,
    overrides: {
      ...currentOverrides,
      cellData: remainingCellData
    }
  }
}

/**
 * Convert relative position within template to absolute position in spreadsheet
 */
export const convertToAbsolutePosition = (
  relativePosition: Position,
  templatePosition: Position
): Position => {
  return {
    row: templatePosition.row + relativePosition.row,
    col: templatePosition.col + relativePosition.col
  }
}

/**
 * Convert absolute position in spreadsheet to relative position within template
 */
export const convertToRelativePosition = (
  absolutePosition: Position,
  templatePosition: Position
): Position => {
  return {
    row: absolutePosition.row - templatePosition.row,
    col: absolutePosition.col - templatePosition.col
  }
}

/**
 * Check if a position is within the template boundary
 */
export const isPositionInTemplate = (
  position: Position,
  templateStructure: TemplateStructure
): boolean => {
  const { startPosition, dimensions } = templateStructure
  return (
    position.row >= startPosition.row &&
    position.row < startPosition.row + dimensions.rows &&
    position.col >= startPosition.col &&
    position.col < startPosition.col + dimensions.cols
  )
}
