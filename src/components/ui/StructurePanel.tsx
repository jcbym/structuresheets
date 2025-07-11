import React from 'react'
import { StructurePanelProps, Table } from '../../types'
import { COLUMN_LETTERS } from '../../constants'

export const StructurePanel: React.FC<StructurePanelProps> = ({ 
  structures, 
  selectedStructure, 
  selectedColumn,
  expandedTableColumns,
  onUpdateTableHeaders,
  onSelectColumn,
  onToggleTableColumns,
  isCollapsed,
  width,
  onToggleCollapse,
  onWidthChange
}) => {
  const [isResizing, setIsResizing] = React.useState(false)
  const [startX, setStartX] = React.useState(0)
  const [startWidth, setStartWidth] = React.useState(0)

  // Get the current structure from the structures map to ensure we have the latest version
  const currentStructure = React.useMemo(() => {
    if (!selectedStructure) return null
    
    // Get the structure key and fetch the latest version from the structures map
    const structureKey = `struct-${selectedStructure.position.row}-${selectedStructure.position.col}`
    return structures.get(structureKey) || selectedStructure
  }, [selectedStructure, structures])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    setStartX(e.clientX)
    setStartWidth(width)
  }

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      
      const deltaX = startX - e.clientX // Subtract because we're dragging from the right
      const newWidth = startWidth + deltaX
      onWidthChange(newWidth)
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

  if (currentStructure && isCollapsed) {
    return (
      <div className="flex-shrink-0 relative">
        {/* Collapsed state - just a thin bar with toggle button */}
        <div className="h-full w-8 bg-white border-l border-gray-300 flex flex-col items-center py-4">
          <button
            onClick={onToggleCollapse}
            className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="Expand Structure Panel"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 2l6 6-6 6V2z"/>
            </svg>
          </button>
        </div>
      </div>
    )
  }

  const tableStructure = currentStructure?.type === 'table' ? currentStructure as Table : null

  return currentStructure && (
    <div className="flex-shrink-0 relative">
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize bg-transparent hover:bg-blue-500 transition-colors z-10"
        onMouseDown={handleMouseDown}
      />
      
      {/* Panel content */}
      <div 
        className="h-full bg-white border-l border-gray-300 flex flex-col relative"
        style={{ width: `${width}px` }}
      >
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          {
            <>
              {/* Structure title */}
              {currentStructure.name ? (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-baseline">
                    <h3 className="font-bold text-lg mr-2">{currentStructure.name}</h3>
                    <span className="text-sm text-gray-500 capitalize">({currentStructure.type})</span>
                  </div>
                  <button
                    onClick={onToggleCollapse}
                    className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                    title="Collapse Structure Panel"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M10 2L4 8l6 6V2z"/>
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg capitalize">{currentStructure.type}</h3>
                  <button
                    onClick={onToggleCollapse}
                    className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                    title="Collapse Structure Panel"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M10 2L4 8l6 6V2z"/>
                    </svg>
                  </button>
                </div>
              )}

              {/* Table Header Options */}
              {tableStructure && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 text-gray-700">Headers</h4>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={tableStructure.hasHeaderRow || false}
                        onChange={(e) => onUpdateTableHeaders(
                          currentStructure.position.row,
                          currentStructure.position.col,
                          e.target.checked,
                          tableStructure.hasHeaderCol || false,
                          tableStructure.headerRows,
                          tableStructure.headerCols
                        )}
                        className="rounded"
                      />
                      <span className="text-sm">Column headers</span>
                    </label>
                    
                    {tableStructure.hasHeaderRow && (
                      <div className="ml-6 flex items-center space-x-2">
                        <label className="text-xs text-gray-600">Levels:</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={tableStructure.headerRows || 1}
                          onChange={(e) => onUpdateTableHeaders(
                            currentStructure.position.row,
                            currentStructure.position.col,
                            tableStructure.hasHeaderRow || false,
                            tableStructure.hasHeaderCol || false,
                            parseInt(e.target.value) || 1,
                            tableStructure.headerCols
                          )}
                          className="w-16 px-2 py-1 text-xs border rounded"
                        />
                      </div>
                    )}
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={tableStructure.hasHeaderCol || false}
                        onChange={(e) => onUpdateTableHeaders(
                          currentStructure.position.row,
                          currentStructure.position.col,
                          tableStructure.hasHeaderRow || false,
                          e.target.checked,
                          tableStructure.headerRows,
                          tableStructure.headerCols
                        )}
                        className="rounded"
                      />
                      <span className="text-sm">Row headers</span>
                    </label>
                    
                    {tableStructure.hasHeaderCol && (
                      <div className="ml-6 flex items-center space-x-2">
                        <label className="text-xs text-gray-600">Levels:</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={tableStructure.headerCols || 1}
                          onChange={(e) => onUpdateTableHeaders(
                            currentStructure.position.row,
                            currentStructure.position.col,
                            tableStructure.hasHeaderRow || false,
                            tableStructure.hasHeaderCol || false,
                            tableStructure.headerRows,
                            parseInt(e.target.value) || 1
                          )}
                          className="w-16 px-2 py-1 text-xs border rounded"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Table Columns Section */}
              {tableStructure && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-700">Columns</h4>
                    <button
                      onClick={() => onToggleTableColumns(`struct-${tableStructure.position.row}-${tableStructure.position.col}`)}
                      className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {expandedTableColumns.has(`struct-${tableStructure.position.row}-${tableStructure.position.col}`) ? '▼' : '▶'}
                    </button>
                  </div>
                  
                  {expandedTableColumns.has(`struct-${tableStructure.position.row}-${tableStructure.position.col}`) && (
                    <div className="space-y-1 ml-4 max-h-40 overflow-y-auto">
                      {Array.from({ length: tableStructure.dimensions.cols }, (_, index) => {
                        const columnIndex = tableStructure.startPosition.col + index
                        const columnLetter = COLUMN_LETTERS[columnIndex]
                        const isSelected = selectedColumn?.tablePosition.row === tableStructure.position.row &&
                                         selectedColumn?.tablePosition.col === tableStructure.position.col &&
                                         selectedColumn?.columnIndex === index
                        
                        return (
                          <div
                            key={index}
                            className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                              isSelected ? 'bg-green-100 border border-green-300' : 'hover:bg-gray-50'
                            }`}
                            onClick={() => onSelectColumn(tableStructure.position, index)}
                          >
                            <span className="text-xs text-gray-500">▪</span>
                            <span className="text-sm font-mono">{columnLetter}</span>
                            <span className="text-xs text-gray-500">Column {index + 1}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Formula Section */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3 text-gray-700">Formula</h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Enter formula"
                    value={""} // placeholder
                    onChange={() => ""} 
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Constraints Section */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3 text-gray-700">Constraints</h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Enter constraints"
                    value={""} // placeholder
                    onChange={() => ""} 
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </>
          }
        </div>
      </div>
    </div>
  )
}
