import React from 'react';
import { motion } from 'motion/react';
import { Crown } from 'lucide-react';

interface MascotAvatarProps {
  color?: string; // 'white' | 'yellow' | 'mint' | 'pink' | 'purple' | 'orange' | 'blue' | 'gray'
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isHost?: boolean;
  isAlive?: boolean;
  isActiveTurn?: boolean;
  expression?: 'happy' | 'smile' | 'shock' | 'dead' | 'wink' | 'sleeping';
  accessory?: string;
  className?: string;
}

const COLOR_MAP: Record<string, { bg: string; border: string; glow: string; shadow: string }> = {
  white: { bg: 'from-white via-[#fcfdff] to-[#e6e9f2]', border: 'border-slate-200', glow: 'rgba(255, 255, 255, 0.8)', shadow: 'shadow-slate-300/50' },
  yellow: { bg: 'from-[#ffe87a] via-[#ffd644] to-[#f5b822]', border: 'border-amber-300', glow: 'rgba(255, 214, 68, 0.6)', shadow: 'shadow-amber-400/40' },
  mint: { bg: 'from-[#a7f3d0] via-[#6ee7b7] to-[#34d399]', border: 'border-emerald-300', glow: 'rgba(110, 231, 183, 0.6)', shadow: 'shadow-emerald-400/40' },
  pink: { bg: 'from-[#fbcfe8] via-[#f472b6] to-[#ec4899]', border: 'border-pink-300', glow: 'rgba(244, 114, 182, 0.6)', shadow: 'shadow-pink-400/40' },
  purple: { bg: 'from-[#e9d5ff] via-[#c084fc] to-[#a855f7]', border: 'border-purple-300', glow: 'rgba(192, 132, 252, 0.6)', shadow: 'shadow-purple-400/40' },
  orange: { bg: 'from-[#fed7aa] via-[#fb923c] to-[#f97316]', border: 'border-orange-300', glow: 'rgba(251, 146, 60, 0.6)', shadow: 'shadow-orange-400/40' },
  blue: { bg: 'from-[#bae6fd] via-[#60a5fa] to-[#3b82f6]', border: 'border-blue-300', glow: 'rgba(96, 165, 250, 0.6)', shadow: 'shadow-blue-400/40' },
  gray: { bg: 'from-[#e2e8f0] via-[#cbd5e1] to-[#94a3b8]', border: 'border-slate-400', glow: 'rgba(203, 213, 225, 0.4)', shadow: 'shadow-slate-400/30' },
};

const SIZE_MAP = {
  sm: { box: 'w-10 h-10', face: 'scale-75', crown: 'w-3.5 h-3.5 -top-1.5' },
  md: { box: 'w-14 h-14', face: 'scale-90', crown: 'w-4 h-4 -top-2' },
  lg: { box: 'w-20 h-20', face: 'scale-110', crown: 'w-5 h-5 -top-2.5' },
  xl: { box: 'w-28 h-28', face: 'scale-125', crown: 'w-6 h-6 -top-3' },
};

export const MascotAvatar: React.FC<MascotAvatarProps> = ({
  color = 'yellow',
  size = 'md',
  isHost = false,
  isAlive = true,
  isActiveTurn = false,
  expression = 'happy',
  className = '',
}) => {
  const currentTheme = isAlive ? (COLOR_MAP[color] || COLOR_MAP.yellow) : COLOR_MAP.gray;
  const currentSize = SIZE_MAP[size] || SIZE_MAP.md;

  const isSleeping = !isAlive || expression === 'sleeping';

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      {/* Sleeping Zzz Floating Animation */}
      {isSleeping && (
        <div className="absolute -top-6 -right-2 pointer-events-none z-30 flex flex-col items-start">
          <motion.span
            initial={{ opacity: 0, y: 4, x: -2, scale: 0.7 }}
            animate={{
              opacity: [0, 1, 0],
              y: [-2, -16, -24],
              x: [0, 6, 12],
              scale: [0.7, 1.1, 0.9],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="text-[11px] font-black text-indigo-500/90 drop-shadow-xs"
          >
            Z
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 4, x: 0, scale: 0.6 }}
            animate={{
              opacity: [0, 0.9, 0],
              y: [0, -12, -18],
              x: [-2, 3, 7],
              scale: [0.6, 0.9, 0.7],
            }}
            transition={{
              duration: 2.2,
              delay: 0.7,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="text-[9px] font-black text-purple-400/90 -mt-1 ml-2"
          >
            z
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 4, x: 2, scale: 0.5 }}
            animate={{
              opacity: [0, 0.8, 0],
              y: [2, -8, -14],
              x: [0, 2, 4],
              scale: [0.5, 0.7, 0.5],
            }}
            transition={{
              duration: 2.2,
              delay: 1.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="text-[8px] font-black text-blue-400/90 -mt-1 ml-3"
          >
            z
          </motion.span>
        </div>
      )}

      {/* Active Turn Pulsing Aura */}
      {isActiveTurn && isAlive && !isSleeping && (
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.7, 0.3, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -inset-2 rounded-full bg-gradient-to-r from-amber-400/50 via-purple-500/50 to-pink-500/50 blur-md pointer-events-none"
        />
      )}

      {/* Host Crown */}
      {isHost && (
        <motion.div
          initial={{ y: -5 }}
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute ${currentSize.crown} z-20 text-amber-500 filter drop-shadow-sm`}
        >
          <Crown className="w-full h-full fill-amber-400 stroke-amber-600" />
        </motion.div>
      )}

      {/* Character Body (Squishy rounded shape) */}
      <motion.div
        animate={
          isSleeping
            ? {
                y: [1, 3, 1],
                rotate: [-8, -12, -8],
                scale: [1, 0.97, 1],
                filter: 'opacity(0.85)',
              }
            : isActiveTurn
            ? { y: [0, -6, 0], scale: [1, 1.04, 1] }
            : { y: [0, -2, 0] }
        }
        transition={{
          duration: isSleeping ? 2.4 : isActiveTurn ? 0.8 : 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`relative ${currentSize.box} rounded-[44%_44%_40%_40%/52%_52%_42%_42%] bg-gradient-to-b ${currentTheme.bg} border-2 ${currentTheme.border} shadow-lg ${currentTheme.shadow} flex flex-col items-center justify-center overflow-hidden transition-all duration-300`}
      >
        {/* Soft 3D Highlight reflection */}
        <div className="absolute top-1 left-2 w-1/3 h-1/4 bg-white/50 rounded-full blur-[1px] pointer-events-none transform -rotate-12" />

        {/* Mascot Face */}
        <div className={`relative flex flex-col items-center justify-center ${currentSize.face}`}>
          {/* Eyes */}
          <div className="flex items-center gap-2.5 mb-0.5">
            {isSleeping ? (
              // Sleeping closed peaceful eyes (u u / curved arches)
              <>
                <div className="w-2.5 h-1.5 border-b-2 border-slate-600 rounded-full" />
                <div className="w-2.5 h-1.5 border-b-2 border-slate-600 rounded-full" />
              </>
            ) : expression === 'dead' ? (
              <>
                <span className="text-slate-600 font-bold text-xs">✕</span>
                <span className="text-slate-600 font-bold text-xs">✕</span>
              </>
            ) : expression === 'wink' ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-[#1e2022]" />
                <span className="text-[#1e2022] font-black text-[10px] leading-none">^</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-[#1e2022] relative">
                  {/* Eye sparkle */}
                  <div className="w-0.5 h-0.5 bg-white rounded-full absolute top-0.5 right-0.5" />
                </div>
                <div className="w-2 h-2 rounded-full bg-[#1e2022] relative">
                  <div className="w-0.5 h-0.5 bg-white rounded-full absolute top-0.5 right-0.5" />
                </div>
              </>
            )}
          </div>

          {/* Cheeks Blush */}
          {(isAlive || isSleeping) && color !== 'gray' && (
            <div className="absolute -top-0.5 flex justify-between w-6.5 pointer-events-none">
              <div className="w-1.5 h-1 rounded-full bg-pink-400/50 blur-[0.5px]" />
              <div className="w-1.5 h-1 rounded-full bg-pink-400/50 blur-[0.5px]" />
            </div>
          )}

          {/* Mouth */}
          {isSleeping ? (
            // Small sleeping cute 'o' mouth (breathing)
            <div className="w-1.5 h-1.5 rounded-full bg-slate-600/70 mt-0.5 animate-pulse" />
          ) : isAlive ? (
            <div className="w-2.5 h-1 border-b-2 border-[#1e2022] rounded-full mt-0.5" />
          ) : (
            <div className="w-2 h-0.5 bg-slate-600 rounded-full mt-0.5" />
          )}

          {/* Tiny Hands/Flaps */}
          <div className="absolute -bottom-2 flex justify-between w-6 pointer-events-none opacity-40">
            <div className="w-1.5 h-1 bg-black/20 rounded-full" />
            <div className="w-1.5 h-1 bg-black/20 rounded-full" />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
