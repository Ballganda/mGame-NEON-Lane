export const GAME_VERSION = 'V0.0.121';

export const LANE_COUNT = 3;
export const CANVAS_WIDTH = 720; // Internal resolution width
export const CANVAS_HEIGHT = 1280; // Internal resolution height
export const LANE_WIDTH = CANVAS_WIDTH / LANE_COUNT;

// World Coordinates (3D)
export const WORLD_LANE_WIDTH = 200; 
export const TOTAL_WORLD_WIDTH = LANE_COUNT * WORLD_LANE_WIDTH;
export const CAMERA_DEPTH = 800;
export const SPAWN_Z = 8000; // Edge of the map
export const PLAYER_Z = 0;
export const DRAW_DISTANCE = 8000; 
export const BULLET_MAX_RANGE = 4000; // Player shots disappear completely at 4000
export const BULLET_FADE_START = 2500; // Player shots start shrinking/fading at 2500

// Gameplay
export const BASE_PLAYER_SPEED = 600;
export const BASE_SCROLL_SPEED = 200;
export const UNIFIED_ENTITY_SPEED = 350;
export const CONVERGENCE_Z = 500;
export const BOSS_APPEAR_DISTANCE = 25000; 
export const GATE_SPAWN_DISTANCE = 4500; 

// Limits & Caps
export const MAX_PARTICLES = 400; // Balanced for performance
export const MAX_VISIBLE_SQUAD = 41; 
export const MAX_PROJECTILES_PER_SHOT = 12; 

// Entity Sizes
export const PLAYER_RADIUS = 12;

export const ENEMY_RADIUS_GRUNT = 18;
export const ENEMY_RADIUS_SPRINTER = 22;
export const ENEMY_RADIUS_TANK = 40;

export const BULLET_RADIUS = 10;
export const PICKUP_RADIUS = 30;
export const GATE_HEIGHT = 120;

// Combat
export const SQUAD_SPREAD_WIDTH = 120; 
export const STUCK_DAMAGE_INTERVAL = 0.8; 
export const MAX_SPREAD_ANGLE_DEG = 12; 

// Visuals
export const HORIZON_Y = 0; 
export const VIEWPORT_BOTTOM_OFFSET = 350; 
export const GRID_SPEED = 200;

// Cityscape
export const CITY_BLOCK_SIZE = 1000; 
export const CITY_STREET_WIDTH = 600; // Pushed out for optimization visibility

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

  GATE_POS_BG: 'rgba(0, 255, 100, 0.15)',
  GATE_POS_BORDER: '#00ff66',
  GATE_NEG_BORDER: '#ff0000',
  GATE_NEG_BG: 'rgba(255, 0, 0, 0.15)',
  TEXT: '#ffffff',
  LANE_LINE: 'rgba(0, 240, 245, 0.3)',
  LANE_BORDER: '#00f0ff',
  GRID_LINE: 'rgba(0, 240, 255, 0.1)'
};

export const BULLET_COLORS = [
  '#ffffff', 
  '#ffff00', 
  '#ff8800', 
  '#ff0000', 
  '#ff00ff', 
  '#00ffff', 
];