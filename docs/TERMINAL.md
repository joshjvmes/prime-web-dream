# Terminal & Command Reference

The PRIME Shell (`psh`) is a full terminal emulator accessible via the Terminal app or `Ctrl+`` `.

---

## Commands

Source: `src/components/os/terminal/commands.ts`

| Command | Arguments | Description |
|---|---|---|
| `help` | — | Show all available commands |
| `clear` | — | Clear terminal output |
| `echo <text>` | text | Echo text to output |
| `ask <question>` | question | Chat with Hyper AI from the shell |
| `sysinfo` | — | Display system information panel |
| `qstat` | — | Show qutrit process table |
| `netstat` | — | Show PrimeNet routing statistics |
| `flow_to <tags>` | semantic tags | Navigate to a semantic region |
| `fold_read <file>` | file tags | Read file from Prime FS |
| `fold_write <file>` | file tags | Write file to Prime FS |
| `prime_dist <a> <b>` | coordinates | Compute prime distance between coordinates |
| `waltz <state>` | 0/1/2 | Apply Fibonacci Waltz state transition |
| `q3 infer <data>` | comma-separated numbers | Run Q3 inference on data |
| `q3 train` | — | Enter interactive Q3 training mode |
| `geomc <code>` | expression | Compile with GeomC |
| `geomc repl` | — | Enter GeomC interactive REPL |
| `foldmem stats` | — | Show FoldMem memory statistics |
| `energy status` | — | Show energy harvesting status |
| `storage info` | — | Show Prime Storage capacity |
| `psh debug <proc>` | process name | Enter live process debugger |
| `primenet trace` | — | Enter packet trace mode |
| `primenet scan [target]` | target name | Enter network security scanner |
| `disk` | — | Enter interactive disk analyzer |
| `open <app>` | app name | Open an application window |
| `kill <app>` | app name | Close an application window |
| `export VAR=val` | VAR=value | Set environment variable |
| `env` | — | List environment variables |
| `grep <pattern>` | pattern | Filter piped input (pipe-only) |
| `uptime` | — | System uptime and load |
| `whoami` | — | Current user identity |
| `date` | — | Current timestamp (ISO + epoch) |
| `history` | — | Show last 20 commands |
| `widget <sub>` | subcommand | Control desktop widgets |

### App Names for `open` / `kill`

The following names map to app windows:

```
terminal, files, processes, sysinfo, q3inference, q3, primenet, geomc,
foldmem, storage, energy, settings, monitor, editor, chat, security,
browser, datacenter, board, gallery, cloudhooks, hooks, hypersphere,
hyper, calendar, docs, spreadsheet, grid, schemaforge, schema, canvas,
comm, phone, maps, pkg, audio, music, bets, signals, stream, vault,
videocall, video, link, agent, robotics, robots, booking, book, iot,
devices, arcade, games, admin
```

Multiple names resolve to the same app (e.g., `hyper` → `hypersphere`, `music` → `audio`).

---

## Pipe System

Source: `src/components/os/terminal/pipes.ts`

### Pipes (`|`)

Chain command output into filters:

```
qstat | grep engine
netstat | grep latency
```

`grep` filters lines containing the pattern (case-insensitive).

### Chains (`;`)

Execute multiple commands sequentially:

```
sysinfo ; netstat ; uptime
```

### Variable Substitution (`$VAR`)

Environment variables set with `export` can be referenced:

```
export NAME=Prime
echo Hello $NAME
```

Substitution happens before command parsing.

---

## Interactive Modes

Source: `src/components/os/terminal/modes.ts`

When entering a mode, the prompt changes and input is handled by the mode's handler.

### Q3 Training Mode (`q3 train`)

- **Prompt:** `q3-train ▸`
- **Input:** Numbers 0-100 to classify as qutrit states
- **Exit:** Type `done`
- **Output:** Per-sample accuracy and loss tracking, final summary

### Debug Mode (`psh debug <process>`)

- **Prompt:** `debug ▸`
- **Input:** Streams live state transitions for the attached process
- **Exit:** Type `detach`
- **Output:** Timestamped state transitions with energy deltas

### GeomC REPL (`geomc repl`)

- **Prompt:** `geomc ▸`
- **Input:** Mathematical expressions and variable assignments
- **Exit:** Type `.exit`
- **Output:** Evaluated results with compile time; variables persist across inputs

### Trace Mode (`primenet trace`)

- **Prompt:** `trace ▸`
- **Input:** Streams live PrimeNet packet traces
- **Exit:** Type `stop`
- **Output:** Timestamped packet data with protocol, source, destination, and TTL

### Scan Mode (`primenet scan [target]`)

- **Prompt:** `scan ▸`
- **Input:** Runs a progressive security scan on the target
- **Exit:** Type `stop` or wait for completion (100%)
- **Output:** Vulnerability discoveries and clean port probes

### Disk Analyzer (`disk`)

- **Prompt:** `disk ▸`
- **Commands:** `ls [path]`, `du <path>`, `top`, `exit`
- **Output:** Disk regions with size, usage bars, and Adinkra compression stats

---

## Widget Commands

Source: `src/components/os/terminal/widgetCommands.ts`

Control desktop widgets from the terminal:

| Command | Description |
|---|---|
| `widget list` | Show all widgets with on/off status and position |
| `widget toggle <name>` | Toggle a widget on/off |
| `widget show <name>` | Enable a widget |
| `widget hide <name>` | Disable a widget |
| `widget move <name> <x> <y>` | Move a widget to coordinates |
| `widget reset` | Reset all widgets to defaults |
| `widget all on\|off` | Enable/disable all widgets |

**Available widgets:** `clock`, `stats`, `notes`, `network`, `forge`, `agentLog`, `rokcat`

Widget names are resolved fuzzy (e.g., "clock", "stats", "rok" all work).
