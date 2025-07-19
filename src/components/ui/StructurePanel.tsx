import React from 'react'
import { StructurePanelProps, Table } from '../../types'
import { COLUMN_LETTERS } from '../../constants'

// Name input component for structures without names
const NameInput: React.FC<{
  structureId: string
  onUpdateName: (structureId: string, name: string) => void
  placeholder: string
}> = ({ structureId, onUpdateName, placeholder }) => {
  const [name, setName] = React.useState('')
  const [isFocused, setIsFocused] = React.useState(true)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    // Auto-focus the input when component mounts
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleSubmit = () => {
    if (name.trim()) {
      onUpdateName(structureId, name.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setName('')
      if (inputRef.current) {
        inputRef.current.blur()
      }
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
    if (name.trim()) {
      handleSubmit()
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={() => setIsFocused(true)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border-2 border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50"
      />
      {isFocused && (
        <div className="absolute -bottom-6 left-0 text-xs text-gray-500">
          Press Enter to save, Esc to cancel
        </div>
      )}
    </div>
  )
}

export const StructurePanel: React.FC<StructurePanelProps> = ({ 
  structures, 
  selectedStructure, 
  selectedColumn,
  expandedTableColumns,
  onUpdateTableHeaders,
  onSelectColumn,
  onToggleTableColumns,
  onUpdateStructureName,
  isCollapsed,
  width,
  onToggleCollapse,
  onWidthChange
}) => {
  const [isResizing, setIsResizing] = React.useState(false)
  const [startX, setStartX] = React.useState(0)
  const [startWidth, setStartWidth] = React.useState(0)
  const [isEditingName, setIsEditingName] = React.useState(false)
  const [editingNameValue, setEditingNameValue] = React.useState('')

  // Get the current structure from the structures map to ensure we have the latest version
  const currentStructure = React.useMemo(() => {
    if (!selectedStructure) return null
    
    // Fetch the latest version from the structures map
    return structures.get(selectedStructure.id) || selectedStructure
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-baseline flex-1 mr-2">
                  {isEditingName ? (
                    <input
                      type="text"
                      value={editingNameValue}
                      onChange={(e) => setEditingNameValue(e.target.value)}
                      onBlur={() => {
                        const trimmedName = editingNameValue.trim()
                        // Always call update if the name changed, including when deleting (empty string)
                        if (trimmedName !== (currentStructure.name || '')) {
                          // Pass empty string to delete the name, or the new name to set it
                          onUpdateStructureName(currentStructure.id, trimmedName || '')
                        }
                        setIsEditingName(false)
                        setEditingNameValue('')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const trimmedName = editingNameValue.trim()
                          // Always call update if the name changed, including when deleting (empty string)
                          if (trimmedName !== (currentStructure.name || '')) {
                            // Pass empty string to delete the name, or the new name to set it
                            onUpdateStructureName(currentStructure.id, trimmedName || '')
                          }
                          setIsEditingName(false)
                          setEditingNameValue('')
                        } else if (e.key === 'Escape') {
                          e.preventDefault()
                          setIsEditingName(false)
                          setEditingNameValue('')
                        }
                      }}
                      autoFocus
                      placeholder={`Enter ${currentStructure.type} name`}
                      className="font-bold text-lg bg-transparent border-b-2 border-blue-500 outline-none focus:border-blue-600 min-w-0 flex-1"
                    />
                  ) : (
                    <>
                      {currentStructure.name ? (
                        <h3 
                          className="font-bold text-lg mr-2 cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => {
                            setIsEditingName(true)
                            setEditingNameValue(currentStructure.name || '')
                          }}
                          title="Click to edit name"
                        >
                          {currentStructure.name}
                        </h3>
                      ) : (
                        <h3 
                          className="font-bold text-lg mr-2 cursor-pointer hover:text-blue-600 transition-colors italic text-gray-500"
                          onClick={() => {
                            setIsEditingName(true)
                            setEditingNameValue('')
                          }}
                          title="Click to add name"
                        >
                          Add {currentStructure.type} name
                        </h3>
                      )}
                      <span className="text-sm text-gray-500 capitalize">({currentStructure.type})</span>
                    </>
                  )}
                </div>
                <button
                  onClick={onToggleCollapse}
                  className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                  title="Collapse Structure Panel"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M10 2L4 8l6 6V2z"/>
                  </svg>
                </button>
              </div>

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
                          currentStructure.startPosition.row,
                          currentStructure.startPosition.col,
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
                            currentStructure.startPosition.row,
                            currentStructure.startPosition.col,
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
                          currentStructure.startPosition.row,
                          currentStructure.startPosition.col,
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
                            currentStructure.startPosition.row,
                            currentStructure.startPosition.col,
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
                      onClick={() => onToggleTableColumns(tableStructure.id)}
                      className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {expandedTableColumns.has(tableStructure.id) ? '▼' : '▶'}
                    </button>
                  </div>
                  
                  {expandedTableColumns.has(tableStructure.id) && (
                    <div className="space-y-1 ml-4 max-h-40 overflow-y-auto">
                      {Array.from({ length: tableStructure.dimensions.cols }, (_, index) => {
                        const columnIndex = tableStructure.startPosition.col + index
                        const columnLetter = COLUMN_LETTERS[columnIndex]
                        const isSelected = selectedColumn?.tableId === tableStructure.id &&
                                         selectedColumn?.columnIndex === index
                        
                        return (
                          <div
                            key={index}
                            className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                              isSelected ? 'bg-green-100 border border-green-300' : 'hover:bg-gray-50'
                            }`}
                            onClick={() => onSelectColumn(tableStructure.id, index)}
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
