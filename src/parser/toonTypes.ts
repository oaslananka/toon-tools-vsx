export interface ToonPosition {
  line: number;
  character: number;
}

export interface ToonTextRange {
  start: ToonPosition;
  end: ToonPosition;
}

export interface ToonField {
  name: string;
  range: ToonTextRange;
  valueRange: ToonTextRange;
}

export interface ToonValue {
  value: string;
  range: ToonTextRange;
  valueRange: ToonTextRange;
}

export interface ToonComment {
  line: number;
  text: string;
  range: ToonTextRange;
}

export interface ToonRow {
  line: number;
  values: string[];
  valueTokens: ToonValue[];
  range: ToonTextRange;
}

export interface ToonBlock {
  name: string;
  rowCountDeclared: number;
  fields: string[];
  fieldTokens: ToonField[];
  headerLine: number;
  headerRange: ToonTextRange;
  nameRange: ToonTextRange;
  rowCountRange: ToonTextRange;
  fieldsRange: ToonTextRange;
  bodyStartLine: number;
  bodyEndLine: number;
  rows: ToonRow[];
  comments: ToonComment[];
  parseErrors: ToonParseError[];
}

export interface ToonDocument {
  blocks: ToonBlock[];
  comments: ToonComment[];
  parseErrors: ToonParseError[];
}

export type ToonDiagnosticSeverity = 'error' | 'warning' | 'info';

export interface ToonParseError {
  message: string;
  severity: ToonDiagnosticSeverity;
  range: ToonTextRange;
}

export interface ToonDiagnostic {
  message: string;
  severity: ToonDiagnosticSeverity;
  range: ToonTextRange;
}
