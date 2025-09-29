import React from 'react'
import { Structure, CellStructure, ArrayStructure, TableStructure, Position, Dimensions, StructureMap, PositionMap } from '../types'
import { generateUUID } from '../utils/sheetUtils'
import { addStructureToPositionMap, removeStructureFromPositionMap, getStructureAtPosition, getDimensions, initializeCellIdsFromRange, getTemplateDimensionsFromStructures, calculateArrayDimensionsWithTemplate, calculateTemplateInstancePosition } from '../utils/structureUtils'
import { FormulaEngine } from '../formula/engine'
import { DependencyManager } from '../formula/dependencyManager'
import { instantiateTemplate, addInstantiatedTemplateToStructures } from '../utils/templateInstantiation'
import { getTemplateStructures, loadTemplates } from '../utils/templateStorage'

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

  // Helper function to recalculate a single structure and return whether its value changed
  const recalculateStructure = React.useCallback((structureId: string, currentStructures: StructureMap): { 
    newStructures: StructureMap, 
    valueChanged: boolean 
  } => {
    const structure = currentStructures.get(structureId);
    if (!structure || !structure.formula) {
      return { newStructures: currentStructures, valueChanged: false };
    }

    const newStructures = new Map(currentStructures);
    let valueChanged = false;
    
    try {
      const engine = new FormulaEngine(newStructures, positions);
      const result = engine.evaluateFormula(structure.formula);
      const dependencies = engine.getDependencies();

      // Update dependencies in the dependency manager
      dependencyManager.addFormula(structureId, structure.formula, dependencies);
      
      let updatedStructure = { ...structure };
      // For formulas, we need to check if the calculated value changed
      const oldValue = structure.type === 'cell' ? (structure as CellStructure).value : undefined;
      
      if (result.kind === 'ERROR') {
        updatedStructure.formulaError = result.value;
        // Keep the current value unchanged on error
        valueChanged = false;
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
        
        // Write the calculated value back to the structure's cells
        if (structure.type === 'cell') {
          (updatedStructure as CellStructure).value = displayValue;
          valueChanged = oldValue !== displayValue;
        } else if (structure.type === 'array' && 'itemIds' in structure) {
          const arrayStructure = updatedStructure as ArrayStructure;
          const itemIds = [...arrayStructure.itemIds];
          
          if (result.kind === 'RANGE') {
            const values = result.value;
            for (let i = 0; i < itemIds.length && i < values.length; i++) {
              const itemId = itemIds[i];
              if (itemId) {
                const cell = newStructures.get(itemId) as CellStructure;
                if (cell) {
                  const oldValue = cell.value;
                  const newValue = String(values[i]);
                  newStructures.set(itemId, {
                    ...cell,
                    value: newValue
                  });
                  valueChanged = valueChanged || oldValue !== newValue;
                }
              }
            }
          } else {
            for (const itemId of itemIds) {
              if (itemId) {
                const cell = newStructures.get(itemId) as CellStructure;
                if (cell) {
                  const oldValue = cell.value;
                  newStructures.set(itemId, {
                    ...cell,
                    value: displayValue
                  });
                  valueChanged = valueChanged || oldValue !== displayValue;
                }
              }
            }
          }
        } else if (structure.type === 'table' && 'itemIds' in structure) {
          const tableStructure = updatedStructure as TableStructure;
          const itemIds = [...tableStructure.itemIds];
          
          if (result.kind === 'RANGE') {
            const values = result.value;
            let valueIndex = 0;
            
            for (let row = 0; row < itemIds.length && valueIndex < values.length; row++) {
              for (let col = 0; col < itemIds[row].length && valueIndex < values.length; col++) {
                const itemId = itemIds[row][col];
                if (itemId) {
                  const cell = newStructures.get(itemId) as CellStructure;
                  if (cell) {
                    const oldValue = cell.value;
                    const newValue = String(values[valueIndex]);
                    newStructures.set(itemId, {
                      ...cell,
                      value: newValue
                    });
                    valueChanged = valueChanged || oldValue !== newValue;
                  }
                }
                valueIndex++;
              }
            }
          } else {
            for (const row of itemIds) {
              for (const itemId of row) {
                if (itemId) {
                  const cell = newStructures.get(itemId) as CellStructure;
                  if (cell) {
                    const oldValue = cell.value;
                    newStructures.set(itemId, {
                      ...cell,
                      value: displayValue
                    });
                    valueChanged = valueChanged || oldValue !== displayValue;
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
        const oldError = structure.formulaError;
        const updatedStructure = {
          ...structure,
          formulaError: error instanceof Error ? error.message : 'Unknown error'
        };
        newStructures.set(structureId, updatedStructure);
        valueChanged = oldError !== updatedStructure.formulaError;
      }
    }
    
    return { newStructures, valueChanged };
  }, [positions, dependencyManager]);

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
          contentType: 'cells', // Default to cells for backward compatibility
          itemIds: arrayCellIds
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
          itemIds: tableCellIds
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
        // Get the old name for dependency tracking
        const oldName = structure.name;
        
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
        
        // Trigger recalculation for formulas that depend on this structure
        // This is important when:
        // 1. Structure gets a name for the first time (formulas can now reference it)
        // 2. Structure name changes (formulas using old name may break, new name may work)
        // 3. Structure name is removed (formulas using the name may break)
        if (oldName !== (name || undefined)) {
          const dependents = dependencyManager.getDependentsOfStructure(structureId);
          if (dependents.length > 0) {
            // Use setTimeout to ensure the structure update happens first
            setTimeout(() => {
              setStructures(current => {
                let updatedStructures = new Map(current);
                for (const dependentId of dependents) {
                  const result = recalculateStructure(dependentId, updatedStructures);
                  updatedStructures = result.newStructures;
                }
                return updatedStructures;
              });
            }, 0);
          }
        }
      }
      return newStructures
    })
  }, [setStructures, setSelectedStructure, dependencyManager, recalculateStructure])

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
          const evalResult = engine.evaluateFormula(formula);
          const dependencies = engine.getDependencies();

          // Add to dependency manager
          dependencyManager.addFormula(structureId, formula, dependencies);

          // Create updated structure with formula
          let updatedStructure: Structure;
          if (structure.type === 'cell') {
            updatedStructure = {
              ...structure,
              formula: formula,
              formulaError: undefined
            } as CellStructure;
          } else if (structure.type === 'array') {
            updatedStructure = {
              ...structure,
              formula: formula,
              formulaError: undefined
            } as ArrayStructure;
          } else if (structure.type === 'table') {
            updatedStructure = {
              ...structure,
              formula: formula,
              formulaError: undefined
            } as TableStructure;
          } else {
            return newStructures;
          }

          newStructures.set(structureId, updatedStructure);

          // Recalculate this structure
          const recalcResult = recalculateStructure(structureId, newStructures);
          newStructures = recalcResult.newStructures;

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
            formulaError: error instanceof Error ? error.message : 'Unknown error'
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
          formulaError: undefined
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

  const updateArrayContentType = React.useCallback((arrayId: string, contentType: string) => {
    setStructures((prev: StructureMap) => {
      const newStructures = new Map(prev)
      const structure = newStructures.get(arrayId)
      
      if (structure && structure.type === 'array') {
        const arrayStructure = structure as ArrayStructure
        
        if (contentType === 'cells') {
          // Switching back to cells - clear template properties
          const updatedArray: ArrayStructure = {
            ...arrayStructure,
            contentType: 'cells',
            templateDimensions: undefined,
            instanceCount: undefined
          }
          
          newStructures.set(arrayId, updatedArray)
          
          // Also update the selected structure if it's the same one
          setSelectedStructure(current => {
            if (current && current.id === arrayId) {
              return updatedArray
            }
            return current
          })
        } else {
          // Switching to a template - need to instantiate template and resize array
          try {
            // Get template dimensions from the Template object, not from stored structures
            const templates = loadTemplates()
            const template = templates.find(t => t.id === contentType)
            if (!template) {
              throw new Error(`Template ${contentType} not found`)
            }
            const templateDimensions = template.dimensions
            
            // Calculate new array dimensions for one template instance
            const newArrayDimensions = calculateArrayDimensionsWithTemplate(
              arrayStructure,
              templateDimensions,
              1 // Start with one instance
            )
            
            // Calculate position for the template instance
            const templatePosition = calculateTemplateInstancePosition(
              arrayStructure.startPosition,
              arrayStructure.direction,
              templateDimensions,
              0 // First instance
            )
            
            // Create template instance
            const instantiationResult = instantiateTemplate(
              contentType,
              templatePosition,
              templateDimensions,
              1 // Template version
            )
            
            // Update array structure
            const updatedArray: ArrayStructure = {
              ...arrayStructure,
              contentType: contentType,
              templateDimensions: templateDimensions,
              instanceCount: 1,
              dimensions: newArrayDimensions,
              itemIds: [instantiationResult.templateStructure.id] // Reference the template instance
            }
            
            // Add the template instance to structures
            newStructures.set(instantiationResult.templateStructure.id, instantiationResult.templateStructure)
            
            // Add all nested structures from the template
            for (const nestedStructure of instantiationResult.nestedStructures) {
              newStructures.set(nestedStructure.id, nestedStructure)
            }
            
            // Update the array structure
            newStructures.set(arrayId, updatedArray)
            
            // Apply cell data updates through onCellUpdate callback
            for (const [positionKey, value] of Object.entries(instantiationResult.cellData)) {
              const [rowStr, colStr] = positionKey.split('-')
              const row = parseInt(rowStr, 10)
              const col = parseInt(colStr, 10)
              
              if (value) {
                // This will be handled by the calling component
                // We can't call onCellUpdate directly here since it's not in scope
                console.log(`Cell update needed at ${row},${col}: ${value}`)
              }
            }
            
            // Also update the selected structure if it's the same one
            setSelectedStructure(current => {
              if (current && current.id === arrayId) {
                return updatedArray
              }
              return current
            })
            
            console.log(`Successfully converted array to template type: ${contentType}`)
            
          } catch (error) {
            console.error('Failed to instantiate template in array:', error)
            
            // Fall back to basic update without template instantiation
            const updatedArray: ArrayStructure = {
              ...arrayStructure,
              contentType: contentType as any
            }
            
            newStructures.set(arrayId, updatedArray)
            
            setSelectedStructure(current => {
              if (current && current.id === arrayId) {
                return updatedArray
              }
              return current
            })
          }
        }
      }
      
      return newStructures
    })
    
  }, [setStructures, setSelectedStructure, setPositions, structures]);

  // Sync position mapping whenever structures change
  React.useEffect(() => {
    setPositions(prev => {
      let newPositions = new Map(prev)
      
      // Rebuild position mapping for all structures
      newPositions.clear()
      for (const [, structure] of structures) {
        newPositions = addStructureToPositionMap(structure, newPositions)
      }
      
      return newPositions
    })
  }, [structures, setPositions])

  // Function to handle cell value changes and trigger cascading recalculation
  const triggerRecalculation = React.useCallback((changedCells: Array<{row: number, col: number}>) => {
    setStructures(prev => {
      let newStructures = new Map(prev);
      const processedStructures = new Set<string>();
      const maxIterations = 50; // Prevent infinite loops
      let iteration = 0;
      
      // Start with the initial changed cells
      let currentChangedCells = [...changedCells];
      
      while (currentChangedCells.length > 0 && iteration < maxIterations) {
        iteration++;
        
        // Get structures that depend on the currently changed cells
        const calculationOrder = dependencyManager.getEnhancedCalculationOrder(currentChangedCells, newStructures);
        
        // Track which structures changed values in this iteration
        const structuresWithChanges = new Set<string>();
        const cellsChangedThisIteration = new Set<string>();
        
        // Recalculate structures in dependency order
        for (const structureId of calculationOrder) {
          // Skip if we've already processed this structure in this cascade
          if (processedStructures.has(structureId)) {
            continue;
          }
          
          const result = recalculateStructure(structureId, newStructures);
          newStructures = result.newStructures;
          processedStructures.add(structureId);
          
          // If the structure's value changed, we need to find what cells it affects
          if (result.valueChanged) {
            structuresWithChanges.add(structureId);
            
            // Get the structure to determine which cells it occupies
            const structure = newStructures.get(structureId);
            if (structure) {
              // Add all cells that this structure occupies to the changed cells for the next iteration
              const endRow = structure.startPosition.row + structure.dimensions.rows - 1;
              const endCol = structure.startPosition.col + structure.dimensions.cols - 1;
              
              for (let row = structure.startPosition.row; row <= endRow; row++) {
                for (let col = structure.startPosition.col; col <= endCol; col++) {
                  cellsChangedThisIteration.add(`${row}-${col}`);
                }
              }
            }
          }
        }
        
        // Prepare changed cells for the next iteration
        currentChangedCells = Array.from(cellsChangedThisIteration).map(cellKey => {
          const [row, col] = cellKey.split('-').map(Number);
          return { row, col };
        });
        
        // If no structures changed values, we can stop the cascade
        if (structuresWithChanges.size === 0) {
          break;
        }
        
        // Also add dependents of changed structures for the next iteration
        for (const structureId of structuresWithChanges) {
          const structureDependents = dependencyManager.getDependentsOfStructure(structureId);
          for (const dependentId of structureDependents) {
            if (!processedStructures.has(dependentId)) {
              const dependentStructure = newStructures.get(dependentId);
              if (dependentStructure) {
                const endRow = dependentStructure.startPosition.row + dependentStructure.dimensions.rows - 1;
                const endCol = dependentStructure.startPosition.col + dependentStructure.dimensions.cols - 1;
                
                for (let row = dependentStructure.startPosition.row; row <= endRow; row++) {
                  for (let col = dependentStructure.startPosition.col; col <= endCol; col++) {
                    currentChangedCells.push({ row, col });
                  }
                }
              }
            }
          }
        }
        
        // Remove duplicates from currentChangedCells
        const cellSet = new Set(currentChangedCells.map(cell => `${cell.row}-${cell.col}`));
        currentChangedCells = Array.from(cellSet).map(cellKey => {
          const [row, col] = cellKey.split('-').map(Number);
          return { row, col };
        });
      }
      
      if (iteration >= maxIterations) {
        console.warn('Recalculation cascade reached maximum iterations, stopping to prevent infinite loop');
      }
      
      return newStructures;
    });
  }, [dependencyManager, recalculateStructure, setStructures, structures]);

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
    //       newCellIds = array.itemIds.map((itemId, index) => {
    //         const cell = newStructures.get(itemId) as CellStructure
    //         if (cell) {
    //           const updatedCell = {
    //             ...cell,
    //             startPosition: { row: startPosition.row + index, col: startPosition.col },
    //             endPosition: { row: startPosition.row + index, col: startPosition.col }
    //           }
    //           newStructures.set(itemId, updatedCell)
    //         }
    //         return itemId
    //       })
    //     } else {
    //       // Converting from vertical to horizontal
    //       newEndPosition = { 
    //         row: startPosition.row, 
    //         col: startPosition.col + array.size - 1 
    //       }
          
    //       // Update cell positions to be horizontal - need to update the actual cell structures
    //       newCellIds = array.itemIds.map((itemId, index) => {
    //         const cell = newStructures.get(itemId) as CellStructure
    //         if (cell) {
    //           const updatedCell = {
    //             ...cell,
    //             startPosition: { row: startPosition.row, col: startPosition.col + index },
    //             endPosition: { row: startPosition.row, col: startPosition.col + index }
    //           }
    //           newStructures.set(itemId, updatedCell)
    //         }
    //         return itemId
    //       })
    //     }
        
    //     const updatedArray = {
    //       ...array,
    //       direction: newDirection,
    //       endPosition: newEndPosition,
    //       itemIds: newCellIds
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
    updateArrayContentType,
    triggerRecalculation,
    rotateArray,
    deleteStructure,
    dependencyManager // Export the dependency manager so it can be passed to useCellOperations
  }
}
