import React from 'react'
import { ContextMenuProps } from '../../types'

export const ContextMenu: React.FC<ContextMenuProps> = ({ 
  x, 
  y, 
  onClose, 
  onMergeCells, 
  onUnmergeCells, 
  onCreateArray, 
  onCreateTable, 
  onAddColumnHeaderLevel, 
  onAddRowHeaderLevel, 
  canMerge, 
  canUnmerge, 
  canCreateStructures, 
  canAddHeaderLevels 
}) => {
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="fixed bg-white border border-gray-300 rounded shadow-lg py-1 z-50"
      style={{ left: x, top: y, minWidth: '150px' }}
    >
      <button
        className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm ${
          !canMerge ? 'text-gray-400 cursor-not-allowed' : ''
        }`}
        onClick={canMerge ? onMergeCells : undefined}
        disabled={!canMerge}
      >
        Merge Cells
      </button>
      <button
        className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm ${
          !canUnmerge ? 'text-gray-400 cursor-not-allowed' : ''
        }`}
        onClick={canUnmerge ? onUnmergeCells : undefined}
        disabled={!canUnmerge}
      >
        Unmerge Cells
      </button>
      
      <hr className="my-1 border-gray-200" />
      
      <button
        className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm ${
          !canCreateStructures ? 'text-gray-400 cursor-not-allowed' : ''
        }`}
        onClick={canCreateStructures ? onCreateArray : undefined}
        disabled={!canCreateStructures}
      >
        Create Array
      </button>
      
      <button
        className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm ${
          !canCreateStructures ? 'text-gray-400 cursor-not-allowed' : ''
        }`}
        onClick={canCreateStructures ? onCreateTable : undefined}
        disabled={!canCreateStructures}
      >
        Create Table
      </button>
      
      <hr className="my-1 border-gray-200" />
      
      <button
        className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm ${
          !canAddHeaderLevels ? 'text-gray-400 cursor-not-allowed' : ''
        }`}
        onClick={canAddHeaderLevels ? onAddColumnHeaderLevel : undefined}
        disabled={!canAddHeaderLevels}
      >
        Add Column Header Level
      </button>
      
      <button
        className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm ${
          !canAddHeaderLevels ? 'text-gray-400 cursor-not-allowed' : ''
        }`}
        onClick={canAddHeaderLevels ? onAddRowHeaderLevel : undefined}
        disabled={!canAddHeaderLevels}
      >
        Add Row Header Level
      </button>
    </div>
  )
}
