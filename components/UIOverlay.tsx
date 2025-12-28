import React from 'react';
import { GameState, GameConfig, Difficulty } from '../types';
import { StorageService } from '../services/StorageService';

interface UIProps {
  gameState: GameState;
  stats: any;
  config: GameConfig;
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
  onToggleSetting: (key: keyof GameConfig) => void;
  onNavigate: (to: GameState) => void;
  onConfigChange: (newConfig: GameConfig) => void;
}

const DIFFICULTY_NAMES: Record<Difficulty, string> = {
  [Difficulty.EASY]: "I have a life",
  [Difficulty.NORMAL]: "Bring it on",
  [Difficulty.HARD]: "I Like Pain",
  [Difficulty.UNFAIR]: "Unfair",
  [Difficulty.EMOTIONAL]: "Emotional Damage",
  [Difficulty.SINGULARITY]: "Singularity",
  [Difficulty.OMEGA]: "Omega Protocol"
};

export const UIOverlay: React.FC<UIProps> = ({ 
  gameState, stats, config, 
  onStart, onResume, onRestart, onToggleSetting, onNavigate, onConfigChange
}) => {

  // -- Main Menu --
  if (gameState === GameState.MENU) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 space-y-8 pointer-events-auto bg-black/50 backdrop-blur-sm">
        <h1 className="text-6xl font-black text-cyan-400 title-font tracking-tighter drop-shadow-[0_0_10px_rgba(0,255,255,0.8)] text-center">
          NEON<br/><span className="text-white">LANE</span>
        </h1>
        <div className="flex flex-col w-full max-w-xs space-y-4">
          <button onClick={onStart} className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-4 rounded-sm text-xl uppercase tracking-widest transition-transform active:scale-95">
            Play
          </button>
          <button onClick={() => onNavigate(GameState.SETTINGS)} className="bg-gray-800 hover:bg-gray-700 border border-cyan-500/30 text-gray-400 font-bold py-3 rounded-sm text-lg uppercase">
            Settings
          </button>
        </div>
      </div>
    );
  }

  // -- HUD --
  if (gameState === GameState.PLAYING) {
    return (
      <div className="absolute inset-0 pointer-events-none p-4 flex justify-between items-start">
        
        {/* Left Column: Stats & Info - Tightened Spacing */}
        <div className="flex flex-col items-start mt-4">
            {/* Score & Distance Block */}
            <div className="px-3 py-1 bg-transparent">
                <div className="text-white font-mono text-4xl font-black leading-none tracking-widest drop-shadow-md text-shadow-black">
                   {String(stats.score).padStart(6, '0')}
                </div>
                <div className="text-cyan-400 font-mono text-xl font-bold text-shadow-black">
                   {stats.distance}m
                </div>
            </div>
            
            {/* Secondary Stats - Moved Up */}
            <div className="px-3 bg-transparent">
                 <div className="text-red-400 font-bold text-lg font-mono text-shadow-black">{stats.dps || 0} DPS</div>
                 <div className="text-white/40 font-mono text-xs">
                    FPS: {stats.fps} <span className="mx-1">|</span> ENT: {stats.activeEntities}
                 </div>
            </div>
        </div>

        {/* Right Column: Pause */}
        <div className="flex flex-col items-end pointer-events-auto mt-4">
            <button onClick={() => onNavigate(GameState.PAUSED)} className="bg-transparent hover:bg-white/10 p-2 rounded mb-6 backdrop-blur-sm">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </button>
        </div>
      </div>
    );
  }

  // -- Pause --
  if (gameState === GameState.PAUSED) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 backdrop-blur-sm pointer-events-auto">
        <h2 className="text-4xl font-bold text-white mb-8 title-font">PAUSED</h2>
        <button onClick={onResume} className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 px-8 rounded-sm text-xl mb-4 w-64">
          RESUME
        </button>
        <button onClick={() => onNavigate(GameState.MENU)} className="bg-red-900/50 hover:bg-red-800 border border-red-500 text-white font-bold py-3 px-8 rounded-sm text-xl w-64">
          QUIT
        </button>
      </div>
    );
  }

  // -- Game Over --
  if (gameState === GameState.GAME_OVER) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/90 z-30 p-6 pointer-events-auto">
        <h2 className="text-5xl font-black text-white mb-2 title-font tracking-widest">DEFEAT</h2>
        <div className="bg-black/50 p-6 rounded-lg border border-red-500/50 w-full max-w-sm mb-8">
            <div className="flex justify-between text-lg mb-2">
                <span className="text-gray-400">Score</span>
                <span className="font-mono text-cyan-400 font-bold text-xl">{stats.score}</span>
            </div>
            <div className="flex justify-between text-lg">
                <span className="text-gray-400">Distance</span>
                <span className="font-mono">{stats.distance}m</span>
            </div>
        </div>
        
        <button onClick={onRestart} className="bg-white text-black font-bold py-4 px-8 rounded-sm text-xl w-full max-w-xs mb-4 hover:bg-gray-200">
          RETRY
        </button>
        <button onClick={() => onNavigate(GameState.MENU)} className="bg-transparent border border-white/30 text-white font-bold py-3 px-8 rounded-sm text-lg w-full max-w-xs hover:bg-white/10">
            MENU
        </button>
      </div>
    );
  }

  // -- Settings --
  if (gameState === GameState.SETTINGS) {
    return (
        <div className="absolute inset-0 bg-black z-20 flex flex-col p-8 justify-center pointer-events-auto overflow-y-auto">
            <h2 className="text-3xl font-bold text-white title-font mb-8 text-center">SETTINGS</h2>
            
            <div className="space-y-6 w-full max-w-md mx-auto">
                {/* Difficulty Select */}
                <div className="flex flex-col space-y-2">
                    <span className="text-xl text-gray-300">Difficulty</span>
                    <select 
                        value={config.difficulty}
                        onChange={(e) => {
                            const newConfig = { ...config, difficulty: e.target.value as Difficulty };
                            onConfigChange(newConfig);
                            StorageService.saveConfig(newConfig);
                        }}
                        className="bg-gray-800 text-white p-3 rounded border border-gray-600 focus:border-cyan-500 outline-none font-bold"
                    >
                        {Object.entries(DIFFICULTY_NAMES).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>

                <div className="border-t border-gray-700 my-4"></div>

                <div className="flex justify-between items-center">
                    <span className="text-xl text-gray-300">Sound Effects</span>
                    <button 
                        onClick={() => onToggleSetting('soundEnabled')}
                        className={`w-16 h-8 rounded-full p-1 transition-colors ${config.soundEnabled ? 'bg-cyan-500' : 'bg-gray-700'}`}
                    >
                        <div className={`bg-white w-6 h-6 rounded-full shadow transition-transform ${config.soundEnabled ? 'translate-x-8' : ''}`} />
                    </button>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xl text-gray-300">Haptics</span>
                    <button 
                        onClick={() => onToggleSetting('hapticsEnabled')}
                        className={`w-16 h-8 rounded-full p-1 transition-colors ${config.hapticsEnabled ? 'bg-cyan-500' : 'bg-gray-700'}`}
                    >
                        <div className={`bg-white w-6 h-6 rounded-full shadow transition-transform ${config.hapticsEnabled ? 'translate-x-8' : ''}`} />
                    </button>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xl text-gray-300">Reduced VFX</span>
                    <button 
                        onClick={() => onToggleSetting('reducedEffects')}
                        className={`w-16 h-8 rounded-full p-1 transition-colors ${config.reducedEffects ? 'bg-cyan-500' : 'bg-gray-700'}`}
                    >
                        <div className={`bg-white w-6 h-6 rounded-full shadow transition-transform ${config.reducedEffects ? 'translate-x-8' : ''}`} />
                    </button>
                </div>
            </div>

            <button onClick={() => onNavigate(GameState.MENU)} className="mt-12 bg-gray-800 text-white py-4 rounded font-bold border border-gray-600 w-full max-w-md mx-auto hover:bg-gray-700">
                BACK
            </button>
        </div>
    );
  }

  return null;
};
