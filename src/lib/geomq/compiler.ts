// GeomQ Compiler - Compiles AST to executable JavaScript

import { tokenize } from './lexer';
import { parse, ASTNode } from './parser';
import { createQutrit, measure, GATES, DUAL_GATES, QutritState } from './gates';

export interface CompileResult {
  js: string;
  output: string[];
  error?: string;
  phases: string[];
}

function emitJS(node: ASTNode): string {
  switch (node.type) {
    case 'program':
      return node.body.map(emitJS).join('\n');
    case 'qutrit_decl':
      return `__qutrits["${node.name}"] = __createQutrit(${node.state});`;
    case 'gate_apply':
      if (node.targets.length === 1) {
        return `__qutrits["${node.targets[0]}"] = __applyGate("${node.gate}", __qutrits["${node.targets[0]}"]);`;
      }
      return `{ const [a, b] = __applyDualGate("${node.gate}", __qutrits["${node.targets[0]}"], __qutrits["${node.targets[1]}"]); __qutrits["${node.targets[0]}"] = a; __qutrits["${node.targets[1]}"] = b; }`;
    case 'measure':
      return `var ${node.result} = __measure(__qutrits["${node.qutrit}"]);`;
    case 'emit':
      return `__emit(${emitExpr(node.expr)});`;
    case 'fold':
      return `var ${node.variable} = ${emitExpr(node.init)};\nfor (const ${node.iterVar} of ${emitExpr(node.rangeExpr)}) {\n${node.body.map(emitJS).join('\n')}\n}`;
    case 'fn_decl':
      return `function ${node.name}(${node.params.join(', ')}) {\n${node.body.map(emitJS).join('\n')}\n}`;
    case 'return_stmt':
      return `return ${emitExpr(node.expr)};`;
    case 'if_stmt': {
      let s = `if (${emitExpr(node.condition)}) {\n${node.then.map(emitJS).join('\n')}\n}`;
      if (node.else) s += ` else {\n${node.else.map(emitJS).join('\n')}\n}`;
      return s;
    }
    case 'assign':
      return `${node.name} = ${emitExpr(node.expr)};`;
    default:
      return emitExpr(node) + ';';
  }
}

function emitExpr(node: ASTNode): string {
  switch (node.type) {
    case 'number': return String(node.value);
    case 'string': return JSON.stringify(node.value);
    case 'ident': return node.name;
    case 'binary': {
      const op = node.op === 'and' ? '&&' : node.op === 'or' ? '||' : node.op;
      return `(${emitExpr(node.left)} ${op} ${emitExpr(node.right)})`;
    }
    case 'unary':
      return node.op === 'not' ? `(!${emitExpr(node.operand)})` : `(${node.op}${emitExpr(node.operand)})`;
    case 'fn_call':
      return `${node.name}(${node.args.map(emitExpr).join(', ')})`;
    case 'range_call':
      return `Array.from({length: ${emitExpr(node.arg)}}, (_, i) => i)`;
    default:
      return '0';
  }
}

export function compile(source: string): CompileResult {
  const phases: string[] = [];
  const output: string[] = [];

  try {
    // Phase 1: Lex
    phases.push('Tokenizing...');
    const tokens = tokenize(source);
    phases.push(`Lexed ${tokens.length} tokens`);

    // Phase 2: Parse
    phases.push('Parsing AST...');
    const ast = parse(tokens);
    phases.push('AST constructed');

    // Phase 3: Compile
    phases.push('Compiling to JavaScript...');
    const js = emitJS(ast);
    phases.push('JavaScript emitted');

    // Phase 4: Execute in sandbox
    phases.push('Executing in sandbox...');

    const qutrits: Record<string, QutritState> = {};
    const sandbox = new Function(
      '__qutrits', '__createQutrit', '__measure', '__applyGate', '__applyDualGate', '__emit',
      js
    );

    sandbox(
      qutrits,
      createQutrit,
      measure,
      (gate: string, q: QutritState) => {
        const fn = GATES[gate];
        if (!fn) throw new Error(`Unknown gate: ${gate}`);
        return fn(q);
      },
      (gate: string, a: QutritState, b: QutritState) => {
        const fn = DUAL_GATES[gate];
        if (!fn) throw new Error(`Unknown dual gate: ${gate}`);
        return fn(a, b);
      },
      (val: unknown) => { output.push(String(val)); },
    );

    phases.push('Execution complete');
    return { js, output, phases };
  } catch (e: any) {
    return { js: '', output, error: e.message, phases: [...phases, `Error: ${e.message}`] };
  }
}

export const EXAMPLE_PROGRAMS: { label: string; code: string }[] = [
  {
    label: 'Hello Qutrits',
    code: `-- Hello GeomQ!
qutrit x = |2>
qutrit y = |0>
gate HADAMARD x
measure x -> result
emit "Measured x: " + result
emit "Hello from GeomQ!"`,
  },
  {
    label: 'Fibonacci',
    code: `-- Fibonacci via fold
fn fibonacci(n)
  if n < 2 then return n
  return fibonacci(n - 1) + fibonacci(n - 2)
endfn

fold i = 0
  over range(10) as i
    emit "fib(" + i + ") = " + fibonacci(i)
endfold`,
  },
  {
    label: 'Gate Pipeline',
    code: `-- Gate pipeline demo
qutrit q = |0>
emit "Initial: |0>"
gate HADAMARD q
emit "After HADAMARD"
gate PHASE q
emit "After PHASE"
gate SHIFT q
emit "After SHIFT"
measure q -> result
emit "Final measurement: |" + result + ">"`,
  },
  {
    label: 'Ternary Sum',
    code: `-- Ternary sum using fold
fold sum = 0
  over range(100) as i
    sum = sum + i
endfold
emit "Sum 0..99 = " + sum`,
  },
  {
    label: 'CNOT Gate',
    code: `-- Controlled-NOT gate demo
qutrit control = |1>
qutrit target = |0>
emit "Before CNOT:"
measure control -> c1
measure target -> t1
emit "  control: |" + c1 + ">"
emit "  target: |" + t1 + ">"

qutrit control2 = |2>
qutrit target2 = |0>
gate CNOT control2 target2
measure control2 -> c2
measure target2 -> t2
emit "After CNOT(|2>, |0>):"
emit "  control: |" + c2 + ">"
emit "  target: |" + t2 + ">"`,
  },
];
