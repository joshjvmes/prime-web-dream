

# Deep Terminal Sessions and Enhanced Interactivity

## Overview

Transform the terminal from a simple command-response system into a rich, stateful shell with interactive modes, piping, scripting, and cross-app integration. Add interactivity to existing apps as well.

## 1. Interactive Terminal Modes (Deep Sessions)

Currently every command returns instant static output. This upgrade adds **modal sessions** -- commands that enter a persistent interactive sub-shell until the user exits.

### `q3 train` -- Interactive Training Session
Enter a loop where the terminal prompts for training samples one at a time, shows a running accuracy/loss counter, and updates in real-time. Type `done` to exit and see a summary.

### `psh debug <process>` -- Live Process Inspector
Attaches to a simulated qutrit process. Shows a streaming log of state transitions (|0> -> |1> -> |2>) with timestamps. Type `detach` to return to normal shell.

### `geomc repl` -- GeomC Read-Eval-Print Loop
A persistent compiler session where each line is compiled and executed immediately, with results shown inline. Maintains variable state across inputs. Type `.exit` to leave.

### `primenet trace <node>` -- Packet Trace Mode
Enters a live packet trace showing simulated packets flowing through the network with source/destination coordinates. Scrolls like a real `tcpdump`. Type `Ctrl+C` (or `stop`) to end.

## 2. Command Piping and Chaining

Add basic pipe (`|`) and chain (`;`) support:
- `qstat | grep engine` -- Filter process output
- `sysinfo; netstat` -- Run multiple commands sequentially
- `echo hello | fold_write test` -- Pipe data into file writes

Implement a simple `grep <pattern>` filter command that works on piped input.

## 3. Tab Autocomplete

Press Tab to autocomplete command names and arguments. Shows a brief suggestions list if multiple matches exist.

## 4. Terminal-to-App Integration

Commands that open or interact with GUI apps:
- `open <app>` -- Launch any app window from the terminal (e.g., `open primenet`)
- `kill <app>` -- Close an app window
- `launch settings` -- Open settings

This requires the terminal to receive an `onOpenApp` and `onCloseApp` callback from Desktop.

## 5. Animated Output

Replace instant text dumps with typewriter-style streaming for certain commands (like `q3 infer`, `geomc`), simulating real computation with 20-50ms delays between lines.

## 6. Persistent Environment Variables

Add `export VAR=value`, `env` (list all), and `$VAR` substitution in commands. Stored in component state, persists across commands within the session.

## Technical Details

### Modified Files
- `src/components/os/TerminalApp.tsx` -- Major rewrite: add modal session state machine, pipe parser, tab completion, env vars, typewriter output queue, and `onOpenApp`/`onCloseApp` props
- `src/components/os/Desktop.tsx` -- Pass `openWindow` and `closeWindow` callbacks to TerminalApp

### Architecture Changes in TerminalApp

The terminal gains a `mode` state:
- `'normal'` -- Default command prompt (current behavior)
- `'q3-train'` -- Training session sub-shell
- `'debug'` -- Process inspector streaming
- `'geomc-repl'` -- Compiler REPL with variable context
- `'trace'` -- Network packet trace stream

When in a non-normal mode, the prompt changes (e.g., `q3-train ▸`, `geomc ▸`) and input is routed to the mode-specific handler instead of the main command switch. An interval or timer drives streaming output for `debug` and `trace` modes.

### Pipe Implementation
Before dispatching, the input string is split on `|`. Each segment is executed in order, with the output of the previous command passed as filterable input to the next. `grep` simply filters lines containing the pattern.

### Tab Completion
On Tab keypress, find all commands starting with the current input. If exactly one match, complete it. If multiple, show them as a temporary line in the terminal.

### Typewriter Output
Instead of appending all output lines at once, push them into a queue and use `setTimeout` to append one line at a time with a short delay, creating a streaming effect.

### No New Dependencies
Everything uses existing React state, `setTimeout`/`setInterval`, and the current architecture patterns.

