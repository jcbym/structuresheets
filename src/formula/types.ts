// Formula system types for StructureSheets

export const NUMBER = "NUMBER";
export const BOOLEAN = "BOOLEAN";
export const STRING = "STRING";
export const ERROR = "ERROR";
export const EMPTY = "EMPTY";
export const REFERENCE = "REFERENCE";
export const RANGE = "RANGE";

export type FormulaValue = 
  | { kind: "NUMBER"; value: number }
  | { kind: "BOOLEAN"; value: boolean }
  | { kind: "STRING"; value: string }
  | { kind: "ERROR"; value: string }
  | { kind: "EMPTY"; value: string }
  | { kind: "REFERENCE"; value: string }
  | { kind: "RANGE"; value: Array<number | string> };

export type FormulaContext = {
  getStructureByName: (name: string) => any;
  getCellValue: (row: number, col: number) => FormulaValue;
  getRangeValues: (startRow: number, startCol: number, endRow: number, endCol: number) => FormulaValue[];
  parseA1Notation: (notation: string) => { row: number; col: number } | null;
  parseRangeNotation: (notation: string) => { 
    startRow: number; 
    startCol: number; 
    endRow: number; 
    endCol: number; 
  } | null;
};

// Helper functions
export const formulaNumber = (x: number): FormulaValue => ({
  kind: NUMBER,
  value: x,
});

export const formulaBoolean = (b: boolean): FormulaValue => ({
  kind: BOOLEAN,
  value: b,
});

export const formulaString = (s: string): FormulaValue => ({
  kind: STRING,
  value: s,
});

export const formulaError = (msg: string): FormulaValue => ({
  kind: ERROR,
  value: msg,
});

export const emptyCell: FormulaValue = {
  kind: EMPTY,
  value: ''
};

export const formulaReference = (ref: string): FormulaValue => ({
  kind: REFERENCE,
  value: ref,
});

export const formulaRange = (values: Array<number | string>): FormulaValue => ({
  kind: RANGE,
  value: values,
});
