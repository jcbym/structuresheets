import React from 'react'
import { Structure, CellStructure, ArrayStructure, TableStructure, Position, Dimensions, StructureMap, PositionMap } from '../types'
import { generateUUID } from '../utils/sheetUtils'
import { addStructureToPositionMap, removeStructureFromPositionMap, getStructureAtPosition, getDimensions, initializeCellIdsFromRange } from '../utils/structureUtils'
import { FormulaEngine } from '../formula/engine'
import { DependencyManager } from '../formula/dependencyManager'

export const useStructureOperations = (
  structures: StructureMap,
  setStructures: React.Dispatch<React.SetStateAction<StructureMap>>,
  positions: PositionMap,
  setPositions: React.Dispatch<React.SetStateAction<PositionMap>>,
  selectedRange: {start: Position, end: Position} | null,
  setSelectedStructure: React.Dispatch<React.SetStateAction<Structure | null>>
) => {
  // Create a dependency manager instance
  const dependencyManagerRef = React.useRef(new DependencyManager());
  const dependencyManager = dependencyManagerRef.current;

  // Helper function to recalculate a single structure
  const recalculateStructure = React.useCallback((structureId: string, currentStructures: StructureMap): StructureMap => {
    const structure = currentStructures.get(structureId);
    if (!structure || !structure.formula) {
      return currentStructures;
    }

    const newStructures = new Map(currentStructures);
    
    try {
      const engine = new FormulaEngine(newStructures, positions);
      const result = engine.evaluateFormula(structure.formula);
      
      let updatedStructure = { ...structure };
      
      if (result.kind === 'ERROR') {
        updatedStructure.formulaError = result.value;
        updatedStructure.formulaValue = undefined;
      } else {
        updatedStructure.formulaError = undefined;
        
        // Store the result value for display
        let displayValue: string;
        if (result.kind === 'NUMBER') {
          displayValue = result.value.toString();
        } else if (result.kind === 'STRING') {
          displayValue = result.value;
        } else if (result.kind === 'BOOLEAN') {
          displayValue = result.value.toString();
        } else if (result.kind === 'RANGE') {
          displayValue = `Array[${result.value.length}]`;
        } else {
          displayValue = String(result.value);
        }
        
        updatedStructure.formulaValue = displayValue;

        // Write the calculated value back to the structure's cells
        if (structure.type === 'cell') {
          (updatedStructure as CellStructure).value = displayValue;
        } else if (structure.type === 'array' && 'cellIds' in structure) {
          const arrayStructure = updatedStructure as ArrayStructure;
          const cellIds = [...arrayStructure.cellIds];
          
          if (result.kind === 'RANGE') {
            const values = result.value;
            for (let i = 0; i < cellIds.length && i < values.length; i++) {
              const cellId = cellIds[i];
              if (cellId) {
                const cell = newStructures.get(cellId) as CellStructure;
                if (cell) {
                  newStructures.set(cellId, {
                    ...cell,
                    value: String(values[i])
                  });
                }
              }
            }
          } else {
            for (const cellId of cellIds) {
              if (cellId) {
                const cell = newStructures.get(cellId) as CellStructure;
                if (cell) {
                  newStructures.set(cellId, {
                    ...cell,
                    value: displayValue
                  });
                }
              }
            }
          }
        } else if (structure.type === 'table' && 'cellIds' in structure) {
          const tableStructure = updatedStructure as TableStructure;
          const cellIds = [...tableStructure.cellIds];
          
          if (result.kind === 'RANGE') {
            const values = result.value;
            let valueIndex = 0;
            
            for (let row = 0; row < cellIds.length && valueIndex < values.length; row++) {
              for (let col = 0; col < cellIds[row].length && valueIndex < values.length; col++) {
                const cellId = cellIds[row][col];
                if (cellId) {
                  const cell = newStructures.get(cellId) as CellStructure;
                  if (cell) {
                    newStructures.set(cellId, {
                      ...cell,
                      value: String(values[valueIndex])
                    });
                  }
                }
                valueIndex++;
              }
            }
          } else {
            for (const row of cellIds) {
              for (const cellId of row) {
                if (cellId) {
                  const cell = newStructures.get(cellId) as CellStructure;
                  if (cell) {
                    newStructures.set(cellId, {
                      ...cell,
                      value: displayValue
                    });
                  }
                }
              }
            }
          }
        }
      }
      
      newStructures.set(structureId, updatedStructure);
    } catch (error) {
      const structure = newStructures.get(structureId);
      if (structure) {
        const updatedStructure = {
          ...structure,
          formulaError: error instanceof Error ? error.message : 'Unknown error',
          formulaValue: undefined
        };
        newStructures.set(structureId, updatedStructure);
      }
    }
    
    return newStructures;
  }, [positions]);

  const createStructure = (type: Structure['type'], name: string, startPosition: Position, dimensions: Dimensions) => {
    let newStructure: Structure

    switch (type) {
      case 'cell':
        newStructure = {
          type: 'cell',
          id: generateUUID(),
          startPosition: startPosition,
          dimensions: dimensions,
          name,
          value: ''
        }
        return newStructure
      
      case 'array':
        let direction: 'horizontal' | 'vertical';

        if (dimensions.cols == 1) {
          direction = 'vertical'
        } else if (dimensions.rows == 1) {
          direction = 'horizontal'
        } else {
          console.warn('Invalid array dimensions:', dimensions)
          return
        }

        const arrayCellIds = initializeCellIdsFromRange(
          startPosition, dimensions, positions, structures, 'array'
        ) as (string | null)[]

        newStructure = {
          type: 'array',
          id: generateUUID(),
          startPosition: startPosition,
          dimensions: dimensions,
          name,
          direction,
          cellIds: arrayCellIds
        }
        return newStructure

      case 'table':
        const tableCellIds = initializeCellIdsFromRange(
          startPosition, dimensions, positions, structures, 'table'
        ) as (string | null)[][]
        
        newStructure = {
          type: 'table',
          id: generateUUID(),
          startPosition: startPosition,
          dimensions: dimensions,
          name,
          colHeaderLevels: 1,
          rowHeaderLevels: 0,
          cellIds: tableCellIds
        }
        return newStructure
    }
  }

  // Create structure from toolbar (works with selected range)
  const createStructureFromToolbar = React.useCallback((type: Structure['type']) => {
    let startRow: number, endRow: number, startCol: number, endCol: number

    if (selectedRange) {
      // Use selected range
      startRow = Math.min(selectedRange.start.row, selectedRange.end.row)
      endRow = Math.max(selectedRange.start.row, selectedRange.end.row)
      startCol = Math.min(selectedRange.start.col, selectedRange.end.col)
      endCol = Math.max(selectedRange.start.col, selectedRange.end.col)
    } else {
      return // No selection
    }

    const newStructure = createStructure(type, '', {row: startRow, col: startCol}, getDimensions({row: startRow, col: startCol}, {row: endRow, col: endCol}))

    if (!newStructure) return // Invalid structure type or dimensions

    // Set the main structure in structures map and update position map
    setStructures((prev: StructureMap) => {
      const newStructures = new Map(prev)
      newStructures.set(newStructure.id, newStructure)
      
      return newStructures
    })
    
    // Update position map
    setPositions(prev => addStructureToPositionMap(newStructure, prev))
    
    // Select the newly created structure
    setSelectedStructure(newStructure)
  }, [selectedRange, structures, positions, setStructures, setSelectedStructure, setPositions])

  // Function to update table header settings
  const updateTableHeaders = React.useCallback((row: number, col: number, headerRows: number, headerCols: number) => {
    // Find the structure at the given position
    // let targetStructure: Structure | null = null
    // for (const [, structure] of structures) {
    //   if (structure.type === 'table') {
    //     const { startPosition, endPosition } = structure
    //     if (row >= startPosition.row && row <= endPosition.row &&
    //         col >= startPosition.col && col <= endPosition.col) {
    //       targetStructure = structure
    //       break
    //     }
    //   }
    // }
    
    // if (targetStructure && targetStructure.type === 'table') {
    //   const updatedTable = { 
    //     ...targetStructure,
    //     headerRows: headerRows || 1,
    //     headerCols: headerCols || 0
    //   }
      
    //   setStructures((prev: StructureMap) => {
    //     const newStructures = new Map(prev)
    //     newStructures.set(updatedTable.id, updatedTable)
        
    //     return newStructures
    //   })
    // }
  }, [structures, setStructures])

  const getStructureAtPositionSafe = React.useCallback((row: number, col: number) => {
    return getStructureAtPosition(row, col, positions, structures)
  }, [positions, structures])

  const updateStructureName = React.useCallback((structureId: string, name: string) => {
    setStructures((prev: StructureMap) => {
      const newStructures = new Map(prev)
      const structure = newStructures.get(structureId)
      if (structure) {
        // Set name to undefined if empty string is passed to delete the name
        const updatedStructure = { ...structure, name: name || undefined }
        newStructures.set(structureId, updatedStructure)
        
        // Also update the selected structure if it's the same one
        setSelectedStructure(current => {
          if (current && current.id === structureId) {
            return updatedStructure as Structure
          }
          return current
        })
      }
      return newStructures
    })
  }, [setStructures, setSelectedStructure])

  const updateStructureFormula = React.useCallback((structureId: string, formula: string) => {
    setStructures((prev: StructureMap) => {
      let newStructures = new Map(prev);
      const structure = newStructures.get(structureId);
      
      if (!structure) {
        return newStructures;
      }

      // Remove old formula from dependency manager
      dependencyManager.removeFormula(structureId);

      // If there's a formula, evaluate it and track dependencies
      if (formula && formula.trim()) {
        try {
          const engine = new FormulaEngine(newStructures, positions);
          const result = engine.evaluateFormula(formula);
          const dependencies = engine.getDependencies();

          // Add to dependency manager
          dependencyManager.addFormula(structureId, formula, dependencies);

          // Create updated structure with formula
          let updatedStructure: Structure;
          if (structure.type === 'cell') {
            updatedStructure = {
              ...structure,
              formula: formula,
              formulaError: undefined,
              formulaValue: undefined
            } as CellStructure;
          } else if (structure.type === 'array') {
            updatedStructure = {
              ...structure,
              formula: formula,
              formulaError: undefined,
              formulaValue: undefined
            } as ArrayStructure;
          } else if (structure.type === 'table') {
            updatedStructure = {
              ...structure,
              formula: formula,
              formulaError: undefined,
              formulaValue: undefined
            } as TableStructure;
          } else {
            return newStructures;
          }

          newStructures.set(structureId, updatedStructure);

          // Recalculate this structure
          newStructures = recalculateStructure(structureId, newStructures);

          // Update selected structure
          setSelectedStructure(current => {
            if (current && current.id === structureId) {
              return newStructures.get(structureId) || current;
            }
            return current;
          });

        } catch (error) {
          // Create updated structure with error
          const updatedStructure = {
            ...structure,
            formula: formula,
            formulaError: error instanceof Error ? error.message : 'Unknown error',
            formulaValue: undefined
          };
          newStructures.set(structureId, updatedStructure);

          setSelectedStructure(current => {
            if (current && current.id === structureId) {
              return updatedStructure;
            }
            return current;
          });
        }
      } else {
        // Remove formula
        const updatedStructure = {
          ...structure,
          formula: undefined,
          formulaError: undefined,
          formulaValue: undefined
        };
        newStructures.set(structureId, updatedStructure);

        setSelectedStructure(current => {
          if (current && current.id === structureId) {
            return updatedStructure;
          }
          return current;
        });
      }

      return newStructures;
    });
  }, [dependencyManager, recalculateStructure, setStructures, setSelectedStructure, positions]);

  // Function to handle cell value changes and trigger recalculation
  const triggerRecalculation = React.useCallback((changedCells: Array<{row: number, col: number}>) => {
    const calculationOrder = dependencyManager.getCalculationOrder(changedCells);
    
    if (calculationOrder.length > 0) {
      setStructures(prev => {
        let newStructures = new Map(prev);
        
        // Recalculate structures in dependency order
        for (const structureId of calculationOrder) {
          newStructures = recalculateStructure(structureId, newStructures);
        }
        
        return newStructures;
      });
    }
  }, [dependencyManager, recalculateStructure, setStructures]);

  const rotateArray = React.useCallback((arrayId: string) => { // TODO: Implement array rotation with new model
    // setStructures((prev: StructureMap) => {
    //   const newStructures = new Map<string, Structure>(prev)
    //   const structure = newStructures.get(arrayId)
      
    //   if (structure && structure.type === 'array') {
    //     const array = structure
    //     const { startPosition } = array
    //     const newDirection: 'horizontal' | 'vertical' = array.direction === 'horizontal' ? 'vertical' : 'horizontal'
        
    //     // Calculate new dimensions based on rotation
    //     let newEndPosition: { row: number, col: number }
    //     let newCellIds: string[] = []
        
    //     if (newDirection === 'vertical') {
    //       // Converting from horizontal to vertical
    //       newEndPosition = { 
    //         row: startPosition.row + array.size - 1, 
    //         col: startPosition.col 
    //       }
          
    //       // Update cell positions to be vertical - need to update the actual cell structures
    //       newCellIds = array.cellIds.map((cellId, index) => {
    //         const cell = newStructures.get(cellId) as CellStructure
    //         if (cell) {
    //           const updatedCell = {
    //             ...cell,
    //             startPosition: { row: startPosition.row + index, col: startPosition.col },
    //             endPosition: { row: startPosition.row + index, col: startPosition.col }
    //           }
    //           newStructures.set(cellId, updatedCell)
    //         }
    //         return cellId
    //       })
    //     } else {
    //       // Converting from vertical to horizontal
    //       newEndPosition = { 
    //         row: startPosition.row, 
    //         col: startPosition.col + array.size - 1 
    //       }
          
    //       // Update cell positions to be horizontal - need to update the actual cell structures
    //       newCellIds = array.cellIds.map((cellId, index) => {
    //         const cell = newStructures.get(cellId) as CellStructure
    //         if (cell) {
    //           const updatedCell = {
    //             ...cell,
    //             startPosition: { row: startPosition.row, col: startPosition.col + index },
    //             endPosition: { row: startPosition.row, col: startPosition.col + index }
    //           }
    //           newStructures.set(cellId, updatedCell)
    //         }
    //         return cellId
    //       })
    //     }
        
    //     const updatedArray = {
    //       ...array,
    //       direction: newDirection,
    //       endPosition: newEndPosition,
    //       cellIds: newCellIds
    //     }
        
    //     newStructures.set(arrayId, updatedArray)
        
    //     // Also update the selected structure if it's the same one
    //     setSelectedStructure(current => {
    //       if (current && current.id === arrayId) {
    //         return updatedArray
    //       }
    //       return current
    //     })
    //   }
      
    //   return newStructures
    // })
    
    // // Update position map when rotating
    // setPositions(prev => {
    //   const structure = structures.get(arrayId)
    //   if (structure) {
    //     // Remove old positions and add new ones
    //     let newPositionMap = removeStructureFromPositionMap(structure, prev)
    //     // Get the updated structure from the structures map after rotation
    //     const updatedStructure = structures.get(arrayId)
    //     if (updatedStructure) {
    //       newPositionMap = addStructureToPositionMap(updatedStructure, newPositionMap)
    //     }
    //     return newPositionMap
    //   }
    //   return prev
    // })
  }, [structures, setStructures, setSelectedStructure, setPositions])

  const deleteStructure = React.useCallback((structureId: string) => {
    const structureToDelete = structures.get(structureId)
    
    setStructures((prev: StructureMap) => {
      const newStructures = new Map(prev)
      newStructures.delete(structureId)
      return newStructures
    })
    
    // Remove from position map
    if (structureToDelete) {
      setPositions(prev => removeStructureFromPositionMap(structureToDelete, prev))
    }
    
    // Clear selected structure if it was the deleted one
    setSelectedStructure(current => {
      if (current && current.id === structureId) {
        return null
      }
      return current
    })
  }, [structures, setStructures, setPositions, setSelectedStructure])

  return {
    createStructure,
    createStructureFromToolbar,
    updateTableHeaders,
    getStructureAtPositionSafe,
    updateStructureName,
    updateStructureFormula,
    triggerRecalculation,
    rotateArray,
    deleteStructure
  }
}
