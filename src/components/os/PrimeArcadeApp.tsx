import { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Bomb, RotateCcw, Trophy, Play } from 'lucide-react';

// ─── Lattice Minesweeper ───
type CellState = { mine: boolean; revealed: boolean; flagged: boolean; adjacent: number };

function createBoard(size: number, mines: number): CellState[][] {
  const board: CellState[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
  );
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * size);
    const c = Math.floor(Math.random() * size);
    if (!board[r][c].mine) { board[r][c].mine = true; placed++; }
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc].mine) count++;
      }
      board[r][c].adjacent = count;
    }
  }
  return board;
}

function LatticeMinesweeper() {
  const difficulties: { label: string; size: number; mines: number }[] = [
    { label: 'Easy', size: 8, mines: 10 },
    { label: 'Medium', size: 12, mines: 30 },
    { label: 'Hard', size: 16, mines: 60 },
  ];
  const [diff, setDiff] = useState(0);
  const [board, setBoard] = useState(() => createBoard(8, 10));
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [timer, setTimer] = useState(0);
  const [started, setStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const { size, mines } = difficulties[diff];

  const resetGame = useCallback((d = diff) => {
    const { size: s, mines: m } = difficulties[d];
    setBoard(createBoard(s, m));
    setGameOver(false);
    setWon(false);
    setTimer(0);
    setStarted(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [diff]);

  useEffect(() => {
    if (started && !gameOver && !won) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [started, gameOver, won]);

  const reveal = (r: number, c: number) => {
    if (gameOver || won || board[r][c].flagged || board[r][c].revealed) return;
    if (!started) setStarted(true);
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    if (newBoard[r][c].mine) {
      // Reveal all mines
      newBoard.forEach(row => row.forEach(cell => { if (cell.mine) cell.revealed = true; }));
      setBoard(newBoard);
      setGameOver(true);
      return;
    }
    // Flood fill
    const queue = [[r, c]];
    while (queue.length) {
      const [cr, cc] = queue.pop()!;
      if (cr < 0 || cr >= size || cc < 0 || cc >= size) continue;
      if (newBoard[cr][cc].revealed || newBoard[cr][cc].mine) continue;
      newBoard[cr][cc].revealed = true;
      if (newBoard[cr][cc].adjacent === 0) {
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) queue.push([cr + dr, cc + dc]);
      }
    }
    setBoard(newBoard);
    // Check win
    const unrevealed = newBoard.flat().filter(c => !c.revealed && !c.mine).length;
    if (unrevealed === 0) setWon(true);
  };

  const flag = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (gameOver || won || board[r][c].revealed) return;
    setBoard(prev => prev.map((row, ri) => row.map((cell, ci) =>
      ri === r && ci === c ? { ...cell, flagged: !cell.flagged } : cell
    )));
  };

  const flagCount = board.flat().filter(c => c.flagged).length;
  const ADJ_COLORS = ['', 'text-prime-cyan', 'text-prime-green', 'text-prime-amber', 'text-prime-red', 'text-prime-violet', 'text-prime-teal', 'text-foreground', 'text-muted-foreground'];
  const cellSize = size <= 8 ? 'w-7 h-7 text-[11px]' : size <= 12 ? 'w-5 h-5 text-[9px]' : 'w-4 h-4 text-[8px]';

  return (
    <div className="flex flex-col items-center gap-3 p-3">
      <div className="flex items-center gap-3 w-full">
        <div className="flex gap-1">
          {difficulties.map((d, i) => (
            <button key={d.label} onClick={() => { setDiff(i); resetGame(i); }}
              className={`px-2 py-0.5 text-[9px] font-display tracking-wider uppercase rounded border transition-colors ${
                i === diff ? 'bg-primary/20 border-primary/40 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >{d.label}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
          <span><Bomb size={10} className="inline mr-1" />{mines - flagCount}</span>
          <span>⏱ {timer}s</span>
          <button onClick={() => resetGame()} className="p-1 hover:text-primary transition-colors"><RotateCcw size={12} /></button>
        </div>
      </div>

      {(gameOver || won) && (
        <div className={`text-[10px] font-display tracking-wider uppercase ${won ? 'text-prime-green' : 'text-prime-red'}`}>
          {won ? '✦ Lattice stabilized — singularities contained ✦' : '✦ Singularity breach — lattice collapsed ✦'}
        </div>
      )}

      <div className="inline-grid gap-px" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {board.map((row, r) => row.map((cell, c) => (
          <button
            key={`${r}-${c}`}
            onClick={() => reveal(r, c)}
            onContextMenu={e => flag(e, r, c)}
            className={`${cellSize} flex items-center justify-center font-mono border transition-colors ${
              cell.revealed
                ? cell.mine
                  ? 'bg-prime-red/20 border-prime-red/30 text-prime-red'
                  : 'bg-card/60 border-border/30'
                : 'bg-muted/40 border-border/50 hover:bg-primary/10 hover:border-primary/30'
            }`}
          >
            {cell.revealed
              ? cell.mine ? '◆' : cell.adjacent > 0 ? <span className={ADJ_COLORS[cell.adjacent]}>{cell.adjacent}</span> : ''
              : cell.flagged ? <span className="text-prime-amber">⚑</span> : ''
            }
          </button>
        )))}
      </div>
    </div>
  );
}

// ─── Qutrit Snake ───
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Point = { x: number; y: number };

const GRID = 20;
const QUTRIT_COLORS = ['hsl(var(--prime-cyan))', 'hsl(var(--prime-violet))', 'hsl(var(--prime-amber))'];

function QutritSnake() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try { return parseInt(localStorage.getItem('prime-snake-high') || '0'); } catch { return 0; }
  });
  const [playing, setPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const gameState = useRef<{
    snake: Point[]; dir: Direction; food: Point; foodState: number; speed: number; running: boolean;
  }>({ snake: [{ x: 10, y: 10 }], dir: 'RIGHT', food: { x: 15, y: 10 }, foodState: 0, speed: 150, running: false });

  const spawnFood = (snake: Point[]): Point => {
    let p: Point;
    do { p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }; }
    while (snake.some(s => s.x === p.x && s.y === p.y));
    return p;
  };

  const startGame = useCallback(() => {
    const gs = gameState.current;
    gs.snake = [{ x: 10, y: 10 }];
    gs.dir = 'RIGHT';
    gs.food = spawnFood(gs.snake);
    gs.foodState = Math.floor(Math.random() * 3);
    gs.speed = 150;
    gs.running = true;
    setScore(0);
    setPlaying(true);
    setGameOver(false);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const gs = gameState.current;
      if (!gs.running) return;
      const map: Record<string, Direction> = { ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT' };
      const nd = map[e.key];
      if (!nd) return;
      const opp: Record<Direction, Direction> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
      if (opp[nd] !== gs.dir) { gs.dir = nd; e.preventDefault(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const cellW = canvas.width / GRID;
    const cellH = canvas.height / GRID;

    const tick = () => {
      const gs = gameState.current;
      if (!gs.running) return;
      const head = { ...gs.snake[0] };
      if (gs.dir === 'UP') head.y--;
      if (gs.dir === 'DOWN') head.y++;
      if (gs.dir === 'LEFT') head.x--;
      if (gs.dir === 'RIGHT') head.x++;

      if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID || gs.snake.some(s => s.x === head.x && s.y === head.y)) {
        gs.running = false;
        setPlaying(false);
        setGameOver(true);
        setScore(s => {
          if (s > highScore) { setHighScore(s); localStorage.setItem('prime-snake-high', String(s)); }
          return s;
        });
        return;
      }

      gs.snake.unshift(head);
      if (head.x === gs.food.x && head.y === gs.food.y) {
        setScore(s => s + (gs.foodState + 1) * 10);
        gs.food = spawnFood(gs.snake);
        gs.foodState = Math.floor(Math.random() * 3);
        gs.speed = Math.max(60, gs.speed - 3);
      } else {
        gs.snake.pop();
      }

      // Draw
      ctx.fillStyle = 'hsl(var(--background))';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Grid lines
      ctx.strokeStyle = 'hsl(var(--border) / 0.3)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= GRID; i++) {
        ctx.beginPath(); ctx.moveTo(i * cellW, 0); ctx.lineTo(i * cellW, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * cellH); ctx.lineTo(canvas.width, i * cellH); ctx.stroke();
      }
      // Snake
      gs.snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? 'hsl(var(--primary))' : `hsl(var(--primary) / ${0.7 - i * 0.02})`;
        ctx.fillRect(s.x * cellW + 1, s.y * cellH + 1, cellW - 2, cellH - 2);
      });
      // Food
      ctx.fillStyle = QUTRIT_COLORS[gs.foodState];
      ctx.beginPath();
      ctx.arc(gs.food.x * cellW + cellW / 2, gs.food.y * cellH + cellH / 2, cellW / 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'hsl(var(--foreground))';
      ctx.font = `${cellW * 0.45}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`|${gs.foodState}⟩`, gs.food.x * cellW + cellW / 2, gs.food.y * cellH + cellH / 2);
    };

    let interval = setInterval(tick, gameState.current.speed);
    const speedCheck = setInterval(() => {
      clearInterval(interval);
      interval = setInterval(tick, gameState.current.speed);
    }, 1000);

    return () => { clearInterval(interval); clearInterval(speedCheck); };
  }, [playing, highScore]);

  return (
    <div className="flex flex-col items-center gap-3 p-3">
      <div className="flex items-center justify-between w-full text-[10px] font-mono text-muted-foreground">
        <span>Score: <span className="text-primary">{score}</span></span>
        <span className="flex items-center gap-1"><Trophy size={10} /> {highScore}</span>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={400} height={400} className="border border-border rounded bg-background" />
        {!playing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded">
            <p className="font-display text-sm tracking-wider uppercase text-foreground mb-1">
              {gameOver ? 'Lattice Collapse' : 'Qutrit Snake'}
            </p>
            {gameOver && <p className="text-[10px] text-muted-foreground mb-3">Score: {score}</p>}
            <button onClick={startGame} className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-primary/20 border border-primary/40 text-primary text-[10px] font-display tracking-wider uppercase hover:bg-primary/30 transition-colors">
              <Play size={10} /> {gameOver ? 'Retry' : 'Start'}
            </button>
            <p className="text-[8px] text-muted-foreground/50 mt-2">Arrow keys or WASD to move</p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
        <span>Collect qutrits: </span>
        {[0, 1, 2].map(i => (
          <span key={i} className="font-mono" style={{ color: QUTRIT_COLORS[i] }}>|{i}⟩ = {(i + 1) * 10}pts</span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Arcade App ───
export default function PrimeArcadeApp() {
  return (
    <div className="h-full flex flex-col bg-background/50">
      <Tabs defaultValue="minesweeper" className="flex-1 flex flex-col">
        <div className="px-3 py-2 border-b border-border">
          <TabsList className="h-7 bg-muted/30">
            <TabsTrigger value="minesweeper" className="text-[10px] font-display tracking-wider uppercase h-5 px-3">
              Lattice Minesweeper
            </TabsTrigger>
            <TabsTrigger value="snake" className="text-[10px] font-display tracking-wider uppercase h-5 px-3">
              Qutrit Snake
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="minesweeper" className="flex-1 overflow-auto mt-0">
          <LatticeMinesweeper />
        </TabsContent>
        <TabsContent value="snake" className="flex-1 overflow-auto mt-0">
          <QutritSnake />
        </TabsContent>
      </Tabs>
    </div>
  );
}
