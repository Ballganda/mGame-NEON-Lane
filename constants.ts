export const GAME_VERSION = 'V0.0.109';

export const LANE_COUNT = 3;
export const CANVAS_WIDTH = 720; // Internal resolution width
export const CANVAS_HEIGHT = 1280; // Internal resolution height
export const LANE_WIDTH = CANVAS_WIDTH / LANE_COUNT;

// World Coordinates (3D)
export const WORLD_LANE_WIDTH = 200; // Wider lanes
export const TOTAL_WORLD_WIDTH = LANE_COUNT * WORLD_LANE_WIDTH;
export const CAMERA_DEPTH = 800;
export const SPAWN_Z = 3000;
export const PLAYER_Z = 0;
export const DRAW_DISTANCE = 8000; // Distance to draw lanes to reach top of screen

// Gameplay
export const BASE_PLAYER_SPEED = 600;
export const BASE_SCROLL_SPEED = 200;
export const UNIFIED_ENTITY_SPEED = 350;
export const CONVERGENCE_Z = 500;
export const BOSS_APPEAR_DISTANCE = 25000; 
export const GATE_SPAWN_DISTANCE = 3800; 

// Limits & Caps
export const MAX_PARTICLES = 150; 
export const MAX_VISIBLE_SQUAD = 41; // Adjusted for Diamond shape (Centered Square Number: 1, 5, 13, 25, 41)
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
export const MAX_SPREAD_ANGLE_DEG = 12; // Tighter spread (was ~25)

// Visuals
export const HORIZON_Y = 0; 
export const VIEWPORT_BOTTOM_OFFSET = 350; 
export const GRID_SPEED = 200;

// Cityscape
export const CITY_BLOCK_SIZE = 1000; 
export const CITY_STREET_WIDTH = 500; // Pushed out further to ensure no lane overlap

// Colors
export const COLORS = {
  PLAYER: '#00f0ff', // Cyan
  ENEMY_GRUNT: '#ff0044', // Red
  ENEMY_SPRINTER: '#ffaa00', // Orange
  ENEMY_TANK: '#aa00ff', // Purple
  BOSS: '#ff0000', // Red
  OBSTACLE: '#555555',
  
  // Pickups
  PICKUP_BOMB_SMALL: '#00ffaa',   // Teal/Green
  PICKUP_BOMB_MEDIUM: '#00ccff',  // Cyan/Blue
  PICKUP_BOMB_LARGE: '#ff00ff',   // Magenta
  PICKUP_CLUSTER: '#ffdd00',      // Yellow

  GATE_POS_BG: 'rgba(0, 255, 100, 0.15)',
  GATE_POS_BORDER: '#00ff66',
  GATE_NEG_BORDER: '#ff0000',
  GATE_NEG_BG: 'rgba(255, 0, 0, 0.15)',
  TEXT: '#ffffff',
  LANE_LINE: 'rgba(0, 240, 255, 0.4)',
  LANE_BORDER: '#00f0ff',
  GRID_LINE: 'rgba(0, 240, 255, 0.15)'
};

export const BULLET_COLORS = [
  '#ffffff', // Base
  '#ffff00', // T1
  '#ff8800', // T2
  '#ff0000', // T3
  '#ff00ff', // T4
  '#00ffff', // T5
];