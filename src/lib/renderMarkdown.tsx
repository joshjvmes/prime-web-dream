import React from 'react';
import ActionChip from '@/components/os/rokcat/ActionChip';

const CHIP_RE = /\{\{chip:(open|close|nav):([a-z]+)(?::([^\}]+))?\}\}/g;

/** Splits a string by chip placeholders and returns React nodes */
function renderChips(text: string, keyPrefix: string): React.ReactNode {
  CHIP_RE.lastIndex = 0;
  if (!CHIP_RE.test(text)) return text;
  CHIP_RE.lastIndex = 0;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = CHIP_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const actionRaw = match[1];
    const appId = match[2];
    const context = match[3];
    parts.push(
      <ActionChip
        key={`${keyPrefix}-chip-${match.index}`}
        appId={appId}
        action={actionRaw === 'nav' ? 'navigate' : actionRaw as 'open' | 'close'}
        context={context}
      />
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return <>{parts}</>;
}

/** Process an HTML string to inject chips (used for inline-formatted paragraphs) */
function renderHtmlWithChips(html: string, key: string): React.ReactNode {
  CHIP_RE.lastIndex = 0;
  if (!CHIP_RE.test(html)) {
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  }
  CHIP_RE.lastIndex = 0;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = CHIP_RE.exec(html)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`${key}-h-${lastIndex}`} dangerouslySetInnerHTML={{ __html: html.slice(lastIndex, match.index) }} />);
    }
    const action = match[1] as 'open' | 'close' | 'navigate';
    const appId = match[2];
    const context = match[3];
    parts.push(
      <ActionChip
        key={`${key}-chip-${match.index}`}
        appId={appId}
        action={action === 'nav' ? 'navigate' : action}
        context={context}
      />
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < html.length) {
    parts.push(<span key={`${key}-h-${lastIndex}`} dangerouslySetInnerHTML={{ __html: html.slice(lastIndex) }} />);
  }
  return <>{parts}</>;
}

export function renderMarkdown(md: string): React.ReactNode[] {
  const lines = md.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++; }
      i++;
      elements.push(
        <pre key={`code-${i}`} className="bg-card border border-border rounded p-3 mb-3 text-[10px] leading-relaxed overflow-x-auto max-w-full whitespace-pre-wrap break-all">
          <code className="text-primary/80">{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Table
    if (line.includes('|') && line.trim().startsWith('|')) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        const row = lines[i].split('|').map(c => c.trim()).filter(Boolean);
        if (!row.every(c => /^[-:]+$/.test(c))) tableRows.push(row);
        i++;
      }
      if (tableRows.length > 0) {
        elements.push(
          <div key={`tbl-${i}`} className="border border-border rounded mb-3 overflow-hidden">
            <table className="w-full text-[10px]">
              <thead><tr className="bg-muted/30">
                {tableRows[0].map((h, j) => <th key={j} className="text-left px-2 py-1 border-b border-border font-display text-primary">{renderChips(h, `th-${i}-${j}`)}</th>)}
              </tr></thead>
              <tbody>
                {tableRows.slice(1).map((row, ri) => (
                  <tr key={ri} className="hover:bg-muted/20">
                    {row.map((cell, ci) => <td key={ci} className="px-2 py-1 border-b border-border/50 text-muted-foreground">{renderChips(cell, `td-${i}-${ri}-${ci}`)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Headings
    if (line.startsWith('### ')) { elements.push(<h3 key={`h3-${i}`} className="font-display text-xs tracking-wider text-primary mt-3 mb-1.5">{renderChips(line.slice(4), `h3-${i}`)}</h3>); i++; continue; }
    if (line.startsWith('## ')) { elements.push(<h2 key={`h2-${i}`} className="font-display text-sm tracking-wider text-primary mt-4 mb-2">{renderChips(line.slice(3), `h2-${i}`)}</h2>); i++; continue; }
    if (line.startsWith('# ')) { elements.push(<h1 key={`h1-${i}`} className="font-display text-lg tracking-wide text-foreground mb-1">{renderChips(line.slice(2), `h1-${i}`)}</h1>); i++; continue; }

    // Empty line
    if (!line.trim()) { i++; continue; }

    // Inline formatting for paragraph (with image support)
    const formatted = line
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded border border-border my-2" />')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-muted px-1 rounded text-primary/80">$1</code>');
    
    elements.push(
      <p key={`p-${i}`} className="text-muted-foreground leading-relaxed mb-3">
        {renderHtmlWithChips(formatted, `p-${i}`)}
      </p>
    );
    i++;
  }
  return elements;
}
