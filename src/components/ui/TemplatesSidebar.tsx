import React from 'react'
import { setTemplateDragState, clearTemplateDragState } from '../../utils/templateDragState'

export interface Template {
  id: string
  name: string
  createdAt: Date
  dimensions: {
    rows: number
    cols: number
  }
  version: number // Track template version for change detection
}

export interface TemplatesSidebarProps {
  templates: Template[]
  onCreateTemplate: () => void
  onOpenTemplate: (templateId: string) => void
  onDeleteTemplate: (templateId: string) => void
  isCollapsed: boolean
  width: number
  onToggleCollapse: () => void
  onWidthChange: (width: number) => void
}

export const TemplatesSidebar: React.FC<TemplatesSidebarProps> = ({
  templates,
  onCreateTemplate,
  onOpenTemplate,
  onDeleteTemplate,
  isCollapsed,
  width,
  onToggleCollapse,
  onWidthChange
}) => {
  const [isResizing, setIsResizing] = React.useState(false)
  const [startX, setStartX] = React.useState(0)
  const [startWidth, setStartWidth] = React.useState(0)
  const [draggedTemplate, setDraggedTemplate] = React.useState<Template | null>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    setStartX(e.clientX)
    setStartWidth(width)
  }

  const handleTemplateDragStart = (e: React.DragEvent, template: Template) => {
    setDraggedTemplate(template)
    
    // Store complete template data in the drag event
    e.dataTransfer.setData('application/template', JSON.stringify({
      templateId: template.id,
      name: template.name,
      dimensions: template.dimensions,
      createdAt: template.createdAt.toISOString()
    }))
    
    // Set drag effect
    e.dataTransfer.effectAllowed = 'copy'
    
    // Create a custom drag image (optional)
    e.dataTransfer.setDragImage(e.currentTarget as HTMLElement, 10, 10)
    
    // Set shared drag state so the grid can access real template dimensions
    setTemplateDragState({
      isDragging: true,
      templateData: {
        templateId: template.id,
        name: template.name,
        dimensions: template.dimensions
      }
    })
  }

  const handleTemplateDragEnd = () => {
    setDraggedTemplate(null)
    // Clear shared drag state
    clearTemplateDragState()
  }

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      
      const deltaX = e.clientX - startX
      const newWidth = startWidth + deltaX
      onWidthChange(Math.max(200, Math.min(600, newWidth))) // Min 200px, max 600px
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, startX, startWidth, onWidthChange])

  if (isCollapsed) {
    return (
      <div className="flex-shrink-0 relative">
        {/* Collapsed state - just a thin bar with toggle button */}
        <div className="h-full w-8 bg-white border-r border-gray-300 flex flex-col items-center py-4">
          <button
            onClick={onToggleCollapse}
            className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="Expand Templates Panel"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10 2l-6 6 6 6V2z"/>
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-shrink-0 relative">
      {/* Panel content */}
      <div 
        className="h-full bg-white border-r border-gray-300 flex flex-col relative"
        style={{ width: `${width}px` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            <h3 className="font-semibold text-gray-800">Templates</h3>
            <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {templates.length}
            </span>
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="Collapse Templates Panel"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 2l6 6-6 6V2z"/>
            </svg>
          </button>
        </div>

        {/* Create Template Button */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={onCreateTemplate}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="mr-2">
              <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2Z"/>
            </svg>
            Create Template
          </button>
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto">
          {templates.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <div className="mb-4">
                <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor" className="mx-auto text-gray-400">
                  <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z"/>
                  <path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-1v1a.5.5 0 0 1-1 0V6h-.5a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-1v1a.5.5 0 0 1-1 0V9h-.5a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-1v1a.5.5 0 0 1-1 0v-1h-.5a.5.5 0 0 1 0-1H1z"/>
                </svg>
              </div>
              <p className="text-sm">No templates yet</p>
              <p className="text-xs mt-1">Click "Create Template" to get started</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`group bg-gray-50 hover:bg-gray-100 rounded-lg p-3 cursor-pointer transition-colors border border-transparent hover:border-gray-200 ${
                    draggedTemplate?.id === template.id ? 'opacity-50' : ''
                  }`}
                  draggable
                  onDragStart={(e) => handleTemplateDragStart(e, template)}
                  onDragEnd={handleTemplateDragEnd}
                  onClick={() => onOpenTemplate(template.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {template.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {template.dimensions.rows} × {template.dimensions.cols} cells
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {template.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteTemplate(template.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all"
                      title="Delete Template"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                        <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize bg-transparent hover:bg-blue-500 transition-colors z-10"
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}
