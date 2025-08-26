import React from 'react'
import { Structure, TemplateStructure, StructureMap } from '../types'
import { 
  isStructureOverridden, 
  isCellOverridden, 
  isStructureDeleted, 
  isStructureAdded,
  isPositionInTemplate
} from '../utils/templateOverrides'

export interface OverrideInfo {
  hasOverrides: boolean
  overriddenStructures: string[]
  overriddenCells: string[]
  deletedStructures: string[]
  addedStructures: string[]
  totalOverrideCount: number
}

export interface TemplateInstanceInfo {
  templateInstance: TemplateStructure
  overrideInfo: OverrideInfo
  isOutdated: boolean
}

/**
 * Hook to detect and track template override information
 */
export const useTemplateOverrideDetection = (
  structures: StructureMap,
  templates: any[] // Template array from TemplatesSidebar
) => {
  
  const getOverrideInfo = React.useCallback((templateInstance: TemplateStructure): OverrideInfo => {
    if (!templateInstance.overrides) {
      return {
        hasOverrides: false,
        overriddenStructures: [],
        overriddenCells: [],
        deletedStructures: [],
        addedStructures: [],
        totalOverrideCount: 0
      }
    }

    const overriddenStructures = Object.keys(templateInstance.overrides.structures)
    const overriddenCells = Object.keys(templateInstance.overrides.cellData)
    const deletedStructures = templateInstance.overrides.deletedStructures
    const addedStructures = templateInstance.overrides.addedStructures

    const totalOverrideCount = 
      overriddenStructures.length + 
      overriddenCells.length + 
      deletedStructures.length + 
      addedStructures.length

    return {
      hasOverrides: totalOverrideCount > 0,
      overriddenStructures,
      overriddenCells,
      deletedStructures,
      addedStructures,
      totalOverrideCount
    }
  }, [])

  const getTemplateInstanceInfo = React.useCallback((templateInstance: TemplateStructure): TemplateInstanceInfo => {
    const overrideInfo = getOverrideInfo(templateInstance)
    
    // Check if instance is outdated compared to template
    const sourceTemplate = templates.find(t => t.id === templateInstance.templateId)
    const isOutdated = sourceTemplate ? 
      (templateInstance.sourceTemplateVersion || 0) < sourceTemplate.version : 
      false

    return {
      templateInstance,
      overrideInfo,
      isOutdated
    }
  }, [getOverrideInfo, templates])

  const getAllTemplateInstances = React.useCallback((): TemplateInstanceInfo[] => {
    const instances: TemplateInstanceInfo[] = []
    
    for (const structure of structures.values()) {
      if (structure.type === 'template') {
        instances.push(getTemplateInstanceInfo(structure))
      }
    }
    
    return instances
  }, [structures, getTemplateInstanceInfo])

  const getTemplateInstancesForTemplate = React.useCallback((templateId: string): TemplateInstanceInfo[] => {
    return getAllTemplateInstances().filter(info => 
      info.templateInstance.templateId === templateId
    )
  }, [getAllTemplateInstances])

  const isStructureInTemplateInstance = React.useCallback((
    structureId: string, 
    templateInstanceId: string
  ): boolean => {
    const structure = structures.get(structureId)
    const templateInstance = structures.get(templateInstanceId)
    
    if (!structure || !templateInstance || templateInstance.type !== 'template') {
      return false
    }

    return isPositionInTemplate(structure.startPosition, templateInstance)
  }, [structures])

  const checkIfCellIsOverridden = React.useCallback((
    row: number, 
    col: number, 
    templateInstanceId: string
  ): boolean => {
    const templateInstance = structures.get(templateInstanceId)
    
    if (!templateInstance || templateInstance.type !== 'template') {
      return false
    }

    // Convert absolute position to relative position within template
    const relativeRow = row - templateInstance.startPosition.row
    const relativeCol = col - templateInstance.startPosition.col
    const relativePosition = `${relativeRow}-${relativeCol}`

    return isCellOverridden(templateInstance, relativePosition)
  }, [structures])

  const checkIfStructureIsOverridden = React.useCallback((
    structureId: string, 
    templateInstanceId: string
  ): boolean => {
    const templateInstance = structures.get(templateInstanceId)
    
    if (!templateInstance || templateInstance.type !== 'template') {
      return false
    }

    return isStructureOverridden(templateInstance, structureId)
  }, [structures])

  return {
    getOverrideInfo,
    getTemplateInstanceInfo,
    getAllTemplateInstances,
    getTemplateInstancesForTemplate,
    isStructureInTemplateInstance,
    checkIfCellIsOverridden,
    checkIfStructureIsOverridden
  }
}

/**
 * Hook to provide override status for the currently selected structure/cell
 */
export const useCurrentSelectionOverrideStatus = (
  selectedStructure: Structure | null,
  selectedRange: { start: { row: number, col: number }, end: { row: number, col: number } } | null,
  structures: StructureMap,
  templates: any[]
) => {
  const { 
    checkIfCellIsOverridden, 
    checkIfStructureIsOverridden,
    getAllTemplateInstances 
  } = useTemplateOverrideDetection(structures, templates)

  const currentOverrideStatus = React.useMemo(() => {
    const templateInstances = getAllTemplateInstances()
    
    if (selectedStructure) {
      // Check if selected structure is overridden in any template instance
      for (const instance of templateInstances) {
        if (checkIfStructureIsOverridden(selectedStructure.id, instance.templateInstance.id)) {
          return {
            isOverridden: true,
            templateInstanceId: instance.templateInstance.id,
            type: 'structure' as const
          }
        }
      }
    }

    if (selectedRange && selectedRange.start.row === selectedRange.end.row && 
        selectedRange.start.col === selectedRange.end.col) {
      // Single cell selected - check if it's overridden in any template instance
      const { row, col } = selectedRange.start
      
      for (const instance of templateInstances) {
        if (checkIfCellIsOverridden(row, col, instance.templateInstance.id)) {
          return {
            isOverridden: true,
            templateInstanceId: instance.templateInstance.id,
            type: 'cell' as const
          }
        }
      }
    }

    return {
      isOverridden: false,
      templateInstanceId: null,
      type: null
    }
  }, [selectedStructure, selectedRange, checkIfCellIsOverridden, checkIfStructureIsOverridden, getAllTemplateInstances])

  return currentOverrideStatus
}
