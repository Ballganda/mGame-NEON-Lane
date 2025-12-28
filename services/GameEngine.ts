import { 
  CANVAS_HEIGHT, CANVAS_WIDTH, LANE_COUNT, COLORS, PLAYER_RADIUS, 
  BASE_SCROLL_SPEED, BOSS_APPEAR_DISTANCE, GATE_SPAWN_DISTANCE, GATE_HEIGHT, 
  HORIZON_Y, UNIFIED_ENTITY_SPEED, GRID_SPEED, WORLD_LANE_WIDTH, CAMERA_DEPTH, SPAWN_Z, PLAYER_Z, CONVERGENCE_Z,
  ENEMY_RADIUS_GRUNT, ENEMY_RADIUS_SPRINTER, ENEMY_RADIUS_TANK, MAX_PARTICLES, MAX_VISIBLE_SQUAD, MAX_PROJECTILES_PER_SHOT, BULLET_COLORS, BULLET_RADIUS, VIEWPORT_BOTTOM_OFFSET, TOTAL_WORLD_WIDTH, BASE_PLAYER_SPEED
} from '../constants';
import { Entity, EntityType, GameState, Vector2, PickupType, PlayerStats, GameConfig, GateData, GateType, GateOp, Difficulty } from '../types';

export class GameEngine {
  // State
  public state: GameState = GameState.MENU;
  public entities: Entity[] = [];
  public particles: Entity[] = [];
  public player: Entity;
  
  // Optimization Buckets
  private enemies: Entity[] = [];
  private bullets: Entity[] = [];
  
  // Stats
  public score: number = 0;
  public distance: number = 0;
  public wave: number = 1;
  public fps: number = 60;
  
  // DPS Tracking
  public currentPotentialDps: number = 0;

  // Configuration & Modifiers
  public config: GameConfig;
  public playerStats: PlayerStats;
  
  // Loop internals
  private lastTime: number = 0;
  private accumulator: number = 0;
  private readonly step: number = 1/60;
  private animationFrameId: number | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  
  // Input
  private inputKeys = { left: false, right: false };
  private touchTargetX: number | null = null;
  private isTouching: boolean = false;
  
  // Systems
  private spawnTimer: number = 0;
  private lastGateDistance: number = 0;
  private shootTimer: number = 0;
  private shakeTimer: number = 0;
  private bossActive: boolean = false;
  private gridOffset: number = 0;
  private invulnerabilityTimer: number = 0;

  constructor(
    canvas: HTMLCanvasElement, 
    initialConfig: GameConfig, 
    initialStats: PlayerStats,
    private onUIUpdate: (stats: any) => void
  ) {
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.config = initialConfig;
    this.playerStats = { ...initialStats };
    
    // Initialize Player at Center (0)
    this.player = {
      id: 0,
      type: EntityType.PLAYER,
      pos: { x: 0, y: PLAYER_Z },
      radius: PLAYER_RADIUS,
      active: true,
      hp: 100, 
      maxHp: 100,
      color: COLORS.PLAYER,
      lane: 1
    };

    this.setupInput(canvas);
  }

  // Helper to get lane center for Spawning only
  private getLaneWorldX(laneIndex: number): number {
    const totalWidth = LANE_COUNT * WORLD_LANE_WIDTH;
    const startX = -totalWidth / 2 + (WORLD_LANE_WIDTH / 2);
    return startX + (laneIndex * WORLD_LANE_WIDTH);
  }

  private setupInput(canvas: HTMLCanvasElement) {
    const handleMove = (clientX: number) => {
      if (this.state !== GameState.PLAYING) return;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const canvasX = (clientX - rect.left) * scaleX;

      // Inverse Project: Screen X -> World X
      const scale = CAMERA_DEPTH / (PLAYER_Z + CAMERA_DEPTH);
      const screenCX = CANVAS_WIDTH / 2;
      const worldX = (canvasX - screenCX) / scale;
      
      this.touchTargetX = worldX;
      this.isTouching = true;
    };

    const handleEnd = () => {
      this.isTouching = false;
      this.touchTargetX = null;
    };

    canvas.addEventListener('touchstart', (e) => {
      // Allow multi-touch for buttons, but track first touch for movement
      const t = e.changedTouches[0];
      handleMove(t.clientX); 
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault(); // Prevent scroll
      const t = e.changedTouches[0];
      handleMove(t.clientX);
    }, { passive: false });

    canvas.addEventListener('touchend', handleEnd);

    canvas.addEventListener('mousedown', (e) => {
      if (this.state === GameState.PLAYING) handleMove(e.clientX);
    });
    canvas.addEventListener('mousemove', (e) => {
       if (this.isTouching) handleMove(e.clientX);
    });
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('mouseleave', handleEnd);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.inputKeys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.inputKeys.right = true;
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.inputKeys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.inputKeys.right = false;
    });
  }

  public initGame() {
    this.entities = [];
    this.particles = [];
    this.enemies = [];
    this.bullets = [];
    
    this.score = 0;
    this.distance = 0;
    this.wave = 1;
    this.currentPotentialDps = 0;
    this.invulnerabilityTimer = 0;
    
    // Start with 1 unit
    this.playerStats.projectileCount = 1;

    this.player.active = true;
    this.player.pos.x = 0; // Center
    this.touchTargetX = null;
    this.isTouching = false;
    
    this.lastGateDistance = 0;
    this.spawnTimer = 2.0;
    this.shootTimer = 0;
    this.shakeTimer = 0;
    this.bossActive = false;
    this.gridOffset = 0;

    // Don't spawn gate immediately, give player a second
    // this.spawnGateRow(1800); 
  }

  public start() {
    this.state = GameState.PLAYING;
    this.lastTime = performance.now();
    this.loop();
  }

  public pause() {
    if (this.state === GameState.PLAYING) {
      this.state = GameState.PAUSED;
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      this.onUIUpdate({ state: this.state });
    }
  }

  public resume() {
    if (this.state === GameState.PAUSED) {
      this.state = GameState.PLAYING;
      this.lastTime = performance.now();
      this.loop();
    }
  }

  public stop() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.state = GameState.MENU;
  }

  public destroy() {
    this.stop();
  }

  private loop = () => {
    if (this.state !== GameState.PLAYING) return;

    const now = performance.now();
    let deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (deltaTime > 0.25) deltaTime = 0.25;

    this.accumulator += deltaTime;
    this.fps = Math.round(1 / deltaTime);

    while (this.accumulator >= this.step) {
      this.update(this.step);
      this.accumulator -= this.step;
    }

    this.draw();
    
    this.currentPotentialDps = this.playerStats.damage * this.playerStats.projectileCount * this.playerStats.fireRate;

    this.onUIUpdate({
      score: Math.floor(this.score),
      hp: this.playerStats.projectileCount,
      distance: Math.floor(this.distance),
      fps: this.fps,
      state: this.state,
      activeEntities: this.entities.length,
      dps: Math.round(this.currentPotentialDps)
    });

    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  private getDifficultyMultiplier(): number {
    switch (this.config.difficulty) {
      case Difficulty.EASY: return 0.5;
      case Difficulty.NORMAL: return 1.0;
      case Difficulty.HARD: return 1.5;
      case Difficulty.UNFAIR: return 2.0;
      case Difficulty.EMOTIONAL: return 3.0;
      case Difficulty.SINGULARITY: return 5.0;
      case Difficulty.OMEGA: return 10.0;
      default: return 1.0;
    }
  }

  private update(dt: number) {
    if (this.playerStats.projectileCount < 1) {
      this.endGame();
      return;
    }

    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= dt;
    }

    // World Logic
    const scrollSpeed = BASE_SCROLL_SPEED + (this.wave * 10);
    this.distance += scrollSpeed * dt;
    // Calculate Wave based on distance (approx every 1500m is a new wave)
    this.wave = 1 + Math.floor(this.distance / 1500);

    this.score += 10 * dt;
    this.gridOffset = (this.gridOffset + GRID_SPEED * dt) % 200;

    // --- PLAYER MOVEMENT ---
    const boundary = (TOTAL_WORLD_WIDTH / 2) - 40; // Keep slightly inside edges

    if (this.isTouching && this.touchTargetX !== null) {
      // Direct Touch Following
      const diff = this.touchTargetX - this.player.pos.x;
      this.player.pos.x += diff * 15 * dt;
    } else {
      // Keyboard
      if (this.inputKeys.left) this.player.pos.x -= BASE_PLAYER_SPEED * dt;
      if (this.inputKeys.right) this.player.pos.x += BASE_PLAYER_SPEED * dt;
    }

    // Clamp
    if (this.player.pos.x < -boundary) this.player.pos.x = -boundary;
    if (this.player.pos.x > boundary) this.player.pos.x = boundary;

    // --- CALCULATE LOGICAL LANE (For Gates) ---
    // Even though moving smoothly, which lane "slot" are we in?
    // Start X of Lane 0
    const laneWidth = WORLD_LANE_WIDTH;
    const totalWidth = LANE_COUNT * laneWidth;
    const startX = -totalWidth / 2 + (laneWidth / 2);
    // x = startX + (lane * width)  =>  lane = (x - startX) / width
    const exactLane = (this.player.pos.x - startX) / laneWidth;
    const logicalLane = Math.max(0, Math.min(LANE_COUNT - 1, Math.round(exactLane)));


    if (this.shakeTimer > 0) this.shakeTimer -= dt;

    // Shooting
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.fireBullet();
      this.shootTimer = 1 / this.playerStats.fireRate;
    }

    // Spawning
    if (!this.bossActive) {
      this.spawnManager(dt);
    }

    this.enemies = [];
    this.bullets = [];

    // Entity Loop
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const ent = this.entities[i];
      
      if (!ent.active) {
        this.entities.splice(i, 1);
        continue;
      }

      // Move Logic
      if (ent.type !== EntityType.BOSS) {
         if (ent.type === EntityType.BULLET) {
             if (ent.velocity) {
                 ent.pos.x += ent.velocity.x * dt;
                 ent.pos.y += ent.velocity.y * dt;
             }
             this.bullets.push(ent);
         } else {
             if (ent.type.startsWith('ENEMY')) {
               this.enemies.push(ent);
               ent.pos.y -= UNIFIED_ENTITY_SPEED * dt;
               
               if (ent.pos.y < CONVERGENCE_Z) {
                   const dx = this.player.pos.x - ent.pos.x;
                   if (Math.abs(dx) < WORLD_LANE_WIDTH * 2) {
                       ent.pos.x += Math.sign(dx) * 120 * dt; 
                   }
               }
             } else {
               ent.pos.y -= UNIFIED_ENTITY_SPEED * dt;
             }
         }
      }

      if (ent.pos.y < -200 || ent.pos.y > SPAWN_Z + 4000) {
        ent.active = false;
      }

      // Collisions
      if (ent.active && ent.type !== EntityType.BULLET) {
          if (ent.type === EntityType.GATE) {
             // GATE LOGIC: Strict Lane Snapping
             // Only activate if player is logically in this gate's lane
             if (ent.lane === logicalLane) {
                 // Check Depth overlap (allowing some tolerance)
                 if (Math.abs(ent.pos.y - this.player.pos.y) < 50) {
                     this.handlePlayerCollision(ent);
                 }
             }
          } else if (ent.type === EntityType.PICKUP) {
              this.handlePlayerCollision(ent);
          } else if (ent.type.startsWith('ENEMY') || ent.type === EntityType.OBSTACLE) {
              this.handleEnemyPlayerInteraction(ent);
          }
      }
    }

    // Bullet Collisions
    for (const bullet of this.bullets) {
        if (!bullet.active) continue;
        for (const enemy of this.enemies) {
            if (!enemy.active) continue;
            if (Math.abs(bullet.pos.y - enemy.pos.y) > 60) continue;
            
            if (this.checkCollision(bullet, enemy)) {
                bullet.active = false;
                const dmg = (bullet.damage || 10);
                enemy.hp -= dmg;
                this.createExplosion(enemy.pos.x, enemy.pos.y, 2, bullet.color);

                if (enemy.hp <= 0) {
                    enemy.active = false;
                    this.createExplosion(enemy.pos.x, enemy.pos.y, 8, enemy.color);
                    this.score += (enemy.scoreValue || 10);
                    if (this.config.hapticsEnabled) navigator.vibrate(10);
                }
                break; 
            }
        }
    }

    // Particles
    if (this.particles.length > MAX_PARTICLES) {
        this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.pos.x += (p.velocity?.x || 0) * dt;
      p.pos.y += (p.velocity?.y || 0) * dt; 
      p.pos.y -= UNIFIED_ENTITY_SPEED * 0.5 * dt; 
      p.radius -= 10 * dt;
      if (p.radius <= 0) this.particles.splice(i, 1);
    }
  }

  private spawnManager(dt: number) {
    // 1. GATE Spawning (Distance based)
    // Check if we travelled far enough for a gate
    if (this.distance - this.lastGateDistance > GATE_SPAWN_DISTANCE) {
        this.spawnGateRow();
        this.lastGateDistance = this.distance;
    }

    // 2. ENEMY Spawning (Time based)
    // Runs independently of Gates
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
        const pattern = Math.random();
        if (pattern < 0.5) this.spawnArmyWave(); 
        else if (pattern < 0.8) this.spawnEliteWave();
        else this.spawnSimpleGap();
        this.spawnTimer = Math.max(0.8, 3.0 - (this.wave * 0.15));
    }
  }

  private spawnArmyWave() {
      const targetLane = Math.floor(Math.random() * LANE_COUNT);
      const laneX = this.getLaneWorldX(targetLane);
      const diffMult = this.getDifficultyMultiplier();
      let baseHp = (10 + (this.wave * 5)) * diffMult;
      
      // CAP DPS used for scaling
      const effectiveDps = Math.min(this.currentPotentialDps || 0, 100000);

      // Scale Army Size with capped DPS
      let dpsDepthBonus = Math.floor(effectiveDps / 100); 
      
      let gridDepth = 5 + dpsDepthBonus + Math.floor(Math.random() * 4); 
      
      const MAX_GRID_DEPTH = 30; 
      if (gridDepth > MAX_GRID_DEPTH) {
          const scaler = gridDepth / MAX_GRID_DEPTH;
          baseHp = Math.floor(baseHp * scaler); 
          gridDepth = MAX_GRID_DEPTH;
      }
      
      const gridWidth = 5;
      const spacingX = 35; 
      const spacingZ = 40; 
      
      const startXOffset = -((gridWidth - 1) * spacingX) / 2;
      let currentZ = SPAWN_Z;

      if (Math.random() > 0.6) {
          const type = Math.random() > 0.5 ? EntityType.ENEMY_SPRINTER : EntityType.ENEMY_TANK;
          const r = type === EntityType.ENEMY_TANK ? ENEMY_RADIUS_TANK : ENEMY_RADIUS_SPRINTER;
          this.spawnEntity(type, laneX, currentZ, r, baseHp * 3, 50);
          currentZ += 150; 
      }

      for (let row = 0; row < gridDepth; row++) {
          for (let col = 0; col < gridWidth; col++) {
              const x = laneX + startXOffset + (col * spacingX);
              const z = currentZ + (row * spacingZ);
              const jitterX = (Math.random() - 0.5) * 10;
              const jitterZ = (Math.random() - 0.5) * 10;
              this.spawnEntity(EntityType.ENEMY_GRUNT, x + jitterX, z + jitterZ, ENEMY_RADIUS_GRUNT, baseHp, 10);
          }
      }
      currentZ += (gridDepth * spacingZ) + 100;

      if (Math.random() > 0.6) {
          const type = Math.random() > 0.5 ? EntityType.ENEMY_SPRINTER : EntityType.ENEMY_TANK;
          const r = type === EntityType.ENEMY_TANK ? ENEMY_RADIUS_TANK : ENEMY_RADIUS_SPRINTER;
          this.spawnEntity(type, laneX, currentZ, r, baseHp * 3, 50);
      }
      
      // Spawn Bomb/Pickup
      if (Math.random() > 0.6) {
          const pLane = (targetLane + 1) % LANE_COUNT;
          this.spawnPickup(pLane, SPAWN_Z);
      }
  }

  private spawnEliteWave() {
      const centerZ = SPAWN_Z;
      const type = Math.random() > 0.5 ? EntityType.ENEMY_SPRINTER : EntityType.ENEMY_TANK;
      const hpMult = type === EntityType.ENEMY_TANK ? 4 : 2;
      const diffMult = this.getDifficultyMultiplier();
      const r = type === EntityType.ENEMY_TANK ? ENEMY_RADIUS_TANK : ENEMY_RADIUS_SPRINTER;
      const baseHp = (10 + (this.wave * 5)) * hpMult * diffMult;

      for(let i=0; i<LANE_COUNT; i++) {
          if (Math.random() > 0.3) {
             const offsetZ = Math.abs(i - 1) * 200; 
             this.spawnEntity(type, this.getLaneWorldX(i), centerZ + offsetZ, r, baseHp, 30);
          }
      }
  }

  private spawnSimpleGap() {
      const gapLane = Math.floor(Math.random() * LANE_COUNT);
      const diffMult = this.getDifficultyMultiplier();
      const baseHp = (10 + (this.wave * 5)) * diffMult;
      
      for(let i=0; i<LANE_COUNT; i++) {
          if (i === gapLane) continue;
          const laneX = this.getLaneWorldX(i);
          this.spawnEntity(EntityType.ENEMY_GRUNT, laneX - 20, SPAWN_Z, ENEMY_RADIUS_GRUNT, baseHp, 10);
          this.spawnEntity(EntityType.ENEMY_GRUNT, laneX + 20, SPAWN_Z, ENEMY_RADIUS_GRUNT, baseHp, 10);
          this.spawnEntity(EntityType.ENEMY_GRUNT, laneX - 20, SPAWN_Z + 50, ENEMY_RADIUS_GRUNT, baseHp, 10);
          this.spawnEntity(EntityType.ENEMY_GRUNT, laneX + 20, SPAWN_Z + 50, ENEMY_RADIUS_GRUNT, baseHp, 10);
      }
  }

  private spawnEntity(type: EntityType, x: number, z: number, r: number, hp: number, score: number) {
      let color = COLORS.ENEMY_GRUNT;
      if (type === EntityType.ENEMY_SPRINTER) color = COLORS.ENEMY_SPRINTER;
      if (type === EntityType.ENEMY_TANK) color = COLORS.ENEMY_TANK;

      this.entities.push({
          id: Math.random(),
          type,
          pos: { x, y: z },
          radius: r,
          active: true,
          hp: hp,
          maxHp: hp,
          color,
          lane: -1,
          scoreValue: score
      });
  }

  private spawnPickup(laneIndex: number, z: number) {
     const types = [PickupType.BOMB_SMALL, PickupType.BOMB_MEDIUM, PickupType.BOMB_LARGE, PickupType.CLUSTER];
     const type = types[Math.floor(Math.random() * types.length)];
     let color = COLORS.PICKUP_BOMB_SMALL;
     if (type === PickupType.BOMB_MEDIUM) color = COLORS.PICKUP_BOMB_MEDIUM;
     if (type === PickupType.BOMB_LARGE) color = COLORS.PICKUP_BOMB_LARGE;
     if (type === PickupType.CLUSTER) color = COLORS.PICKUP_CLUSTER;

     this.entities.push({
        id: Math.random(),
        type: EntityType.PICKUP,
        pos: { x: this.getLaneWorldX(laneIndex), y: z },
        radius: 30,
        active: true,
        hp: 1,
        maxHp: 1,
        color,
        lane: laneIndex,
        pickupType: type
     });
  }

  private spawnGateRow(zOverride?: number) {
     const z = zOverride ?? SPAWN_Z;
     const expectedDps = this.wave * 200;
     const actualDps = Math.min(this.currentPotentialDps || 200, 100000);
     const powerRatio = actualDps / expectedDps;
     
     // EASIER EARLY GAME - Tweak logic
     let negativeBias = 0.5;
     
     if (this.wave <= 1) {
         negativeBias = 0.1; 
     } else {
         if (powerRatio > 1.2) negativeBias = 0.7; 
         else if (powerRatio < 0.5) negativeBias = 0.2;
         else negativeBias = 0.5;
         
         if (this.wave > 5) negativeBias = Math.max(negativeBias, 0.4); 
     }

     const guaranteedGoodLane = Math.floor(Math.random() * LANE_COUNT);
     const hasOpenLane = Math.random() < 0.2;
     const openLaneIndex = hasOpenLane ? Math.floor(Math.random() * LANE_COUNT) : -1;

     for (let i = 0; i < LANE_COUNT; i++) {
        if (i === openLaneIndex) continue;

        let wantBad = Math.random() < negativeBias;
        if (i === guaranteedGoodLane && powerRatio < 0.8) wantBad = false;

        const gateType = GateType.PROJECTILES; 
        let op = Math.random() > 0.6 ? GateOp.MULTIPLY : GateOp.ADD;
        let value = 0;

        if (op === GateOp.MULTIPLY) {
            if (wantBad) value = 0.5; 
            else value = 2; 
        } else {
            if (wantBad) value = -(Math.floor(Math.random() * 4) + 2); 
            else value = Math.floor(Math.random() * 5) + 3;
        }

        const isBeneficial = (op === GateOp.MULTIPLY && value >= 1) || (op === GateOp.ADD && value >= 0);
        const color = isBeneficial ? COLORS.GATE_POS_BG : COLORS.GATE_NEG_BG;
        
        this.entities.push({
            id: Math.random(),
            type: EntityType.GATE,
            pos: { x: this.getLaneWorldX(i), y: z },
            radius: 40,
            active: true,
            hp: 1,
            maxHp: 1,
            color: color,
            lane: i,
            gateData: { type: gateType, op: op, value: value },
            width: WORLD_LANE_WIDTH - 20,
            height: GATE_HEIGHT
        });
     }
  }

  private checkCollision(a: Entity, b: Entity): boolean {
      const zDiff = Math.abs(a.pos.y - b.pos.y);
      if (zDiff > 60) return false;
      const dx = a.pos.x - b.pos.x;
      const radiusSum = a.radius + b.radius;
      return Math.abs(dx) < radiusSum;
  }

  private handlePlayerCollision(ent: Entity) {
    if (ent.type === EntityType.GATE) {
       ent.active = false;
       this.applyGateBonus(ent.gateData!);
       this.createExplosion(this.player.pos.x, this.player.pos.y, 10, ent.gateData!.value > 0 ? '#00ff00' : '#ff0000');
       if (this.config.hapticsEnabled) navigator.vibrate(20);
    } else {
       // Standard Radius Check for others
       if (this.checkCollision(this.player, ent)) {
           if (ent.type === EntityType.PICKUP) {
               ent.active = false;
               this.applyPickup(ent.pickupType!);
           }
       }
    }
  }

  private handleEnemyPlayerInteraction(ent: Entity) {
    if (!ent.isAttacking && this.checkCollision(this.player, ent)) {
        if (this.invulnerabilityTimer <= 0) {
            this.playerStats.projectileCount = Math.max(0, this.playerStats.projectileCount - 1);
            this.shakeTimer = 0.3;
            this.createExplosion(this.player.pos.x, this.player.pos.y, 15, COLORS.PLAYER);
            if (this.config.hapticsEnabled) navigator.vibrate(100);
            this.invulnerabilityTimer = 0.5;
        }
        ent.active = false;
        ent.hp = 0;
    }
  }

  private applyGateBonus(data: GateData) {
      const val = data.value;
      const isMult = data.op === GateOp.MULTIPLY;
      let newCount = this.playerStats.projectileCount;
      if (isMult) newCount = Math.floor(newCount * val);
      else newCount += val;
      this.playerStats.projectileCount = Math.max(0, newCount); 
  }

  private applyPickup(type: PickupType) {
    if (this.config.hapticsEnabled) navigator.vibrate(50);
    
    // Define Radius/Effect based on type
    let radius = 0;
    let color = '#fff';
    
    switch (type) {
        case PickupType.BOMB_SMALL:
            radius = 300;
            color = COLORS.PICKUP_BOMB_SMALL;
            break;
        case PickupType.BOMB_MEDIUM:
            radius = 600;
            color = COLORS.PICKUP_BOMB_MEDIUM;
            break;
        case PickupType.BOMB_LARGE:
            radius = 1200;
            color = COLORS.PICKUP_BOMB_LARGE;
            break;
        case PickupType.CLUSTER:
            radius = 2000; // Just visual trigger for logic below
            color = COLORS.PICKUP_CLUSTER;
            break;
    }

    if (type === PickupType.CLUSTER) {
        // Forward Cone Clear
        this.entities.forEach(e => {
            if (e.active && e.type.startsWith('ENEMY') && e.pos.y < SPAWN_Z) {
                const dist = Math.abs(e.pos.y - this.player.pos.y);
                const dx = Math.abs(e.pos.x - this.player.pos.x);
                if (dist < 1200 && dx < 400) { 
                    e.active = false;
                    e.hp = 0;
                    this.createExplosion(e.pos.x, e.pos.y, 8, color);
                    this.score += (e.scoreValue || 10);
                }
            }
        });
        this.createExplosion(0, 300, 20, color);
    } else {
        // Radial Clear
        this.entities.forEach(e => {
            if (e.active && e.type.startsWith('ENEMY') && e.pos.y < SPAWN_Z && e.pos.y > -200) {
                 const dx = e.pos.x - this.player.pos.x;
                 const dy = e.pos.y - this.player.pos.y;
                 const dist = Math.sqrt(dx*dx + dy*dy);
                 
                 if (dist < radius) {
                    e.active = false;
                    e.hp = 0;
                    this.createExplosion(e.pos.x, e.pos.y, 10, color);
                    this.score += (e.scoreValue || 10);
                 }
            }
        });
        this.createExplosion(this.player.pos.x, this.player.pos.y + 200, 30, color);
    }
    this.shakeTimer = 0.5;
  }

  private createExplosion(x: number, z: number, count: number, color: string) {
    if (this.config.reducedEffects) count = Math.ceil(count / 2);
    const spawnCount = Math.min(count, 15);
    for(let i=0; i<spawnCount; i++) {
       this.particles.push({
         id: Math.random(),
         type: EntityType.PARTICLE,
         pos: {x, y: z},
         radius: Math.random() * 4 + 2,
         active: true,
         hp: 1,
         maxHp: 1,
         color: color,
         lane: -1,
         velocity: {
            x: (Math.random() - 0.5) * 500,
            y: (Math.random() - 0.5) * 500 
         }
       });
    }
  }

  private findAutoAimTarget(): Entity | null {
    let nearest: Entity | null = null;
    let minSqDist = Infinity;
    const maxAngle = 3 * (Math.PI / 180); 

    for (const ent of this.enemies) {
        if (!ent.active) continue;
        if (ent.pos.y <= this.player.pos.y) continue;
        const dx = ent.pos.x - this.player.pos.x;
        const dy = ent.pos.y - this.player.pos.y;
        const angle = Math.atan2(dx, dy);
        if (Math.abs(angle) <= maxAngle) {
            const sqDist = dx*dx + dy*dy;
            if (sqDist < minSqDist) {
                minSqDist = sqDist;
                nearest = ent;
            }
        }
    }
    return nearest;
  }

  private fireBullet() {
    const rawCount = Math.max(1, Math.floor(this.playerStats.projectileCount));
    const actualBulletCount = Math.min(rawCount, MAX_PROJECTILES_PER_SHOT);
    const damageMultiplier = rawCount / actualBulletCount;
    const bulletDamage = this.playerStats.damage * damageMultiplier;
    
    const intensityScore = bulletDamage / 20; 
    const tier = Math.min(BULLET_COLORS.length - 1, Math.floor(intensityScore));
    const bulletColor = BULLET_COLORS[tier];
    const bulletRadius = BULLET_RADIUS + Math.min(5, tier);

    const offsets = this.getSquadOffsets(actualBulletCount);
    const target = this.findAutoAimTarget();
    const speed = 1800;

    // Cone Spread Calculation
    // Total spread angle varies by bullet count, maxing at ~30 degrees for huge squads
    const maxSpread = 20 * (Math.PI / 180);
    const currentSpread = Math.min(maxSpread, (actualBulletCount * 0.5) * (Math.PI / 180));
    
    for (let i = 0; i < offsets.length; i++) {
        const off = offsets[i];
        let vx = 0;
        let vy = speed;
        
        // Calculate Base Angle (Aim at target or straight ahead)
        let baseAngle = Math.PI / 2; // Straight up in standard trig, but here Y is depth. 
        // We use vectors, so let's stick to vector math.
        
        let dirX = 0; 
        let dirY = 1;

        if (target) {
            const startX = this.player.pos.x + off.x;
            const startY = this.player.pos.y + off.y;
            const dx = target.pos.x - startX;
            const dy = target.pos.y - startY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 0) {
                dirX = dx/dist;
                dirY = dy/dist;
            }
        }

        // Apply Cone Spread
        // angleOffset is distributed from -spread/2 to +spread/2
        let angleOffset = 0;
        if (actualBulletCount > 1) {
            const step = currentSpread / (actualBulletCount - 1);
            angleOffset = -currentSpread/2 + (i * step);
        }

        // Rotate the direction vector by angleOffset
        // x' = x cos(theta) - y sin(theta)
        // y' = x sin(theta) + y cos(theta)
        const cos = Math.cos(angleOffset);
        const sin = Math.sin(angleOffset);
        
        const finalDirX = dirX * cos - dirY * sin;
        const finalDirY = dirX * sin + dirY * cos;

        vx = finalDirX * speed;
        vy = finalDirY * speed;

        this.entities.push({
            id: Math.random(),
            type: EntityType.BULLET,
            pos: { x: this.player.pos.x + off.x, y: this.player.pos.y + off.y },
            radius: bulletRadius,
            active: true,
            hp: 1,
            maxHp: 1,
            color: bulletColor,
            lane: -1,
            damage: bulletDamage,
            velocity: { x: vx, y: vy }
        });
    }
  }

  private getSquadOffsets(count: number): Vector2[] {
      if (count <= 1) return [{x:0, y:0}];
      const offsets: Vector2[] = [];
      const spacing = 18; 
      let layer = 0;
      let placed = 0;
      while(placed < count) {
          if (layer === 0) {
              offsets.push({x:0, y:0});
              placed++;
          } else {
             const rowCount = layer + 1;
             const width = (rowCount - 1) * spacing * 1.5;
             const rowStartX = -width/2;
             const y = layer * spacing;
             for(let k=0; k<rowCount && placed < count; k++) {
                 offsets.push({ x: rowStartX + (k * spacing * 1.5), y });
                 placed++;
             }
          }
          layer++;
      }
      return offsets;
  }

  private endGame() {
    this.state = GameState.GAME_OVER;
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.onUIUpdate({ state: this.state });
  }

  private project(p: Vector2): { x: number, y: number, scale: number, visible: boolean } {
      const z = p.y; 
      if (z < -200 || z > SPAWN_Z + 500) return { x:0, y:0, scale:0, visible: false };

      const x = p.x;
      const scale = CAMERA_DEPTH / (z + CAMERA_DEPTH);

      const screenCX = CANVAS_WIDTH / 2;
      const projX = screenCX + (x * scale);
      
      const bottomY = CANVAS_HEIGHT - VIEWPORT_BOTTOM_OFFSET; 
      const topY = HORIZON_Y;
      
      const finalY = topY + (scale * (bottomY - topY));
      
      return { x: projX, y: finalY, scale, visible: true };
  }

  private draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    let offsetX = 0; let offsetY = 0;
    if (this.shakeTimer > 0) {
      offsetX = (Math.random() - 0.5) * 15;
      offsetY = (Math.random() - 0.5) * 15;
    }
    ctx.save();
    ctx.translate(offsetX, offsetY);

    this.drawGrid(ctx);

    // Draw Convergence Line
    const trackLeftX = this.getLaneWorldX(0) - (WORLD_LANE_WIDTH / 2);
    const trackRightX = this.getLaneWorldX(LANE_COUNT - 1) + (WORLD_LANE_WIDTH / 2);

    const pConvLeft = this.project({ x: trackLeftX, y: CONVERGENCE_Z });
    const pConvRight = this.project({ x: trackRightX, y: CONVERGENCE_Z });

    if (pConvLeft.visible) {
        ctx.strokeStyle = COLORS.LANE_BORDER; 
        ctx.lineWidth = 2;
        ctx.setLineDash([15, 15]); // Dashed line to indicate zone transition
        ctx.beginPath();
        ctx.moveTo(pConvLeft.x, pConvLeft.y);
        ctx.lineTo(pConvRight.x, pConvRight.y);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.lineWidth = 2;
    const drawDist = 3000;
    for (let i = 0; i <= LANE_COUNT; i++) {
        const lx = this.getLaneWorldX(0) - (WORLD_LANE_WIDTH/2) + (i * WORLD_LANE_WIDTH);
        
        const isBorder = i === 0 || i === LANE_COUNT;
        const startZ = isBorder ? PLAYER_Z : CONVERGENCE_Z;
        
        const pStart = this.project({ x: lx, y: startZ });
        const pEnd = this.project({ x: lx, y: drawDist });
        
        if (pStart.visible || pEnd.visible) {
             ctx.strokeStyle = isBorder ? COLORS.LANE_BORDER : COLORS.LANE_LINE;
             ctx.beginPath();
             ctx.moveTo(pStart.x, pStart.y);
             ctx.lineTo(pEnd.x, pEnd.y);
             ctx.stroke();
        }
    }

    const allEnts = [...this.entities, ...this.particles];
    allEnts.sort((a,b) => b.pos.y - a.pos.y);
    
    for (const ent of allEnts) {
        if (!ent.active) continue;
        const proj = this.project(ent.pos);
        if (!proj.visible) continue;

        if (ent.type === EntityType.GATE) this.drawGate(ctx, ent, proj);
        else if (ent.type === EntityType.PARTICLE) this.drawParticle(ctx, ent, proj);
        else this.drawEntity(ctx, ent, proj);
    }

    if (this.invulnerabilityTimer <= 0 || Math.floor(performance.now() / 50) % 2 === 0) {
      this.drawPlayerSquad(ctx);
    }

    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D) {
      ctx.strokeStyle = COLORS.GRID_LINE;
      ctx.lineWidth = 1;
      const spacing = 200;
      const count = 20;
      
      for(let i=0; i<count; i++) {
          let z = (i * spacing) - this.gridOffset;
          if (z < 0) z += (count * spacing);
          
          const pLeft = this.project({ x: -1000, y: z });
          const pRight = this.project({ x: 1000, y: z });
          
          if (pLeft.visible) {
             ctx.beginPath();
             ctx.moveTo(pLeft.x, pLeft.y);
             ctx.lineTo(pRight.x, pRight.y);
             ctx.stroke();
          }
      }
  }

  private drawPlayerSquad(ctx: CanvasRenderingContext2D) {
      const rawCount = Math.floor(this.playerStats.projectileCount);
      const visibleCount = Math.min(rawCount, MAX_VISIBLE_SQUAD);
      const offsets = this.getSquadOffsets(visibleCount);
      const projP = this.project(this.player.pos);
      const scale = projP.scale;

      // Color logic: White for leader (index 0), Player Color for others
      for(let i=0; i<offsets.length; i++) {
          const off = offsets[i];
          const x = projP.x + (off.x * scale);
          const y = projP.y + (off.y * scale);
          const r = PLAYER_RADIUS * scale; 
          
          ctx.fillStyle = (i === 0) ? '#ffffff' : this.player.color;
          
          ctx.beginPath();
          ctx.moveTo(x, y - r);
          ctx.lineTo(x - r, y + r);
          ctx.lineTo(x + r, y + r);
          ctx.closePath();
          ctx.fill();
      }

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${30 * scale}px Orbitron`;
      ctx.textAlign = 'center';
      ctx.fillText(rawCount.toString(), projP.x, projP.y + (60 * scale));
  }

  private drawEntity(ctx: CanvasRenderingContext2D, ent: Entity, proj: any) {
    const radius = ent.radius * proj.scale;
    ctx.fillStyle = ent.color;
    
    if (ent.type === EntityType.PICKUP) {
      ctx.save();
      ctx.translate(proj.x, proj.y);
      ctx.rotate(performance.now() / 200);
      const s = 15 * proj.scale;
      
      // Draw Diamond Shape for Special
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s, 0);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3 * proj.scale;
      ctx.stroke();
      
      // Icon
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${20 * proj.scale}px sans-serif`;
      
      let icon = '✷';
      if (ent.pickupType === PickupType.BOMB_SMALL || ent.pickupType === PickupType.BOMB_MEDIUM || ent.pickupType === PickupType.BOMB_LARGE) icon = '☢';
      
      ctx.fillText(icon, 0, 0);

      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, radius, 0, Math.PI * 2);
      ctx.fill();
      
      if (ent.type === EntityType.ENEMY_TANK) {
         ctx.strokeStyle = '#fff';
         ctx.lineWidth = 3 * proj.scale;
         ctx.stroke();
      }
    }
  }

  private drawParticle(ctx: CanvasRenderingContext2D, ent: Entity, proj: any) {
      ctx.fillStyle = ent.color;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, ent.radius * proj.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
  }

  private drawGate(ctx: CanvasRenderingContext2D, ent: Entity, proj: any) {
      if (!ent.gateData) return;
      const val = ent.gateData.value;
      const op = ent.gateData.op;
      let isGood = true;
      if (op === GateOp.MULTIPLY) isGood = val >= 1;
      else isGood = val >= 0;

      const bgColor = isGood ? COLORS.GATE_POS_BG : COLORS.GATE_NEG_BG;
      const borderColor = isGood ? COLORS.GATE_POS_BORDER : COLORS.GATE_NEG_BORDER;
      
      const w = (ent.width || WORLD_LANE_WIDTH) * proj.scale;
      const h = (ent.height || GATE_HEIGHT) * proj.scale;
      
      const x = proj.x - w/2;
      const y = proj.y - h/2;

      ctx.fillStyle = bgColor;
      ctx.fillRect(x, y, w, h);
      
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 4 * proj.scale;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${30 * proj.scale}px Orbitron`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      let text = '';
      if (op === GateOp.MULTIPLY) {
          if (val < 1 && val > 0) text = `/${Math.round(1/val)}`;
          else text = `x${val}`;
      } else {
          text = `${val > 0 ? '+' : ''}${val}`;
      }
      
      ctx.fillText(text, proj.x, proj.y);
  }
}