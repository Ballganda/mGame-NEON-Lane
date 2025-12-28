import React, { useState, useCallback, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { UIOverlay } from './components/UIOverlay';
import { GameState, GameConfig, PlayerStats } from './types';
import { StorageService } from './services/StorageService';
import { GameEngine } from './services/GameEngine';
import { BASE_PLAYER_SPEED } from './constants';

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
    dps: 0
  });

  const engineRef = useRef<GameEngine | null>(null);

  const getInitialStats = (): PlayerStats => ({
    maxHp: 100,
    damage: 10,
    fireRate: 4, 
    projectileCount: 1, 
    moveSpeed: BASE_PLAYER_SPEED
  });

  const handleUIUpdate = useCallback((newStats: any) => {
    if (newStats.state && newStats.state !== gameState) {
      setGameState(newStats.state);
    }
    setStats(prev => ({ ...prev, ...newStats }));
  }, [gameState]);

  const startGame = () => {
    if (engineRef.current) {
      engineRef.current.playerStats = getInitialStats(); 
      engineRef.current.initGame(); 
      // Explicitly start playing
      engineRef.current.setGameState(GameState.PLAYING);
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
          if (s === GameState.MENU && engineRef.current) engineRef.current.stop();
          if (s === GameState.PAUSED && engineRef.current) engineRef.current.pause();
          setGameState(s);
        }}
      />
    </div>
  );
}