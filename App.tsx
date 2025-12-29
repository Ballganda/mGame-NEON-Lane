import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas.tsx';
import { UIOverlay } from './components/UIOverlay.tsx';
import { GameState, GameConfig, PlayerStats } from './types.ts';
import { StorageService } from './services/StorageService.ts';
import { GameEngine } from './services/GameEngine.ts';
import { SoundService } from './services/SoundService.ts';
import { BASE_PLAYER_SPEED, GAME_VERSION } from './constants.ts';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [config, setConfig] = useState<GameConfig>(StorageService.loadConfig());
  
  // Game Stats for UI
  const [stats, setStats] = useState({
    score: 0,
    hp: 100,
    maxHp: 100,
    distance: 0,
    fps: 60,
    activeEntities: 0,
    dps: 0,
    bossHp: null
  });

  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    SoundService.setEnabled(config.soundEnabled);
  }, [config.soundEnabled]);

  const getInitialStats = (): PlayerStats => ({
    maxHp: 100,
    damage: 10,
    fireRate: 4, 
    projectileCount: 1, 
    moveSpeed: BASE_PLAYER_SPEED
  });

  const handleUIUpdate = useCallback((newStats: any) => {
    if (newStats.state && newStats.state !== gameState) {
      if (newStats.state === GameState.GAME_OVER) {
        StorageService.saveHighScore(newStats.score || stats.score);
      }
      setGameState(newStats.state);
    }
    setStats(prev => ({ ...prev, ...newStats }));
  }, [gameState, stats.score]);

  const startGame = () => {
    if (engineRef.current) {
      engineRef.current.playerStats = getInitialStats(); 
      engineRef.current.initGame(); 
      engineRef.current.setGameState(GameState.PLAYING);
      engineRef.current.start();
    }
    setGameState(GameState.PLAYING);
  };

  const resumeGame = () => {
    engineRef.current?.resume();
    setGameState(GameState.PLAYING);
  };

  const toggleSetting = (key: keyof GameConfig) => {
    const newConfig = { ...config, [key]: !config[key] };
    setConfig(newConfig);
    StorageService.saveConfig(newConfig);
  };

  return (
    <div className="relative w-full h-screen bg-neutral-900 overflow-hidden select-none">
      <GameCanvas 
        config={config} 
        initialStats={getInitialStats()} 
        onUpdate={handleUIUpdate}
        engineRef={engineRef}
      />
      
      {/* Persistent Top Overlay: Version | FPS | ENT */}
      <div className="absolute top-1 left-2 text-[10px] text-white/40 font-mono pointer-events-none z-50 flex space-x-2 whitespace-pre">
        <span>{GAME_VERSION}</span>
        <span className="opacity-30">|</span>
        <span>{String(stats.fps).padStart(3, ' ')} FPS</span>
        <span className="opacity-30">|</span>
        <span>{String(stats.activeEntities).padStart(4, ' ')} ENT</span>
      </div>

      <UIOverlay 
        gameState={gameState} 
        stats={stats}
        config={config}
        onStart={startGame}
        onResume={resumeGame}
        onRestart={startGame}
        onToggleSetting={toggleSetting}
        onConfigChange={setConfig}
        onNavigate={(s) => {
          if (s === GameState.MENU && engineRef.current) {
            engineRef.current.initGame();
            engineRef.current.setGameState(GameState.MENU);
            engineRef.current.start();
          } else if (s === GameState.PAUSED && engineRef.current) {
            engineRef.current.pause();
          }
          setGameState(s);
        }}
      />
    </div>
  );
}