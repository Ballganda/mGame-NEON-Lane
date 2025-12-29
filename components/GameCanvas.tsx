
import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../services/GameEngine.ts';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../constants.ts';
import { GameConfig, PlayerStats } from '../types.ts';

interface GameCanvasProps {
  config: GameConfig;
  initialStats: PlayerStats;
  onUpdate: (data: any) => void;
  engineRef: React.MutableRefObject<GameEngine | null>;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ config, initialStats, onUpdate, engineRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Engine
    const engine = new GameEngine(
      canvasRef.current, 
      config, 
      initialStats,
      onUpdate
    );
    
    engineRef.current = engine;
    engine.initGame(); 
    // Start loop but keep in MENU state
    engine.start();

    // Cleanup
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Watch for config changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.config = config;
    }
  }, [config, engineRef]);

  return (
    <canvas 
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="w-full h-full object-contain bg-black"
    />
  );
};
