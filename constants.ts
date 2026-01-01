export const GAME_VERSION = 'V0.0.141';

export const LANE_COUNT = 3;
export const CANVAS_WIDTH = 720;
export const CANVAS_HEIGHT = 1280;
export const LANE_WIDTH = CANVAS_WIDTH / LANE_COUNT;

// World Coordinates (3D)
export const WORLD_LANE_WIDTH = 200; 
export const TOTAL_WORLD_WIDTH = LANE_COUNT * WORLD_LANE_WIDTH;
export const CAMERA_DEPTH = 800;
export const SPAWN_Z = 8000;
export const PLAYER_Z = 0;
export const DRAW_DISTANCE = 8500; 
export const BULLET_MAX_RANGE = 4000;
export const BULLET_FADE_START = 2500;

// Gameplay
export const BASE_PLAYER_SPEED = 700;
export const BASE_SCROLL_SPEED = 250;
export const UNIFIED_ENTITY_SPEED = 400;
export const CONVERGENCE_Z = 600;
export const BOSS_APPEAR_DISTANCE = 30000; 
export const GATE_SPAWN_DISTANCE = 4800; // Reduced from 16000 for better flow

// Squad Visuals (1-2-3-4-3-2-1 Diamond)
export const MAX_SQUAD_DISPLAY = 16; 
export const SQUAD_DOT_RADIUS = 5;
export const SQUAD_OFFSETS = [
  { x: 0, z: 0 },
  { x: -14, z: -24 }, { x: 14, z: -24 },
  { x: -28, z: -48 }, { x: 0, z: -48 }, { x: 28, z: -48 },
  { x: -42, z: -72 }, { x: -14, z: -72 }, { x: 14, z: -72 }, { x: 42, z: -72 },
  { x: -28, z: -96 }, { x: 0, z: -96 }, { x: 28, z: -96 },
  { x: -14, z: -120 }, { x: 14, z: -120 },
  { x: 0, z: -144 }
];

// Limits & Caps
export const MAX_PARTICLES = 250; 
export const MAX_VISIBLE_SQUAD = 50; 
export const MAX_PROJECTILES_PER_SHOT = 12; 

// Entity Sizes
export const PLAYER_RADIUS = 14;
export const ENEMY_RADIUS_GRUNT = 20;
export const ENEMY_RADIUS_SPRINTER = 24;
export const ENEMY_RADIUS_TANK = 45;
export const BULLET_RADIUS = 10;
export const PICKUP_RADIUS = 35;
export const GATE_HEIGHT = 140;

// Combat
export const SQUAD_SPREAD_WIDTH = 130; 
export const STUCK_DAMAGE_INTERVAL = 0.7; 
export const MAX_SPREAD_ANGLE_DEG = 2; 

// Visuals
export const HORIZON_Y = 0; 
export const VIEWPORT_BOTTOM_OFFSET = 380; 
export const GRID_SPEED = 250;

// Cityscape
export const CITY_BLOCK_SIZE = 1200; 
export const CITY_STREET_WIDTH = 650;

// Colors
export const COLORS = {
  PLAYER: '#00f0ff', 
  ENEMY_GRUNT: '#ff0044', 
  ENEMY_SPRINTER: '#ffaa00', 
  ENEMY_TANK: '#aa00ff', 
  BOSS: '#ff0000', 
  OBSTACLE: '#555555',
  
  PICKUP_BOMB_SMALL: '#00ffaa',   
  PICKUP_BOMB_MEDIUM: '#00ccff',  
  PICKUP_BOMB_LARGE: '#ff00ff',   
  PICKUP_CLUSTER: '#ffdd00',      

  GATE_POS_BG: 'rgba(0, 255, 100, 0.2)',
  GATE_POS_BORDER: '#00ff66',
  GATE_NEG_BORDER: '#ff0000',
  GATE_NEG_BG: 'rgba(255, 0, 0, 0.2)',
  TEXT: '#ffffff',
  LANE_LINE: 'rgba(0, 240, 245, 0.3)',
  LANE_BORDER: '#00f0ff',
  INNER_LANE_LINE: 'rgba(0, 240, 245, 0.7)', 
  GRID_LINE: 'rgba(0, 240, 255, 0.1)',
};

export const BULLET_COLORS = [
  '#ffffff', 
  '#ffff00', 
  '#ff8800', 
  '#ff0000', 
  '#ff00ff', 
  '#00ffff', 
];