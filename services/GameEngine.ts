import { 
  CANVAS_HEIGHT, CANVAS_WIDTH, LANE_COUNT, COLORS, PLAYER_RADIUS, 
  BASE_SCROLL_SPEED, BOSS_APPEAR_DISTANCE, GATE_SPAWN_DISTANCE, GATE_HEIGHT, 
  HORIZON_Y, UNIFIED_ENTITY_SPEED, GRID_SPEED, WORLD_LANE_WIDTH, CAMERA_DEPTH, SPAWN_Z, PLAYER_Z, CONVERGENCE_Z,
  ENEMY_RADIUS_GRUNT, ENEMY_RADIUS_SPRINTER, ENEMY_RADIUS_TANK, MAX_PARTICLES, MAX_VISIBLE_SQUAD, MAX_PROJECTILES_PER_SHOT, BULLET_COLORS, BULLET_RADIUS, VIEWPORT_BOTTOM_OFFSET, TOTAL_WORLD_WIDTH, BASE_PLAYER_SPEED, SQUAD_SPREAD_WIDTH, STUCK_DAMAGE_INTERVAL,
  CITY_BLOCK_SIZE, CITY_STREET_WIDTH, DRAW_DISTANCE, MAX_SPREAD_ANGLE_DEG, BULLET_MAX_RANGE, BULLET_FADE_START,
  PICKUP_RADIUS, MAX_SQUAD_DISPLAY, SQUAD_OFFSETS, SQUAD_DOT_RADIUS
} from '../constants.ts';
import { Entity, EntityType, GameState, Vector2, PickupType, PlayerStats, GameConfig, GateData, GateType, GateOp, Difficulty, ParticleShape } from '../types.ts';
import { SoundService } from './SoundService.ts';

interface SnowParticle {
  x: number; y: number; size: number; speed: number; drift: number;
}

export class GameEngine {
  public state: GameState = GameState.MENU;
  public entities: Entity[] = [];
  public particles: Entity[] = [];
  public player: Entity;
  
  private enemies: Entity[] = [];
  private bullets: Entity[] = [];
  private pickups: Entity[] = [];
  private snowParticles: SnowParticle[] = [];
  
  public score: number = 0;
  public distance: number = 0;
  public wave: number = 1;
  public fps: number = 60;
  public currentPotentialDps: number = 0;
  
  private battleIntensity: number = 0;

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
  private flashColor: string | null = null;
  private flashTimer: number = 0;
  private bossActive: boolean = false;
  private bossEntity: Entity | null = null;
  private nextBossDistance: number = BOSS_APPEAR_DISTANCE;
  
  private gridOffset: number = 0;

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
      id: 0, type: EntityType.PLAYER, pos: { x: 0, y: PLAYER_Z }, radius: PLAYER_RADIUS, active: true,
      hp: 100, maxHp: 100, color: COLORS.PLAYER, lane: 1
    };
    this.setupInput(canvas);
    this.initSnow();
  }

  private initSnow() {
    this.snowParticles = [];
    for (let i = 0; i < 150; i++) {
      this.snowParticles.push({
        x: Math.random() * CANVAS_WIDTH, y: Math.random() * CANVAS_HEIGHT, size: Math.random() * 3 + 1, speed: Math.random() * 50 + 50, drift: (Math.random() - 0.5) * 20
      });
    }
  }

  private updateSnow(dt: number) {
    if (!this.config.snowEnabled) return;
    for (const p of this.snowParticles) {
      p.y += p.speed * dt; p.x += p.drift * dt;
      if (p.y > CANVAS_HEIGHT) { p.y = -10; p.x = Math.random() * CANVAS_WIDTH; }
      if (p.x < 0) p.x = CANVAS_WIDTH; if (p.x > CANVAS_WIDTH) p.x = 0;
    }
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
      this.touchTargetX = worldX; this.isTouching = true;
    };
    canvas.addEventListener('touchstart', (e) => handleMove(e.changedTouches[0].clientX), { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleMove(e.changedTouches[0].clientX); }, { passive: false });
    canvas.addEventListener('touchend', () => { this.isTouching = false; this.touchTargetX = null; });
    canvas.addEventListener('mousedown', (e) => { if (this.state === GameState.PLAYING) handleMove(e.clientX); });
    canvas.addEventListener('mousemove', (e) => { if (this.isTouching) handleMove(e.clientX); });
    canvas.addEventListener('mouseup', () => { this.isTouching = false; this.touchTargetX = null; });
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
    this.entities = []; this.particles = []; this.enemies = []; this.bullets = []; this.pickups = [];
    this.score = 0; this.distance = 0; this.wave = 1; this.battleIntensity = 0;
    this.playerStats.projectileCount = 1; this.player.active = true;
    this.player.pos.x = 0; this.touchTargetX = null; this.isTouching = false;
    
    this.lastGateDistance = -GATE_SPAWN_DISTANCE + 1000; 
    this.spawnTimer = 0.2; 
    this.shootTimer = 0;
    this.shakeTimer = 0; this.flashTimer = 0; this.bossActive = false; this.bossEntity = null;
    this.nextBossDistance = BOSS_APPEAR_DISTANCE; this.gridOffset = 0;

    const spawnStart = 800;
    const spawnEnd = 4000;
    
    this.spawnGateRowAtZ(spawnStart + 500);
    this.spawnGateRowAtZ(spawnStart + 2500);

    for (let i = 0; i < 8; i++) {
        const laneX = this.getLaneWorldX(Math.floor(Math.random() * LANE_COUNT));
        const z = spawnStart + Math.random() * (spawnEnd - spawnStart);
        this.spawnEntity(EntityType.ENEMY_GRUNT, laneX, z, ENEMY_RADIUS_GRUNT, 20, 10);
    }
  }

  public setGameState(newState: GameState) {
    this.state = newState;
    if (newState === GameState.PLAYING) this.lastTime = performance.now();
  }

  public start() { if (!this.animationFrameId) { this.lastTime = performance.now(); this.loop(); } }
  public pause() { if (this.state === GameState.PLAYING) { this.state = GameState.PAUSED; this.onUIUpdate({ state: this.state }); } }
  public resume() { if (this.state === GameState.PAUSED) { this.state = GameState.PLAYING; this.lastTime = performance.now(); } }
  public stop() { if (this.animationFrameId) { cancelAnimationFrame(this.animationFrameId); this.animationFrameId = null; } this.state = GameState.MENU; }
  public destroy() { this.stop(); }

  private loop = () => {
    const now = performance.now(); let deltaTime = (now - this.lastTime) / 1000; this.lastTime = now;
    if (deltaTime > 0.2) deltaTime = 0.2;
    if (this.state === GameState.PLAYING || this.state === GameState.MENU) {
      this.accumulator += deltaTime; this.fps = Math.round(1 / deltaTime);
      while (this.accumulator >= this.step) {
        if (this.state === GameState.PLAYING) this.update(this.step);
        else if (this.state === GameState.MENU) {
          this.gridOffset = (this.gridOffset + (GRID_SPEED * 0.5) * this.step) % 200;
          this.distance += (BASE_SCROLL_SPEED * 0.5) * this.step;
        }
        this.updateSnow(this.step); this.accumulator -= this.step;
      }
    }
    this.draw();
    if (this.state === GameState.PLAYING) {
      this.currentPotentialDps = this.playerStats.damage * this.playerStats.projectileCount * this.playerStats.fireRate;
      this.onUIUpdate({
        score: Math.floor(this.score), hp: Math.floor(this.playerStats.projectileCount), distance: Math.floor(this.distance),
        fps: this.fps, state: this.state, dps: Math.round(this.currentPotentialDps),
        activeEntities: this.entities.length,
        bossHp: this.bossEntity?.active ? (this.bossEntity.hp / this.bossEntity.maxHp) : null
      });
    }
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  private getDifficultyMultiplier(): number {
    switch (this.config.difficulty) {
      case Difficulty.EASY: return 0.25; case Difficulty.NORMAL: return 0.5;
      case Difficulty.HARD: return 0.8; case Difficulty.UNFAIR: return 1.2;
      case Difficulty.EMOTIONAL: return 2.0; case Difficulty.SINGULARITY: return 4.0;
      case Difficulty.OMEGA: return 8.0; default: return 0.5;
    }
  }

  private update(dt: number) {
    if (this.playerStats.projectileCount < 1) { this.endGame(); return; }
    if (this.flashTimer > 0) this.flashTimer -= dt;

    const scrollSpeed = BASE_SCROLL_SPEED + (this.wave * 15);
    this.distance += scrollSpeed * dt;
    this.wave = 1 + Math.floor(this.distance / 2000);
    this.score += 10 * dt;
    this.gridOffset = (this.gridOffset + GRID_SPEED * dt) % 200;

    const boundary = (TOTAL_WORLD_WIDTH / 2) - 40;
    if (this.isTouching && this.touchTargetX !== null) {
      this.player.pos.x += (this.touchTargetX - this.player.pos.x) * 12 * dt;
    } else {
      if (this.inputKeys.left) this.player.pos.x -= BASE_PLAYER_SPEED * dt;
      if (this.inputKeys.right) this.player.pos.x += BASE_PLAYER_SPEED * dt;
    }
    this.player.pos.x = Math.max(-boundary, Math.min(boundary, this.player.pos.x));

    if (this.shakeTimer > 0) this.shakeTimer -= dt;
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) { this.fireBullet(); this.shootTimer = 1 / this.playerStats.fireRate; }

    if (this.distance > this.nextBossDistance && !this.bossActive) this.spawnBoss();
    if (!this.bossActive) this.spawnManager(dt);

    this.enemies = []; this.bullets = []; this.pickups = [];
    
    let minEnemyZ = DRAW_DISTANCE;

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const ent = this.entities[i];
      if (!ent.active) { this.entities.splice(i, 1); continue; }
      if (ent.pos.y > DRAW_DISTANCE + 500 || ent.pos.y < -300) { ent.active = false; continue; }

      if (ent.type === EntityType.PICKUP) {
        ent.rotation = (ent.rotation || 0) + (ent.rotationSpeed || 2) * dt;
      }

      if (ent.type === EntityType.BULLET) {
        if (ent.velocity) { ent.pos.x += ent.velocity.x * dt; ent.pos.y += ent.velocity.y * dt; }
        if (ent.pos.y > BULLET_MAX_RANGE) { ent.active = false; continue; }
        this.bullets.push(ent);
      } else if (ent.type === EntityType.PICKUP) {
        ent.pos.y -= UNIFIED_ENTITY_SPEED * dt; this.pickups.push(ent);
      } else if (ent.type === EntityType.BOSS) {
        this.updateBoss(ent, dt); this.enemies.push(ent);
        minEnemyZ = Math.min(minEnemyZ, ent.pos.y);
      } else if (ent.type.startsWith('ENEMY')) {
        this.enemies.push(ent);
        if (ent.isStuckToPlayer && ent.stickOffset) {
          ent.pos.x = this.player.pos.x + ent.stickOffset.x;
          ent.pos.y = this.player.pos.y + ent.stickOffset.y;
          
          const passiveDmg = (this.playerStats.damage * 1.5) * dt;
          ent.hp -= passiveDmg;
          if (ent.hp <= 0) {
            ent.active = false;
            this.createHitEffect(ent.pos, ent.type, 20);
            SoundService.playExplosion(false);
            this.score += (ent.scoreValue || 10);
          }

          ent.stuckDamageTimer = (ent.stuckDamageTimer || 0) - dt;
          if (ent.stuckDamageTimer <= 0) {
            this.playerStats.projectileCount = Math.max(0, this.playerStats.projectileCount - 1);
            SoundService.playHit(); ent.stuckDamageTimer = STUCK_DAMAGE_INTERVAL;
          }
          minEnemyZ = 0; 
        } else {
          ent.pos.y -= UNIFIED_ENTITY_SPEED * dt;
          minEnemyZ = Math.min(minEnemyZ, ent.pos.y);
          if (ent.pos.y < CONVERGENCE_Z) {
            const targetX = this.player.pos.x + (ent.formationOffset || 0);
            const dx = targetX - ent.pos.x;
            const steerEase = 0.5 + (1.0 - (ent.pos.y / CONVERGENCE_Z)) * 1.5;
            ent.pos.x += dx * steerEase * dt; 
          }
        }
      } else { ent.pos.y -= UNIFIED_ENTITY_SPEED * dt; }

      if (ent.active && ent.type !== EntityType.BULLET) {
        if (ent.type === EntityType.GATE) {
          const startX = -((LANE_COUNT * WORLD_LANE_WIDTH) / 2) + (WORLD_LANE_WIDTH / 2);
          const logicalLane = Math.max(0, Math.min(LANE_COUNT - 1, Math.round((this.player.pos.x - startX) / WORLD_LANE_WIDTH)));
          if (ent.lane === logicalLane && Math.abs(ent.pos.y - this.player.pos.y) < 60) {
            this.handlePlayerCollision(ent);
          }
        } else if (ent.type === EntityType.PICKUP) {
          if (this.checkCollision(this.player, ent)) {
            ent.active = false; this.applyPickup(ent.pickupType!, ent.pos);
          }
        } else if (ent.type.startsWith('ENEMY') || ent.type === EntityType.BOSS) {
          if (!ent.isStuckToPlayer && this.checkCollision(this.player, ent)) {
            ent.isStuckToPlayer = true; ent.stickOffset = { x: ent.pos.x - this.player.pos.x, y: ent.pos.y - this.player.pos.y };
            SoundService.playHit(); if (this.config.hapticsEnabled) navigator.vibrate(50);
          }
        }
      }
    }
    
    const targetIntensity = Math.max(0, 1.0 - (minEnemyZ / 1500));
    this.battleIntensity += (targetIntensity - this.battleIntensity) * 5 * dt;

    for (const bullet of this.bullets) {
      if (!bullet.active) continue;
      
      let hit = false;
      const stuckEnemies = this.enemies.filter(e => e.isStuckToPlayer);
      for (const enemy of stuckEnemies) {
        if (!enemy.active) continue;
        if (this.checkCollision(bullet, enemy)) {
          this.damageEnemy(enemy, bullet);
          bullet.active = false;
          hit = true;
          break;
        }
      }
      
      if (hit) continue;

      for (const enemy of this.enemies) {
        if (!enemy.active || enemy.isStuckToPlayer || Math.abs(bullet.pos.y - enemy.pos.y) > 120) continue;
        if (this.checkCollision(bullet, enemy)) {
          this.damageEnemy(enemy, bullet);
          bullet.active = false;
          break;
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.pos.x += (p.velocity?.x || 0) * dt; p.pos.y += (p.velocity?.y || 0) * dt;
      p.life = (p.life || 1) - dt; if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  private damageEnemy(enemy: Entity, bullet: Entity) {
    enemy.hp -= (bullet.damage || 10);
    this.createHitEffect(enemy.pos, enemy.type, 12);
    if (enemy.type === EntityType.BOSS) enemy.pos.y = Math.min(2500, enemy.pos.y + 15); 
    if (enemy.hp <= 0) {
      enemy.active = false; 
      if (enemy.type === EntityType.BOSS) this.onBossDefeated();
      this.createHitEffect(enemy.pos, enemy.type, 40);
      SoundService.playExplosion(enemy.type === EntityType.ENEMY_TANK);
      this.score += (enemy.scoreValue || 10);
    }
  }

  private spawnBoss() {
    this.bossActive = true; const hp = 3000 * this.wave * this.getDifficultyMultiplier();
    const boss: Entity = {
      id: Math.random(), type: EntityType.BOSS, pos: { x: 0, y: SPAWN_Z }, radius: 140, active: true, hp, maxHp: hp, color: COLORS.BOSS, lane: -1, scoreValue: 10000, velocity: { x: 150, y: 0 }, attackTimer: 3
    };
    this.bossEntity = boss; this.entities.push(boss);
  }

  private updateBoss(boss: Entity, dt: number) {
    const minZ = 600; 
    if (boss.pos.y > minZ) {
      const approachSpeed = 300 + (boss.pos.y * 0.15); 
      boss.pos.y -= approachSpeed * dt;
    }
    if (boss.pos.y < 800) this.shakeTimer = Math.max(this.shakeTimer, 0.1); 
    if (boss.velocity) { 
        boss.pos.x += boss.velocity.x * dt; 
        if (Math.abs(boss.pos.x) > 280) boss.velocity.x *= -1; 
    }
    if (boss.attackTimer !== undefined) {
      boss.attackTimer -= dt;
      if (boss.attackTimer <= 0) {
        this.spawnEntity(EntityType.ENEMY_SPRINTER, boss.pos.x, boss.pos.y, ENEMY_RADIUS_SPRINTER, 100, 50);
        const proximityFactor = Math.max(0.1, (boss.pos.y - minZ) / 2000);
        boss.attackTimer = 0.5 + proximityFactor * 3.0; 
      }
    }
  }

  private onBossDefeated() {
    this.bossActive = false; this.bossEntity = null; this.nextBossDistance = this.distance + BOSS_APPEAR_DISTANCE;
    this.shakeTimer = 1.2; SoundService.playExplosion(true);
  }

  private spawnManager(dt: number) {
    const targetGateDistance = Math.max(2200, GATE_SPAWN_DISTANCE - (this.wave * 120));
    if (this.distance - this.lastGateDistance > targetGateDistance) {
      this.spawnGateRow(); this.lastGateDistance = this.distance;
    }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const pattern = Math.random();
      if (pattern < 0.3) this.spawnEliteWave(); else if (pattern < 0.7) this.spawnArmyWave(); else this.spawnSimpleGap();
      this.spawnTimer = Math.max(0.7, 3.5 - (this.wave * 0.1));
    }
  }

  private spawnArmyWave() {
    const lane = Math.floor(Math.random() * LANE_COUNT); const laneX = this.getLaneWorldX(lane);
    const hp = (10 + this.wave * 5) * this.getDifficultyMultiplier();
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 5; c++) {
        this.spawnEntity(EntityType.ENEMY_GRUNT, laneX - 60 + c * 30, SPAWN_Z + r * 50, ENEMY_RADIUS_GRUNT, hp, 10);
      }
    }
    if (Math.random() < 0.4) this.spawnPickup((lane + 1) % 3, SPAWN_Z + 200);
  }

  private spawnEliteWave() {
    const hp = (50 + this.wave * 20) * this.getDifficultyMultiplier();
    for (let i = 0; i < 3; i++) {
        if (Math.random() < 0.6) this.spawnEntity(EntityType.ENEMY_TANK, this.getLaneWorldX(i), SPAWN_Z + i * 150, ENEMY_RADIUS_TANK, hp * 4, 100);
    }
  }

  private spawnSimpleGap() {
    const gap = Math.floor(Math.random() * LANE_COUNT);
    const hp = (12 + this.wave * 6) * this.getDifficultyMultiplier();
    for (let i = 0; i < 3; i++) {
        if (i !== gap) this.spawnEntity(EntityType.ENEMY_SPRINTER, this.getLaneWorldX(i), SPAWN_Z, ENEMY_RADIUS_SPRINTER, hp, 25);
    }
  }

  private spawnEntity(type: EntityType, x: number, z: number, r: number, hp: number, score: number) {
    let color = COLORS.ENEMY_GRUNT;
    if (type === EntityType.ENEMY_SPRINTER) color = COLORS.ENEMY_SPRINTER;
    if (type === EntityType.ENEMY_TANK) color = COLORS.ENEMY_TANK;
    this.entities.push({
      id: Math.random(), type, pos: { x, y: z }, radius: r, active: true, hp, maxHp: hp, color, lane: -1, scoreValue: score, formationOffset: (Math.random() - 0.5) * SQUAD_SPREAD_WIDTH
    });
  }

  private spawnPickup(lane: number, z: number, forcedType?: PickupType) {
    const types = forcedType ? [forcedType] : [PickupType.BOMB_SMALL, PickupType.BOMB_MEDIUM, PickupType.BOMB_LARGE, PickupType.CLUSTER];
    const type = types[Math.floor(Math.random() * types.length)];
    let color = COLORS.PICKUP_BOMB_MEDIUM;
    if (type === PickupType.BOMB_SMALL) color = COLORS.PICKUP_BOMB_SMALL;
    if (type === PickupType.BOMB_LARGE) color = COLORS.PICKUP_BOMB_LARGE;
    if (type === PickupType.CLUSTER) color = COLORS.PICKUP_CLUSTER;

    this.entities.push({
      id: Math.random(), type: EntityType.PICKUP, pos: { x: this.getLaneWorldX(lane), y: z }, radius: PICKUP_RADIUS, active: true, hp: 1, maxHp: 1, color, lane, pickupType: type, rotation: 0, rotationSpeed: 1 + Math.random() * 4
    });
  }

  private spawnGateRow() {
    this.spawnGateRowAtZ(SPAWN_Z);
  }

  private spawnGateRowAtZ(z: number) {
    const goodLane = Math.floor(Math.random() * LANE_COUNT);
    for (let i = 0; i < LANE_COUNT; i++) {
      const op = Math.random() > 0.6 ? GateOp.MULTIPLY : GateOp.ADD;
      let val = (i === goodLane) ? (op === GateOp.MULTIPLY ? 2 : 5) : (op === GateOp.MULTIPLY ? 0.5 : -3);
      const beneficial = (op === GateOp.MULTIPLY && val >= 1) || (op === GateOp.ADD && val >= 0);
      this.entities.push({
        id: Math.random(), type: EntityType.GATE, pos: { x: this.getLaneWorldX(i), y: z }, radius: 50, active: true, hp: 1, maxHp: 1, color: beneficial ? COLORS.GATE_POS_BG : COLORS.GATE_NEG_BG, lane: i, gateData: { type: GateType.PROJECTILES, op, value: val }, width: WORLD_LANE_WIDTH - 10, height: GATE_HEIGHT
      });
    }
  }

  private checkCollision(a: Entity, b: Entity): boolean {
    const dx = a.pos.x - b.pos.x; const dy = a.pos.y - b.pos.y;
    if (Math.abs(dy) > 120) return false;
    const distSq = dx * dx + dy * dy; const rSum = a.radius + b.radius;
    return distSq < (rSum * rSum);
  }

  private handlePlayerCollision(ent: Entity) {
    ent.active = false;
    if (ent.type === EntityType.GATE) {
      const data = ent.gateData!; let count = this.playerStats.projectileCount;
      if (data.op === GateOp.MULTIPLY) count = Math.floor(count * data.value); else count += data.value;
      this.playerStats.projectileCount = Math.max(0, count);
      this.flashColor = (data.op === GateOp.MULTIPLY ? data.value >= 1 : data.value >= 0) ? 'rgba(0, 255, 100, 0.2)' : 'rgba(255, 0, 0, 0.2)';
      this.flashTimer = 0.2; SoundService.playPickup();
    }
  }

  private applyPickup(type: PickupType, origin: Vector2) {
    let blastRadius = 800;
    switch(type) {
      case PickupType.BOMB_SMALL: blastRadius = 400; break;
      case PickupType.BOMB_MEDIUM: blastRadius = 800; break;
      case PickupType.BOMB_LARGE: blastRadius = 1500; break;
      case PickupType.CLUSTER: blastRadius = 1000; break;
    }

    let color = COLORS.PICKUP_BOMB_MEDIUM;
    if (type === PickupType.BOMB_SMALL) color = COLORS.PICKUP_BOMB_SMALL;
    if (type === PickupType.BOMB_LARGE) color = COLORS.PICKUP_BOMB_LARGE;
    if (type === PickupType.CLUSTER) color = COLORS.PICKUP_CLUSTER;

    this.entities.forEach(e => {
      if (e.active && (e.type.startsWith('ENEMY') || e.type === EntityType.BOSS) && e.pos.y < SPAWN_Z) {
        const dx = e.pos.x - origin.x; const dy = e.pos.y - origin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < blastRadius) {
          const dmg = type === PickupType.BOMB_LARGE ? 3000 : (type === PickupType.BOMB_MEDIUM ? 1500 : 800);
          if (e.type === EntityType.BOSS) e.hp -= dmg; 
          else { e.active = false; this.score += (e.scoreValue || 10); }
          this.createHitEffect(e.pos, e.type, 10, color);
        }
      }
    });
    this.createHitEffect(origin, EntityType.PARTICLE, 60, color);
    this.shakeTimer = type === PickupType.BOMB_LARGE ? 0.9 : 0.6; 
    SoundService.playExplosion(type === PickupType.BOMB_LARGE || type === PickupType.BOMB_MEDIUM);
  }

  private createHitEffect(pos: Vector2, type: EntityType, count: number, color?: string) {
    if (this.config.reducedEffects) count = Math.floor(count / 2);
    let c = color || COLORS.ENEMY_GRUNT;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2; const speed = 200 + Math.random() * 600;
      this.particles.push({
        id: Math.random(), type: EntityType.PARTICLE, pos: { x: pos.x, y: pos.y }, radius: 3 + Math.random() * 4, active: true, hp: 1, maxHp: 1, color: c, lane: -1, velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }, life: 0.5, maxLife: 0.5
      });
    }
  }

  private fireBullet() {
    const raw = Math.floor(this.playerStats.projectileCount); const count = Math.min(raw, MAX_PROJECTILES_PER_SHOT);
    const dmg = this.playerStats.damage * (raw / count); const tier = Math.min(BULLET_COLORS.length - 1, Math.floor(dmg / 25));
    const spread = MAX_SPREAD_ANGLE_DEG * (Math.PI / 180) * Math.min(1.0, count / 12);
    SoundService.playShoot();
    for (let i = 0; i < count; i++) {
      const angle = count > 1 ? (-spread / 2 + (i * (spread / (count - 1)))) : 0;
      this.entities.push({
        id: Math.random(), type: EntityType.BULLET, pos: { x: this.player.pos.x, y: this.player.pos.y }, radius: BULLET_RADIUS, active: true, hp: 1, maxHp: 1, color: BULLET_COLORS[tier], lane: -1, damage: dmg, velocity: { x: -Math.sin(angle) * 1800, y: Math.cos(angle) * 1800 }
      });
    }
  }

  private endGame() { this.state = GameState.GAME_OVER; SoundService.playExplosion(true); this.onUIUpdate({ state: this.state }); }

  private project(p: Vector2): { x: number, y: number, scale: number, visible: boolean } {
    const z = p.y; if (z < -300 || z > DRAW_DISTANCE + 500) return { x: 0, y: 0, scale: 0, visible: false };
    const scale = CAMERA_DEPTH / (z + CAMERA_DEPTH); const bottomY = CANVAS_HEIGHT - VIEWPORT_BOTTOM_OFFSET;
    return { x: (CANVAS_WIDTH / 2) + (p.x * scale), y: HORIZON_Y + (scale * (bottomY - HORIZON_Y)), scale, visible: true };
  }

  private draw() {
    if (!this.ctx) return; const ctx = this.ctx;
    ctx.fillStyle = '#020202'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const now = Date.now();
    ctx.save(); if (this.shakeTimer > 0) ctx.translate((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
    this.drawCityscape(ctx); this.drawGrid(ctx);
    
    const linePulse = 0.5 + Math.sin(now / 150) * 0.4;

    for (let i of [-1.5, -0.5, 0.5, 1.5]) {
      const isInner = i === -0.5 || i === 0.5;
      const lx = i * WORLD_LANE_WIDTH;
      const zStart = isInner ? DRAW_DISTANCE : 0;
      const zEnd = isInner ? CONVERGENCE_Z : DRAW_DISTANCE;
      
      const pS = this.project({ x: lx, y: zStart }); 
      const pE = this.project({ x: lx, y: zEnd });
      
      if (pS.visible && pE.visible) {
        ctx.save();
        const laneColor: string = isInner ? (COLORS as any).INNER_LANE_LINE : COLORS.LANE_BORDER;
        ctx.strokeStyle = laneColor; 
        ctx.lineWidth = isInner ? 4 : 8;
        
        const glowRadius = isInner ? (15 + linePulse * 25) : (25 + this.battleIntensity * 60 + linePulse * 40);
        ctx.shadowBlur = glowRadius * pS.scale; 
        ctx.shadowColor = laneColor;
        
        ctx.beginPath(); ctx.moveTo(pS.x, pS.y); ctx.lineTo(pE.x, pE.y); ctx.stroke(); 
        
        if (!isInner) {
           ctx.lineWidth = 16;
           ctx.globalAlpha = (this.battleIntensity * 0.5) + (linePulse * 0.4);
           ctx.shadowBlur = (35 + this.battleIntensity * 90) * pS.scale;
           ctx.stroke();
        }
        ctx.restore();
      }
    }

    const all = [...this.entities, ...this.particles].filter(e => e.active).sort((a, b) => b.pos.y - a.pos.y);
    for (const ent of all) {
      const proj = this.project(ent.pos); if (!proj.visible) continue;
      if (ent.type === EntityType.GATE) {
        const w = (ent.width || 200) * proj.scale; const h = (ent.height || 140) * proj.scale;
        ctx.fillStyle = ent.color; ctx.fillRect(proj.x - w / 2, proj.y - h, w, h);
        const text = `${ent.gateData!.op === GateOp.MULTIPLY ? 'x' : '+'}${ent.gateData!.value}`;
        ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.max(12, 45 * proj.scale)}px Orbitron`; ctx.textAlign = 'center'; ctx.fillText(text, proj.x, proj.y - h / 2);
      } else if (ent.type === EntityType.PICKUP) {
        const size = ent.radius * proj.scale * 1.5;
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.rotate(ent.rotation || 0);
        ctx.shadowBlur = 25 * proj.scale; ctx.shadowColor = ent.color;
        ctx.fillStyle = ent.color; ctx.fillRect(-size/2, -size/2, size, size);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * proj.scale; ctx.strokeRect(-size/2, -size/2, size, size);
        ctx.restore();
      } else if (ent.type === EntityType.BULLET) {
        let bulletScale = 1.0;
        let bulletAlpha = 1.0;
        if (ent.pos.y > BULLET_FADE_START) {
          const t = (ent.pos.y - BULLET_FADE_START) / (BULLET_MAX_RANGE - BULLET_FADE_START);
          bulletScale = 1.0 - t;
          bulletAlpha = 1.0 - t;
        }
        ctx.save();
        ctx.globalAlpha = bulletAlpha;
        ctx.fillStyle = ent.color; ctx.beginPath(); ctx.arc(proj.x, proj.y, ent.radius * proj.scale * bulletScale, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else if (ent.type === EntityType.BOSS) {
         this.drawBoss(ctx, ent, proj);
      } else if (ent.type === EntityType.PLAYER) {
        // Handled via drawPlayer/drawSquad
      } else {
        ctx.fillStyle = ent.color; ctx.beginPath(); ctx.arc(proj.x, proj.y, ent.radius * proj.scale, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Squad is drawn behind player, so we draw it first
    this.drawSquad(ctx);
    // Player ship leads, drawn on top
    this.drawPlayer(ctx); 
    
    this.drawSnow(ctx);
    if (this.flashTimer > 0 && this.flashColor) { ctx.fillStyle = this.flashColor; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); }
    ctx.restore();
  }

  private drawBoss(ctx: CanvasRenderingContext2D, ent: Entity, proj: { x: number, y: number, scale: number }) {
    const r = ent.radius * proj.scale;
    ctx.save(); ctx.shadowBlur = 60 * proj.scale; ctx.shadowColor = COLORS.BOSS;
    ctx.fillStyle = COLORS.BOSS; ctx.beginPath();
    ctx.moveTo(proj.x, proj.y - r * 1.5); ctx.lineTo(proj.x + r, proj.y); ctx.lineTo(proj.x + r * 0.5, proj.y + r); ctx.lineTo(proj.x - r * 0.5, proj.y + r); ctx.lineTo(proj.x - r, proj.y);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  private drawSquad(ctx: CanvasRenderingContext2D) {
    const projPlayer = this.project(this.player.pos);
    if (!projPlayer.visible) return;

    const count = Math.floor(this.playerStats.projectileCount);
    const displayedCount = Math.min(count, MAX_SQUAD_DISPLAY);

    ctx.save();
    // Start from index 1 (0 is the player tip)
    for (let i = 1; i < displayedCount; i++) {
        const offset = SQUAD_OFFSETS[i];
        // Now Z offsets are negative, forming BEHIND the player tip
        const squadWorldPos = { 
            x: this.player.pos.x + offset.x, 
            y: this.player.pos.y + offset.z 
        };
        const proj = this.project(squadWorldPos);
        if (proj.visible) {
            const r = SQUAD_DOT_RADIUS * proj.scale;
            ctx.fillStyle = COLORS.PLAYER;
            ctx.shadowBlur = 15 * proj.scale;
            ctx.shadowColor = COLORS.PLAYER;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const proj = this.project(this.player.pos); if (!proj.visible) return;
    const r = this.player.radius * proj.scale;
    ctx.save();
    ctx.shadowBlur = 40 * proj.scale; ctx.shadowColor = COLORS.PLAYER;
    ctx.fillStyle = COLORS.PLAYER; 
    
    // Distinct ship shape leading the diamond tip
    ctx.beginPath(); 
    ctx.moveTo(proj.x, proj.y - r * 2.5); 
    ctx.lineTo(proj.x + r * 1.5, proj.y + r); 
    ctx.lineTo(proj.x - r * 1.5, proj.y + r); 
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(proj.x, proj.y - r * 1.8);
    ctx.lineTo(proj.x + r * 0.8, proj.y + r * 0.4);
    ctx.lineTo(proj.x - r * 0.8, proj.y + r * 0.4);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#fff'; ctx.font = `bold 28px Orbitron`; ctx.textAlign = 'center'; 
    ctx.fillText(Math.floor(this.playerStats.projectileCount).toString(), proj.x, proj.y + 60);
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
    const bWidth = 150 + (seed % 200);
    const bHeight = 200 + (seed % 400);
    const zF = zCenter - 400; const zB = zCenter + 400;
    const xInner = side * CITY_STREET_WIDTH; const xOuter = xInner + (side * bWidth);
    const pIF = this.project({ x: xInner, y: zF }); const pOF = this.project({ x: xOuter, y: zF });
    const pIB = this.project({ x: xInner, y: zB }); const pOB = this.project({ x: xOuter, y: zB });
    if (!pIF.visible || !pIB.visible || !pOF.visible || !pOB.visible) return;

    const colors = ['#aa00ff', '#00ff00', '#ffff00', '#ff00ff', '#00ffff'];
    const color = colors[index % colors.length];
    
    ctx.save();
    ctx.strokeStyle = color; 
    ctx.lineWidth = 4;
    
    const glowScale = 0.3 + 0.7 * pIF.scale; 
    ctx.shadowBlur = 40 * glowScale;
    ctx.shadowColor = color;
    
    ctx.beginPath();
    ctx.moveTo(pIF.x, pIF.y - bHeight * pIF.scale); ctx.lineTo(pOF.x, pOF.y - bHeight * pOF.scale); ctx.lineTo(pOB.x, pOB.y - bHeight * pOB.scale); ctx.lineTo(pIB.x, pIB.y - bHeight * pIB.scale);
    ctx.closePath(); ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(pIF.x, pIF.y); ctx.lineTo(pIF.x, pIF.y - bHeight * pIF.scale);
    ctx.moveTo(pOF.x, pOF.y); ctx.lineTo(pOF.x, pOF.y - bHeight * pOF.scale);
    ctx.moveTo(pIB.x, pIB.y); ctx.lineTo(pIB.x, pIB.y - bHeight * pIB.scale);
    ctx.moveTo(pOB.x, pOB.y); ctx.lineTo(pOB.x, pOB.y - bHeight * pOB.scale);
    ctx.stroke();

    ctx.globalAlpha = 0.05 + 0.15 * pIF.scale;
    ctx.lineWidth = 2 + 10 * pIF.scale;
    ctx.stroke();
    
    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)'; ctx.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      let z = (i * 250) - this.gridOffset; if (z < 0) z += 10000;
      const pL = this.project({ x: -2000, y: z }); const pR = this.project({ x: 2000, y: z });
      if (pL.visible && pR.visible) { ctx.beginPath(); ctx.moveTo(pL.x, pL.y); ctx.lineTo(pR.x, pR.y); ctx.stroke(); }
    }
  }

  private drawSnow(ctx: CanvasRenderingContext2D) {
    if (!this.config.snowEnabled) return; ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (const p of this.snowParticles) { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
  }
}