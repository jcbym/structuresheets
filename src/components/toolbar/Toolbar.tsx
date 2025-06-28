import React from 'react'
import { ToolbarProps } from '../../types'

export const Toolbar: React.FC<ToolbarProps> = ({ 
  selectedCell, 
  selectedRange, 
  onCreateStructure 
}) => {
  const getSelectionInfo = () => {
    if (selectedRange) {
      const minRow = Math.min(selectedRange.start.row, selectedRange.end.row)
      const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row)
      const minCol = Math.min(selectedRange.start.col, selectedRange.end.col)
      const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col)
      const rows = maxRow - minRow + 1
      const cols = maxCol - minCol + 1
      return { rows, cols, isRange: true }
    } else if (selectedCell) {
      return { rows: 1, cols: 1, isRange: false }
    }
    return null
  }

  const selectionInfo = getSelectionInfo()
  const hasSelection = selectedCell || selectedRange

  return (
    <div className="bg-white border-b border-gray-300 p-2 flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Create Structure:</span>
      
      <button
        onClick={() => onCreateStructure('cell')}
        disabled={!hasSelection}
        className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
      >
        Cell
      </button>
      
      <button
        onClick={() => onCreateStructure('array')}
        disabled={!hasSelection}
        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
      >
        Array
      </button>
      
      <button
        onClick={() => onCreateStructure('table')}
        disabled={!hasSelection}
        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
      >
        Table
      </button>

      {selectionInfo && (
        <span className="text-sm text-gray-600 ml-4">
          {selectionInfo.isRange 
            ? `Selection: ${selectionInfo.rows} × ${selectionInfo.cols} cells`
            : ''
          }
        </span>
      )}
    </div>
  )
}
