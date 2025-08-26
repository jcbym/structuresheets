import { Template } from '../components/ui/TemplatesSidebar'
import { StructureMap } from '../types'

const TEMPLATES_STORAGE_KEY = 'structuresheets-templates'
const TEMPLATE_DATA_STORAGE_KEY = 'structuresheets-template-data'

export interface TemplateData {
  [templateId: string]: {
    structures: Array<[string, any]> // Serialized StructureMap
    cellData: { [position: string]: string } // Cell values by position
  }
}

export const saveTemplates = (templates: Template[]) => {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates))
  } catch (error) {
    console.error('Failed to save templates:', error)
  }
}

export const loadTemplates = (): Template[] => {
  try {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY)
    if (stored) {
      const templates = JSON.parse(stored)
      // Convert date strings back to Date objects and ensure version is set
      return templates.map((template: any) => ({
        ...template,
        createdAt: new Date(template.createdAt),
        version: template.version || 1 // Ensure existing templates have version 1
      }))
    }
  } catch (error) {
    console.error('Failed to load templates:', error)
  }
  return []
}

export const saveTemplateData = (templateId: string, structures: StructureMap, cellData: { [position: string]: string }) => {
  try {
    const existingData = loadTemplateData()
    
    // Convert StructureMap to serializable format
    const structuresArray = Array.from(structures.entries())
    
    existingData[templateId] = {
      structures: structuresArray,
      cellData
    }
    
    localStorage.setItem(TEMPLATE_DATA_STORAGE_KEY, JSON.stringify(existingData))
  } catch (error) {
    console.error('Failed to save template data:', error)
  }
}

export const loadTemplateData = (): TemplateData => {
  try {
    const stored = localStorage.getItem(TEMPLATE_DATA_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load template data:', error)
  }
  return {}
}

export const getTemplateStructures = (templateId: string): StructureMap => {
  const data = loadTemplateData()
  const templateData = data[templateId]
  
  if (templateData && templateData.structures) {
    // Convert back to StructureMap
    return new Map(templateData.structures)
  }
  
  return new Map()
}

export const getTemplateCellData = (templateId: string): { [position: string]: string } => {
  const data = loadTemplateData()
  const templateData = data[templateId]
  
  if (templateData && templateData.cellData) {
    return templateData.cellData
  }
  
  return {}
}

export const deleteTemplateData = (templateId: string) => {
  try {
    const existingData = loadTemplateData()
    delete existingData[templateId]
    localStorage.setItem(TEMPLATE_DATA_STORAGE_KEY, JSON.stringify(existingData))
  } catch (error) {
    console.error('Failed to delete template data:', error)
  }
}
