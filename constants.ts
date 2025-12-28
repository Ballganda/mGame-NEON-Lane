export const LANE_COUNT = 3;
export const CANVAS_WIDTH = 720; // Internal resolution width
export const CANVAS_HEIGHT = 1280; // Internal resolution height
export const LANE_WIDTH = CANVAS_WIDTH / LANE_COUNT;

// World Coordinates (3D)
export const WORLD_LANE_WIDTH = 200; // Wider lanes (3 * 200 = 600 total width)
export const TOTAL_WORLD_WIDTH = LANE_COUNT * WORLD_LANE_WIDTH; // 600
export const CAMERA_DEPTH = 800; // Focal length (controls how "deep" the world looks)
export const SPAWN_Z = 3000; // Increased spawn distance for longer visibility
export const PLAYER_Z = 0; // Player is at 0 depth

// Gameplay
export const BASE_PLAYER_SPEED = 600; // Pixels per second for keyboard movement
export const BASE_SCROLL_SPEED = 200; // World scroll speed (for score)
export const UNIFIED_ENTITY_SPEED = 350; // Faster approach
export const CONVERGENCE_Z = 500; // Enemies start tracking player much earlier
export const BOSS_APPEAR_DISTANCE = 25000; 
export const GATE_SPAWN_DISTANCE = 4500; // Increased to prevent constant gates

// Limits & Caps
export const MAX_PARTICLES = 80;
export const MAX_VISIBLE_SQUAD = 50; // Show more triangles now that they are the health
export const MAX_PROJECTILES_PER_SHOT = 20; 

// Entity Sizes
export const PLAYER_RADIUS = 12; // Smaller individual units

export const ENEMY_RADIUS_GRUNT = 18;
export const ENEMY_RADIUS_SPRINTER = 22;
export const ENEMY_RADIUS_TANK = 40;

export const BULLET_RADIUS = 10;
export const PICKUP_RADIUS = 30;
export const GATE_HEIGHT = 120;

// Visuals
export const HORIZON_Y = 0; 
// Shift play area up significantly so thumb doesn't cover squad.
export const VIEWPORT_BOTTOM_OFFSET = 350; 
export const GRID_SPEED = 200;

// Colors (Tron Style)
export const COLORS = {
  PLAYER: '#00f0ff', // Cyan
  ENEMY_GRUNT: '#ff0044', // Red
  ENEMY_SPRINTER: '#ffaa00', // Orange
  ENEMY_TANK: '#aa00ff', // Purple
  BOSS: '#ff0000', // Red
  OBSTACLE: '#555555',
  
  // Pickups
  PICKUP_BOMB_SMALL: '#00ccff',   // Cyan/Blue
  PICKUP_BOMB_MEDIUM: '#aa00ff',  // Purple
  PICKUP_BOMB_LARGE: '#ff0000',   // Red
  PICKUP_CLUSTER: '#ffdd00',      // Yellow

  GATE_POS_BG: 'rgba(0, 255, 100, 0.15)',
  GATE_POS_BORDER: '#00ff66',
  GATE_NEG_BG: 'rgba(255, 0, 0, 0.15)',
  GATE_NEG_BORDER: '#ff0000',
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
  '#00ffff', // T5 (Plasma)
];