// GeomQ Lexer - Tokenizer for the ternary quantum-gate scripting language

export type TokenType =
  | 'QUTRIT' | 'GATE' | 'MEASURE' | 'FOLD' | 'OVER' | 'AS' | 'ENDFOLD'
  | 'EMIT' | 'FN' | 'ENDFN' | 'RETURN' | 'IF' | 'THEN' | 'ELSE'
  | 'IDENT' | 'NUMBER' | 'STRING' | 'KET' | 'ARROW'
  | 'ASSIGN' | 'PLUS' | 'MINUS' | 'STAR' | 'SLASH' | 'PERCENT'
  | 'EQ' | 'NEQ' | 'LT' | 'GT' | 'LTE' | 'GTE'
  | 'AND' | 'OR' | 'NOT'
  | 'LPAREN' | 'RPAREN' | 'COMMA' | 'NEWLINE' | 'EOF'
  | 'RANGE';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

const KEYWORDS: Record<string, TokenType> = {
  qutrit: 'QUTRIT', gate: 'GATE', measure: 'MEASURE',
  fold: 'FOLD', over: 'OVER', as: 'AS', endfold: 'ENDFOLD',
  emit: 'EMIT', fn: 'FN', endfn: 'ENDFN', return: 'RETURN',
  if: 'IF', then: 'THEN', else: 'ELSE',
  and: 'AND', or: 'OR', not: 'NOT',
  range: 'RANGE',
};

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  while (i < source.length) {
    const ch = source[i];

    // Skip comments (-- to end of line)
    if (ch === '-' && source[i + 1] === '-') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }

    // Whitespace (not newline)
    if (ch === ' ' || ch === '\t' || ch === '\r') { i++; col++; continue; }

    // Newline
    if (ch === '\n') {
      tokens.push({ type: 'NEWLINE', value: '\n', line, col });
      i++; line++; col = 1; continue;
    }

    // Ket notation: |0>, |1>, |2>
    if (ch === '|' && /[012]/.test(source[i + 1] || '') && source[i + 2] === '>') {
      tokens.push({ type: 'KET', value: source[i + 1], line, col });
      i += 3; col += 3; continue;
    }

    // Arrow: ->
    if (ch === '-' && source[i + 1] === '>') {
      tokens.push({ type: 'ARROW', value: '->', line, col });
      i += 2; col += 2; continue;
    }

    // Operators
    if (ch === '=' && source[i + 1] === '=') { tokens.push({ type: 'EQ', value: '==', line, col }); i += 2; col += 2; continue; }
    if (ch === '!' && source[i + 1] === '=') { tokens.push({ type: 'NEQ', value: '!=', line, col }); i += 2; col += 2; continue; }
    if (ch === '<' && source[i + 1] === '=') { tokens.push({ type: 'LTE', value: '<=', line, col }); i += 2; col += 2; continue; }
    if (ch === '>' && source[i + 1] === '=') { tokens.push({ type: 'GTE', value: '>=', line, col }); i += 2; col += 2; continue; }

    const singleOps: Record<string, TokenType> = {
      '=': 'ASSIGN', '+': 'PLUS', '-': 'MINUS', '*': 'STAR', '/': 'SLASH', '%': 'PERCENT',
      '<': 'LT', '>': 'GT', '(': 'LPAREN', ')': 'RPAREN', ',': 'COMMA',
    };
    if (singleOps[ch]) {
      tokens.push({ type: singleOps[ch], value: ch, line, col });
      i++; col++; continue;
    }

    // String
    if (ch === '"') {
      let str = '';
      i++; col++;
      while (i < source.length && source[i] !== '"' && source[i] !== '\n') {
        str += source[i]; i++; col++;
      }
      if (source[i] === '"') { i++; col++; }
      tokens.push({ type: 'STRING', value: str, line, col });
      continue;
    }

    // Number
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(source[i + 1] || ''))) {
      let num = '';
      while (i < source.length && /[\d.]/.test(source[i])) { num += source[i]; i++; col++; }
      tokens.push({ type: 'NUMBER', value: num, line, col });
      continue;
    }

    // Identifier / keyword
    if (/[a-zA-Z_]/.test(ch)) {
      let id = '';
      const startCol = col;
      while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) { id += source[i]; i++; col++; }
      const kw = KEYWORDS[id.toLowerCase()];
      tokens.push({ type: kw || 'IDENT', value: id, line, col: startCol });
      continue;
    }

    // Unknown character - skip
    i++; col++;
  }

  tokens.push({ type: 'EOF', value: '', line, col });
  return tokens;
}
