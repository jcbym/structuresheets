import React from 'react'
import { StructurePanelProps, Table } from '../../types'

export const StructurePanel: React.FC<StructurePanelProps> = ({ 
  structures, 
  selectedStructure, 
  onCreateStructure, 
  onUpdateTableHeaders 
}) => {
  const [structureType, setStructureType] = React.useState<'cell' | 'array' | 'table'>('cell')
  const [structureName, setStructureName] = React.useState('')
  const [arrayRows, setArrayRows] = React.useState(1)
  const [arrayCols, setArrayCols] = React.useState(1)

  if (selectedStructure) {
    const tableStructure = selectedStructure.type === 'table' ? selectedStructure as Table : null
    
    return (
      <div className="h-full bg-white border-l border-gray-300 p-4 flex flex-col w-80">
        <h3 className="font-bold mb-4 text-lg">{selectedStructure.type}</h3>

        {/* Table Header Options */}
        {tableStructure && (
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Headers</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={tableStructure.hasHeaderRow || false}
                  onChange={(e) => onUpdateTableHeaders(
                    selectedStructure.position.row,
                    selectedStructure.position.col,
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
                      selectedStructure.position.row,
                      selectedStructure.position.col,
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
                    selectedStructure.position.row,
                    selectedStructure.position.col,
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
                      selectedStructure.position.row,
                      selectedStructure.position.col,
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

        <div className="mb-4">
          <h4 className="font-semibold mb-2">Formula</h4>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Enter formula"
              value={""} // placeholder
              onChange={() => ""} 
              className="w-full border rounded px-2 py-1"
            />
          </div>
        </div>

        <div className="mb-4">
          <h4 className="font-semibold mb-2">Constraints</h4>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Enter constraints"
              value={""} // placeholder
              onChange={() => ""} 
              className="w-full border rounded px-2 py-1"
            />
          </div>
        </div>
      </div>
    )
  }

  return null
}
