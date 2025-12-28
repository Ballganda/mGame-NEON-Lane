export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  SETTINGS = 'SETTINGS'
}

export enum EntityType {
  PLAYER = 'PLAYER',
  ENEMY_GRUNT = 'ENEMY_GRUNT',
  ENEMY_SPRINTER = 'ENEMY_SPRINTER',
  ENEMY_TANK = 'ENEMY_TANK',
  BOSS = 'BOSS',
  BULLET = 'BULLET',
  PARTICLE = 'PARTICLE',
  PICKUP = 'PICKUP',
  GATE = 'GATE',
  OBSTACLE = 'OBSTACLE'
}

export enum PickupType {
  NUKE = 'NUKE',           // Clears the entire screen
  CLUSTER = 'CLUSTER'      // Large radius explosion
}

export enum GateType {
  PROJECTILES = 'PROJECTILES',
  RATE = 'RATE',
  DAMAGE = 'DAMAGE'
}

export enum GateOp {
  ADD = 'ADD',
  MULTIPLY = 'MULTIPLY'
}

export interface GateData {
  type: GateType;
  op: GateOp;
  value: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: number;
  type: EntityType;
  pos: Vector2;
  radius: number;
  active: boolean;
  hp: number;
  maxHp: number;
  color: string;
  lane: number; // -1 if not lane bound
  // Specific props
  velocity?: Vector2;
  damage?: number;
  scoreValue?: number;
  pickupType?: PickupType;
  gateData?: GateData;
  width?: number;
  height?: number;
  // Combat state
  isAttacking?: boolean;
  attackTimer?: number;
}

export interface PlayerStats {
  damage: number;
  fireRate: number; // Shots per second
  maxHp: number;
  projectileCount: number;
  moveSpeed: number;
}

export interface GameConfig {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reducedEffects: boolean;
}