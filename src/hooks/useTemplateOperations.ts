import React from 'react'
import { Template } from '../components/ui/TemplatesSidebar'
import { StructureMap, PositionMap, Position, Structure } from '../types'
import { 
  saveTemplates, 
  loadTemplates, 
  saveTemplateData, 
  getTemplateStructures, 
  deleteTemplateData 
} from '../utils/templateStorage'
import { propagateTemplateChanges } from '../utils/templatePropagation'

export const useTemplateOperations = (
  templates: Template[],
  setTemplates: React.Dispatch<React.SetStateAction<Template[]>>,
  setIsEditingTemplate: React.Dispatch<React.SetStateAction<boolean>>,
  setCurrentTemplate: React.Dispatch<React.SetStateAction<Template | null>>,
  setTemplateStructures: React.Dispatch<React.SetStateAction<StructureMap>>,
  setTemplatePositions: React.Dispatch<React.SetStateAction<PositionMap>>,
  setScrollTop: React.Dispatch<React.SetStateAction<number>>,
  setScrollLeft: React.Dispatch<React.SetStateAction<number>>,
  setSelectedRange: React.Dispatch<React.SetStateAction<{start: Position, end: Position} | null>>,
  setSelectedStructure: React.Dispatch<React.SetStateAction<Structure | null>>,
  // Additional parameters for propagation support
  structures?: StructureMap,
  positions?: PositionMap,
  setStructures?: React.Dispatch<React.SetStateAction<StructureMap>>,
  setPositions?: React.Dispatch<React.SetStateAction<PositionMap>>,
  onCellUpdate?: (row: number, col: number, value: string) => void
) => {
  
  const createTemplate = React.useCallback(() => {
    const newTemplate: Template = {
      id: `template-${Date.now()}`,
      name: `Template ${templates.length + 1}`,
      createdAt: new Date(),
      dimensions: {
        rows: 10,
        cols: 8
      },
      version: 1
    }
    
    // Add to templates list and save
    const newTemplates = [...templates, newTemplate]
    setTemplates(newTemplates)
    saveTemplates(newTemplates)
    
    // Enter template editing mode
    setCurrentTemplate(newTemplate)
    setIsEditingTemplate(true)
    
    // Reset viewport to top-left for fresh template
    setScrollTop(0)
    setScrollLeft(0)
    
    // Clear any selections
    setSelectedRange(null)
    setSelectedStructure(null)
    
    // Initialize empty template structures and positions
    setTemplateStructures(new Map())
    setTemplatePositions(new Map())
  }, [templates, setTemplates, setCurrentTemplate, setIsEditingTemplate, setTemplateStructures, setTemplatePositions, setScrollTop, setScrollLeft, setSelectedRange, setSelectedStructure])

  const openTemplate = React.useCallback((templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return
    
    setCurrentTemplate(template)
    setIsEditingTemplate(true)
    
    // Reset viewport to top-left for template editing
    setScrollTop(0)
    setScrollLeft(0)
    
    // Clear any selections
    setSelectedRange(null)
    setSelectedStructure(null)
    
    // Load template structures from storage
    const storedStructures = getTemplateStructures(templateId)
    setTemplateStructures(storedStructures)
    setTemplatePositions(new Map()) // Will be rebuilt automatically
  }, [templates, setCurrentTemplate, setIsEditingTemplate, setTemplateStructures, setTemplatePositions, setScrollTop, setScrollLeft, setSelectedRange, setSelectedStructure])

  const closeTemplate = React.useCallback(() => {
    // This will be called from the component with the current state
    setIsEditingTemplate(false)
    setCurrentTemplate(null)
    setTemplateStructures(new Map())
    setTemplatePositions(new Map())
  }, [setIsEditingTemplate, setCurrentTemplate, setTemplateStructures, setTemplatePositions])

  const saveTemplate = React.useCallback((
    currentTemplate: Template | null,
    templateStructures: StructureMap
  ) => {
    // Save template data
    if (currentTemplate) {
      saveTemplateData(currentTemplate.id, templateStructures, {})
    }
  }, [])

  const saveTemplateWithPropagation = React.useCallback((
    currentTemplate: Template | null,
    templateStructures: StructureMap,
    templateCellData: { [position: string]: string } = {}
  ) => {
    if (!currentTemplate || !structures || !positions || !setStructures || !setPositions || !onCellUpdate) {
      // Fallback to regular save if propagation dependencies are not available
      return saveTemplate(currentTemplate, templateStructures)
    }

    // Increment template version
    const updatedTemplate: Template = {
      ...currentTemplate,
      version: currentTemplate.version + 1
    }

    // Update template in list
    const newTemplates = templates.map(template => 
      template.id === currentTemplate.id 
        ? updatedTemplate
        : template
    )
    setTemplates(newTemplates)
    saveTemplates(newTemplates)

    // Save template data
    saveTemplateData(currentTemplate.id, templateStructures, templateCellData)

    // Update current template reference
    setCurrentTemplate(updatedTemplate)

    // Propagate changes to all instances
    const propagationResult = propagateTemplateChanges(
      updatedTemplate,
      structures,
      positions,
      onCellUpdate
    )

    // Update main spreadsheet structures and positions
    setStructures(propagationResult.updatedStructures)
    setPositions(propagationResult.updatedPositions)

    // Log propagation results for debugging
    if (propagationResult.conflicts.length > 0) {
      console.log('Template propagation conflicts:', propagationResult.conflicts)
    }

    return propagationResult
  }, [
    templates,
    setTemplates,
    setCurrentTemplate,
    saveTemplate,
    structures,
    positions,
    setStructures,
    setPositions,
    onCellUpdate
  ])

  const deleteTemplate = React.useCallback((templateId: string) => {
    const newTemplates = templates.filter(t => t.id !== templateId)
    setTemplates(newTemplates)
    saveTemplates(newTemplates)
    
    // Delete template data from storage
    deleteTemplateData(templateId)
    
    // If we're currently editing this template, close it
    setCurrentTemplate(current => {
      if (current?.id === templateId) {
        setIsEditingTemplate(false)
        setTemplateStructures(new Map())
        setTemplatePositions(new Map())
        return null
      }
      return current
    })
  }, [templates, setTemplates, setCurrentTemplate, setIsEditingTemplate, setTemplateStructures, setTemplatePositions])

  const updateTemplate = React.useCallback((templateId: string, updates: Partial<Template>) => {
    const newTemplates = templates.map(template => 
      template.id === templateId 
        ? { ...template, ...updates }
        : template
    )
    setTemplates(newTemplates)
    saveTemplates(newTemplates)
    
    // Update current template if it matches
    setCurrentTemplate(current => 
      current?.id === templateId 
        ? { ...current, ...updates }
        : current
    )
  }, [templates, setTemplates, setCurrentTemplate])

  // Load templates on mount
  React.useEffect(() => {
    const loadedTemplates = loadTemplates()
    if (loadedTemplates.length > 0) {
      setTemplates(loadedTemplates)
    }
  }, [setTemplates])

  return {
    createTemplate,
    openTemplate,
    closeTemplate,
    saveTemplate,
    saveTemplateWithPropagation,
    deleteTemplate,
    updateTemplate
  }
}
