// Simplified formula engine for StructureSheets
import { FormulaValue, formulaNumber, formulaString, formulaError, emptyCell, NUMBER, STRING, ERROR, EMPTY, BOOLEAN } from './types';
import { Structure, StructureMap, PositionMap, TableStructure, CellStructure } from '../types';
import { getCellValue } from '../utils/structureUtils';

// Dependency tracking types
export type CellReference = {
  type: 'cell';
  row: number;
  col: number;
};

export type RangeReference = {
  type: 'range';
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
};

export type StructureReference = {
  type: 'structure';
  structureId: string;
};

export type TableColumnReference = {
  type: 'tableColumn';
  tableName: string;
  columnName: string;
};

export type Dependency = CellReference | RangeReference | StructureReference | TableColumnReference;

// Simple formula parser that handles basic expressions
export class FormulaEngine {
  private structures: StructureMap;
  private positions: PositionMap;
  private dependencies: Dependency[] = [];

  constructor(structures: StructureMap, positions: PositionMap) {
    this.structures = structures;
    this.positions = positions;
  }

  // Get dependencies identified during the last evaluation
  getDependencies(): Dependency[] {
    return [...this.dependencies];
  }

  // Clear dependencies (called at start of each evaluation)
  private clearDependencies(): void {
    this.dependencies = [];
  }

  // Add a dependency
  private addDependency(dependency: Dependency): void {
    this.dependencies.push(dependency);
  }

  // Main evaluation function
  evaluateFormula(formula: string): FormulaValue {
    try {
      // Clear dependencies from previous evaluation
      this.clearDependencies();
      
      // Remove leading = if present
      const cleanFormula = formula.startsWith('=') ? formula.slice(1) : formula;
      
      // Parse and evaluate the formula
      return this.parseExpression(cleanFormula.trim());
    } catch (error) {
      return formulaError(`Formula error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Parse different types of expressions
  private parseExpression(expr: string): FormulaValue {
    // Handle empty expression
    if (!expr) {
      return emptyCell;
    }

    // Handle numbers
    const numberMatch = expr.match(/^-?\d+(\.\d+)?$/);
    if (numberMatch) {
      return formulaNumber(parseFloat(expr));
    }

    // Handle strings (quoted)
    const stringMatch = expr.match(/^"([^"]*)"$/);
    if (stringMatch) {
      return formulaString(stringMatch[1]);
    }

    // Handle functions
    const functionMatch = expr.match(/^([A-Z]+)\s*\(\s*(.*)\s*\)$/i);
    if (functionMatch) {
      const functionName = functionMatch[1].toUpperCase();
      const argsString = functionMatch[2];
      return this.evaluateFunction(functionName, argsString);
    }

    // Handle cell references (A1, B2, etc.)
    const cellMatch = expr.match(/^([A-Z]+)(\d+)$/);
    if (cellMatch) {
      return this.evaluateCellReference(expr);
    }

    // Handle range references (A1:B2)
    const rangeMatch = expr.match(/^([A-Z]+\d+):([A-Z]+\d+)$/);
    if (rangeMatch) {
      return this.evaluateRangeReference(expr);
    }

    // Handle table column references (table[col] or table["col name"])
    const tableColumnMatch = expr.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\[(?:"([^"]+)"|([a-zA-Z_][a-zA-Z0-9_]*))\]$/);
    if (tableColumnMatch) {
      const tableName = tableColumnMatch[1];
      const columnName = tableColumnMatch[2] || tableColumnMatch[3]; // quoted or unquoted column name
      return this.evaluateTableColumnReference(tableName, columnName);
    }

    // Handle structure name references
    const structure = this.getStructureByName(expr);
    if (structure) {
      return this.evaluateStructureReference(structure);
    }

    // Handle simple arithmetic expressions
    return this.evaluateArithmetic(expr);
  }

  // Evaluate function calls
  private evaluateFunction(functionName: string, argsString: string): FormulaValue {
    const args = this.parseArguments(argsString);
    
    switch (functionName) {
      case 'SUM':
        return this.sumFunction(args);
      case 'AVERAGE':
        return this.averageFunction(args);
      case 'COUNT':
        return this.countFunction(args);
      case 'MAX':
        return this.maxFunction(args);
      case 'MIN':
        return this.minFunction(args);
      case 'IF':
        return this.ifFunction(args);
      default:
        return formulaError(`Unknown function: ${functionName}`);
    }
  }

  // Parse function arguments
  private parseArguments(argsString: string): FormulaValue[] {
    if (!argsString.trim()) {
      return [];
    }

    // Simple comma-separated argument parsing
    const argStrings = this.splitArguments(argsString);
    return argStrings.map(arg => this.parseExpression(arg.trim()));
  }

  // Split arguments respecting nested parentheses and quotes
  private splitArguments(argsString: string): string[] {
    const args: string[] = [];
    let current = '';
    let depth = 0;
    let inQuotes = false;

    for (let i = 0; i < argsString.length; i++) {
      const char = argsString[i];
      
      if (char === '"' && argsString[i - 1] !== '\\') {
        inQuotes = !inQuotes;
      }
      
      if (!inQuotes) {
        if (char === '(') depth++;
        else if (char === ')') depth--;
        else if (char === ',' && depth === 0) {
          args.push(current);
          current = '';
          continue;
        }
      }
      
      current += char;
    }
    
    if (current) {
      args.push(current);
    }
    
    return args;
  }

  // Function implementations
  private sumFunction(args: FormulaValue[]): FormulaValue {
    let sum = 0;
    for (const arg of args) {
      const numbers = this.extractNumbers(arg);
      sum += numbers.reduce((acc, num) => acc + num, 0);
    }
    return formulaNumber(sum);
  }

  private averageFunction(args: FormulaValue[]): FormulaValue {
    const allNumbers: number[] = [];
    for (const arg of args) {
      allNumbers.push(...this.extractNumbers(arg));
    }
    
    if (allNumbers.length === 0) {
      return formulaError("No numbers to average");
    }
    
    const sum = allNumbers.reduce((acc, num) => acc + num, 0);
    return formulaNumber(sum / allNumbers.length);
  }

  private countFunction(args: FormulaValue[]): FormulaValue {
    let count = 0;
    for (const arg of args) {
      count += this.extractNumbers(arg).length;
    }
    return formulaNumber(count);
  }

  private maxFunction(args: FormulaValue[]): FormulaValue {
    const allNumbers: number[] = [];
    for (const arg of args) {
      allNumbers.push(...this.extractNumbers(arg));
    }
    
    if (allNumbers.length === 0) {
      return formulaError("No numbers for MAX");
    }
    
    return formulaNumber(Math.max(...allNumbers));
  }

  private minFunction(args: FormulaValue[]): FormulaValue {
    const allNumbers: number[] = [];
    for (const arg of args) {
      allNumbers.push(...this.extractNumbers(arg));
    }
    
    if (allNumbers.length === 0) {
      return formulaError("No numbers for MIN");
    }
    
    return formulaNumber(Math.min(...allNumbers));
  }

  private ifFunction(args: FormulaValue[]): FormulaValue {
    if (args.length < 2 || args.length > 3) {
      return formulaError("IF function requires 2 or 3 arguments");
    }

    const condition = args[0];
    const trueValue = args[1];
    const falseValue = args.length > 2 ? args[2] : emptyCell;

    // Evaluate condition as boolean
    let conditionResult = false;
    if (condition.kind === NUMBER) {
      conditionResult = condition.value !== 0;
    } else if (condition.kind === BOOLEAN) {
      conditionResult = condition.value;
    } else if (condition.kind === STRING) {
      conditionResult = condition.value.toLowerCase() === 'true';
    }

    return conditionResult ? trueValue : falseValue;
  }

  // Helper to extract numbers from various value types
  private extractNumbers(value: FormulaValue): number[] {
    switch (value.kind) {
      case NUMBER:
        return [value.value];
      case STRING:
        const num = parseFloat(value.value);
        return isNaN(num) ? [] : [num];
      case 'RANGE':
        return value.value.filter((v): v is number => typeof v === 'number');
      case ERROR:
      case EMPTY:
        return [];
      default:
        return [];
    }
  }

  // Evaluate cell references like A1, B2
  private evaluateCellReference(cellRef: string): FormulaValue {
    const match = cellRef.match(/^([A-Z]+)(\d+)$/);
    if (!match) {
      return formulaError(`Invalid cell reference: ${cellRef}`);
    }

    const colLetters = match[1];
    const rowNum = parseInt(match[2]) - 1; // Convert to 0-based

    // Convert column letters to number
    let colNum = 0;
    for (let i = 0; i < colLetters.length; i++) {
      colNum = colNum * 26 + (colLetters.charCodeAt(i) - 65 + 1);
    }
    colNum -= 1; // Convert to 0-based

    // Track this cell as a dependency
    this.addDependency({
      type: 'cell',
      row: rowNum,
      col: colNum
    });

    // Get cell value from the structure system
    const cellValue = getCellValue(rowNum, colNum, this.structures, this.positions);
    
    if (!cellValue) {
      return emptyCell;
    }

    // Try to parse as number first
    const numValue = parseFloat(cellValue);
    if (!isNaN(numValue)) {
      return formulaNumber(numValue);
    }

    return formulaString(cellValue);
  }

  // Evaluate range references like A1:B2
  private evaluateRangeReference(rangeRef: string): FormulaValue {
    const match = rangeRef.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!match) {
      return formulaError(`Invalid range reference: ${rangeRef}`);
    }

    // Parse start and end cells
    const startCol = this.columnLettersToNumber(match[1]);
    const startRow = parseInt(match[2]) - 1;
    const endCol = this.columnLettersToNumber(match[3]);
    const endRow = parseInt(match[4]) - 1;

    // Track this range as a dependency
    this.addDependency({
      type: 'range',
      startRow,
      startCol,
      endRow,
      endCol
    });

    const values: Array<number | string> = [];
    
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cellValue = getCellValue(row, col, this.structures, this.positions);
        if (cellValue) {
          const numValue = parseFloat(cellValue);
          values.push(isNaN(numValue) ? cellValue : numValue);
        }
      }
    }

    return { kind: 'RANGE', value: values };
  }

  // Convert column letters to number (A=0, B=1, ..., Z=25, AA=26, etc.)
  private columnLettersToNumber(letters: string): number {
    let result = 0;
    for (let i = 0; i < letters.length; i++) {
      result = result * 26 + (letters.charCodeAt(i) - 65 + 1);
    }
    return result - 1; // Convert to 0-based
  }

  // Get structure by name
  private getStructureByName(name: string): Structure | undefined {
    for (const [, structure] of this.structures) {
      if (structure.name === name) {
        return structure;
      }
    }
    return undefined;
  }

  // Evaluate structure references (named structures)
  private evaluateStructureReference(structure: Structure): FormulaValue {
    // Track this structure as a dependency
    this.addDependency({
      type: 'structure',
      structureId: structure.id
    });

    const values: Array<number | string> = [];
    
    // Get all values from the structure
    const endRow = structure.startPosition.row + structure.dimensions.rows - 1;
    const endCol = structure.startPosition.col + structure.dimensions.cols - 1;
    
    for (let row = structure.startPosition.row; row <= endRow; row++) {
      for (let col = structure.startPosition.col; col <= endCol; col++) {
        const cellValue = getCellValue(row, col, this.structures, this.positions);
        if (cellValue) {
          const numValue = parseFloat(cellValue);
          values.push(isNaN(numValue) ? cellValue : numValue);
        }
      }
    }

    return { kind: 'RANGE', value: values };
  }

  // Evaluate table column references like table[columnName]
  private evaluateTableColumnReference(tableName: string, columnName: string): FormulaValue {
    // Find the table structure by name
    const tableStructure = this.getStructureByName(tableName);
    if (!tableStructure) {
      return formulaError(`Table '${tableName}' not found`);
    }

    if (tableStructure.type !== 'table') {
      return formulaError(`'${tableName}' is not a table`);
    }

    const table = tableStructure as TableStructure;
    
    // Track this table column as a dependency
    this.addDependency({
      type: 'tableColumn',
      tableName: tableName,
      columnName: columnName
    });

    // Check if the table has column name mappings
    if (!table.colNames || typeof table.colNames !== 'object') {
      return formulaError(`Table '${tableName}' has no column definitions`);
    }

    // Find the column index by name
    const columnIndex = table.colNames[columnName];
    if (columnIndex === undefined) {
      return formulaError(`Column '${columnName}' not found in table '${tableName}'`);
    }

    // Get the number of header rows to skip
    const headerRows = table.colHeaderLevels || 0;
    
    // Extract values from the column (excluding headers)
    const values: Array<number | string> = [];
    
    if (table.itemIds && Array.isArray(table.itemIds)) {
      for (let rowIndex = headerRows; rowIndex < table.itemIds.length; rowIndex++) {
        const row = table.itemIds[rowIndex];
        if (row && columnIndex < row.length) {
          const cellId = row[columnIndex];
          if (cellId) {
            // Get the cell structure and its value
            const cellStructure = this.structures.get(cellId);
            if (cellStructure && cellStructure.type === 'cell') {
              const cell = cellStructure as CellStructure;
              const cellValue = cell.value || '';
              if (cellValue) {
                const numValue = parseFloat(cellValue);
                values.push(isNaN(numValue) ? cellValue : numValue);
              }
            }
          }
        }
      }
    }

    return { kind: 'RANGE', value: values };
  }

  // Simple arithmetic evaluation (basic implementation)
  private evaluateArithmetic(expr: string): FormulaValue {
    // This is a very basic implementation - can be expanded
    try {
      // Handle simple addition, subtraction, multiplication, division
      const operators = ['+', '-', '*', '/'];
      
      for (const op of operators) {
        const parts = expr.split(op);
        if (parts.length === 2) {
          const left = this.parseExpression(parts[0].trim());
          const right = this.parseExpression(parts[1].trim());
          
          if (left.kind === NUMBER && right.kind === NUMBER) {
            switch (op) {
              case '+':
                return formulaNumber(left.value + right.value);
              case '-':
                return formulaNumber(left.value - right.value);
              case '*':
                return formulaNumber(left.value * right.value);
              case '/':
                return right.value === 0 
                  ? formulaError("Division by zero") 
                  : formulaNumber(left.value / right.value);
            }
          }
        }
      }
      
      return formulaError(`Cannot evaluate expression: ${expr}`);
    } catch (error) {
      return formulaError(`Arithmetic error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
