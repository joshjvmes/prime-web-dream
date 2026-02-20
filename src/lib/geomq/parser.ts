// GeomQ Parser - Produces AST from tokens

import { Token, TokenType } from './lexer';

export type ASTNode =
  | { type: 'program'; body: ASTNode[] }
  | { type: 'qutrit_decl'; name: string; state: number }
  | { type: 'gate_apply'; gate: string; targets: string[] }
  | { type: 'measure'; qutrit: string; result: string }
  | { type: 'emit'; expr: ASTNode }
  | { type: 'fold'; variable: string; init: ASTNode; rangeExpr: ASTNode; iterVar: string; body: ASTNode[] }
  | { type: 'fn_decl'; name: string; params: string[]; body: ASTNode[] }
  | { type: 'fn_call'; name: string; args: ASTNode[] }
  | { type: 'return_stmt'; expr: ASTNode }
  | { type: 'if_stmt'; condition: ASTNode; then: ASTNode[]; else?: ASTNode[] }
  | { type: 'assign'; name: string; expr: ASTNode }
  | { type: 'binary'; op: string; left: ASTNode; right: ASTNode }
  | { type: 'unary'; op: string; operand: ASTNode }
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'ident'; name: string }
  | { type: 'range_call'; arg: ASTNode };

export function parse(tokens: Token[]): ASTNode {
  let pos = 0;

  function peek(): Token { return tokens[pos] || { type: 'EOF', value: '', line: 0, col: 0 }; }
  function advance(): Token { return tokens[pos++]; }
  function expect(type: TokenType): Token {
    const t = advance();
    if (t.type !== type) throw new Error(`Expected ${type} but got ${t.type} ("${t.value}") at line ${t.line}`);
    return t;
  }
  function match(type: TokenType): boolean {
    if (peek().type === type) { advance(); return true; }
    return false;
  }
  function skipNewlines() { while (peek().type === 'NEWLINE') advance(); }

  function parseProgram(): ASTNode {
    const body: ASTNode[] = [];
    skipNewlines();
    while (peek().type !== 'EOF') {
      body.push(parseStatement());
      skipNewlines();
    }
    return { type: 'program', body };
  }

  function parseStatement(): ASTNode {
    const t = peek();

    if (t.type === 'QUTRIT') return parseQutritDecl();
    if (t.type === 'GATE') return parseGateApply();
    if (t.type === 'MEASURE') return parseMeasure();
    if (t.type === 'EMIT') return parseEmit();
    if (t.type === 'FOLD') return parseFold();
    if (t.type === 'FN') return parseFnDecl();
    if (t.type === 'RETURN') return parseReturn();
    if (t.type === 'IF') return parseIf();

    // Assignment or expression
    if (t.type === 'IDENT' && tokens[pos + 1]?.type === 'ASSIGN') {
      const name = advance().value;
      advance(); // =
      const expr = parseExpr();
      return { type: 'assign', name, expr };
    }

    return parseExpr();
  }

  function parseQutritDecl(): ASTNode {
    advance(); // qutrit
    const name = expect('IDENT').value;
    expect('ASSIGN');
    const state = parseInt(expect('KET').value) as 0 | 1 | 2;
    return { type: 'qutrit_decl', name, state };
  }

  function parseGateApply(): ASTNode {
    advance(); // gate
    const gate = expect('IDENT').value.toUpperCase();
    const targets: string[] = [expect('IDENT').value];
    while (peek().type === 'IDENT' && peek().value !== 'gate' && peek().value !== 'measure') {
      targets.push(advance().value);
    }
    return { type: 'gate_apply', gate, targets };
  }

  function parseMeasure(): ASTNode {
    advance(); // measure
    const qutrit = expect('IDENT').value;
    expect('ARROW');
    const result = expect('IDENT').value;
    return { type: 'measure', qutrit, result };
  }

  function parseEmit(): ASTNode {
    advance(); // emit
    return { type: 'emit', expr: parseExpr() };
  }

  function parseFold(): ASTNode {
    advance(); // fold
    const variable = expect('IDENT').value;
    expect('ASSIGN');
    const init = parseExpr();
    skipNewlines();
    expect('OVER');
    const rangeExpr = parseExpr();
    expect('AS');
    const iterVar = expect('IDENT').value;
    skipNewlines();
    const body: ASTNode[] = [];
    while (peek().type !== 'ENDFOLD' && peek().type !== 'EOF') {
      body.push(parseStatement());
      skipNewlines();
    }
    match('ENDFOLD');
    return { type: 'fold', variable, init, rangeExpr, iterVar, body };
  }

  function parseFnDecl(): ASTNode {
    advance(); // fn
    const name = expect('IDENT').value;
    expect('LPAREN');
    const params: string[] = [];
    if (peek().type !== 'RPAREN') {
      params.push(expect('IDENT').value);
      while (match('COMMA')) params.push(expect('IDENT').value);
    }
    expect('RPAREN');
    skipNewlines();
    const body: ASTNode[] = [];
    while (peek().type !== 'ENDFN' && peek().type !== 'EOF') {
      body.push(parseStatement());
      skipNewlines();
    }
    match('ENDFN');
    return { type: 'fn_decl', name, params, body };
  }

  function parseReturn(): ASTNode {
    advance(); // return
    return { type: 'return_stmt', expr: parseExpr() };
  }

  function parseIf(): ASTNode {
    advance(); // if
    const condition = parseExpr();
    expect('THEN');
    skipNewlines();
    const thenBody: ASTNode[] = [];
    while (peek().type !== 'ELSE' && peek().type !== 'NEWLINE' && peek().type !== 'EOF' && peek().type !== 'ENDFN' && peek().type !== 'ENDFOLD') {
      thenBody.push(parseStatement());
      if (peek().type === 'NEWLINE') break;
    }
    let elseBody: ASTNode[] | undefined;
    skipNewlines();
    if (peek().type === 'ELSE') {
      advance();
      skipNewlines();
      elseBody = [];
      elseBody.push(parseStatement());
    }
    return { type: 'if_stmt', condition, then: thenBody, else: elseBody };
  }

  function parseExpr(): ASTNode {
    return parseOr();
  }

  function parseOr(): ASTNode {
    let left = parseAnd();
    while (peek().type === 'OR') { advance(); left = { type: 'binary', op: 'or', left, right: parseAnd() }; }
    return left;
  }

  function parseAnd(): ASTNode {
    let left = parseComparison();
    while (peek().type === 'AND') { advance(); left = { type: 'binary', op: 'and', left, right: parseComparison() }; }
    return left;
  }

  function parseComparison(): ASTNode {
    let left = parseAddSub();
    const ops: Record<string, string> = { EQ: '==', NEQ: '!=', LT: '<', GT: '>', LTE: '<=', GTE: '>=' };
    while (ops[peek().type]) {
      const op = ops[advance().type];
      left = { type: 'binary', op, left, right: parseAddSub() };
    }
    return left;
  }

  function parseAddSub(): ASTNode {
    let left = parseMulDiv();
    while (peek().type === 'PLUS' || peek().type === 'MINUS') {
      const op = advance().value;
      left = { type: 'binary', op, left, right: parseMulDiv() };
    }
    return left;
  }

  function parseMulDiv(): ASTNode {
    let left = parseUnary();
    while (peek().type === 'STAR' || peek().type === 'SLASH' || peek().type === 'PERCENT') {
      const op = advance().value;
      left = { type: 'binary', op, left, right: parseUnary() };
    }
    return left;
  }

  function parseUnary(): ASTNode {
    if (peek().type === 'NOT') { advance(); return { type: 'unary', op: 'not', operand: parseUnary() }; }
    if (peek().type === 'MINUS') { advance(); return { type: 'unary', op: '-', operand: parseUnary() }; }
    return parsePrimary();
  }

  function parsePrimary(): ASTNode {
    const t = peek();

    if (t.type === 'NUMBER') { advance(); return { type: 'number', value: parseFloat(t.value) }; }
    if (t.type === 'STRING') { advance(); return { type: 'string', value: t.value }; }

    if (t.type === 'RANGE') {
      advance();
      expect('LPAREN');
      const arg = parseExpr();
      expect('RPAREN');
      return { type: 'range_call', arg };
    }

    if (t.type === 'IDENT') {
      advance();
      // Function call?
      if (peek().type === 'LPAREN') {
        advance();
        const args: ASTNode[] = [];
        if (peek().type !== 'RPAREN') {
          args.push(parseExpr());
          while (match('COMMA')) args.push(parseExpr());
        }
        expect('RPAREN');
        return { type: 'fn_call', name: t.value, args };
      }
      return { type: 'ident', name: t.value };
    }

    if (t.type === 'LPAREN') {
      advance();
      const expr = parseExpr();
      expect('RPAREN');
      return expr;
    }

    advance();
    return { type: 'number', value: 0 };
  }

  return parseProgram();
}
