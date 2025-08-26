import React from 'react'
import { Template } from '../ui/TemplatesSidebar'
import { getColumnPosition, getRowPosition, getColumnWidth, getRowHeight } from '../../utils/sheetUtils'
import { Z_INDEX } from '../../constants'

interface TemplateBoundaryProps {
  template: Template
  onUpdateTemplate: (templateId: string, updates: Partial<Template>) => void
  columnWidths: Map<number, number>
  rowHeights: Map<number, number>
  startRow: number
  endRow: number
  startCol: number
  endCol: number
}

export const TemplateBoundary: React.FC<TemplateBoundaryProps> = ({
  template,
  onUpdateTemplate,
  columnWidths,
  rowHeights,
  startRow,
  endRow,
  startCol,
  endCol
}) => {
  const [isResizing, setIsResizing] = React.useState(false)
  const [resizeDirection, setResizeDirection] = React.useState<'right' | 'bottom' | 'corner' | null>(null)
  const [startDimensions, setStartDimensions] = React.useState({ rows: 0, cols: 0 })
  const [startMousePos, setStartMousePos] = React.useState({ x: 0, y: 0 })

  // Template bounds (always starting at 0,0 for template editing)
  const templateStartPos = { row: 0, col: 0 }
  const templateEndPos = { 
    row: template.dimensions.rows - 1, 
    col: template.dimensions.cols - 1 
  }

  // Check if template is visible in current viewport
  const isVisible = (
    templateEndPos.row >= startRow &&
    templateStartPos.row < endRow &&
    templateEndPos.col >= startCol &&
    templateStartPos.col < endCol
  )

  if (!isVisible) return null

  // Calculate layout using existing grid utilities
  const left = getColumnPosition(templateStartPos.col, columnWidths)
  const top = getRowPosition(templateStartPos.row, rowHeights)
  
  let width = 0
  for (let c = templateStartPos.col; c <= templateEndPos.col; c++) {
    width += getColumnWidth(c, columnWidths)
  }
  
  let height = 0
  for (let r = templateStartPos.row; r <= templateEndPos.row; r++) {
    height += getRowHeight(r, rowHeights)
  }

  const handleMouseDown = (e: React.MouseEvent, direction: 'right' | 'bottom' | 'corner') => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsResizing(true)
    setResizeDirection(direction)
    setStartDimensions({ rows: template.dimensions.rows, cols: template.dimensions.cols })
    setStartMousePos({ x: e.clientX, y: e.clientY })
  }

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizeDirection) return

      const deltaX = e.clientX - startMousePos.x
      const deltaY = e.clientY - startMousePos.y
      
      // Calculate cell delta based on column/row sizes
      let colsDelta = 0
      let rowsDelta = 0
      
      if (resizeDirection === 'right' || resizeDirection === 'corner') {
        let accumulatedWidth = 0
        let targetCol = templateStartPos.col + startDimensions.cols - 1
        
        for (let c = templateStartPos.col + startDimensions.cols; accumulatedWidth < deltaX; c++) {
          const colWidth = getColumnWidth(c, columnWidths)
          if (accumulatedWidth + colWidth <= deltaX) {
            colsDelta++
            accumulatedWidth += colWidth
            targetCol = c
          } else {
            break
          }
        }
        
        if (deltaX < 0) {
          let accumulatedWidth = 0
          for (let c = templateStartPos.col + startDimensions.cols - 1; c >= templateStartPos.col && accumulatedWidth > deltaX; c--) {
            const colWidth = getColumnWidth(c, columnWidths)
            if (accumulatedWidth - colWidth >= deltaX) {
              colsDelta--
              accumulatedWidth -= colWidth
            } else {
              break
            }
          }
        }
      }
      
      if (resizeDirection === 'bottom' || resizeDirection === 'corner') {
        let accumulatedHeight = 0
        
        for (let r = templateStartPos.row + startDimensions.rows; accumulatedHeight < deltaY; r++) {
          const rowHeight = getRowHeight(r, rowHeights)
          if (accumulatedHeight + rowHeight <= deltaY) {
            rowsDelta++
            accumulatedHeight += rowHeight
          } else {
            break
          }
        }
        
        if (deltaY < 0) {
          let accumulatedHeight = 0
          for (let r = templateStartPos.row + startDimensions.rows - 1; r >= templateStartPos.row && accumulatedHeight > deltaY; r--) {
            const rowHeight = getRowHeight(r, rowHeights)
            if (accumulatedHeight - rowHeight >= deltaY) {
              rowsDelta--
              accumulatedHeight -= rowHeight
            } else {
              break
            }
          }
        }
      }

      const newCols = Math.max(1, startDimensions.cols + colsDelta)
      const newRows = Math.max(1, startDimensions.rows + rowsDelta)

      if (newCols !== template.dimensions.cols || newRows !== template.dimensions.rows) {
        onUpdateTemplate(template.id, {
          dimensions: { rows: newRows, cols: newCols }
        })
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      setResizeDirection(null)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = resizeDirection === 'corner' ? 'nw-resize' : 
                                  resizeDirection === 'right' ? 'ew-resize' : 'ns-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, resizeDirection, startMousePos, startDimensions, template, onUpdateTemplate, columnWidths, rowHeights, templateStartPos.col, templateStartPos.row])

  const borderColor = 'border-purple-600'
  const borderWidth = 'border-3'
  const edgeWidth = 4

  return (
    <>
      {/* Main border overlay - similar to table structure */}
      <div
        className={`absolute ${borderWidth} ${borderColor} pointer-events-none`}
        style={{
          left,
          top,
          width,
          height,
          zIndex: Z_INDEX.STRUCTURE_OVERLAY
        }}
        title={`Template: ${template.name}`}
      />

      {/* Resize handles */}
      {/* Right edge resize area */}
      <div
        className="absolute cursor-ew-resize"
        style={{
          left: left + width - edgeWidth,
          top,
          width: edgeWidth,
          height,
          zIndex: Z_INDEX.STRUCTURE_RESIZE_HANDLE,
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'right')}
        title="Resize horizontally"
      />

      {/* Bottom edge resize area */}
      <div
        className="absolute cursor-ns-resize"
        style={{
          left,
          top: top + height - edgeWidth,
          width,
          height: edgeWidth,
          zIndex: Z_INDEX.STRUCTURE_RESIZE_HANDLE,
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'bottom')}
        title="Resize vertically"
      />

      {/* Corner resize area */}
      <div
        className="absolute cursor-nw-resize"
        style={{
          left: left + width - edgeWidth,
          top: top + height - edgeWidth,
          width: edgeWidth,
          height: edgeWidth,
          zIndex: Z_INDEX.STRUCTURE_RESIZE_HANDLE + 1,
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'corner')}
        title="Resize both directions"
      />
    </>
  )
}
