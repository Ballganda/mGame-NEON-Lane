import React from 'react';
import { GameState, GameConfig, Difficulty } from '../types.ts';
import { StorageService } from '../services/StorageService.ts';

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
  [Difficulty.EASY]: "Casual",
  [Difficulty.NORMAL]: "Normal",
  [Difficulty.HARD]: "Veteran",
  [Difficulty.UNFAIR]: "Insane",
  [Difficulty.EMOTIONAL]: "Nightmare",
  [Difficulty.SINGULARITY]: "Singularity",
  [Difficulty.OMEGA]: "Omega"
};

export const UIOverlay: React.FC<UIProps> = ({ 
  gameState, stats, config, 
  onStart, onResume, onRestart, onToggleSetting, onNavigate, onConfigChange
}) => {
  const highScore = StorageService.getHighScore();

  if (gameState === GameState.MENU) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 space-y-8 pointer-events-auto bg-black/60 backdrop-blur-md">
        <h1 className="text-7xl font-black text-cyan-400 title-font tracking-tighter drop-shadow-[0_0_20px_rgba(0,255,255,0.8)] text-center leading-none">
          NEON<br/><span className="text-white">LANE</span>
        </h1>
        <div className="text-center">
            <div className="text-gray-400 text-xs uppercase tracking-widest mb-1">BEST RUN</div>
            <div className="text-white font-mono text-3xl font-bold tracking-widest">{highScore.toLocaleString()}</div>
        </div>
        <div className="flex flex-col w-full max-w-xs space-y-4">
          <button onClick={onStart} className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-5 rounded-sm text-2xl uppercase tracking-widest transition-transform active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
            IGNITE
          </button>
          <button onClick={() => onNavigate(GameState.SETTINGS)} className="bg-gray-900/50 border border-cyan-500/20 text-gray-400 font-bold py-3 rounded-sm text-lg uppercase">
            GEAR
          </button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.PLAYING) {
    return (
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start">
            <div className="flex flex-col">
                <div className="text-white font-mono text-5xl font-black tracking-tighter text-shadow-black">
                   {String(stats.score).padStart(6, '0')}
                </div>
                <div className="flex items-baseline space-x-2">
                    <div className="text-cyan-400 font-mono text-2xl font-bold">{stats.distance}m</div>
                    {stats.combo > 1 && (
                        <div className="text-yellow-400 font-black italic text-2xl animate-bounce">
                           x{stats.combo}
                        </div>
                    )}
                </div>
            </div>
            <button onClick={() => onNavigate(GameState.PAUSED)} className="pointer-events-auto bg-white/10 p-3 rounded-full backdrop-blur-sm border border-white/20">
                <div className="w-6 h-6 flex space-x-1">
                    <div className="w-2 h-full bg-white"></div>
                    <div className="w-2 h-full bg-white"></div>
                </div>
            </button>
        </div>

        <div className="flex flex-col items-center space-y-2 mb-10">
            {stats.shieldRatio !== null && (
                <div className="w-full max-w-[200px]">
                    <div className="text-cyan-400 text-[10px] uppercase font-bold text-center mb-1">SHIELD ACTIVE</div>
                    <div className="h-1 bg-cyan-900 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400" style={{ width: `${stats.shieldRatio * 100}%` }} />
                    </div>
                </div>
            )}
            {stats.bossHp !== null && (
              <div className="w-full max-w-md">
                <div className="text-red-500 font-bold text-[10px] uppercase tracking-widest mb-1 text-center">ELITE SENTINEL DETECTED</div>
                <div className="h-2 w-full bg-red-900/20 border border-red-500/30 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 shadow-[0_0_15px_#f00]" style={{ width: `${stats.bossHp * 100}%` }} />
                </div>
              </div>
            )}
        </div>
      </div>
    );
  }

  if (gameState === GameState.PAUSED) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 backdrop-blur-md pointer-events-auto">
        <h2 className="text-5xl font-bold text-white mb-12 title-font tracking-widest">SYSTEM HALT</h2>
        <button onClick={onResume} className="bg-cyan-500 text-black font-bold py-4 px-12 rounded-sm text-2xl mb-4 w-72">RESUME</button>
        <button onClick={() => onNavigate(GameState.MENU)} className="bg-transparent border border-red-500 text-red-500 font-bold py-4 px-12 rounded-sm text-2xl w-72">ABORT</button>
      </div>
    );
  }

  if (gameState === GameState.GAME_OVER) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/90 z-30 p-8 pointer-events-auto backdrop-blur-lg">
        <h2 className="text-6xl font-black text-white mb-4 title-font tracking-tighter">DEFEATED</h2>
        <div className="bg-black/40 p-8 rounded-sm border border-red-500/40 w-full max-w-sm mb-10">
            <div className="flex justify-between text-xl mb-3 border-b border-white/10 pb-2">
                <span className="text-gray-400">FINAL SCORE</span>
                <span className="font-mono text-cyan-400 font-bold">{stats.score.toLocaleString()}</span>
            </div>
            {stats.score >= highScore && <div className="text-yellow-400 font-black text-center text-xl animate-pulse">NEW WORLD RECORD</div>}
        </div>
        <button onClick={onRestart} className="bg-white text-black font-bold py-5 px-12 rounded-sm text-2xl w-full max-w-xs mb-4">RETRY</button>
        <button onClick={() => onNavigate(GameState.MENU)} className="bg-transparent border border-white/30 text-white font-bold py-4 px-12 rounded-sm text-xl w-full max-w-xs">MENU</button>
      </div>
    );
  }

  if (gameState === GameState.SETTINGS) {
    return (
        <div className="absolute inset-0 bg-black z-20 flex flex-col p-10 justify-center pointer-events-auto">
            <h2 className="text-4xl font-bold text-white title-font mb-12 text-center">CONFIG</h2>
            <div className="space-y-8 w-full max-w-md mx-auto">
                <div className="flex flex-col space-y-3">
                    <span className="text-xs uppercase text-cyan-400 font-bold tracking-widest">Protocol Difficulty</span>
                    <select value={config.difficulty} onChange={(e) => onConfigChange({...config, difficulty: e.target.value as Difficulty})}
                        className="bg-gray-900 text-white p-4 rounded-sm border border-gray-800 focus:border-cyan-500 outline-none font-bold text-lg">
                        {Object.entries(DIFFICULTY_NAMES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                </div>
                <div className="space-y-4">
                    {[
                        { key: 'soundEnabled', label: 'Audio Feedback' },
                        { key: 'hapticsEnabled', label: 'Neural Haptics' },
                        { key: 'snowEnabled', label: 'Particle Snow' }
                    ].map(s => (
                        <div key={s.key} className="flex justify-between items-center">
                            <span className="text-lg text-gray-300">{s.label}</span>
                            <button onClick={() => onToggleSetting(s.key as any)} className={`w-14 h-7 rounded-full transition-colors ${config[s.key as keyof GameConfig] ? 'bg-cyan-500' : 'bg-gray-800'}`}>
                                <div className={`bg-white w-5 h-5 rounded-full m-1 transition-transform ${config[s.key as keyof GameConfig] ? 'translate-x-7' : ''}`} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            <button onClick={() => onNavigate(GameState.MENU)} className="mt-16 bg-gray-900 text-white py-4 rounded-sm font-bold border border-gray-800 w-full max-w-md mx-auto">SAVE & RETURN</button>
        </div>
    );
  }
  return null;
};