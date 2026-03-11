import { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Bomb, RotateCcw, Trophy, Play, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { eventBus } from '@/hooks/useEventBus';

async function claimArcadeReward(game: string, amount: number) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prime-bank?action=arcade-reward`;
    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ game, amount, session_id: `${game}-${Date.now()}` }),
    });
  } catch {}
}

function RewardBadge({ amount }: { amount: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[8px] font-mono ml-1">
      <Coins size={8} /> +{amount} OS
    </span>
  );
}

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
      newBoard.forEach(row => row.forEach(cell => { if (cell.mine) cell.revealed = true; }));
      setBoard(newBoard);
      setGameOver(true);
      return;
    }
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
    const unrevealed = newBoard.flat().filter(c => !c.revealed && !c.mine).length;
    if (unrevealed === 0) {
      setWon(true);
      claimArcadeReward('minesweeper', [500, 1500, 5000][diff]);
    }
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
          {won && <RewardBadge amount={[500, 1500, 5000][diff]} />}
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
        const pts = (gs.foodState + 1) * 10;
        setScore(s => s + pts);
        claimArcadeReward('snake', pts);
        gs.food = spawnFood(gs.snake);
        gs.foodState = Math.floor(Math.random() * 3);
        gs.speed = Math.max(60, gs.speed - 3);
      } else {
        gs.snake.pop();
      }

      ctx.fillStyle = 'hsl(var(--background))';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'hsl(var(--border) / 0.3)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= GRID; i++) {
        ctx.beginPath(); ctx.moveTo(i * cellW, 0); ctx.lineTo(i * cellW, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * cellH); ctx.lineTo(canvas.width, i * cellH); ctx.stroke();
      }
      gs.snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? 'hsl(var(--primary))' : `hsl(var(--primary) / ${0.7 - i * 0.02})`;
        ctx.fillRect(s.x * cellW + 1, s.y * cellH + 1, cellW - 2, cellH - 2);
      });
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

// ─── Graviton Pong ───
function GravitonPong() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ player: 0, ai: 0 });
  const [playing, setPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const gameRef = useRef({
    ball: { x: 200, y: 200, vx: 3, vy: 2 },
    player: { y: 170, h: 60 },
    ai: { y: 170, h: 60 },
    running: false,
  });

  const startGame = useCallback(() => {
    const g = gameRef.current;
    g.ball = { x: 200, y: 200, vx: 3 * (Math.random() > 0.5 ? 1 : -1), vy: 2 * (Math.random() > 0.5 ? 1 : -1) };
    g.player = { y: 170, h: 60 };
    g.ai = { y: 170, h: 60 };
    g.running = true;
    setScore({ player: 0, ai: 0 });
    setPlaying(true);
    setGameOver(false);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (!g.running) return;
      if (e.key === 'ArrowUp' || e.key === 'w') { g.player.y = Math.max(0, g.player.y - 15); e.preventDefault(); }
      if (e.key === 'ArrowDown' || e.key === 's') { g.player.y = Math.min(400 - g.player.h, g.player.y + 15); e.preventDefault(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = 400, H = 400;
    const GX = W / 2, GY = H / 2, GRAV = 800;

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const g = gameRef.current;
      if (!g.running) return;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Gravity well pull
      const dx = GX - g.ball.x, dy = GY - g.ball.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = GRAV / (dist * dist + 500);
      g.ball.vx += (dx / dist) * force * dt;
      g.ball.vy += (dy / dist) * force * dt;

      // Speed cap
      const spd = Math.sqrt(g.ball.vx ** 2 + g.ball.vy ** 2);
      if (spd > 8) { g.ball.vx *= 8 / spd; g.ball.vy *= 8 / spd; }

      g.ball.x += g.ball.vx;
      g.ball.y += g.ball.vy;

      // Wall bounce
      if (g.ball.y <= 5 || g.ball.y >= H - 5) g.ball.vy *= -1;

      // Paddle collision
      if (g.ball.x <= 15 && g.ball.y >= g.player.y && g.ball.y <= g.player.y + g.player.h) {
        g.ball.vx = Math.abs(g.ball.vx) * 1.05;
        g.ball.x = 16;
      }
      if (g.ball.x >= W - 15 && g.ball.y >= g.ai.y && g.ball.y <= g.ai.y + g.ai.h) {
        g.ball.vx = -Math.abs(g.ball.vx) * 1.05;
        g.ball.x = W - 16;
      }

      // AI movement
      const aiTarget = g.ball.y - g.ai.h / 2;
      g.ai.y += (aiTarget - g.ai.y) * 0.04;
      g.ai.y = Math.max(0, Math.min(H - g.ai.h, g.ai.y));

      // Scoring
      if (g.ball.x < 0) {
        setScore(s => {
          const ns = { ...s, ai: s.ai + 1 };
          if (ns.ai >= 5) { g.running = false; setPlaying(false); setGameOver(true); }
          return ns;
        });
        g.ball = { x: W / 2, y: H / 2, vx: 3, vy: 2 * (Math.random() > 0.5 ? 1 : -1) };
      }
      if (g.ball.x > W) {
        setScore(s => {
          const ns = { ...s, player: s.player + 1 };
          if (ns.player >= 5) { g.running = false; setPlaying(false); setGameOver(true); claimArcadeReward('pong', 200); }
          return ns;
        });
        g.ball = { x: W / 2, y: H / 2, vx: -3, vy: 2 * (Math.random() > 0.5 ? 1 : -1) };
      }

      // Draw
      ctx.fillStyle = 'hsl(var(--background))';
      ctx.fillRect(0, 0, W, H);

      // Gravity well
      const grad = ctx.createRadialGradient(GX, GY, 0, GX, GY, 60);
      grad.addColorStop(0, 'hsla(270, 80%, 60%, 0.4)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(GX - 60, GY - 60, 120, 120);
      ctx.fillStyle = 'hsla(270, 80%, 60%, 0.8)';
      ctx.beginPath(); ctx.arc(GX, GY, 5, 0, Math.PI * 2); ctx.fill();

      // Dashed center line
      ctx.strokeStyle = 'hsl(var(--border) / 0.3)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
      ctx.setLineDash([]);

      // Paddles
      ctx.fillStyle = 'hsl(var(--primary))';
      ctx.fillRect(5, g.player.y, 8, g.player.h);
      ctx.fillStyle = 'hsl(var(--prime-red))';
      ctx.fillRect(W - 13, g.ai.y, 8, g.ai.h);

      // Ball
      ctx.fillStyle = 'hsl(var(--foreground))';
      ctx.beginPath(); ctx.arc(g.ball.x, g.ball.y, 5, 0, Math.PI * 2); ctx.fill();

      // Score
      ctx.fillStyle = 'hsl(var(--muted-foreground) / 0.5)';
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${score.player}`, W / 2 - 40, 30);
      ctx.fillText(`${score.ai}`, W / 2 + 40, 30);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [playing, score]);

  return (
    <div className="flex flex-col items-center gap-3 p-3">
      <div className="flex items-center justify-between w-full text-[10px] font-mono text-muted-foreground">
        <span>You: <span className="text-primary">{score.player}</span></span>
        <span className="text-[8px]">First to 5 wins</span>
        <span>AI: <span className="text-prime-red">{score.ai}</span></span>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={400} height={400} className="border border-border rounded bg-background" />
        {!playing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded">
            <p className="font-display text-sm tracking-wider uppercase text-foreground mb-1">
              {gameOver ? (score.player >= 5 ? 'You Win!' : 'AI Wins') : 'Graviton Pong'}
            </p>
            {!gameOver && <p className="text-[9px] text-muted-foreground/60 mb-2">A gravity well warps the ball's path</p>}
            <button onClick={startGame} className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-primary/20 border border-primary/40 text-primary text-[10px] font-display tracking-wider uppercase hover:bg-primary/30 transition-colors">
              <Play size={10} /> {gameOver ? 'Play Again' : 'Start'}
            </button>
            <p className="text-[8px] text-muted-foreground/50 mt-2">↑/↓ or W/S to move paddle</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Particle Cascade (Breakout) ───
interface Brick { x: number; y: number; w: number; h: number; color: number; alive: boolean }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }

function ParticleCascade() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    try { return parseInt(localStorage.getItem('prime-cascade-high') || '0'); } catch { return 0; }
  });

  const gameRef = useRef({
    ball: { x: 200, y: 350, vx: 3, vy: -3 },
    paddle: { x: 160, w: 80 },
    bricks: [] as Brick[],
    particles: [] as Particle[],
    running: false,
    mouseX: 200,
  });

  const BRICK_COLORS = ['hsl(var(--prime-cyan))', 'hsl(var(--prime-violet))', 'hsl(var(--prime-amber))'];

  const buildBricks = useCallback((lvl: number) => {
    const rows = 3 + Math.min(lvl, 5);
    const cols = 8;
    const bw = 400 / cols - 4;
    const bricks: Brick[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({ x: c * (bw + 4) + 2, y: r * 18 + 30, w: bw, h: 14, color: (r + c) % 3, alive: true });
      }
    }
    return bricks;
  }, []);

  const startGame = useCallback(() => {
    const g = gameRef.current;
    g.ball = { x: 200, y: 350, vx: 3, vy: -3 };
    g.paddle = { x: 160, w: 80 };
    g.bricks = buildBricks(1);
    g.particles = [];
    g.running = true;
    setScore(0);
    setLives(3);
    setLevel(1);
    setPlaying(true);
    setGameOver(false);
  }, [buildBricks]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      gameRef.current.mouseX = e.clientX - rect.left;
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = 400, H = 400;
    let animId: number;

    const loop = () => {
      const g = gameRef.current;
      if (!g.running) return;

      // Paddle follows mouse
      g.paddle.x = Math.max(0, Math.min(W - g.paddle.w, g.mouseX - g.paddle.w / 2));

      // Ball movement
      g.ball.x += g.ball.vx;
      g.ball.y += g.ball.vy;

      // Wall bounce
      if (g.ball.x <= 4 || g.ball.x >= W - 4) g.ball.vx *= -1;
      if (g.ball.y <= 4) g.ball.vy *= -1;

      // Paddle collision
      if (g.ball.vy > 0 && g.ball.y >= 375 && g.ball.y <= 380 && g.ball.x >= g.paddle.x && g.ball.x <= g.paddle.x + g.paddle.w) {
        g.ball.vy = -Math.abs(g.ball.vy);
        const hitPos = (g.ball.x - g.paddle.x) / g.paddle.w - 0.5;
        g.ball.vx = hitPos * 6;
      }

      // Ball lost
      if (g.ball.y > H) {
        setLives(l => {
          const nl = l - 1;
          if (nl <= 0) {
            g.running = false;
            setPlaying(false);
            setGameOver(true);
            setScore(s => { if (s > highScore) { setHighScore(s); localStorage.setItem('prime-cascade-high', String(s)); } return s; });
          } else {
            g.ball = { x: 200, y: 350, vx: 3, vy: -3 };
          }
          return nl;
        });
      }

      // Brick collision
      for (const brick of g.bricks) {
        if (!brick.alive) continue;
        if (g.ball.x >= brick.x && g.ball.x <= brick.x + brick.w && g.ball.y >= brick.y && g.ball.y <= brick.y + brick.h) {
          brick.alive = false;
          g.ball.vy *= -1;
          setScore(s => s + 10);
          // Spawn particles
          for (let i = 0; i < 8; i++) {
            g.particles.push({
              x: brick.x + brick.w / 2, y: brick.y + brick.h / 2,
              vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6 - 2,
              life: 1, color: BRICK_COLORS[brick.color],
            });
          }
          break;
        }
      }

      // Check level complete
      if (g.bricks.every(b => !b.alive)) {
        claimArcadeReward('cascade', 300);
        setLevel(l => {
          const nl = l + 1;
          g.bricks = buildBricks(nl);
          g.ball = { x: 200, y: 350, vx: 3 + nl * 0.3, vy: -(3 + nl * 0.3) };
          return nl;
        });
      }

      // Update particles
      g.particles = g.particles.filter(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.025;
        return p.life > 0;
      });

      // Draw
      ctx.fillStyle = 'hsl(var(--background))';
      ctx.fillRect(0, 0, W, H);

      // Bricks
      for (const b of g.bricks) {
        if (!b.alive) continue;
        ctx.fillStyle = BRICK_COLORS[b.color];
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }

      // Particles
      for (const p of g.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;

      // Paddle
      ctx.fillStyle = 'hsl(var(--primary))';
      ctx.fillRect(g.paddle.x, 375, g.paddle.w, 8);

      // Ball
      ctx.fillStyle = 'hsl(var(--foreground))';
      ctx.beginPath(); ctx.arc(g.ball.x, g.ball.y, 4, 0, Math.PI * 2); ctx.fill();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [playing, highScore, buildBricks]);

  return (
    <div className="flex flex-col items-center gap-3 p-3">
      <div className="flex items-center justify-between w-full text-[10px] font-mono text-muted-foreground">
        <span>Score: <span className="text-primary">{score}</span></span>
        <span>Level {level}</span>
        <span>Lives: {'♥'.repeat(Math.max(0, lives))}</span>
        <span className="flex items-center gap-1"><Trophy size={10} /> {highScore}</span>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={400} height={400} className="border border-border rounded bg-background cursor-none" />
        {!playing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded">
            <p className="font-display text-sm tracking-wider uppercase text-foreground mb-1">
              {gameOver ? 'Cascade Collapse' : 'Particle Cascade'}
            </p>
            {gameOver && <p className="text-[10px] text-muted-foreground mb-3">Score: {score}</p>}
            {!gameOver && <p className="text-[9px] text-muted-foreground/60 mb-2">Break the lattice nodes — watch them shatter</p>}
            <button onClick={startGame} className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-primary/20 border border-primary/40 text-primary text-[10px] font-display tracking-wider uppercase hover:bg-primary/30 transition-colors">
              <Play size={10} /> {gameOver ? 'Retry' : 'Start'}
            </button>
            <p className="text-[8px] text-muted-foreground/50 mt-2">Move mouse to control paddle</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Topology Tetris ───
const TETRIS_COLS = 10;
const TETRIS_ROWS = 20;
const TETRIS_PIECES = [
  { shape: [[1,1,1,1]], color: 'hsl(var(--prime-cyan))' },       // I
  { shape: [[1,1],[1,1]], color: 'hsl(var(--prime-amber))' },     // O
  { shape: [[0,1,0],[1,1,1]], color: 'hsl(var(--prime-violet))' },// T
  { shape: [[1,0],[1,0],[1,1]], color: 'hsl(var(--primary))' },   // L
  { shape: [[0,1],[0,1],[1,1]], color: 'hsl(var(--prime-red))' }, // J
  { shape: [[0,1,1],[1,1,0]], color: 'hsl(var(--prime-green))' }, // S
  { shape: [[1,1,0],[0,1,1]], color: 'hsl(var(--prime-teal))' },  // Z
];

function rotatePiece(shape: number[][]): number[][] {
  const rows = shape.length, cols = shape[0].length;
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => shape[rows - 1 - r][c])
  );
}

function TopologyTetris() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    try { return parseInt(localStorage.getItem('prime-tetris-high') || '0'); } catch { return 0; }
  });

  const gameRef = useRef({
    board: [] as (string | null)[][],
    piece: { shape: [[1]], color: '', x: 0, y: 0 },
    next: { shape: [[1]], color: '' },
    running: false,
    dropTimer: 0,
    lastDrop: 0,
  });

  const randomPiece = () => {
    const p = TETRIS_PIECES[Math.floor(Math.random() * TETRIS_PIECES.length)];
    return { shape: p.shape.map(r => [...r]), color: p.color };
  };

  const startGame = useCallback(() => {
    const g = gameRef.current;
    g.board = Array.from({ length: TETRIS_ROWS }, () => Array(TETRIS_COLS).fill(null));
    const p = randomPiece();
    g.piece = { ...p, x: Math.floor((TETRIS_COLS - p.shape[0].length) / 2), y: 0 };
    g.next = randomPiece();
    g.running = true;
    g.lastDrop = performance.now();
    setScore(0);
    setLevel(1);
    setLines(0);
    setPlaying(true);
    setGameOver(false);
  }, []);

  const collides = useCallback((board: (string | null)[][], shape: number[][], px: number, py: number) => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = px + c, ny = py + r;
        if (nx < 0 || nx >= TETRIS_COLS || ny >= TETRIS_ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (!g.running) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        if (!collides(g.board, g.piece.shape, g.piece.x - 1, g.piece.y)) g.piece.x--;
        e.preventDefault();
      }
      if (e.key === 'ArrowRight' || e.key === 'd') {
        if (!collides(g.board, g.piece.shape, g.piece.x + 1, g.piece.y)) g.piece.x++;
        e.preventDefault();
      }
      if (e.key === 'ArrowDown' || e.key === 's') {
        if (!collides(g.board, g.piece.shape, g.piece.x, g.piece.y + 1)) g.piece.y++;
        e.preventDefault();
      }
      if (e.key === 'ArrowUp' || e.key === 'w') {
        const rotated = rotatePiece(g.piece.shape);
        if (!collides(g.board, rotated, g.piece.x, g.piece.y)) g.piece.shape = rotated;
        e.preventDefault();
      }
      if (e.key === ' ') {
        // Hard drop
        while (!collides(g.board, g.piece.shape, g.piece.x, g.piece.y + 1)) g.piece.y++;
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [collides]);

  useEffect(() => {
    if (!playing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const CELL = 20;
    const W = TETRIS_COLS * CELL;
    const H = TETRIS_ROWS * CELL;
    canvas.width = W + 80; // extra for next piece
    canvas.height = H;
    let animId: number;

    const lock = () => {
      const g = gameRef.current;
      // Place piece on board
      for (let r = 0; r < g.piece.shape.length; r++) {
        for (let c = 0; c < g.piece.shape[r].length; c++) {
          if (!g.piece.shape[r][c]) continue;
          const ny = g.piece.y + r, nx = g.piece.x + c;
          if (ny < 0) { g.running = false; setPlaying(false); setGameOver(true); setScore(s => { if (s > highScore) { setHighScore(s); localStorage.setItem('prime-tetris-high', String(s)); } return s; }); return; }
          g.board[ny][nx] = g.piece.color;
        }
      }
      // Clear lines
      let cleared = 0;
      g.board = g.board.filter(row => {
        if (row.every(c => c !== null)) { cleared++; return false; }
        return true;
      });
      while (g.board.length < TETRIS_ROWS) g.board.unshift(Array(TETRIS_COLS).fill(null));
      if (cleared > 0) {
        const pts = [0, 100, 300, 500, 800][cleared] || 800;
        setScore(s => s + pts * level);
        claimArcadeReward('tetris', cleared * 100);
        setLines(l => {
          const nl = l + cleared;
          setLevel(Math.floor(nl / 10) + 1);
          return nl;
        });
      }
      // Next piece
      const np = g.next;
      g.piece = { ...np, x: Math.floor((TETRIS_COLS - np.shape[0].length) / 2), y: 0 };
      g.next = randomPiece();
      if (collides(g.board, g.piece.shape, g.piece.x, g.piece.y)) {
        g.running = false; setPlaying(false); setGameOver(true);
        setScore(s => { if (s > highScore) { setHighScore(s); localStorage.setItem('prime-tetris-high', String(s)); } return s; });
      }
    };

    const loop = (now: number) => {
      const g = gameRef.current;
      if (!g.running) return;

      const dropInterval = Math.max(100, 800 - (level - 1) * 70);
      if (now - g.lastDrop > dropInterval) {
        g.lastDrop = now;
        if (!collides(g.board, g.piece.shape, g.piece.x, g.piece.y + 1)) {
          g.piece.y++;
        } else {
          lock();
        }
      }

      // Draw
      ctx.fillStyle = 'hsl(var(--background))';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.strokeStyle = 'hsl(var(--border) / 0.2)';
      ctx.lineWidth = 0.5;
      for (let c = 0; c <= TETRIS_COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); ctx.stroke(); }
      for (let r = 0; r <= TETRIS_ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); ctx.stroke(); }

      // Board
      for (let r = 0; r < TETRIS_ROWS; r++) {
        for (let c = 0; c < TETRIS_COLS; c++) {
          if (g.board[r][c]) {
            ctx.fillStyle = g.board[r][c]!;
            ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
          }
        }
      }

      // Ghost piece
      let ghostY = g.piece.y;
      while (!collides(g.board, g.piece.shape, g.piece.x, ghostY + 1)) ghostY++;
      ctx.globalAlpha = 0.2;
      for (let r = 0; r < g.piece.shape.length; r++) {
        for (let c = 0; c < g.piece.shape[r].length; c++) {
          if (!g.piece.shape[r][c]) continue;
          ctx.fillStyle = g.piece.color;
          ctx.fillRect((g.piece.x + c) * CELL + 1, (ghostY + r) * CELL + 1, CELL - 2, CELL - 2);
        }
      }
      ctx.globalAlpha = 1;

      // Current piece
      for (let r = 0; r < g.piece.shape.length; r++) {
        for (let c = 0; c < g.piece.shape[r].length; c++) {
          if (!g.piece.shape[r][c]) continue;
          ctx.fillStyle = g.piece.color;
          ctx.fillRect((g.piece.x + c) * CELL + 1, (g.piece.y + r) * CELL + 1, CELL - 2, CELL - 2);
        }
      }

      // Next piece preview
      ctx.fillStyle = 'hsl(var(--muted-foreground) / 0.3)';
      ctx.font = '9px monospace';
      ctx.fillText('NEXT', W + 10, 20);
      for (let r = 0; r < g.next.shape.length; r++) {
        for (let c = 0; c < g.next.shape[r].length; c++) {
          if (!g.next.shape[r][c]) continue;
          ctx.fillStyle = g.next.color;
          ctx.fillRect(W + 10 + c * 14, 30 + r * 14, 12, 12);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [playing, level, highScore, collides]);

  return (
    <div className="flex flex-col items-center gap-3 p-3">
      <div className="flex items-center justify-between w-full text-[10px] font-mono text-muted-foreground">
        <span>Score: <span className="text-primary">{score}</span></span>
        <span>Level {level} | Lines {lines}</span>
        <span className="flex items-center gap-1"><Trophy size={10} /> {highScore}</span>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={280} height={400} className="border border-border rounded bg-background" />
        {!playing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded">
            <p className="font-display text-sm tracking-wider uppercase text-foreground mb-1">
              {gameOver ? 'Manifold Collapsed' : 'Topology Tetris'}
            </p>
            {gameOver && <p className="text-[10px] text-muted-foreground mb-3">Score: {score}</p>}
            {!gameOver && <p className="text-[9px] text-muted-foreground/60 mb-2">Assemble geometric manifold fragments</p>}
            <button onClick={startGame} className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-primary/20 border border-primary/40 text-primary text-[10px] font-display tracking-wider uppercase hover:bg-primary/30 transition-colors">
              <Play size={10} /> {gameOver ? 'Retry' : 'Start'}
            </button>
            <p className="text-[8px] text-muted-foreground/50 mt-2">←→ move | ↑ rotate | ↓ soft drop | Space hard drop</p>
          </div>
        )}
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
              Minesweeper
            </TabsTrigger>
            <TabsTrigger value="snake" className="text-[10px] font-display tracking-wider uppercase h-5 px-3">
              Snake
            </TabsTrigger>
            <TabsTrigger value="pong" className="text-[10px] font-display tracking-wider uppercase h-5 px-3">
              Graviton Pong
            </TabsTrigger>
            <TabsTrigger value="cascade" className="text-[10px] font-display tracking-wider uppercase h-5 px-3">
              Cascade
            </TabsTrigger>
            <TabsTrigger value="tetris" className="text-[10px] font-display tracking-wider uppercase h-5 px-3">
              Tetris
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="minesweeper" className="flex-1 overflow-auto mt-0">
          <LatticeMinesweeper />
        </TabsContent>
        <TabsContent value="snake" className="flex-1 overflow-auto mt-0">
          <QutritSnake />
        </TabsContent>
        <TabsContent value="pong" className="flex-1 overflow-auto mt-0">
          <GravitonPong />
        </TabsContent>
        <TabsContent value="cascade" className="flex-1 overflow-auto mt-0">
          <ParticleCascade />
        </TabsContent>
        <TabsContent value="tetris" className="flex-1 overflow-auto mt-0">
          <TopologyTetris />
        </TabsContent>
      </Tabs>
    </div>
  );
}
