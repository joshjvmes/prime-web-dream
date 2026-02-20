export interface WindowState {
  id: string;
  title: string;
  app: AppType;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isMaximized: boolean;
  isFocused: boolean;
  zIndex: number;
  workspace: number;
  prevBounds?: { x: number; y: number; width: number; height: number };
}

export type AppType = 'terminal' | 'files' | 'processes' | 'sysinfo' | 'settings' | 'q3inference' | 'primenet' | 'geomc' | 'foldmem' | 'storage' | 'energy' | 'monitor' | 'editor' | 'chat' | 'security' | 'browser' | 'datacenter' | 'board' | 'gallery' | 'cloudhooks' | 'hypersphere' | 'calendar' | 'docs' | 'spreadsheet' | 'schemaforge' | 'canvas' | 'comm' | 'maps' | 'pkg' | 'audio' | 'bets' | 'signals' | 'stream' | 'vault' | 'videocall' | 'mail' | 'social' | 'agent' | 'robotics' | 'booking' | 'iot' | 'arcade' | 'admin' | 'journal' | 'wallet' | 'miniapps';

export interface QutritProcess {
  id: string;
  name: string;
  coord: string;
  state: 0 | 1 | 2;
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

export interface NetworkNode {
  id: string;
  label: string;
  x: number;
  y: number;
  coord: string;
  load: number;
}

export interface MemoryBlock {
  id: string;
  coord: string;
  size: number;
  allocated: boolean;
  label?: string;
}

export interface StorageRegion {
  id: string;
  name: string;
  coord: string;
  compressed: boolean;
  sizeOriginal: string;
  sizeCompressed: string;
  adinkraEncoded: boolean;
}

export interface EnergyMode {
  name: string;
  cop: number;
  input: number;
  output: number;
  efficiency: number;
}
