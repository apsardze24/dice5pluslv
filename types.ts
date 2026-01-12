

export interface Cell {
  id: number;
  q: number;
  r: number;
  owner: number;
  dice: number;
  nei: number[];
}

export type PlayerPersonality = 'aggressive' | 'normal' | 'kind';
export type AiDifficulty = 'easy' | 'normal' | 'hard';
export type GameMode = 'classic' | 'conquest';

export interface Player {
  id: number;
  human: boolean;
  name: string;
  color: string;
  cells: Set<number>;
  reserve: number;
  alive: boolean;
  personality: PlayerPersonality;
  grudges: Map<number, number>;
  largestRegionSize: number;
  largestRegionCells: Set<number>;
  alliances: Set<number>;
  betrayals: Map<number, number>; // key: traitorId, value: turns left for retaliation
  isBarbarian?: boolean;
  // New Stats
  totalDice: number;
  // Luck Stats
  myRollsCount: number;
  myRollsSum: number;
  opponentRollsCount: number;
  opponentRollsSum: number;
  // Turn Summary Stats
  turnDiceRolled: number;
  turnSumOfRolls: number;
}

export interface CustomMapCell {
  q: number;
  r: number;
  owner: number;
  dice: number;
}

export interface CustomMap {
  mapName: string;
  playerCount: number;
  cells: CustomMapCell[];
  aiDifficulty: AiDifficulty;
  firstTurn: number | 'random';
  playerTypes: ('human' | 'ai')[];
}


export interface GameSettings {
  playersCount: number;
  humanCount: number;
  cellCount: number;
  animationSpeedSetting: number; // 0 (slow) to 1 (fast/off)
  territoryCompactness: number;
  waterLevel: number; // 0 (Pangaea) to 1 (Archipelago)
  corruption: boolean;
  sound: boolean;
  aiDifficulty: AiDifficulty;
  diceDisplay: 'pips' | 'digits';
  customMap?: CustomMap;
  seed?: string;
  gameMode: GameMode;
  alliances?: { [key: number]: ('A'|'B')[] };
  notificationDuration: number;
  showDiceResults: boolean;
  diceResultDuration: number;
}

export interface GameState {
  cells: Cell[];
  cellByQR: Map<string, number>;
  players: Player[];
  turn: number;
  active: number;
  selected: number | null;
  phase: "play" | "victory";
  logs: string[];
  animationSpeed: number;
  isAnimating: boolean;
  corruptionEnabled: boolean;
  seed: string;
  rng: () => number;
  animation: AttackAnimation | null;
  aiDifficulty: AiDifficulty;
  diceDisplay: 'pips' | 'digits';
  gameMode: GameMode;
  alliances: { A: Set<number>, B: Set<number> };
  notification: { message: string; key: number } | null;
  notificationDuration: number;
  showDiceResults: boolean;
  diceResultDuration: number;
}

export interface AttackAnimation {
    fromId: number;
    toId: number;
    progress: 'highlight' | 'traveling' | number;
}

export interface RollResult {
  sum: number;
  arr: number[];
}

// Component Prop Types
export interface GameScreenProps {
    settings: GameSettings;
    onNewGame: () => void;
    onReturnToSettings: (state: GameState) => void;
    onRestartGame: () => void;
}

export interface SidebarProps {
    state: GameState;
    onEndTurn: () => void;
    onReturnToSettings: () => void;
    onNewGame: () => void;
    onRestartGame: () => void;
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
}

export interface SettingsScreenProps {
    onStartGame: (settings: GameSettings, isReturn: boolean) => void;
    onStartEditor: () => void;
    onViewRules: () => void;
    initialSettings?: GameSettings;
    isGameInProgress: boolean;
    gameStateForStats?: GameState | null;
}