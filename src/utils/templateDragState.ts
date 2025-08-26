// Shared state for template drag operations
interface TemplateDragState {
  isDragging: boolean
  templateData: {
    templateId: string
    name: string
    dimensions: { rows: number, cols: number }
  } | null
}

let currentDragState: TemplateDragState = {
  isDragging: false,
  templateData: null
}

export const setTemplateDragState = (state: TemplateDragState) => {
  currentDragState = state
}

export const getTemplateDragState = (): TemplateDragState => {
  return currentDragState
}

export const clearTemplateDragState = () => {
  currentDragState = {
    isDragging: false,
    templateData: null
  }
}
