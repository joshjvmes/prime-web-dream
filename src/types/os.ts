export interface WindowState {
  id: string;
  title: string;
  app: AppType;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isFocused: boolean;
  zIndex: number;
}

export type AppType = 'terminal' | 'files' | 'processes' | 'sysinfo' | 'settings';

export interface QutritProcess {
  id: string;
  name: string;
  coord: string;
  state: 0 | 1 | 2; // |0⟩ Past, |1⟩ Present, |2⟩ Future
  potential: number;
  cpu: number;
  memory: number;
}

export interface PrimeFile {
  name: string;
  semanticTags: string[];
  coord: string;
  type: 'region' | 'manifold' | 'fold';
  size: string;
  curvature: number;
  torsion: number;
  children?: PrimeFile[];
}
