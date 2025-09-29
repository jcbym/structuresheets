import { Dependency } from './engine';

// Dependency graph node
export type DependencyNode = {
  structureId: string;
  formula: string;
  dependencies: Dependency[];
};

// Dependency graph manager
export class DependencyManager {
  private dependencyGraph: Map<string, DependencyNode> = new Map();
  private reverseDependencies: Map<string, Set<string>> = new Map(); // Maps dependency keys to dependent structure IDs

  // Add a formula and its dependencies to the graph
  addFormula(structureId: string, formula: string, dependencies: Dependency[]): void {
    // Remove old dependencies if they exist
    this.removeFormula(structureId);

    // Create new dependency node
    const node: DependencyNode = {
      structureId,
      formula,
      dependencies: [...dependencies]
    };

    this.dependencyGraph.set(structureId, node);

    // Update reverse dependencies
    for (const dependency of dependencies) {
      const depKey = this.getDependencyKey(dependency);
      
      if (!this.reverseDependencies.has(depKey)) {
        this.reverseDependencies.set(depKey, new Set());
      }
      
      this.reverseDependencies.get(depKey)!.add(structureId);
    }
  }

  // Remove a formula from the dependency graph
  removeFormula(structureId: string): void {
    const node = this.dependencyGraph.get(structureId);
    if (node) {
      // Remove from reverse dependencies
      for (const dependency of node.dependencies) {
        const depKey = this.getDependencyKey(dependency);
        const dependents = this.reverseDependencies.get(depKey);
        if (dependents) {
          dependents.delete(structureId);
          if (dependents.size === 0) {
            this.reverseDependencies.delete(depKey);
          }
        }
      }
      
      // Remove the node
      this.dependencyGraph.delete(structureId);
    }
  }

  // Get structures that depend on a specific cell
  getDependentsOfCell(row: number, col: number): string[] {
    const cellKey = `cell:${row}:${col}`;
    const dependents = this.reverseDependencies.get(cellKey);
    return dependents ? Array.from(dependents) : [];
  }

  // Get structures that depend on a specific structure
  getDependentsOfStructure(structureId: string): string[] {
    const structKey = `structure:${structureId}`;
    const dependents = this.reverseDependencies.get(structKey);
    return dependents ? Array.from(dependents) : [];
  }

  // Get structures that depend on a specific table column
  getDependentsOfTableColumn(tableName: string, columnName: string): string[] {
    const tableColumnKey = `tableColumn:${tableName}:${columnName}`;
    const dependents = this.reverseDependencies.get(tableColumnKey);
    return dependents ? Array.from(dependents) : [];
  }

  // Get structures that depend on cells in a range
  getDependentsOfRange(startRow: number, startCol: number, endRow: number, endCol: number): Set<string> {
    const dependents = new Set<string>();
    
    // Check individual cells
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cellDependents = this.getDependentsOfCell(row, col);
        cellDependents.forEach(dep => dependents.add(dep));
      }
    }
    
    // Check ranges that overlap with this range
    for (const [depKey, deps] of this.reverseDependencies.entries()) {
      if (depKey.startsWith('range:')) {
        const [, startRowStr, startColStr, endRowStr, endColStr] = depKey.split(':');
        const depStartRow = parseInt(startRowStr);
        const depStartCol = parseInt(startColStr);
        const depEndRow = parseInt(endRowStr);
        const depEndCol = parseInt(endColStr);
        
        // Check if ranges overlap
        if (this.rangesOverlap(startRow, startCol, endRow, endCol, depStartRow, depStartCol, depEndRow, depEndCol)) {
          deps.forEach(dep => dependents.add(dep));
        }
      }
    }
    
    return dependents;
  }

  // Calculate structures that need to be recalculated when a cell changes
  getCalculationOrder(changedCells: Array<{row: number, col: number}>): string[] {
    const toRecalculate = new Set<string>();
    
    // Find all structures that depend on the changed cells
    for (const cell of changedCells) {
      const cellDependents = this.getDependentsOfCell(cell.row, cell.col);
      cellDependents.forEach(dep => toRecalculate.add(dep));
    }
    
    // Perform topological sort to get correct calculation order
    return this.topologicalSort(Array.from(toRecalculate));
  }

  // Calculate structures that need to be recalculated when a structure changes
  getCalculationOrderForStructure(structureId: string): string[] {
    const toRecalculate = new Set<string>();
    
    // Find all structures that depend on this structure
    const structDependents = this.getDependentsOfStructure(structureId);
    structDependents.forEach(dep => toRecalculate.add(dep));
    
    // Perform topological sort to get correct calculation order
    return this.topologicalSort(Array.from(toRecalculate));
  }

  // Find structures that contain a specific cell (for structure-level dependency tracking)
  getStructuresContainingCell(row: number, col: number, structures: Map<string, any>): string[] {
    const containingStructures: string[] = [];
    
    for (const [structureId, structure] of structures) {
      if (structure.name && this.structureContainsCell(structure, row, col)) {
        containingStructures.push(structureId);
      }
    }
    
    return containingStructures;
  }

  // Enhanced calculation order that considers both cell and structure dependencies
  getEnhancedCalculationOrder(
    changedCells: Array<{row: number, col: number}>, 
    structures: Map<string, any>
  ): string[] {
    const toRecalculate = new Set<string>();
    
    // Find all structures that depend on the changed cells (existing logic)
    for (const cell of changedCells) {
      const cellDependents = this.getDependentsOfCell(cell.row, cell.col);
      cellDependents.forEach(dep => toRecalculate.add(dep));
    }
    
    // NEW: Find structures containing the changed cells and get their dependents
    for (const cell of changedCells) {
      const containingStructures = this.getStructuresContainingCell(cell.row, cell.col, structures);
      for (const structureId of containingStructures) {
        const structureDependents = this.getDependentsOfStructure(structureId);
        structureDependents.forEach(dep => toRecalculate.add(dep));
      }
    }
    
    // Perform topological sort to get correct calculation order
    return this.topologicalSort(Array.from(toRecalculate));
  }

  // Private helper methods

  private getDependencyKey(dependency: Dependency): string {
    switch (dependency.type) {
      case 'cell':
        return `cell:${dependency.row}:${dependency.col}`;
      case 'range':
        return `range:${dependency.startRow}:${dependency.startCol}:${dependency.endRow}:${dependency.endCol}`;
      case 'structure':
        return `structure:${dependency.structureId}`;
      case 'tableColumn':
        return `tableColumn:${dependency.tableName}:${dependency.columnName}`;
    }
  }

  private rangesOverlap(
    r1StartRow: number, r1StartCol: number, r1EndRow: number, r1EndCol: number,
    r2StartRow: number, r2StartCol: number, r2EndRow: number, r2EndCol: number
  ): boolean {
    return !(r1EndRow < r2StartRow || r2EndRow < r1StartRow || r1EndCol < r2StartCol || r2EndCol < r1StartCol);
  }

  private topologicalSort(structureIds: string[]): string[] {
    const visited = new Set<string>();
    const temp = new Set<string>();
    const result: string[] = [];

    const visit = (structureId: string) => {
      if (temp.has(structureId)) {
        // Circular dependency detected - break the cycle by adding to result
        return;
      }
      if (visited.has(structureId)) {
        return;
      }

      temp.add(structureId);
      
      // Visit dependencies first
      const node = this.dependencyGraph.get(structureId);
      if (node) {
        for (const dependency of node.dependencies) {
          if (dependency.type === 'structure') {
            const depStructureId = dependency.structureId;
            if (structureIds.includes(depStructureId)) {
              visit(depStructureId);
            }
          }
        }
      }

      temp.delete(structureId);
      visited.add(structureId);
      result.push(structureId);
    };

    for (const structureId of structureIds) {
      if (!visited.has(structureId)) {
        visit(structureId);
      }
    }

    return result;
  }

  // Helper to check if a structure contains a specific cell
  private structureContainsCell(structure: any, row: number, col: number): boolean {
    if (!structure.startPosition || !structure.dimensions) {
      return false;
    }
    
    const { startPosition, dimensions } = structure;
    const endRow = startPosition.row + dimensions.rows - 1;
    const endCol = startPosition.col + dimensions.cols - 1;
    
    return row >= startPosition.row && row <= endRow && 
           col >= startPosition.col && col <= endCol;
  }

  // Debug method to get current dependency graph state
  getDebugInfo(): { nodes: DependencyNode[], reverseDeps: Array<{key: string, dependents: string[]}> } {
    return {
      nodes: Array.from(this.dependencyGraph.values()),
      reverseDeps: Array.from(this.reverseDependencies.entries()).map(([key, deps]) => ({
        key,
        dependents: Array.from(deps)
      }))
    };
  }
}
