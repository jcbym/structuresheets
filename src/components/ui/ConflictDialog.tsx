import React from 'react'
import { Position } from '../../types'

interface ConflictDialogProps {
  isOpen: boolean
  onClose: () => void
  onKeepExisting: () => void
  onReplaceWithNew: () => void
  conflictingCells: Array<{row: number, col: number, existingValue: string, newValue: string}>
  targetPosition: Position
}

export const ConflictDialog: React.FC<ConflictDialogProps> = ({
  isOpen,
  onClose,
  onKeepExisting,
  onReplaceWithNew,
  conflictingCells,
  targetPosition
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">
          Cell Value Conflicts Detected
        </h3>
        
        <p className="text-gray-700 mb-4">
          Moving this structure will overwrite existing cell values. How would you like to resolve the conflicts?
        </p>
        
        <div className="mb-4 max-h-40 overflow-y-auto">
          <h4 className="font-medium text-gray-800 mb-2">Conflicting cells:</h4>
          <div className="space-y-2">
            {conflictingCells.map((conflict, index) => (
              <div key={index} className="text-sm bg-gray-50 p-2 rounded border">
                <div className="font-medium">Cell {String.fromCharCode(65 + conflict.col)}{conflict.row + 1}:</div>
                <div className="text-red-600">Existing: "{conflict.existingValue}"</div>
                <div className="text-blue-600">New: "{conflict.newValue}"</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onKeepExisting}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Keep Existing Values
          </button>
          <button
            onClick={onReplaceWithNew}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Replace with New Values
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
