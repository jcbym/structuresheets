import React from 'react'
import { ContextMenuProps } from '../../types'

export const ContextMenu: React.FC<ContextMenuProps> = ({ 
  x, 
  y, 
  onClose, 
  onMergeCells, 
  onUnmergeCells, 
  selectedCell,
  selectedRange,
  selectedStructure,
  setContextMenu,
  getStructureAtPositionSafe,
  updateTableHeaders,
  createStructureFromToolbar,
  rotateArray,
  canMerge, 
  canUnmerge, 
  canCreateStructures
}) => {
  const menuRef = React.useRef<HTMLDivElement>(null)

  const MenuButton: React.FC<{
      onClick?: () => void
      enabled?: boolean
      children: React.ReactNode
    }> = ({ onClick, enabled, children }) => (
      <button
        className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm ${
          enabled ? '' : 'text-gray-400 cursor-not-allowed'
        }`}
        onClick={enabled ? onClick : undefined}
        disabled={!enabled}
      >
        {children}
      </button>
    )

  // Event handlers
  const canAddHeaderLevels = (): boolean => {
    return selectedStructure?.type === 'table'
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
    if (!selectedStructure || selectedStructure.type !== 'table') return
    
    const table = selectedStructure
    const newHeaderRows = (table.headerRows || 1) + 1
    
    updateTableHeaders(
      table.startPosition.row,
      table.startPosition.col,
      true,
      table.hasHeaderCol || false,
      newHeaderRows,
      table.headerCols
    )
    setContextMenu(null)
  }

  const handleAddRowHeaderLevel = () => {
    if (!selectedStructure || selectedStructure.type !== 'table') return
    
    const table = selectedStructure
    const newHeaderCols = (table.headerCols || 1) + 1
    
    updateTableHeaders(
      table.startPosition.row,
      table.startPosition.col,
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

  // Determine what to show based on selection
  const hasMultipleCellsSelected = selectedRange !== null
  const hasTableSelected = selectedStructure?.type === 'table'
  const hasArraySelected = selectedStructure?.type === 'array'

  const renderMultipleCellsMenu = () => (
    <>
      <MenuButton onClick={onMergeCells} enabled={canMerge}>
        Merge Cells
      </MenuButton>
      <MenuButton onClick={onUnmergeCells} enabled={canUnmerge}>
        Unmerge Cells
      </MenuButton>
      <hr className="my-1 border-gray-200" />
      <MenuButton onClick={handleCreateArray} enabled={canCreateStructures}>
        Create Array
      </MenuButton>
      <MenuButton onClick={handleCreateTable} enabled={canCreateStructures}>
        Create Table
      </MenuButton>
    </>
  )

  const renderTableMenu = () => (
    <>
      <MenuButton onClick={handleAddColumnHeaderLevel} enabled={canAddHeaderLevels()}>
        Add Column Header Level
      </MenuButton>
      <MenuButton onClick={handleAddRowHeaderLevel} enabled={canAddHeaderLevels()}>
        Add Row Header Level
      </MenuButton>
    </>
  )

  const renderArrayMenu = () => (
    <>
      <MenuButton 
        onClick={() => {
          if (selectedStructure && selectedStructure.type === 'array') {
            rotateArray(selectedStructure.id)
            setContextMenu(null)
          }
        }}
        enabled={hasArraySelected}
      >
        Rotate Array
      </MenuButton>
    </>
  )

  return (
    <div
      ref={menuRef}
      className="fixed bg-white border border-gray-300 rounded shadow-lg py-1 z-50"
      style={{ left: x, top: y, minWidth: '150px' }}
    >
      {hasMultipleCellsSelected && renderMultipleCellsMenu()}
      {hasTableSelected && renderTableMenu()}
      {hasArraySelected && renderArrayMenu()}
    </div>
  )
}
