import { GameConfig, Difficulty } from '../types';

const STORAGE_KEY_CONFIG = 'neon_runner_config_v2';

const DEFAULT_CONFIG: GameConfig = {
  soundEnabled: true,
  hapticsEnabled: true,
  reducedEffects: false,
  difficulty: Difficulty.NORMAL
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
}