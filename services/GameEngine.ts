import { 
  CANVAS_HEIGHT, CANVAS_WIDTH, LANE_COUNT, COLORS, PLAYER_RADIUS, 
  BASE_SCROLL_SPEED, BOSS_APPEAR_DISTANCE, GATE_SPAWN_DISTANCE, GATE_HEIGHT, 
  HORIZON_Y, UNIFIED_ENTITY_SPEED, GRID_SPEED, WORLD_LANE_WIDTH, CAMERA_DEPTH, SPAWN_Z, PLAYER_Z, CONVERGENCE_Z,
  ENEMY_RADIUS_GRUNT, ENEMY_RADIUS_SPRINTER, ENEMY_RADIUS_TANK, MAX_PARTICLES, MAX_VISIBLE_SQUAD, MAX_PROJECTILES_PER_SHOT, BULLET_COLORS, BULLET_RADIUS, VIEWPORT_BOTTOM_OFFSET, TOTAL_WORLD_WIDTH, BASE_PLAYER_SPEED, SQUAD_SPREAD_WIDTH, STUCK_DAMAGE_INTERVAL,
  CITY_BLOCK_SIZE, CITY_STREET_WIDTH, DRAW_DISTANCE, MAX_SPREAD_ANGLE_DEG
} from '../constants';
import { Entity, EntityType, GameState, Vector2, PickupType, PlayerStats, GameConfig, GateData, GateType, GateOp, Difficulty, ParticleShape } from '../types';

export class GameEngine {
  public state: GameState = GameState.MENU;
  public entities: Entity[] = [];
  public particles: Entity[] = [];
  public player: Entity;
  
  private enemies: Entity[] = [];
  private bullets: Entity[] = [];
  private pickups: Entity[] = [];
  
  public score: number = 0;
  public distance: number = 0;
  public wave: number = 1;
  public fps: number = 60;
  public currentPotentialDps: number = 0;

  public config: GameConfig;
  public playerStats: PlayerStats;
  
  private lastTime: number = 0;
  private accumulator: number = 0;
  private readonly step: number = 1/60;
  private animationFrameId: number | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  
  private inputKeys = { left: false, right: false };
  private touchTargetX: number | null = null;
  private isTouching: boolean = false;
  
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
      const scale = CAMERA_DEPTH / (PLAYER_Z + CAMERA_DEPTH);
      const screenCX = CANVAS_WIDTH / 2;
      const worldX = (canvasX - screenCX) / scale;
      this.touchTargetX = worldX;
      this.isTouching = true;
    };
    const handleEnd = () => { this.isTouching = false; this.touchTargetX = null; };

    canvas.addEventListener('touchstart', (e) => handleMove(e.changedTouches[0].clientX), { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleMove(e.changedTouches[0].clientX); }, { passive: false });
    canvas.addEventListener('touchend', handleEnd);
    canvas.addEventListener('mousedown', (e) => { if (this.state === GameState.PLAYING) handleMove(e.clientX); });
    canvas.addEventListener('mousemove', (e) => { if (this.isTouching) handleMove(e.clientX); });
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('mouseleave', handleEnd);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') this.inputKeys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') this.inputKeys.right = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') this.inputKeys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') this.inputKeys.right = false;
    });
  }

  public initGame() {
    this.entities = [];
    this.particles = [];
    this.enemies = [];
    this.bullets = [];
    this.pickups = [];
    this.score = 0;
    this.distance = 0;
    this.wave = 1;
    this.currentPotentialDps = 0;
    this.invulnerabilityTimer = 0;
    this.playerStats.projectileCount = 1;
    this.player.active = true;
    this.player.pos.x = 0;
    this.touchTargetX = null;
    this.isTouching = false;
    this.lastGateDistance = 0;
    this.spawnTimer = 2.0;
    this.shootTimer = 0;
    this.shakeTimer = 0;
    this.bossActive = false;
    this.gridOffset = 0;
  }

  public setGameState(newState: GameState) {
    this.state = newState;
    if (newState === GameState.PLAYING) this.lastTime = performance.now();
  }

  public start() {
    if (!this.animationFrameId) {
      this.lastTime = performance.now();
      this.loop();
    }
  }

  public pause() {
    if (this.state === GameState.PLAYING) {
      this.state = GameState.PAUSED;
      this.onUIUpdate({ state: this.state });
    }
  }

  public resume() {
    if (this.state === GameState.PAUSED) {
      this.state = GameState.PLAYING;
      this.lastTime = performance.now();
    }
  }

  public stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.state = GameState.MENU;
  }

  public destroy() { this.stop(); }

  private loop = () => {
    const now = performance.now();
    let deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (deltaTime > 0.25) deltaTime = 0.25;

    if (this.state === GameState.PLAYING) {
      this.accumulator += deltaTime;
      this.fps = Math.round(1 / deltaTime);
      while (this.accumulator >= this.step) {
        this.update(this.step);
        this.accumulator -= this.step;
      }
    } else if (this.state === GameState.MENU) {
      this.gridOffset = (this.gridOffset + (GRID_SPEED * 0.5) * deltaTime) % 200;
      this.distance += (BASE_SCROLL_SPEED * 0.5) * deltaTime;
    }

    this.draw();
    
    if (this.state === GameState.PLAYING) {
      this.currentPotentialDps = this.playerStats.damage * this.playerStats.projectileCount * this.playerStats.fireRate;
      this.onUIUpdate({
        score: Math.floor(this.score),
        hp: Math.floor(this.playerStats.projectileCount),
        distance: Math.floor(this.distance),
        fps: this.fps,
        state: this.state,
        activeEntities: this.entities.length,
        dps: Math.round(this.currentPotentialDps)
      });
    }
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  private getDifficultyMultiplier(): number {
    switch (this.config.difficulty) {
      case Difficulty.EASY: return 0.28;
      case Difficulty.NORMAL: return 0.56;
      case Difficulty.HARD: return 0.85;
      case Difficulty.UNFAIR: return 1.1;
      case Difficulty.EMOTIONAL: return 1.7;
      case Difficulty.SINGULARITY: return 2.8;
      case Difficulty.OMEGA: return 5.6;
      default: return 0.56;
    }
  }

  private update(dt: number) {
    if (this.playerStats.projectileCount < 1) { this.endGame(); return; }
    if (this.invulnerabilityTimer > 0) this.invulnerabilityTimer -= dt;

    const scrollSpeed = BASE_SCROLL_SPEED + (this.wave * 10);
    this.distance += scrollSpeed * dt;
    this.wave = 1 + Math.floor(this.distance / 1500);
    this.score += 10 * dt;
    this.gridOffset = (this.gridOffset + GRID_SPEED * dt) % 200;

    const boundary = (TOTAL_WORLD_WIDTH / 2) - 40;
    if (this.isTouching && this.touchTargetX !== null) {
      const diff = this.touchTargetX - this.player.pos.x;
      this.player.pos.x += diff * 15 * dt;
    } else {
      if (this.inputKeys.left) this.player.pos.x -= BASE_PLAYER_SPEED * dt;
      if (this.inputKeys.right) this.player.pos.x += BASE_PLAYER_SPEED * dt;
    }
    this.player.pos.x = Math.max(-boundary, Math.min(boundary, this.player.pos.x));

    const laneWidth = WORLD_LANE_WIDTH;
    const totalWidth = LANE_COUNT * laneWidth;
    const startX = -totalWidth / 2 + (laneWidth / 2);
    const exactLane = (this.player.pos.x - startX) / laneWidth;
    const logicalLane = Math.max(0, Math.min(LANE_COUNT - 1, Math.round(exactLane)));

    if (this.shakeTimer > 0) this.shakeTimer -= dt;
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.fireBullet();
      this.shootTimer = 1 / this.playerStats.fireRate;
    }

    if (!this.bossActive) this.spawnManager(dt);

    this.enemies = []; this.bullets = []; this.pickups = [];

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const ent = this.entities[i];
      if (!ent.active) { this.entities.splice(i, 1); continue; }
      if (ent.pos.y < -200 || ent.pos.y > SPAWN_Z + 4000) { ent.active = false; continue; }
      if (ent.type === EntityType.GATE && ent.pos.y < this.player.pos.y - 20) { ent.active = false; continue; }

      if (ent.type === EntityType.BULLET) {
        if (ent.velocity) { ent.pos.x += ent.velocity.x * dt; ent.pos.y += ent.velocity.y * dt; }
        this.bullets.push(ent);
      } else if (ent.type === EntityType.PICKUP) {
        ent.pos.y -= UNIFIED_ENTITY_SPEED * dt;
        this.pickups.push(ent);
      } else if (ent.type.startsWith('ENEMY')) {
        this.enemies.push(ent);
        if (ent.isStuckToPlayer && ent.stickOffset) {
          ent.pos.x = this.player.pos.x + ent.stickOffset.x;
          ent.pos.y = this.player.pos.y + ent.stickOffset.y;
          ent.stuckDamageTimer = (ent.stuckDamageTimer || 0) - dt;
          if (ent.stuckDamageTimer <= 0) {
            this.playerStats.projectileCount = Math.max(0, this.playerStats.projectileCount - 1);
            this.createHitEffect(ent.pos, EntityType.PLAYER);
            if (this.config.hapticsEnabled) navigator.vibrate(50);
            ent.stuckDamageTimer = STUCK_DAMAGE_INTERVAL;
          }
        } else {
          ent.pos.y -= UNIFIED_ENTITY_SPEED * dt;
          if (ent.pos.y < CONVERGENCE_Z) {
            const targetX = this.player.pos.x + (ent.formationOffset || 0);
            const dx = targetX - ent.pos.x;
            if (Math.abs(dx) > 10) ent.pos.x += Math.sign(dx) * 120 * dt; 
          }
        }
      } else {
        ent.pos.y -= UNIFIED_ENTITY_SPEED * dt;
      }

      if (ent.active && ent.type !== EntityType.BULLET) {
        if (ent.type === EntityType.GATE) {
          if (ent.lane === logicalLane && Math.abs(ent.pos.y - this.player.pos.y) < 50) {
            this.handlePlayerCollision(ent);
          }
        } else if (ent.type === EntityType.PICKUP) {
          if (this.checkCollision(this.player, ent)) {
            ent.active = false;
            this.applyPickup(ent.pickupType!, ent.pos);
          }
        } else if (ent.type.startsWith('ENEMY') || ent.type === EntityType.OBSTACLE) {
          this.handleEnemyPlayerInteraction(ent);
        }
      }
    }

    for (const bullet of this.bullets) {
      if (!bullet.active) continue;
      for (const pickup of this.pickups) {
        if (!pickup.active) continue;
        const zDiff = Math.abs(bullet.pos.y - pickup.pos.y);
        const dx = Math.abs(bullet.pos.x - pickup.pos.x);
        if (zDiff < 60 && dx < (bullet.radius + pickup.radius + 20)) {
          bullet.active = false; pickup.active = false;
          this.applyPickup(pickup.pickupType!, pickup.pos);
          this.createHitEffect(pickup.pos, EntityType.PICKUP);
          break;
        }
      }
      if (!bullet.active) continue;
      const stuckEnemies = this.enemies.filter(e => e.isStuckToPlayer && e.active);
      const normalEnemies = this.enemies.filter(e => !e.isStuckToPlayer && e.active);
      const checkList = [...stuckEnemies, ...normalEnemies];
      for (const enemy of checkList) {
        if (!enemy.active) continue;
        if (Math.abs(bullet.pos.y - enemy.pos.y) > 60) continue;
        if (this.checkCollision(bullet, enemy)) {
          bullet.active = false;
          enemy.hp -= (bullet.damage || 10);
          this.createHitEffect(enemy.pos, enemy.type, 15); // Vivid sparks
          if (enemy.hp <= 0) {
            enemy.active = false;
            this.createHitEffect(enemy.pos, enemy.type, 30); // Explosion level sparks
            this.score += (enemy.scoreValue || 10);
            if (this.config.hapticsEnabled) navigator.vibrate(10);
          }
          break; 
        }
      }
    }

    if (this.particles.length > MAX_PARTICLES) this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.pos.x += (p.velocity?.x || 0) * dt;
      p.pos.y += (p.velocity?.y || 0) * dt; 
      p.pos.y -= UNIFIED_ENTITY_SPEED * 0.5 * dt; 
      if (p.rotation !== undefined && p.rotationSpeed) p.rotation += p.rotationSpeed * dt;
      if (p.life !== undefined && p.maxLife !== undefined) {
        p.life -= dt;
        p.radius = (p.life / p.maxLife) * (p.width || 5);
        if (p.life <= 0) this.particles.splice(i, 1);
      } else {
        p.radius -= 10 * dt;
        if (p.radius <= 0) this.particles.splice(i, 1);
      }
    }
  }

  private spawnManager(dt: number) {
    const minSpacing = GATE_SPAWN_DISTANCE + (this.wave * 120);
    if (this.distance - this.lastGateDistance > minSpacing) {
      this.spawnGateRow();
      this.lastGateDistance = this.distance;
    }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const pattern = Math.random();
      if (pattern < 0.5) this.spawnArmyWave(); 
      else if (pattern < 0.8) this.spawnEliteWave();
      else this.spawnSimpleGap();
      this.spawnTimer = Math.max(1.0, 3.5 - Math.min(2.0, this.wave * 0.15));
    }
  }

  private spawnArmyWave() {
    const targetLane = Math.floor(Math.random() * LANE_COUNT);
    const laneX = this.getLaneWorldX(targetLane);
    const diffMult = this.getDifficultyMultiplier();
    let baseHp = (8 + (this.wave * 3.5)) * diffMult;
    let gridDepth = Math.min(30, 5 + Math.floor((this.currentPotentialDps || 0) / 100) + Math.floor(Math.random() * 4));
    const gridWidth = 5;
    const spacingX = 35; const spacingZ = 40;
    const startXOffset = -((gridWidth - 1) * spacingX) / 2;
    let currentZ = SPAWN_Z;
    if (Math.random() > 0.6) {
      const type = Math.random() > 0.5 ? EntityType.ENEMY_SPRINTER : EntityType.ENEMY_TANK;
      this.spawnEntity(type, laneX, currentZ, type === EntityType.ENEMY_TANK ? ENEMY_RADIUS_TANK : ENEMY_RADIUS_SPRINTER, baseHp * 3, 50);
      currentZ += 150; 
    }
    for (let row = 0; row < gridDepth; row++) {
      for (let col = 0; col < gridWidth; col++) {
        const x = laneX + startXOffset + (col * spacingX);
        const z = currentZ + (row * spacingZ);
        this.spawnEntity(EntityType.ENEMY_GRUNT, x + (Math.random()-0.5)*10, z + (Math.random()-0.5)*10, ENEMY_RADIUS_GRUNT, baseHp, 10);
      }
    }
    if (Math.random() > 0.6) this.spawnPickup((targetLane + 1) % LANE_COUNT, SPAWN_Z);
  }

  private spawnEliteWave() {
    const type = Math.random() > 0.5 ? EntityType.ENEMY_SPRINTER : EntityType.ENEMY_TANK;
    const r = type === EntityType.ENEMY_TANK ? ENEMY_RADIUS_TANK : ENEMY_RADIUS_SPRINTER;
    const baseHp = (8 + (this.wave * 3.5)) * (type === EntityType.ENEMY_TANK ? 4 : 2) * this.getDifficultyMultiplier();
    for(let i=0; i<LANE_COUNT; i++) if (Math.random() > 0.3) this.spawnEntity(type, this.getLaneWorldX(i), SPAWN_Z + Math.abs(i-1)*200, r, baseHp, 30);
  }

  private spawnSimpleGap() {
    const gapLane = Math.floor(Math.random() * LANE_COUNT);
    const baseHp = (8 + (this.wave * 3.5)) * this.getDifficultyMultiplier();
    for(let i=0; i<LANE_COUNT; i++) {
      if (i === gapLane) continue;
      const x = this.getLaneWorldX(i);
      this.spawnEntity(EntityType.ENEMY_GRUNT, x - 20, SPAWN_Z, ENEMY_RADIUS_GRUNT, baseHp, 10);
      this.spawnEntity(EntityType.ENEMY_GRUNT, x + 20, SPAWN_Z, ENEMY_RADIUS_GRUNT, baseHp, 10);
    }
  }

  private spawnEntity(type: EntityType, x: number, z: number, r: number, hp: number, score: number) {
    let color = COLORS.ENEMY_GRUNT;
    if (type === EntityType.ENEMY_SPRINTER) color = COLORS.ENEMY_SPRINTER;
    if (type === EntityType.ENEMY_TANK) color = COLORS.ENEMY_TANK;
    this.entities.push({
      id: Math.random(), type, pos: { x, y: z }, radius: r, active: true, hp, maxHp: hp, color, lane: -1, scoreValue: score,
      formationOffset: (Math.random() - 0.5) * SQUAD_SPREAD_WIDTH, stuckDamageTimer: 0
    });
  }

  private spawnPickup(laneIndex: number, z: number) {
    const types = [PickupType.BOMB_SMALL, PickupType.BOMB_MEDIUM, PickupType.BOMB_LARGE, PickupType.CLUSTER];
    const type = types[Math.floor(Math.random() * types.length)];
    const colors = [COLORS.PICKUP_BOMB_SMALL, COLORS.PICKUP_BOMB_MEDIUM, COLORS.PICKUP_BOMB_LARGE, COLORS.PICKUP_CLUSTER];
    this.entities.push({
      id: Math.random(), type: EntityType.PICKUP, pos: { x: this.getLaneWorldX(laneIndex), y: z }, radius: 30, active: true, hp: 1, maxHp: 1,
      color: colors[types.indexOf(type)], lane: laneIndex, pickupType: type
    });
  }

  private spawnGateRow() {
    const dps = this.currentPotentialDps || 200;
    const powerRatio = dps / (this.wave * 200);
    let negBias = 0.5;
    if (dps > 1_000_000) negBias = 0.95; 
    else if (dps > 500_000) negBias = 0.85; 
    else if (this.wave <= 1) negBias = 0.1;
    else negBias = (powerRatio > 1.2 ? 0.7 : (powerRatio < 0.5 ? 0.2 : 0.5));

    const goodLane = Math.floor(Math.random() * LANE_COUNT);
    for (let i = 0; i < LANE_COUNT; i++) {
      if (Math.random() < 0.2) continue; 
      let bad = Math.random() < negBias; 
      if (i === goodLane && powerRatio < 0.8) bad = false;
      const op = Math.random() > 0.6 ? GateOp.MULTIPLY : GateOp.ADD;
      let val = 0;
      if (bad) {
        if (dps > 1_000_000) val = op === GateOp.MULTIPLY ? 0.1 : -5000;
        else if (dps > 500_000) val = op === GateOp.MULTIPLY ? 0.25 : -1000;
        else val = op === GateOp.MULTIPLY ? 0.5 : -(Math.floor(Math.random()*4)+2);
      } else {
        val = op === GateOp.MULTIPLY ? 2 : (Math.floor(Math.random()*5)+3);
      }
      const beneficial = (op === GateOp.MULTIPLY && val >= 1) || (op === GateOp.ADD && val >= 0);
      this.entities.push({
        id: Math.random(), type: EntityType.GATE, pos: { x: this.getLaneWorldX(i), y: SPAWN_Z }, radius: 40, active: true, hp: 1, maxHp: 1,
        color: beneficial ? COLORS.GATE_POS_BG : COLORS.GATE_NEG_BG, lane: i, gateData: { type: GateType.PROJECTILES, op, value: val }, width: WORLD_LANE_WIDTH-20, height: GATE_HEIGHT
      });
    }
  }

  private checkCollision(a: Entity, b: Entity): boolean {
    const zDiff = Math.abs(a.pos.y - b.pos.y);
    if (zDiff > 60) return false;
    const dx = a.pos.x - b.pos.x;
    return Math.abs(dx) < (a.radius + b.radius);
  }

  private handlePlayerCollision(ent: Entity) {
    ent.active = false;
    if (ent.type === EntityType.GATE) this.applyGateBonus(ent.gateData!);
    else if (ent.type === EntityType.PICKUP) this.applyPickup(ent.pickupType!, ent.pos);
    this.createHitEffect(this.player.pos, EntityType.PLAYER);
    if (this.config.hapticsEnabled) navigator.vibrate(20);
  }

  private handleEnemyPlayerInteraction(ent: Entity) {
    if (ent.isStuckToPlayer || ent.isAttacking) return;
    if (this.checkCollision(this.player, ent)) {
      ent.isStuckToPlayer = true;
      ent.stickOffset = { x: ent.pos.x - this.player.pos.x, y: ent.pos.y - this.player.pos.y };
      ent.stuckDamageTimer = 0; 
      if (this.config.hapticsEnabled) navigator.vibrate(20);
    }
  }

  private applyGateBonus(data: GateData) {
    const val = data.value;
    let count = this.playerStats.projectileCount;
    if (data.op === GateOp.MULTIPLY) count = Math.floor(count * val); else count += val;
    this.playerStats.projectileCount = Math.max(0, count);
  }

  private applyPickup(type: PickupType, origin: Vector2) {
    let radius = type === PickupType.BOMB_SMALL ? 400 : (type === PickupType.BOMB_MEDIUM ? 800 : (type === PickupType.BOMB_LARGE ? 1200 : 2000));
    let color = type === PickupType.BOMB_SMALL ? COLORS.PICKUP_BOMB_SMALL : (type === PickupType.BOMB_MEDIUM ? COLORS.PICKUP_BOMB_MEDIUM : (type === PickupType.BOMB_LARGE ? COLORS.PICKUP_BOMB_LARGE : COLORS.PICKUP_CLUSTER));
    this.entities.forEach(e => {
      if (e.active && e.type.startsWith('ENEMY') && e.pos.y < SPAWN_Z) {
        const dx = e.pos.x - origin.x; const dy = e.pos.y - origin.y;
        if (Math.sqrt(dx*dx + dy*dy) < radius) {
          e.active = false; e.hp = 0;
          this.createHitEffect(e.pos, e.type, 20);
          this.score += (e.scoreValue || 10);
        }
      }
    });
    this.createHitEffect(origin, EntityType.PARTICLE, 40, color);
    this.shakeTimer = 0.5;
    if (this.config.hapticsEnabled) navigator.vibrate(50);
  }

  private createHitEffect(pos: Vector2, sourceType: EntityType, countOverride?: number, colorOverride?: string) {
    let count = countOverride || 5; 
    if (this.config.reducedEffects) count = Math.ceil(count / 2);
    let color = colorOverride || '#fff'; let shape = ParticleShape.CIRCLE;
    if (sourceType === EntityType.ENEMY_GRUNT) color = COLORS.ENEMY_GRUNT;
    else if (sourceType === EntityType.ENEMY_SPRINTER) { color = COLORS.ENEMY_SPRINTER; shape = ParticleShape.CIRCLE; }
    else if (sourceType === EntityType.ENEMY_TANK) { color = COLORS.ENEMY_TANK; shape = ParticleShape.CIRCLE; }
    else if (sourceType === EntityType.PLAYER) { color = COLORS.PLAYER; shape = ParticleShape.RING; }
    
    for(let i=0; i<count; i++) {
       const angle = Math.random()*Math.PI*2; const speed = 300 + Math.random()*500;
       this.particles.push({
         id: Math.random(), type: EntityType.PARTICLE, pos: {x: pos.x, y: pos.y}, radius: Math.random()*5+3, width: Math.random()*5+3,
         active: true, hp: 1, maxHp: 1, color, lane: -1, particleShape: shape, velocity: { x: Math.cos(angle)*speed, y: Math.sin(angle)*speed },
         life: 0.6, maxLife: 0.6, rotation: Math.random()*Math.PI, rotationSpeed: (Math.random()-0.5)*12
       });
    }
  }

  private findAutoAimTarget(): Entity | null {
    const stuck = this.enemies.find(e => e.active && e.isStuckToPlayer); if (stuck) return stuck;
    const sortedPickups = this.pickups.filter(p => p.active && p.pos.y > this.player.pos.y).sort((a,b) => a.pos.y - b.pos.y);
    for (const pickup of sortedPickups) {
      if (Math.abs(pickup.pos.x - this.player.pos.x) < 60) {
        if (!this.enemies.some(e => e.active && e.pos.y > this.player.pos.y && e.pos.y < pickup.pos.y && Math.abs(e.pos.x - this.player.pos.x) < (e.radius + 15))) return pickup;
      }
    }
    let nearest: Entity | null = null; let minSq = Infinity;
    for (const ent of this.enemies) {
      if (!ent.active || ent.pos.y <= this.player.pos.y) continue;
      const dx = ent.pos.x - this.player.pos.x; const dy = ent.pos.y - this.player.pos.y;
      if (Math.abs(Math.atan2(dx, dy)) <= (10 * Math.PI/180)) {
        const sq = dx*dx + dy*dy; if (sq < minSq) { minSq = sq; nearest = ent; }
      }
    }
    return nearest;
  }

  private fireBullet() {
    const raw = Math.floor(this.playerStats.projectileCount);
    const count = Math.min(raw, MAX_PROJECTILES_PER_SHOT);
    const dmg = this.playerStats.damage * (raw / count);
    const tier = Math.min(BULLET_COLORS.length - 1, Math.floor(dmg / 20));
    const offsets = this.getSquadOffsets(count);
    const target = this.findAutoAimTarget();
    const spread = MAX_SPREAD_ANGLE_DEG * (Math.PI/180) * Math.min(1.0, count/10);
    for (let i = 0; i < offsets.length; i++) {
      let dirX = 0; let dirY = 1;
      if (target) {
        const dx = target.pos.x - (this.player.pos.x + offsets[i].x);
        const dy = target.pos.y - (this.player.pos.y + offsets[i].y);
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 0) { dirX = dx/dist; dirY = dy/dist; }
      }
      const angle = (count > 1 && !target) ? (-spread/2 + (i * (spread/(count-1)))) : 0;
      const cos = Math.cos(angle); const sin = Math.sin(angle);
      this.entities.push({
        id: Math.random(), type: EntityType.BULLET, pos: { x: this.player.pos.x + offsets[i].x, y: this.player.pos.y + offsets[i].y },
        radius: BULLET_RADIUS + Math.min(5, tier), active: true, hp: 1, maxHp: 1, color: BULLET_COLORS[tier], lane: -1, damage: dmg,
        velocity: { x: (dirX*cos - dirY*sin)*1800, y: (dirX*sin + dirY*cos)*1800 }
      });
    }
  }

  private getSquadOffsets(count: number): Vector2[] {
    const offsets: Vector2[] = [{x:0, y:0}];
    if (count <= 1) return offsets;
    const spacing = 18; let layer = 1;
    while (offsets.length < count) {
      for (let x = -layer; x <= layer; x++) {
        const yAbs = layer - Math.abs(x);
        if (yAbs === 0) offsets.push({x: x * spacing, y: 0});
        else { offsets.push({x: x * spacing, y: yAbs * spacing}); offsets.push({x: x * spacing, y: -yAbs * spacing}); }
        if (offsets.length >= count) break;
      }
      layer++;
    }
    return offsets;
  }

  private endGame() { this.state = GameState.GAME_OVER; this.onUIUpdate({ state: this.state }); }

  private project(p: Vector2): { x: number, y: number, scale: number, visible: boolean } {
    const z = p.y; if (z < -200 || z > DRAW_DISTANCE + 1000) return { x:0, y:0, scale:0, visible: false };
    const scale = CAMERA_DEPTH / (z + CAMERA_DEPTH);
    const bottomY = CANVAS_HEIGHT - VIEWPORT_BOTTOM_OFFSET;
    return { x: (CANVAS_WIDTH/2) + (p.x * scale), y: HORIZON_Y + (scale * (bottomY - HORIZON_Y)), scale, visible: true };
  }

  private draw() {
    if (!this.ctx) return;
    const ctx = this.ctx; ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.save(); if (this.shakeTimer > 0) ctx.translate((Math.random()-0.5)*15, (Math.random()-0.5)*15);
    this.drawCityscape(ctx);
    this.drawGrid(ctx);
    const pL = this.project({ x: this.getLaneWorldX(0) - 100, y: CONVERGENCE_Z });
    const pR = this.project({ x: this.getLaneWorldX(LANE_COUNT-1) + 100, y: CONVERGENCE_Z });
    
    // Lane lines with intense neon glow
    ctx.save();
    ctx.shadowBlur = 35; // Increased from 15
    ctx.shadowColor = COLORS.LANE_BORDER;
    if (pL.visible) { 
      ctx.strokeStyle = COLORS.LANE_BORDER; 
      ctx.lineWidth = 3; // Slightly thicker
      ctx.setLineDash([15, 15]); 
      ctx.beginPath(); 
      ctx.moveTo(pL.x, pL.y); 
      ctx.lineTo(pR.x, pR.y); 
      ctx.stroke(); 
      ctx.setLineDash([]); 
    }
    for (let i = 0; i <= LANE_COUNT; i++) {
      const lx = this.getLaneWorldX(0) - 100 + (i * 200); const isB = i === 0 || i === LANE_COUNT;
      const pS = this.project({ x: lx, y: isB ? PLAYER_Z : CONVERGENCE_Z }); const pE = this.project({ x: lx, y: DRAW_DISTANCE });
      if (pS.visible || pE.visible) { 
        // Outside lines (boundaries) get extra glow intensity
        if (isB) {
          ctx.shadowBlur = 45;
          ctx.lineWidth = 4;
        } else {
          ctx.shadowBlur = 25;
          ctx.lineWidth = 2;
        }
        ctx.strokeStyle = isB ? COLORS.LANE_BORDER : COLORS.LANE_LINE; 
        ctx.beginPath(); 
        ctx.moveTo(pS.x, pS.y); 
        ctx.lineTo(pE.x, pE.y); 
        ctx.stroke(); 
      }
    }
    ctx.restore();

    const all = [...this.entities, ...this.particles].sort((a,b) => b.pos.y - a.pos.y);
    for (const ent of all) {
      if (!ent.active) continue; const proj = this.project(ent.pos); if (!proj.visible) continue;
      if (ent.type === EntityType.GATE) this.drawGate(ctx, ent, proj);
      else if (ent.type === EntityType.PARTICLE) this.drawParticle(ctx, ent, proj);
      else this.drawEntity(ctx, ent, proj);
    }
    if (this.invulnerabilityTimer <= 0 || Math.floor(performance.now()/50)%2 === 0) this.drawPlayerSquad(ctx);
    ctx.restore();
  }

  private drawCityscape(ctx: CanvasRenderingContext2D) {
    const start = Math.floor((this.distance - 200) / CITY_BLOCK_SIZE);
    const end = Math.floor((this.distance + DRAW_DISTANCE + 1000) / CITY_BLOCK_SIZE);
    for(let i = end; i >= start; i--) {
      const z = (i * CITY_BLOCK_SIZE) - this.distance;
      this.drawBuilding(ctx, i, -1, z); this.drawBuilding(ctx, i, 1, z);
    }
  }

  private drawBuilding(ctx: CanvasRenderingContext2D, index: number, side: number, zCenter: number) {
    const seed = Math.abs((index * 9301 + side * 49291) % 10000);
    const bWidth = 100 + (seed % 200); 
    const bHeight = 150 + (seed % 300) + (Math.sin(index) * 50); 
    const zF = Math.max(-CAMERA_DEPTH + 100, zCenter - 400); 
    const zB = Math.max(-CAMERA_DEPTH + 100, zCenter + 400);
    if (zF > DRAW_DISTANCE + 1000 || zB < -200) return;
    const xInner = side * CITY_STREET_WIDTH;
    const xOuter = xInner + (side * bWidth);
    const pFI = this.project({x: xInner, y: zF}); 
    const pBI = this.project({x: xInner, y: zB});
    const pFO = this.project({x: xOuter, y: zF});
    const pBO = this.project({x: xOuter, y: zB});
    if (!pFI.visible || !pBI.visible || !pFO.visible || !pBO.visible) return;
    const color = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00'][index % 4];
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.fillStyle = color + '11';
    
    // Add neon glow
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.moveTo(pFI.x, pFI.y - bHeight * pFI.scale);
    ctx.lineTo(pBI.x, pBI.y - bHeight * pBI.scale);
    ctx.lineTo(pBO.x, pBO.y - bHeight * pBO.scale);
    ctx.lineTo(pFO.x, pFO.y - bHeight * pFO.scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pFI.x, pFI.y);
    ctx.lineTo(pBI.x, pBI.y);
    ctx.lineTo(pBI.x, pBI.y - bHeight * pBI.scale);
    ctx.lineTo(pFI.x, pFI.y - bHeight * pFI.scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = COLORS.GRID_LINE; ctx.lineWidth = 1; const spacing = 200;
    for(let i=0; i<45; i++) {
      let z = (i * spacing) - this.gridOffset; if (z < 0) z += (45 * spacing);
      const pL_O = this.project({ x: -1000, y: z }); const pL_I = this.project({ x: -350, y: z });
      if (pL_O.visible && pL_I.visible) { ctx.beginPath(); ctx.moveTo(pL_O.x, pL_O.y); ctx.lineTo(pL_I.x, pL_I.y); ctx.stroke(); }
      const pR_I = this.project({ x: 350, y: z }); const pR_O = this.project({ x: 1000, y: z });
      if (pR_O.visible && pR_I.visible) { ctx.beginPath(); ctx.moveTo(pR_I.x, pR_I.y); ctx.lineTo(pR_O.x, pR_O.y); ctx.stroke(); }
    }
  }

  private drawEntity(ctx: CanvasRenderingContext2D, ent: Entity, proj: { x: number, y: number, scale: number }) {
    const r = ent.radius * proj.scale; ctx.fillStyle = ent.color; ctx.shadowBlur = 10; ctx.shadowColor = ent.color;
    if (ent.type === EntityType.BULLET) { ctx.beginPath(); ctx.arc(proj.x, proj.y, r, 0, Math.PI*2); ctx.fill(); }
    else if (ent.type === EntityType.PICKUP) {
      // Spinning square bomb with pulsating aura
      const pulse = 1 + Math.sin(performance.now() * 0.01) * 0.2;
      const rotation = performance.now() * 0.005;
      // Aura
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, r * 2 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Spinning Square
      ctx.save();
      ctx.translate(proj.x, proj.y);
      ctx.rotate(rotation);
      ctx.fillRect(-r * pulse, -r * pulse, r * 2 * pulse, r * 2 * pulse);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-r * pulse, -r * pulse, r * 2 * pulse, r * 2 * pulse);
      ctx.restore();
    } else {
      // All enemies are round
      ctx.beginPath(); ctx.arc(proj.x, proj.y, r, 0, Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  private drawGate(ctx: CanvasRenderingContext2D, ent: Entity, proj: { x: number, y: number, scale: number }) {
    if (!ent.gateData) return; const w = (ent.width || 200)*proj.scale; const h = (ent.height || 100)*proj.scale;
    ctx.fillStyle = ent.color; ctx.fillRect(proj.x - w/2, proj.y - h, w, h);
    ctx.strokeStyle = (ent.gateData.op === GateOp.MULTIPLY ? ent.gateData.value >= 1 : ent.gateData.value >= 0) ? '#00ff66' : '#ff0000';
    ctx.lineWidth = 2*proj.scale; ctx.strokeRect(proj.x - w/2, proj.y - h, w, h);
    const text = `${ent.gateData.op === GateOp.MULTIPLY ? 'x' : (ent.gateData.value>=0?'+':'')}${ent.gateData.value}`;
    ctx.fillStyle = '#fff'; ctx.font = `bold ${40*proj.scale}px monospace`; ctx.textAlign = 'center'; ctx.fillText(text, proj.x, proj.y - h/2);
  }

  private drawParticle(ctx: CanvasRenderingContext2D, ent: Entity, proj: { x: number, y: number, scale: number }) {
    const r = ent.radius * proj.scale; ctx.fillStyle = ent.color; ctx.globalAlpha = Math.max(0, ent.life || 1);
    ctx.shadowBlur = 10; ctx.shadowColor = ent.color;
    if (ent.particleShape === ParticleShape.SQUARE) { ctx.save(); ctx.translate(proj.x, proj.y); ctx.rotate(ent.rotation||0); ctx.fillRect(-r, -r, r*2, r*2); ctx.restore(); }
    else if (ent.particleShape === ParticleShape.LINE) { ctx.save(); ctx.translate(proj.x, proj.y); ctx.rotate(ent.rotation||0); ctx.fillRect(-r*2, -r/2, r*4, r); ctx.restore(); }
    else if (ent.particleShape === ParticleShape.RING) { ctx.strokeStyle = ent.color; ctx.lineWidth = 2*proj.scale; ctx.beginPath(); ctx.arc(proj.x, proj.y, r, 0, Math.PI*2); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(proj.x, proj.y, r, 0, Math.PI*2); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }

  private drawPlayerSquad(ctx: CanvasRenderingContext2D) {
    const p = this.player; const proj = this.project(p.pos); if (!proj.visible) return;
    const r = p.radius * proj.scale; const count = Math.floor(this.playerStats.projectileCount);
    if (count > 1) {
      // Squad dots with intense neon glow
      ctx.save();
      ctx.shadowBlur = 25; // Increased from 10
      ctx.shadowColor = '#00ffff';
      const off = this.getSquadOffsets(Math.min(count, MAX_VISIBLE_SQUAD));
      for (const o of off) {
        if (o.x === 0 && o.y === 0) continue;
        const dR = (p.radius*0.4)*proj.scale; 
        ctx.fillStyle = '#00ffff'; 
        ctx.beginPath(); 
        ctx.arc(proj.x + o.x*proj.scale, proj.y + o.y*proj.scale, dR, 0, Math.PI*2); 
        ctx.fill();
      }
      ctx.restore();
    }
    // Main player ship with intense glow
    ctx.save();
    ctx.shadowColor = p.color; 
    ctx.shadowBlur = 35; // Increased from 15
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.moveTo(proj.x, proj.y-r*1.5); ctx.lineTo(proj.x+r, proj.y+r); ctx.lineTo(proj.x, proj.y+r*0.5); ctx.lineTo(proj.x-r, proj.y+r); ctx.closePath(); ctx.fill();
    ctx.restore();
    
    ctx.fillStyle = '#fff'; ctx.font = `bold ${30*proj.scale}px Orbitron`; ctx.textAlign = 'center'; ctx.fillText(count.toString(), proj.x, proj.y + (60*proj.scale));
  }
}