import React from 'react'
import { ContextMenuProps } from '../../types'

export const ContextMenu: React.FC<ContextMenuProps> = ({ 
  x, 
  y, 
  onClose, 
  onMergeCells, 
  onUnmergeCells, 
  selectedCell,
  setContextMenu,
  getStructureAtPositionSafe,
  updateTableHeaders,
  createStructureFromToolbar,
  canMerge, 
  canUnmerge, 
  canCreateStructures
}) => {
  const menuRef = React.useRef<HTMLDivElement>(null)

  // Event handlers
  const canAddHeaderLevels = (): boolean => {
    if (!selectedCell) return false
    const structure = getStructureAtPositionSafe(selectedCell.row, selectedCell.col)
    return structure?.type === 'table'
  }

  const handleCreateArray = () => {
    createStructureFromToolbar('array')
    setContextMenu(null)
  }

  const handleCreateTable = () => {
    createStructureFromToolbar('table')
    setContextMenu(null)
  }

  const handleAddColumnHeaderLevel = () => {
    if (!selectedCell) return
    const structure = getStructureAtPositionSafe(selectedCell.row, selectedCell.col)
    if (!structure || structure.type !== 'table') return
    
    const table = structure
    const newHeaderRows = (table.headerRows || 1) + 1
    
    updateTableHeaders(
      selectedCell.row,
      selectedCell.col,
      true,
      table.hasHeaderCol || false,
      newHeaderRows,
      table.headerCols
    )
    setContextMenu(null)
  }

  const handleAddRowHeaderLevel = () => {
    if (!selectedCell) return
    const structure = getStructureAtPositionSafe(selectedCell.row, selectedCell.col)
    if (!structure || structure.type !== 'table') return
    
    const table = structure
    const newHeaderCols = (table.headerCols || 1) + 1
    
    updateTableHeaders(
      selectedCell.row,
      selectedCell.col,
      table.hasHeaderRow || false,
      true,
      table.headerRows,
      newHeaderCols
    )
    setContextMenu(null)
  }

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
        onClick={canCreateStructures ? handleCreateArray : undefined}
        disabled={!canCreateStructures}
      >
        Create Array
      </button>
      
      <button
        className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm ${
          !canCreateStructures ? 'text-gray-400 cursor-not-allowed' : ''
        }`}
        onClick={canCreateStructures ? handleCreateTable : undefined}
        disabled={!canCreateStructures}
      >
        Create Table
      </button>
      
      <hr className="my-1 border-gray-200" />
      
      <button
        className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm ${
          !canAddHeaderLevels() ? 'text-gray-400 cursor-not-allowed' : ''
        }`}
        onClick={canAddHeaderLevels() ? handleAddColumnHeaderLevel : undefined}
        disabled={!canAddHeaderLevels()}
      >
        Add Column Header Level
      </button>
      
      <button
        className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm ${
          !canAddHeaderLevels() ? 'text-gray-400 cursor-not-allowed' : ''
        }`}
        onClick={canAddHeaderLevels() ? handleAddRowHeaderLevel : undefined}
        disabled={!canAddHeaderLevels()}
      >
        Add Row Header Level
      </button>
    </div>
  )
}
