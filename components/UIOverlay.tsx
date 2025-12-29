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

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  [Difficulty.EASY]: "i have a life",
  [Difficulty.NORMAL]: "bring it on",
  [Difficulty.HARD]: "i like pain",
  [Difficulty.UNFAIR]: "unfair",
  [Difficulty.EMOTIONAL]: "emotional damage",
  [Difficulty.SINGULARITY]: "singularity",
  [Difficulty.OMEGA]: "omega protocol"
};

export const UIOverlay: React.FC<UIProps> = ({ 
  gameState, stats, config, 
  onStart, onResume, onRestart, onToggleSetting, onNavigate, onConfigChange
}) => {
  const highScore = StorageService.getHighScore();

  if (gameState === GameState.MENU) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 pointer-events-auto bg-black/60 backdrop-blur-sm">
        <div className="flex flex-col items-center mb-16 text-center">
          <h1 className="text-7xl font-black text-cyan-400 title-font tracking-tighter drop-shadow-[0_0_20px_rgba(0,240,255,0.8)] leading-none uppercase">
            NEON<br/><span className="text-white not-italic">LANE</span>
          </h1>
        </div>

        <div className="flex flex-col w-full max-w-xs space-y-4">
          <button 
            onClick={onStart} 
            className="bg-cyan-500 text-black font-black py-5 rounded-none text-2xl uppercase tracking-widest transition-all hover:bg-cyan-400 active:scale-95"
          >
            PLAY
          </button>
          
          <button 
            onClick={() => onNavigate(GameState.SETTINGS)} 
            className="bg-[#1a1c25] text-white/70 font-bold py-5 rounded-none text-xl uppercase tracking-widest hover:text-white transition-colors"
          >
            SETTINGS
          </button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.PLAYING) {
    return (
      <div className="absolute inset-0 pointer-events-none p-4 flex flex-col">
        {/* Top Header */}
        <div className="flex justify-between items-start">
            <div className="flex flex-col items-start">
                <div className="text-white font-mono text-4xl font-black tracking-tight drop-shadow-lg">
                   {String(stats.score).padStart(6, '0')}
                </div>
                <div className="flex flex-col mt-1">
                    <div className="text-cyan-400 font-mono text-xl font-bold">{stats.distance}m</div>
                    <div className="text-red-500 font-mono text-lg font-bold">{stats.dps} DPS</div>
                </div>
            </div>
            
            <button 
              onClick={() => onNavigate(GameState.PAUSED)} 
              className="pointer-events-auto bg-black/40 p-3 rounded-none border border-white/20 hover:bg-white/10 transition-colors"
            >
                <div className="flex space-x-1">
                    <div className="w-1 h-3 bg-white"></div>
                    <div className="w-1 h-3 bg-white"></div>
                </div>
            </button>
        </div>

        {/* HUD Elements */}
        <div className="mt-auto flex flex-col items-center space-y-6 mb-24">
            {stats.bossHp !== null && (
              <div className="w-full max-w-sm px-4">
                <div className="text-red-500 font-black text-xs uppercase tracking-[0.5em] mb-2 text-center drop-shadow-lg">CRITICAL_THREAT_DETECTED</div>
                <div className="h-2 w-full bg-red-950 border border-red-500/30 rounded-none overflow-hidden">
                    <div className="h-full bg-red-500 shadow-[0_0_20px_#f00]" style={{ width: `${stats.bossHp * 100}%` }} />
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
        <h2 className="text-6xl font-black text-white mb-16 title-font tracking-widest italic">PAUSED</h2>
        <div className="flex flex-col space-y-6 w-72">
          <button onClick={onResume} className="bg-white text-black font-black py-5 rounded-none text-2xl uppercase tracking-widest active:scale-95">RESUME</button>
          <button onClick={() => onNavigate(GameState.MENU)} className="bg-transparent border border-white/20 text-white/50 font-bold py-5 rounded-none text-xl uppercase tracking-widest hover:text-white transition-all">MAIN MENU</button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.GAME_OVER) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 p-8 pointer-events-auto">
        <div className="mb-16 text-center">
          <h2 className="text-7xl font-black text-red-500 title-font tracking-tighter leading-none italic mb-4 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">GAME OVER</h2>
          <div className="h-1.5 w-32 bg-red-500 mx-auto"></div>
        </div>
        
        <div className="bg-[#0a0a0a] p-10 border border-white/10 w-full max-w-xs mb-16 text-center">
            <div className="text-gray-500 text-xs font-bold uppercase tracking-[0.4em] mb-3">FINAL SCORE</div>
            <div className="font-mono text-white text-5xl font-black">{stats.score.toLocaleString()}</div>
            {stats.score >= highScore && <div className="mt-4 text-cyan-400 font-black text-sm tracking-widest animate-pulse">NEW BEST RECORD!</div>}
        </div>

        <div className="flex flex-col space-y-4 w-full max-w-xs">
          <button onClick={onRestart} className="bg-white text-black font-black py-5 rounded-none text-2xl uppercase tracking-widest active:scale-95 transition-transform">PLAY AGAIN</button>
          <button onClick={() => onNavigate(GameState.MENU)} className="bg-transparent border border-white/20 text-white/50 font-bold py-5 rounded-none text-xl uppercase tracking-widest hover:text-white transition-colors">QUIT</button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.SETTINGS) {
    return (
        <div className="absolute inset-0 bg-black z-20 flex flex-col p-6 pointer-events-auto overflow-hidden">
            <div className="flex justify-center items-center mb-6 mt-4">
              <h2 className="text-4xl font-black text-white title-font tracking-widest uppercase">SETTINGS</h2>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-6 w-full max-w-md mx-auto">
                <div className="flex flex-col space-y-2">
                    <label className="text-xl text-white/60 font-medium tracking-wide">Difficulty</label>
                    <div className="relative">
                      <select 
                        value={config.difficulty}
                        onChange={(e) => onConfigChange({...config, difficulty: e.target.value as Difficulty})}
                        className="w-full bg-[#1a1c25] border border-cyan-500/50 text-white font-bold py-4 px-6 rounded-none text-lg capitalize tracking-wide appearance-none focus:outline-none focus:border-cyan-400 transition-colors cursor-pointer"
                      >
                        {Object.entries(DIFFICULTY_LABELS).map(([key, label]) => (
                          <option key={key} value={key} className="bg-[#1a1c25]">{label}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none">
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-cyan-500"></div>
                      </div>
                    </div>
                </div>

                <div className="h-px bg-white/10 w-full"></div>

                <div className="space-y-6">
                    {[
                        { key: 'soundEnabled', label: 'Sound Effects' },
                        { key: 'hapticsEnabled', label: 'Haptics' },
                        { key: 'reducedEffects', label: 'Reduced VFX' },
                        { key: 'snowEnabled', label: 'Let it snow', italic: true }
                    ].map(s => (
                        <div key={s.key} className="flex justify-between items-center group">
                            <span className={`text-2xl font-medium text-white tracking-wide ${s.italic ? 'italic' : ''}`}>{s.label}</span>
                            <button 
                              onClick={() => onToggleSetting(s.key as any)} 
                              className={`w-16 h-8 rounded-full transition-colors flex items-center p-1 ${config[s.key as keyof GameConfig] ? 'bg-cyan-400' : 'bg-neutral-700'}`}
                            >
                                <div className={`w-6 h-6 rounded-full bg-white transition-all shadow-md ${config[s.key as keyof GameConfig] ? 'translate-x-8' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-auto mb-4 text-center">
              <button 
                onClick={() => onNavigate(GameState.MENU)} 
                className="w-full max-w-md py-5 bg-[#1a1c25] text-white font-black text-xl uppercase tracking-widest hover:bg-[#252835] transition-colors border border-white/5"
              >
                BACK
              </button>
            </div>
        </div>
    );
  }
  return null;
};