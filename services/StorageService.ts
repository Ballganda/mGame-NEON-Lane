import { GameConfig, Difficulty } from '../types.ts';

const STORAGE_KEY_CONFIG = 'neon_runner_config_v2';
const STORAGE_KEY_HIGHSCORE = 'neon_runner_highscore_v2';

const DEFAULT_CONFIG: GameConfig = {
  soundEnabled: true,
  hapticsEnabled: true,
  reducedEffects: false,
  difficulty: Difficulty.NORMAL,
  snowEnabled: false
};

export class StorageService {
  static loadConfig(): GameConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (data) return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch (e) {
       console.error("Failed to load config", e);
    }
    return { ...DEFAULT_CONFIG };
  }

  static saveConfig(config: GameConfig): void {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error("Failed to save config", e);
    }
  }

  static getHighScore(): number {
    try {
      return parseInt(localStorage.getItem(STORAGE_KEY_HIGHSCORE) || '0');
    } catch (e) {
      return 0;
    }
  }

  static saveHighScore(score: number): void {
    try {
      const current = this.getHighScore();
      if (score > current) {
        localStorage.setItem(STORAGE_KEY_HIGHSCORE, score.toString());
      }
    } catch (e) {
      console.error("Failed to save high score", e);
    }
  }
}