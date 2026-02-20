// Pipe and chain parsing utilities

import { processCommand, type CommandContext } from './commands';

/** Substitute $VAR references in a command string */
export function substituteEnvVars(cmd: string, envVars: Record<string, string>): string {
  return cmd.replace(/\$([A-Za-z_]\w*)/g, (_, name) => envVars[name] ?? '');
}

/** Execute a full input line with ; chains and | pipes */
export function executeWithPipesAndChains(
  rawInput: string,
  ctx: CommandContext
): { output: string[]; clear?: boolean; enterMode?: string } {
  const substituted = substituteEnvVars(rawInput, ctx.envVars);
  const chains = substituted.split(';').map(s => s.trim()).filter(Boolean);
  const allOutput: string[] = [];
  let shouldClear = false;

  for (const chain of chains) {
    const pipeSegments = chain.split('|').map(s => s.trim()).filter(Boolean);

    let pipedLines: string[] | null = null;

    for (let i = 0; i < pipeSegments.length; i++) {
      const segment = pipeSegments[i];
      const parts = segment.split(/\s+/);
      const cmd = parts[0]?.toLowerCase();

      // Handle grep as a pipe filter
      if (cmd === 'grep' && pipedLines !== null) {
        const pattern = parts.slice(1).join(' ').toLowerCase();
        pipedLines = pipedLines.filter(line => line.toLowerCase().includes(pattern));
        continue;
      }

      const result = processCommand(segment, ctx);

      if (result === 'mode') {
        // Return early — caller handles mode entry
        allOutput.push(...(pipedLines ?? []));
        return { output: allOutput, enterMode: segment };
      }

      if (result === null) {
        shouldClear = true;
        pipedLines = [];
      } else {
        pipedLines = result;
      }
    }

    if (pipedLines) {
      allOutput.push(...pipedLines);
    }
  }

  return { output: allOutput, clear: shouldClear };
}
