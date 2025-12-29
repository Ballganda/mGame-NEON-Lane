export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  SETTINGS = 'SETTINGS'
}

export enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
  UNFAIR = 'UNFAIR',
  EMOTIONAL = 'EMOTIONAL',
  SINGULARITY = 'SINGULARITY',
  OMEGA = 'OMEGA'
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
  BOMB_SMALL = 'BOMB_SMALL',
  BOMB_MEDIUM = 'BOMB_MEDIUM',
  BOMB_LARGE = 'BOMB_LARGE',
  CLUSTER = 'CLUSTER'
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

export enum ParticleShape {
  CIRCLE = 'CIRCLE',
  SQUARE = 'SQUARE',
  LINE = 'LINE',
  RING = 'RING'
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
  lane: number;
  velocity?: Vector2;
  damage?: number;
  scoreValue?: number;
  pickupType?: PickupType;
  gateData?: GateData;
  width?: number;
  height?: number;
  isAttacking?: boolean;
  attackTimer?: number;
  isStuckToPlayer?: boolean;
  stickOffset?: Vector2;
  formationOffset?: number;
  stuckDamageTimer?: number;
  particleShape?: ParticleShape;
  rotation?: number;
  rotationSpeed?: number;
  life?: number;
  maxLife?: number;
}

export interface PlayerStats {
  damage: number;
  fireRate: number;
  maxHp: number;
  projectileCount: number;
  moveSpeed: number;
}

export interface GameConfig {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reducedEffects: boolean;
  difficulty: Difficulty;
  snowEnabled: boolean;
}